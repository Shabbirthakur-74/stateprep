<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestSeries;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/** A real 1x1 PNG, so the tests do not need the GD extension that fake()->image() relies on. */
function fakeCover(string $name = 'cover.png'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='));
}

beforeEach(function () {
    Storage::fake('public');
    Storage::fake('local');

    $this->exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $this->subject = Subject::create(['name' => 'Pedagogy']);
    foreach (range(1, 5) as $i) {
        Question::create([
            'subject_id' => $this->subject->id, 'text' => "Q{$i}", 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd',
            'correct_option' => 'A', 'difficulty' => 'easy',
        ]);
    }
});

test('admin screens load', function (string $url) {
    $this->actingAs(User::factory()->superAdmin()->create())->get($url)->assertOk();
})->with(['/admin/mock-tests', '/admin/mock-tests/create', '/admin/test-series', '/admin/test-series/create', '/admin/materials', '/admin/materials/create']);

test('students cannot manage content', function () {
    $this->actingAs(User::factory()->create())->get('/admin/mock-tests')->assertForbidden();
});

test('creating a mock test stores the cover and opens its questions screen', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $response = $this->post('/admin/mock-tests', [
        'exam_id' => $this->exam->id, 'title' => 'Pedagogy Mock 1', 'type' => 'mock', 'duration_minutes' => 30,
        'marks_per_question' => 1, 'negative_marks' => 0, 'is_free' => '1', 'is_published' => '1',
        'cover' => fakeCover('cover.png'),
    ]);

    $test = MockTest::first();
    $response->assertRedirect("/admin/sets/mock-test/{$test->id}");
    expect($test->cover_path)->not->toBeNull();
    Storage::disk('public')->assertExists($test->cover_path);
});

test('replacing and removing a cover deletes the old file', function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $test = MockTest::create(['exam_id' => $this->exam->id, 'title' => 'T', 'duration_minutes' => 10]);
    $test->cover_path = fakeCover('old.png')->store('covers', 'public');
    $test->save();
    $old = $test->cover_path;

    $fields = ['exam_id' => $this->exam->id, 'title' => 'T', 'type' => 'mock', 'duration_minutes' => 10, 'marks_per_question' => 1, 'negative_marks' => 0, 'is_free' => '1', 'is_published' => '0'];

    $this->post("/admin/mock-tests/{$test->id}", [...$fields, '_method' => 'put', 'cover' => fakeCover('new.png')]);
    Storage::disk('public')->assertMissing($old);
    $new = $test->fresh()->cover_path;
    Storage::disk('public')->assertExists($new);

    $this->post("/admin/mock-tests/{$test->id}", [...$fields, '_method' => 'put', 'remove_cover' => '1']);
    expect($test->fresh()->cover_path)->toBeNull();
    Storage::disk('public')->assertMissing($new);
});

test('a cover must be an image', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->post('/admin/mock-tests', [
        'exam_id' => $this->exam->id, 'title' => 'X', 'type' => 'mock', 'duration_minutes' => 30, 'marks_per_question' => 1, 'negative_marks' => 0,
        'is_free' => '1', 'is_published' => '0',
        'cover' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
    ])->assertSessionHasErrors('cover');
});

test('a test series keeps its tests in the chosen order', function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $first = MockTest::create(['exam_id' => $this->exam->id, 'title' => 'First', 'duration_minutes' => 10]);
    $second = MockTest::create(['exam_id' => $this->exam->id, 'title' => 'Second', 'duration_minutes' => 10]);

    $this->post('/admin/test-series', [
        'title' => 'TET Series', 'exam_id' => $this->exam->id, 'is_free' => '0', 'price' => 199, 'is_published' => '1',
        'mock_test_ids' => [$second->id, $first->id], 'cover' => fakeCover('series.png'),
    ])->assertRedirect('/admin/test-series');

    $series = TestSeries::first();
    expect($series->mockTests->pluck('title')->all())->toBe(['Second', 'First'])
        ->and($series->price)->toBe(199.0)
        ->and($series->cover_path)->not->toBeNull();
});

test('paid content needs a price', function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $test = MockTest::create(['exam_id' => $this->exam->id, 'title' => 'First', 'duration_minutes' => 10]);

    $this->post('/admin/test-series', ['title' => 'S', 'is_free' => '0', 'is_published' => '0', 'mock_test_ids' => [$test->id]])
        ->assertSessionHasErrors('price');
});

test('study material can be an uploaded file or a link, with a cover', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->post('/admin/materials', [
        'exam_id' => $this->exam->id, 'title' => 'Pedagogy notes', 'is_free' => '1', 'is_published' => '1',
        'file' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
        'cover' => fakeCover('cover.png'),
    ])->assertRedirect('/admin/materials');

    $material = StudyMaterial::first();
    expect($material->file_name)->toBe('notes.pdf')->and($material->formatLabel())->toBe('PDF');
    Storage::disk('local')->assertExists($material->file_path);
    Storage::disk('public')->assertExists($material->cover_path);

    $this->post("/admin/materials/{$material->id}", [
        '_method' => 'put', 'exam_id' => $this->exam->id, 'title' => 'Pedagogy notes', 'is_free' => '1', 'is_published' => '1',
        'external_url' => 'https://example.com/notes',
    ]);

    expect($material->fresh()->isLink())->toBeTrue();
    Storage::disk('local')->assertMissing($material->file_path);
});

test('study material needs a file or a link', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->post('/admin/materials', ['exam_id' => $this->exam->id, 'title' => 'Empty', 'is_free' => '1', 'is_published' => '0'])
        ->assertSessionHasErrors(['file', 'external_url']);
});

test('deleting content removes its cover', function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $series = new TestSeries(['title' => 'S']);
    $series->cover_path = fakeCover('c.png')->store('covers', 'public');
    $series->save();

    $this->delete("/admin/test-series/{$series->id}")->assertRedirect('/admin/test-series');

    Storage::disk('public')->assertMissing($series->cover_path);
    expect(TestSeries::count())->toBe(0);
});
