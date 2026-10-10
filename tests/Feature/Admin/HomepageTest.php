<?php

use App\Enums\Permission;
use App\Models\Exam;
use App\Models\HomeCard;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Setting;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestSeries;
use App\Models\User;
use Illuminate\Http\UploadedFile;

beforeEach(fn () => $this->actingAs(User::factory()->superAdmin()->create()));

function publishedMock(Exam $exam, string $title = 'Mock 1'): MockTest
{
    $subject = Subject::firstOrCreate(['name' => 'GK']);
    $question = Question::create(['subject_id' => $subject->id, 'text' => $title, 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A', 'difficulty' => 'easy']);
    $test = MockTest::create(['exam_id' => $exam->id, 'title' => $title, 'duration_minutes' => 20, 'is_published' => true]);
    $test->questions()->attach($question->id, ['position' => 1]);

    return $test;
}

test('the homepage section opens', function () {
    $this->get('/admin/homepage')->assertOk()->assertInertia(fn ($page) => $page->component('admin/homepage'));
});

test('exams we cover are chosen and ordered in admin', function () {
    $tet = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $hpas = Exam::create(['name' => 'HPAS', 'is_active' => true]);
    $ctet = Exam::create(['name' => 'CTET', 'is_active' => true]);
    Exam::create(['name' => 'Closed', 'is_active' => false]);

    $this->put('/admin/homepage/exams', ['exams' => [
        ['id' => $hpas->id, 'show_on_home' => true],
        ['id' => $ctet->id, 'show_on_home' => false],
        ['id' => $tet->id, 'show_on_home' => true],
    ]])->assertSessionHasNoErrors();

    auth()->logout();
    $this->get('/')->assertInertia(fn ($page) => $page->where('exams', [
        ['name' => 'HPAS', 'slug' => $hpas->slug],
        ['name' => 'HP TET', 'slug' => $tet->slug],
    ]));
});

test('carousel cards are added, edited, reordered and removed, and reach the homepage', function () {
    $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $mock = publishedMock($exam);
    $series = TestSeries::create(['exam_id' => $exam->id, 'title' => 'TET Series', 'is_published' => true, 'is_free' => false, 'price' => 199]);
    $series->mockTests()->attach($mock->id, ['position' => 1]);

    $this->post('/admin/homepage/cards', ['section' => 'tests', 'cardable_type' => 'mock_test', 'cardable_id' => $mock->id, 'badge' => 'Trending'])
        ->assertSessionHasNoErrors();
    $this->post('/admin/homepage/cards', [
        'section' => 'tests', 'cardable_type' => 'test_series', 'cardable_id' => $series->id,
        'badge' => 'Bestseller', 'highlights' => ['15 Full Length', '', 'Bilingual'], 'tag' => 'Free Demo',
    ]);
    // The same item twice is refused.
    $this->post('/admin/homepage/cards', ['section' => 'tests', 'cardable_type' => 'mock_test', 'cardable_id' => $mock->id])->assertSessionHasErrors('cardable_id');

    $seriesCard = HomeCard::where('cardable_type', 'test_series')->first();
    $this->post("/admin/homepage/cards/{$seriesCard->id}/move", ['direction' => 'up']);

    auth()->logout();
    $this->get('/')->assertInertia(fn ($page) => $page
        ->has('testCards', 2)
        ->where('testCards.0.title', 'TET Series')
        ->where('testCards.0.badge', 'Bestseller')
        ->where('testCards.0.highlights', ['15 Full Length', 'Bilingual'])
        ->where('testCards.0.tag', 'Free Demo')
        ->where('testCards.0.action', 'Explore Test Series')
        ->where('testCards.0.href', route('exams.show', $exam->slug).'#inside')
        ->where('testCards.1.title', 'Mock 1')
        ->where('testCards.1.tag', 'Free')
        ->where('testCards.1.action', 'Start Free Mock')
        ->has('materialCards', 0));

    $this->actingAs(User::factory()->superAdmin()->create());
    $this->put("/admin/homepage/cards/{$seriesCard->id}", ['badge' => null, 'tag' => '', 'highlights' => []]);
    expect($seriesCard->fresh()->badge)->toBeNull();

    $this->delete("/admin/homepage/cards/{$seriesCard->id}");
    expect(HomeCard::count())->toBe(1)->and($series->fresh())->not->toBeNull();
});

test('a card only takes the kind of item its carousel shows', function () {
    $material = StudyMaterial::create(['exam_id' => Exam::create(['name' => 'X', 'is_active' => true])->id, 'title' => 'Notes', 'external_url' => 'https://example.com', 'is_published' => true]);

    $this->post('/admin/homepage/cards', ['section' => 'tests', 'cardable_type' => 'study_material', 'cardable_id' => $material->id])->assertStatus(422);
    $this->post('/admin/homepage/cards', ['section' => 'materials', 'cardable_type' => 'study_material', 'cardable_id' => $material->id])->assertSessionHasNoErrors();

    auth()->logout();
    $this->get('/')->assertInertia(fn ($page) => $page->where('materialCards.0.title', 'Notes')->where('materialCards.0.action', 'Explore Study Material'));
});

test('drafts stay off the homepage and deleted items take their cards with them', function () {
    $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $mock = publishedMock($exam);
    HomeCard::create(['section' => 'tests', 'cardable_type' => 'mock_test', 'cardable_id' => $mock->id]);

    $mock->update(['is_published' => false]);
    $this->get('/')->assertInertia(fn ($page) => $page->has('testCards', 0));

    $mock->delete();
    expect(HomeCard::count())->toBe(0);
});

test('section headings are editable', function () {
    $text = Setting::homepageText();

    $this->put('/admin/homepage/text', [...$text, 'home_tests_title' => 'Practice Packs'])->assertSessionHasNoErrors();

    auth()->logout();
    $this->get('/')->assertInertia(fn ($page) => $page->where('text.home_tests_title', 'Practice Packs'));
});

test('the exam page content and price are managed in the exam form', function () {
    $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);

    $this->put("/admin/exams/{$exam->id}", [
        'name' => 'HP TET', 'description' => 'Teachers', 'is_active' => true,
        'overview' => 'About the test.',
        'facts' => [['label' => 'Mode', 'value' => 'Offline']],
        'highlights' => ['Bilingual', ''],
        'faqs' => [['question' => 'Valid for?', 'answer' => 'One year.']],
        'is_free' => false, 'price' => 399, 'original_price' => 799, 'validity_months' => 12,
        'cover' => UploadedFile::fake()->createWithContent('cover.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')),
    ])->assertSessionHasNoErrors()->assertRedirect('/admin/exams');

    $exam->refresh();
    expect($exam->facts)->toBe([['label' => 'Mode', 'value' => 'Offline']])
        ->and($exam->highlights)->toBe(['Bilingual'])
        ->and($exam->price)->toBe(399.0)
        ->and($exam->cover_path)->not->toBeNull();

    $this->get("/exams/{$exam->slug}")->assertInertia(fn ($page) => $page->where('exam.faqs.0.answer', 'One year.')->where('exam.for_sale', true));

    $this->put("/admin/exams/{$exam->id}", ['name' => 'HP TET', 'is_active' => true, 'is_free' => false, 'price' => 500, 'original_price' => 100])
        ->assertSessionHasErrors('original_price');
});

test('the homepage section needs its own access', function () {
    $this->actingAs(User::factory()->staff([Permission::Notices])->create());
    $this->get('/admin/homepage')->assertForbidden();

    $this->actingAs(User::factory()->staff([Permission::Homepage])->create());
    $this->get('/admin/homepage')->assertOk();
});
