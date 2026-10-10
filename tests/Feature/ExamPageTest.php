<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Notice;
use App\Models\Question;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestSeries;
use App\Models\User;

/** A paid exam with a page, one subject with a topic and question, and some published content. */
function examWithPage(array $overrides = []): Exam
{
    $exam = Exam::create(['name' => 'HPAS (HPPSC Himachal Administrative Service)', 'is_active' => true]);
    $exam->update([
        'description' => 'State civil services.', 'overview' => 'All about HPAS.', 'facts' => [['label' => 'Conducted by', 'value' => 'HPPSC']],
        'highlights' => ['Detailed solutions'], 'faqs' => [['question' => 'Access?', 'answer' => '12 months.']],
        'is_free' => false, 'price' => 499, 'original_price' => 999, 'validity_months' => 12, ...$overrides,
    ]);

    $subject = Subject::create(['name' => 'HP GK']);
    $subject->topics()->create(['name' => 'Districts']);
    $exam->subjects()->attach($subject);
    $question = Question::create([
        'subject_id' => $subject->id, 'text' => 'Q', 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A', 'difficulty' => 'easy',
    ]);

    $mock = MockTest::create(['exam_id' => $exam->id, 'title' => 'Prelims Mock 1', 'duration_minutes' => 30, 'is_published' => true, 'is_free' => false, 'price' => 49]);
    $mock->questions()->attach($question->id, ['position' => 1]);
    MockTest::create(['exam_id' => $exam->id, 'title' => 'Draft mock', 'duration_minutes' => 30])->questions()->attach($question->id, ['position' => 1]);
    $pyq = MockTest::create(['exam_id' => $exam->id, 'title' => 'Prelims 2023', 'type' => 'pyq', 'year' => 2023, 'duration_minutes' => 30, 'is_published' => true]);
    $pyq->questions()->attach($question->id, ['position' => 1]);
    TestSeries::create(['exam_id' => $exam->id, 'title' => 'Prelims Series', 'is_published' => true])->mockTests()->attach($mock->id, ['position' => 1]);
    StudyMaterial::create(['exam_id' => $exam->id, 'title' => 'GK notes', 'external_url' => 'https://example.com', 'is_published' => true]);

    return $exam;
}

test('anyone can open an exam page with its details and what buying it includes', function () {
    $exam = examWithPage();
    Notice::create(['exam_id' => $exam->id, 'category' => 'notification', 'title' => 'HPAS notification out', 'published_on' => today(), 'is_published' => true]);

    $this->get("/exams/{$exam->slug}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('exam')
        ->where('exam.name', $exam->name)
        ->where('exam.overview', 'All about HPAS.')
        ->where('exam.facts.0.value', 'HPPSC')
        ->where('exam.faqs.0.answer', '12 months.')
        ->where('exam.price', 499)
        ->where('exam.for_sale', true)
        ->where('counts', ['mocks' => 1, 'pyqs' => 1, 'series' => 1, 'materials' => 1, 'quizzes' => 0, 'subjects' => 1, 'topics' => 1, 'questions' => 1])
        ->where('syllabus.0.topics', ['Districts'])
        ->where('inside.mocks.0.title', 'Prelims Mock 1')
        ->where('inside.pyqs.0.detail', '2023 • 1 Qs')
        ->where('notices.0.title', 'HPAS notification out'));
});

test('inactive exams have no public page', function () {
    $exam = Exam::create(['name' => 'Old exam', 'is_active' => false]);

    $this->get("/exams/{$exam->slug}")->assertNotFound();
    $this->get("/exams/{$exam->slug}/buy")->assertNotFound();
});

test('a visitor who presses buy is sent to sign up, then straight to payment', function () {
    $exam = examWithPage();

    $this->get("/exams/{$exam->slug}/buy")
        ->assertRedirect("/exams/{$exam->slug}?auth=register")
        ->assertSessionHas('status');

    $this->get("/exams/{$exam->slug}?auth=register")->assertInertia(fn ($page) => $page->where('authPrompt', 'register'));

    $this->post('/register', ['name' => 'Asha', 'email' => 'asha@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
        ->assertRedirect("/exams/{$exam->slug}/buy");

    $this->get("/exams/{$exam->slug}/buy")->assertRedirect("/student/checkout/{$exam->slug}");
});

test('a visitor who logs in after pressing buy also continues to payment', function () {
    $exam = examWithPage();
    $student = User::factory()->create();

    $this->get("/exams/{$exam->slug}/buy");
    $this->post('/login', ['email' => $student->email, 'password' => 'password'])->assertRedirect("/exams/{$exam->slug}/buy");
});

test('signed-in students go from buy to the payment page', function () {
    $exam = examWithPage();
    $this->actingAs(User::factory()->create());

    $this->get("/exams/{$exam->slug}/buy")->assertRedirect("/student/checkout/{$exam->slug}");

    $this->get("/student/checkout/{$exam->slug}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('student/checkout')
        ->where('exam.price', 499)
        ->where('exam.original_price', 999)
        ->where('counts.mocks', 1));
});

test('exams without a price, or free ones, have no payment page', function () {
    $unpriced = examWithPage(['price' => null]);
    $this->actingAs(User::factory()->create());

    $this->get("/exams/{$unpriced->slug}")->assertInertia(fn ($page) => $page->where('exam.for_sale', false));
    $this->get("/student/checkout/{$unpriced->slug}")->assertNotFound();

    $unpriced->update(['is_free' => true]);
    $this->get("/exams/{$unpriced->slug}/buy")->assertRedirect('/student/dashboard');
});

test('team accounts cannot buy', function () {
    $exam = examWithPage();
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->from("/exams/{$exam->slug}")->get("/exams/{$exam->slug}/buy")->assertRedirect("/exams/{$exam->slug}")->assertSessionHas('status');
    $this->get("/student/checkout/{$exam->slug}")->assertForbidden();
});

test('a signed-in student can still read exam pages', function () {
    $exam = examWithPage();

    $this->actingAs(User::factory()->create())->get("/exams/{$exam->slug}")->assertOk();
});

test('exam cards in the student dashboard link to the same exam page', function () {
    $exam = examWithPage();
    $this->actingAs(User::factory()->create());

    $this->get('/student/dashboard')->assertInertia(fn ($page) => $page->where('exams.0.slug', $exam->slug));
    $this->get('/student/exams')->assertInertia(fn ($page) => $page->where('exams.0.slug', $exam->slug));
    $this->get("/exams/{$exam->slug}")->assertInertia(fn ($page) => $page->component('exam')->where('exam.slug', $exam->slug));
});
