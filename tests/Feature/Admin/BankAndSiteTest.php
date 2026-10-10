<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Notice;
use App\Models\Question;
use App\Models\QuizAttempt;
use App\Models\Setting;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;

beforeEach(fn () => $this->actingAs(User::factory()->superAdmin()->create()));

test('subjects and topics can be added, renamed, reordered and deleted', function () {
    $this->post('/admin/subjects', ['name' => 'HP GK'])->assertRedirect();
    $subject = Subject::firstWhere('name', 'HP GK');

    $this->post("/admin/subjects/{$subject->id}/topics", ['name' => 'Districts']);
    $this->post("/admin/subjects/{$subject->id}/topics", ['name' => 'Rivers']);
    [$districts, $rivers] = $subject->topics()->get()->all();

    $this->post("/admin/topics/{$rivers->id}/move", ['direction' => 'up']);
    expect($subject->topics()->pluck('name')->all())->toBe(['Rivers', 'Districts']);

    $this->put("/admin/topics/{$districts->id}", ['name' => 'Districts of HP']);
    expect($districts->fresh()->name)->toBe('Districts of HP');

    // Deleting a topic keeps its questions in the subject.
    $question = Question::create([
        'subject_id' => $subject->id, 'topic_id' => $rivers->id, 'text' => 'Q', 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd',
        'correct_option' => 'A', 'difficulty' => 'easy',
    ]);
    $this->delete("/admin/topics/{$rivers->id}");
    expect($question->fresh()->topic_id)->toBeNull();

    $this->post("/admin/subjects/{$subject->id}/topics", ['name' => 'Districts of HP'])->assertSessionHasErrors('name');
});

test('questions can be created, edited and filtered', function () {
    $subject = Subject::create(['name' => 'Polity']);
    $topic = $subject->topics()->create(['name' => 'Constitution']);
    $fields = ['subject_id' => $subject->id, 'topic_id' => $topic->id, 'text' => 'Article 14?', 'option_a' => 'Equality', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A', 'explanation' => 'Equality before law.', 'difficulty' => 'medium'];

    $this->post('/admin/questions', $fields)->assertRedirect('/admin/questions');
    $question = Question::first();

    $this->put("/admin/questions/{$question->id}", [...$fields, 'correct_option' => 'B'])->assertRedirect('/admin/questions');
    expect($question->fresh()->correct_option)->toBe('B');

    $this->get("/admin/questions?subject={$subject->id}&topic={$topic->id}")->assertInertia(fn ($page) => $page->where('questions.total', 1));
    $this->get("/admin/questions?subject={$subject->id}&topic=none")->assertInertia(fn ($page) => $page->where('questions.total', 0));
});

test('a question topic must belong to its subject', function () {
    $a = Subject::create(['name' => 'A']);
    $b = Subject::create(['name' => 'B']);
    $topic = $b->topics()->create(['name' => 'T']);

    $this->post('/admin/questions', ['subject_id' => $a->id, 'topic_id' => $topic->id, 'text' => 'Q', 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A', 'difficulty' => 'easy'])
        ->assertSessionHasErrors('topic_id');
});

test('questions import from CSV after a preview, creating subjects and topics and skipping bad rows and repeats', function () {
    $csv = implode("\n", [
        'subject,topic,question,option_a,option_b,option_c,option_d,correct,explanation,difficulty',
        'HP GK,Districts,How many districts?,10,11,12,13,C,Twelve.,easy',
        'HP GK,Districts,How many districts?,10,11,12,13,C,Twelve.,easy',
        'HP GK,,Capital?,Shimla,b,c,d,A,,',
        'HP GK,Rivers,Broken row,a,b,c,d,E,,easy',
    ]);

    $response = $this->post('/admin/questions/import', ['file' => UploadedFile::fake()->createWithContent('q.csv', $csv)]);
    $preview = $response->headers->get('Location');
    expect(Question::count())->toBe(0);

    $this->get($preview)->assertInertia(fn ($page) => $page
        ->component('admin/questions/import-preview')
        ->where('rows.0.status', 'new')
        ->where('rows.1.status', 'repeat')
        ->where('rows.2.status', 'new')
        ->where('rows.3.status', 'error')
        ->where('rows.3.problem', 'correct must be A, B, C or D'));

    $this->post($preview)->assertRedirect('/admin/questions')
        ->assertSessionHas('status', '2 new questions added to the bank, 0 already in the bank were reused, 2 skipped.');

    $subject = Subject::firstWhere('name', 'HP GK');
    expect($subject->questions()->count())->toBe(2)
        ->and($subject->topics()->pluck('name')->all())->toBe(['Districts'])
        ->and(Question::firstWhere('text', 'Capital?')->difficulty)->toBe('medium');
});

test('the import template downloads', function () {
    $this->get('/admin/questions/import/template')->assertOk()->assertDownload('question-import-template.csv');
});

test('exams link to bank subjects', function () {
    $gk = Subject::create(['name' => 'HP GK']);

    $this->post('/admin/exams', ['name' => 'HP TET', 'description' => 'Teachers', 'is_active' => true, 'subject_ids' => [$gk->id]])->assertRedirect('/admin/exams');

    expect(Exam::firstWhere('name', 'HP TET')->subjects()->pluck('name')->all())->toBe(['HP GK']);
});

test('deleting an exam removes its tests', function () {
    $exam = Exam::create(['name' => 'Old exam', 'is_active' => true]);
    MockTest::create(['exam_id' => $exam->id, 'title' => 'T', 'duration_minutes' => 10]);

    $this->delete("/admin/exams/{$exam->id}")->assertRedirect('/admin/exams');

    expect(MockTest::count())->toBe(0);
});

test('notices can be posted and edited', function () {
    $this->post('/admin/notices', [
        'category' => 'result', 'title' => 'HP TET result out', 'summary' => 'Check now', 'url' => 'https://example.com',
        'published_on' => today()->toDateString(), 'is_pinned' => true, 'is_published' => true,
    ])->assertRedirect('/admin/notices');

    $notice = Notice::first();
    expect($notice->is_pinned)->toBeTrue();

    $this->get('/')->assertInertia(fn ($page) => $page->where('notices.0.title', 'HP TET result out'));
});

test('admins see a student\'s results and can delete the account', function () {
    $student = User::factory()->create();
    $attempt = $student->quizAttempts()->create(['mode' => 'random', 'title' => 'Random', 'total_questions' => 10]);
    $attempt->forceFill(['correct_count' => 7, 'submitted_at' => now()])->save();

    $this->get('/admin/students')->assertInertia(fn ($page) => $page->where('students.data.0.quizzes_count', 1));
    $this->get("/admin/students/{$student->id}")->assertInertia(fn ($page) => $page->where('attempts.0.percent', 70));

    $this->delete("/admin/students/{$student->id}")->assertRedirect('/admin/students');
    expect(User::find($student->id))->toBeNull()->and(QuizAttempt::count())->toBe(0);
});

test('student pages never resolve to a team member', function () {
    $staff = User::factory()->staff()->create();

    $this->get("/admin/students/{$staff->id}")->assertNotFound();
});

test('result cut-offs are editable and reach students', function () {
    $this->put('/admin/settings', ['pass_percent' => 70, 'review_percent' => 50])->assertSessionHasNoErrors();
    expect(Setting::resultBands())->toBe(['pass' => 70, 'review' => 50]);

    $this->put('/admin/settings', ['pass_percent' => 50, 'review_percent' => 60])->assertSessionHasErrors('review_percent');

    $this->actingAs(User::factory()->create())->get('/student/attempted-tests')
        ->assertInertia(fn ($page) => $page->where('bands', ['pass' => 70, 'review' => 50]));
});
