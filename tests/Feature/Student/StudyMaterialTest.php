<?php

use App\Models\Exam;
use App\Models\StudyMaterial;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

function material(array $overrides = []): StudyMaterial
{
    $exam = Exam::firstOrCreate(['name' => 'HP TET'], ['is_active' => true]);

    return StudyMaterial::create(['exam_id' => $exam->id, 'title' => 'GK notes', 'external_url' => 'https://example.com/notes', 'is_published' => true, ...$overrides]);
}

function uploaded(string $name, array $overrides = []): StudyMaterial
{
    Storage::disk('local')->put("materials/{$name}", 'file body');

    return material(['external_url' => null, 'file_path' => "materials/{$name}", 'file_name' => $name, ...$overrides]);
}

beforeEach(fn () => Storage::fake('local'));

test('free material opens in the in-app reader with the right viewer', function (callable $make, string $viewer) {
    $material = $make();
    $this->actingAs(User::factory()->create());

    $this->get("/student/study-material/{$material->id}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('student/material-reader')
        ->where('material.title', $material->title)
        ->where('material.viewer', $viewer)
        ->where('material.saved', false));
})->with([
    'pdf' => [fn () => uploaded('notes.pdf'), 'pdf'],
    'image' => [fn () => uploaded('map.PNG'), 'image'],
    'office file' => [fn () => uploaded('slides.pptx'), 'download'],
    'web page' => [fn () => material(), 'link'],
    'youtube' => [fn () => material(['external_url' => 'https://youtu.be/dQw4w9WgXcQ']), 'video'],
]);

test('youtube links are embedded without tracking cookies', function () {
    $material = material(['external_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10']);
    $this->actingAs(User::factory()->create());

    $this->get("/student/study-material/{$material->id}")
        ->assertInertia(fn ($page) => $page->where('material.embed_url', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
});

test('the file is served inline for the reader and as an attachment for download', function () {
    $material = uploaded('notes.pdf');
    $this->actingAs(User::factory()->create());

    $inline = $this->get("/student/study-material/{$material->id}/file")->assertOk();
    expect($inline->headers->get('Content-Disposition'))->toStartWith('inline')
        ->and($inline->headers->get('X-Content-Type-Options'))->toBe('nosniff');

    $this->get("/student/study-material/{$material->id}/file?download=1")->assertDownload('notes.pdf');
});

test('links open the outside page', function () {
    $material = material();
    $this->actingAs(User::factory()->create());

    $this->get("/student/study-material/{$material->id}/file")->assertRedirect('https://example.com/notes');
});

test('paid, draft and inactive-exam material cannot be read', function () {
    $paid = material(['is_free' => false, 'price' => 49]);
    $draft = material(['is_published' => false]);
    $hidden = StudyMaterial::create([
        'exam_id' => Exam::create(['name' => 'Old', 'is_active' => false])->id, 'title' => 'Old notes', 'external_url' => 'https://example.com', 'is_published' => true,
    ]);
    $this->actingAs(User::factory()->create());

    foreach ([$paid, $draft, $hidden] as $material) {
        $this->get("/student/study-material/{$material->id}")->assertNotFound();
        $this->get("/student/study-material/{$material->id}/file")->assertNotFound();
    }
});

test('students save material to My Library and remove it', function () {
    $first = material(['title' => 'Polity notes']);
    $second = uploaded('history.pdf', ['title' => 'History PDF']);
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/study-material/{$first->id}/save")->assertRedirect();
    $this->travel(1)->minutes();
    $this->post("/student/study-material/{$second->id}/save");
    // Saving twice keeps one copy.
    $this->post("/student/study-material/{$second->id}/save");

    expect($student->savedMaterials()->count())->toBe(2);

    $this->get('/student/library')->assertInertia(fn ($page) => $page
        ->component('student/library')
        ->has('materials', 2)
        ->where('materials.0.title', 'History PDF')
        ->where('materials.0.format', 'PDF')
        ->where('materials.1.title', 'Polity notes')
        ->where('materials.1.saved', true));

    $this->get('/student/study-material')->assertInertia(fn ($page) => $page->where('materials.0.saved', true));
    $this->get("/student/study-material/{$first->id}")->assertInertia(fn ($page) => $page->where('material.saved', true));

    $this->delete("/student/study-material/{$first->id}/save")->assertRedirect();
    $this->get('/student/library')->assertInertia(fn ($page) => $page->has('materials', 1)->where('materials.0.title', 'History PDF'));
});

test('paid material can be saved but not read', function () {
    $paid = material(['is_free' => false, 'price' => 49]);
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/study-material/{$paid->id}/save");

    $this->get('/student/library')->assertInertia(fn ($page) => $page->where('materials.0.is_free', false));
});

test('drafts cannot be saved and unpublished material drops out of the library', function () {
    $draft = material(['is_published' => false]);
    $material = material();
    $this->actingAs($student = User::factory()->create());

    $this->post("/student/study-material/{$draft->id}/save")->assertNotFound();
    $this->post("/student/study-material/{$material->id}/save");

    $material->update(['is_published' => false]);
    $this->get('/student/library')->assertInertia(fn ($page) => $page->has('materials', 0));

    $material->update(['is_published' => true]);
    $this->get('/student/library')->assertInertia(fn ($page) => $page->has('materials', 1));
});

test('saved items belong to each student and go when the material is deleted', function () {
    $material = material();
    $owner = User::factory()->create();
    $this->actingAs($owner)->post("/student/study-material/{$material->id}/save");

    $this->actingAs(User::factory()->create())->get('/student/library')->assertInertia(fn ($page) => $page->has('materials', 0));

    $material->delete();
    expect($owner->savedMaterials()->count())->toBe(0);
});

test('admins cannot use the student reader', function () {
    $material = material();

    $this->actingAs(User::factory()->superAdmin()->create())->get("/student/study-material/{$material->id}")->assertForbidden();
});
