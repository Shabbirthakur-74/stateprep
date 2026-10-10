<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Subject;
use App\Models\TestAttempt;
use App\Models\TestSeries;
use App\Models\User;

/** A free published mock test with 4 questions (answer always A), +2 for right and −0.5 for wrong. */
function freeTest(array $overrides = []): MockTest
{
    $exam = Exam::firstOrCreate(['name' => 'HP TET'], ['is_active' => true]);
    $subject = Subject::firstOrCreate(['name' => 'Pedagogy']);
    $test = MockTest::create([
        'exam_id' => $exam->id, 'title' => 'TET Mock 1', 'duration_minutes' => 30, 'marks_per_question' => 2, 'negative_marks' => 0.5,
        'is_published' => true, ...$overrides,
    ]);

    foreach (range(1, 4) as $i) {
        $q = Question::create([
            'subject_id' => $subject->id, 'text' => "{$test->title} Q{$i}", 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd',
            'correct_option' => 'A', 'explanation' => 'Because A.', 'difficulty' => 'easy',
        ]);
        $test->questions()->attach($q->id, ['position' => $i]);
    }

    return $test;
}

test('a student can take a mock test and gets a marked scorecard', function () {
    $test = freeTest();
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/tests/{$test->id}/start")->assertRedirect();
    $attempt = $student->testAttempts()->first();
    $ids = $attempt->answers()->pluck('question_id');

    // Answers are hidden while the test runs.
    $this->get("/student/tests/attempts/{$attempt->id}")->assertInertia(fn ($page) => $page
        ->component('student/test-attempt')
        ->where('attempt.submitted', false)
        ->where('questions.0.correct', null));

    $this->put("/student/tests/attempts/{$attempt->id}/answer", ['question_id' => $ids[0], 'option' => 'B', 'marked' => false]);
    // Answers can be changed before submitting.
    $this->put("/student/tests/attempts/{$attempt->id}/answer", ['question_id' => $ids[0], 'option' => 'A', 'marked' => true]);
    $this->put("/student/tests/attempts/{$attempt->id}/answer", ['question_id' => $ids[1], 'option' => 'A', 'marked' => false]);
    $this->put("/student/tests/attempts/{$attempt->id}/answer", ['question_id' => $ids[2], 'option' => 'C', 'marked' => false]);

    $this->post("/student/tests/attempts/{$attempt->id}/submit")->assertRedirect("/student/tests/attempts/{$attempt->id}");

    $attempt->refresh();
    // 2 right × 2 − 1 wrong × 0.5 = 3.5 of 8.
    expect($attempt->correct_count)->toBe(2)
        ->and($attempt->wrong_count)->toBe(1)
        ->and($attempt->score)->toBe(3.5)
        ->and($attempt->max_score)->toBe(8.0)
        ->and($attempt->percent())->toBe(43.8);

    $this->get("/student/tests/attempts/{$attempt->id}")->assertInertia(fn ($page) => $page
        ->where('attempt.submitted', true)
        ->where('questions.0.correct', 'A')
        ->where('questions.0.explanation', 'Because A.')
        ->where('bySubject.0.correct', 2));

    // Changing answers after submitting does nothing.
    $this->put("/student/tests/attempts/{$attempt->id}/answer", ['question_id' => $ids[3], 'option' => 'A', 'marked' => false]);
    expect($attempt->fresh()->correct_count)->toBe(2);

    $this->get('/student/dashboard')->assertInertia(fn ($page) => $page->where('overview.tests', 1));
    $this->get('/student/attempted-tests')->assertInertia(fn ($page) => $page->where('attempts.0.kind', 'mock')->where('attempts.0.score', 3.5));
    $this->get('/student/performance')->assertInertia(fn ($page) => $page->where('overview.answered', 3)->where('overview.tests', 1));
});

test('starting again resumes the open attempt', function () {
    $test = freeTest();
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/tests/{$test->id}/start");
    $this->post("/student/tests/{$test->id}/start");

    expect($student->testAttempts()->count())->toBe(1);
});

test('an attempt whose time ran out is scored automatically', function () {
    $test = freeTest();
    $this->actingAs($student = User::factory()->create());
    $this->post("/student/tests/{$test->id}/start");
    $attempt = $student->testAttempts()->first();
    $this->put("/student/tests/attempts/{$attempt->id}/answer", ['question_id' => $attempt->answers()->first()->question_id, 'option' => 'A', 'marked' => false]);

    $this->travel(31)->minutes();

    $this->get("/student/tests/attempts/{$attempt->id}")->assertInertia(fn ($page) => $page->where('attempt.submitted', true));
    expect($attempt->fresh()->correct_count)->toBe(1);
});

test('paid tests cannot be started yet', function () {
    $test = freeTest(['is_free' => false, 'price' => 99]);
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/tests/{$test->id}/start")->assertSessionHasErrors('test');
    expect($student->testAttempts()->count())->toBe(0);
});

test('unpublished tests cannot be started', function () {
    $test = freeTest(['is_published' => false]);
    $this->actingAs(User::factory()->create());

    $this->post("/student/tests/{$test->id}/start")->assertSessionHasErrors('test');
});

test('students cannot open someone else\'s attempt', function () {
    $test = freeTest();
    $owner = User::factory()->create();
    $this->actingAs($owner)->post("/student/tests/{$test->id}/start");
    $attempt = TestAttempt::first();

    $this->actingAs(User::factory()->create());
    $this->get("/student/tests/attempts/{$attempt->id}")->assertNotFound();
    $this->post("/student/tests/attempts/{$attempt->id}/submit")->assertNotFound();
});

test('tests can be taken from a free series and the series page shows progress', function () {
    $first = freeTest();
    $second = freeTest(['title' => 'TET Mock 2']);
    $series = TestSeries::create(['title' => 'TET Series', 'is_published' => true]);
    $series->mockTests()->attach([$first->id => ['position' => 1], $second->id => ['position' => 2]]);
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/tests/{$first->id}/start", ['series' => $series->id]);
    $attempt = $student->testAttempts()->first();
    expect($attempt->test_series_id)->toBe($series->id);
    $this->post("/student/tests/attempts/{$attempt->id}/submit");

    $this->get("/student/test-series/{$series->id}")->assertInertia(fn ($page) => $page
        ->component('student/series-show')
        ->where('series.tests.0.title', 'TET Mock 1')
        ->where('series.tests.0.attempts', 1)
        ->where('series.tests.1.attempts', 0));
});

test('a paid series locks its tests', function () {
    $test = freeTest();
    $series = TestSeries::create(['title' => 'Paid', 'is_published' => true, 'is_free' => false, 'price' => 299]);
    $series->mockTests()->attach($test->id, ['position' => 1]);
    $this->actingAs(User::factory()->create());

    $this->post("/student/tests/{$test->id}/start", ['series' => $series->id])->assertSessionHasErrors('test');
});
