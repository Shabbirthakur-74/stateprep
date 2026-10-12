<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\StudyMaterial;
use App\Models\TestSeries;
use App\Models\User;

function publishedContent(): Exam
{
    $exam = Exam::create(['name' => 'HPAS (HPPSC Himachal Administrative Service)', 'is_active' => true]);
    $subject = $exam->subjects()->create(['name' => 'Himachal GK']);
    $topic = $subject->topics()->create(['name' => 'Districts']);
    $question = Question::create([
        'subject_id' => $subject->id, 'topic_id' => $topic->id, 'text' => 'Capital?', 'option_a' => 'Shimla', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd',
        'correct_option' => 'A', 'explanation' => 'Shimla is the capital.', 'difficulty' => 'easy',
    ]);

    foreach ([['Full mock', 'mock', null], ['Prelims 2023', 'pyq', 2023]] as [$title, $type, $year]) {
        MockTest::create(['exam_id' => $exam->id, 'title' => $title, 'type' => $type, 'year' => $year, 'duration_minutes' => 20, 'is_published' => true])
            ->questions()->attach($question->id, ['position' => 1]);
    }

    return $exam;
}

test('every student screen loads', function (string $url, string $component) {
    publishedContent();

    $this->actingAs(User::factory()->create())->get($url)->assertOk()->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['/student/dashboard', 'student/dashboard'],
    ['/student/exams', 'student/exams'],
    ['/student/library', 'student/library'],
    ['/student/pyqs', 'student/pyqs'],
    ['/student/quizzes', 'student/quizzes'],
    ['/student/mock-tests', 'student/mock-tests'],
    ['/student/test-series', 'student/test-series'],
    ['/student/study-material', 'student/study-material'],
    ['/student/attempted-tests', 'student/attempted-tests'],
    ['/student/performance', 'student/performance'],
    ['/student/settings', 'student/settings'],
    ['/student/personalised-tests', 'student/coming-soon'],
    ['/student/doubts', 'student/doubts/index'],
    ['/student/live-session', 'student/coming-soon'],
]);

test('screens list the published catalogue', function () {
    $exam = publishedContent();
    $this->actingAs(User::factory()->create());

    $this->get('/student/exams')->assertInertia(fn ($page) => $page
        ->has('exams', 1)
        ->where('exams.0.subjects_count', 1)
        ->where('exams.0.questions_count', 1)
        ->where('exams.0.mock_count', 1)
        ->where('exams.0.pyq_count', 1));

    $this->get('/student/pyqs')->assertInertia(fn ($page) => $page
        ->has('papers', 1)
        ->where('papers.0.year', 2023)
        ->where('subjects.0.exam_ids', [$exam->id])
        ->where('samples.0.exam_id', $exam->id));

    $this->get('/student/quizzes')->assertInertia(fn ($page) => $page
        ->has('subjects', 1)
        ->where('subjects.0.name', 'Himachal GK')
        ->where('subjects.0.topics.0.name', 'Districts'));

    $this->get('/student/mock-tests')->assertInertia(fn ($page) => $page->has('papers', 1)->where('papers.0.title', 'Full mock'));
});

test('test series and study material show only published items', function () {
    $exam = publishedContent();
    $series = TestSeries::create(['title' => 'TET Series', 'exam_id' => $exam->id, 'is_published' => true]);
    $series->mockTests()->attach(MockTest::first()->id, ['position' => 1]);
    TestSeries::create(['title' => 'Draft series']);
    StudyMaterial::create(['exam_id' => $exam->id, 'title' => 'GK notes', 'external_url' => 'https://example.com/notes', 'is_published' => true]);
    StudyMaterial::create(['exam_id' => $exam->id, 'title' => 'Draft notes', 'external_url' => 'https://example.com/x']);

    $this->actingAs(User::factory()->create());

    $this->get('/student/test-series')->assertInertia(fn ($page) => $page->has('series', 1)->where('series.0.tests.0.title', 'Full mock'));
    $this->get('/student/study-material')->assertInertia(fn ($page) => $page->has('materials', 1)->where('materials.0.title', 'GK notes'));
});

test('coming soon pages say what is coming', function () {
    $this->actingAs(User::factory()->create())->get('/student/live-session')
        ->assertInertia(fn ($page) => $page->where('title', '1-on-1 Live Session'));
});

test('admins cannot open student screens', function () {
    $this->actingAs(User::factory()->superAdmin()->create())->get('/student/pyqs')->assertForbidden();
});
