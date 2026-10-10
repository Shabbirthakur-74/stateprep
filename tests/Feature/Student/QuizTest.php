<?php

use App\Models\Question;
use App\Models\QuizAttempt;
use App\Models\Subject;
use App\Models\User;

/**
 * HP GK with two topics (Districts: 3 questions, Rivers: 2) and Polity with no topics (2 questions).
 * The correct answer is always A.
 */
function quizBank(): array
{
    $gk = Subject::create(['name' => 'HP GK']);
    $districts = $gk->topics()->create(['name' => 'Districts']);
    $rivers = $gk->topics()->create(['name' => 'Rivers']);
    $polity = Subject::create(['name' => 'Polity']);

    foreach ([[$gk, $districts, 3], [$gk, $rivers, 2], [$polity, null, 2]] as [$subject, $topic, $count]) {
        for ($i = 1; $i <= $count; $i++) {
            Question::create([
                'subject_id' => $subject->id, 'topic_id' => $topic?->id, 'text' => "{$subject->name} {$topic?->name} {$i}",
                'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A',
                'explanation' => 'Because.', 'difficulty' => 'easy',
            ]);
        }
    }

    return [$gk, $districts, $rivers, $polity];
}

function questionTopics(QuizAttempt $attempt): array
{
    return $attempt->answers()->with('question')->get()->pluck('question.topic_id')->unique()->values()->all();
}

test('a topic quiz only asks questions from that topic', function () {
    [$gk, $districts] = quizBank();
    $this->actingAs($student = User::factory()->create());

    $this->post('/student/quizzes', ['mode' => 'topic', 'subject_id' => $gk->id, 'topic_id' => $districts->id, 'length' => 10])
        ->assertRedirect();

    $attempt = $student->quizAttempts()->first();
    expect($attempt->total_questions)->toBe(3)
        ->and($attempt->title)->toBe('HP GK • Districts')
        ->and(questionTopics($attempt))->toBe([$districts->id]);
});

test('a mixed quiz covers every topic of one subject only', function () {
    [$gk] = quizBank();
    $this->actingAs($student = User::factory()->create());

    $this->post('/student/quizzes', ['mode' => 'mixed', 'subject_id' => $gk->id, 'length' => 10]);

    $attempt = $student->quizAttempts()->first();
    $subjects = $attempt->answers()->with('question')->get()->pluck('question.subject_id')->unique()->all();

    expect($attempt->total_questions)->toBe(5)->and(array_values($subjects))->toBe([$gk->id]);
});

test('a random quiz draws from the whole bank', function () {
    quizBank();
    $this->actingAs($student = User::factory()->create());

    $this->post('/student/quizzes', ['mode' => 'random', 'length' => 10]);

    expect($student->quizAttempts()->first()->total_questions)->toBe(7);
});

test('a topic must belong to the chosen subject', function () {
    [, $districts, , $polity] = quizBank();
    $this->actingAs(User::factory()->create());

    $this->post('/student/quizzes', ['mode' => 'topic', 'subject_id' => $polity->id, 'topic_id' => $districts->id, 'length' => 10])->assertNotFound();
});

test('answers are revealed only after answering, and finishing stores the score', function () {
    [$gk, $districts] = quizBank();
    $this->actingAs($student = User::factory()->create());
    $this->post('/student/quizzes', ['mode' => 'topic', 'subject_id' => $gk->id, 'topic_id' => $districts->id, 'length' => 10]);
    $attempt = $student->quizAttempts()->first();
    $ids = $attempt->answers()->pluck('question_id');

    $this->get("/student/quizzes/{$attempt->id}")->assertInertia(fn ($page) => $page
        ->component('student/quiz-attempt')
        ->where('questions.0.correct', null)
        ->where('questions.0.explanation', null));

    $this->put("/student/quizzes/{$attempt->id}/answer", ['question_id' => $ids[0], 'option' => 'A']);
    $this->put("/student/quizzes/{$attempt->id}/answer", ['question_id' => $ids[1], 'option' => 'B']);
    // A second answer to the same question is ignored.
    $this->put("/student/quizzes/{$attempt->id}/answer", ['question_id' => $ids[0], 'option' => 'C']);

    $this->get("/student/quizzes/{$attempt->id}")->assertInertia(fn ($page) => $page
        ->where('questions.0.selected', 'A')
        ->where('questions.0.correct', 'A')
        ->where('questions.0.explanation', 'Because.')
        ->where('questions.2.correct', null));

    $this->post("/student/quizzes/{$attempt->id}/finish")->assertRedirect("/student/quizzes/{$attempt->id}");

    $attempt->refresh();
    expect($attempt->correct_count)->toBe(1)
        ->and($attempt->wrong_count)->toBe(1)
        ->and($attempt->percent())->toBe(33.3);

    $this->get('/student/performance')->assertInertia(fn ($page) => $page
        ->where('overview.quizzes', 1)
        ->where('overview.answered', 2)
        ->where('overview.accuracy', 50)
        ->where("bySubject.{$gk->id}.correct", 1));

    $this->get('/student/attempted-tests')->assertInertia(fn ($page) => $page->has('attempts', 1)->where('attempts.0.percent', 33.3));
    $this->get('/student/dashboard')->assertInertia(fn ($page) => $page->where('overview.quizzes', 1)->has('recent', 1));
});

test('students cannot see or answer someone else\'s quiz', function () {
    [$gk] = quizBank();
    $owner = User::factory()->create();
    $this->actingAs($owner)->post('/student/quizzes', ['mode' => 'mixed', 'subject_id' => $gk->id, 'length' => 10]);
    $attempt = $owner->quizAttempts()->first();

    $this->actingAs(User::factory()->create());
    $this->get("/student/quizzes/{$attempt->id}")->assertNotFound();
    $this->post("/student/quizzes/{$attempt->id}/finish")->assertNotFound();
});

test('quiz length must be one of the offered sizes', function () {
    [$gk] = quizBank();
    $this->actingAs(User::factory()->create());

    $this->post('/student/quizzes', ['mode' => 'mixed', 'subject_id' => $gk->id, 'length' => 500])->assertSessionHasErrors('length');
});
