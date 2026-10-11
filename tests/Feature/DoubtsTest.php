<?php

use App\Enums\Permission;
use App\Models\Doubt;
use App\Models\Question;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/** A real 1x1 PNG (the GD extension is not available for fake images). */
function doubtPhoto(): UploadedFile
{
    return UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='));
}

beforeEach(function () {
    Storage::fake('local');
    $this->subject = Subject::create(['name' => 'HP GK']);
    $this->topic = $this->subject->topics()->create(['name' => 'Districts']);
    $this->student = User::factory()->create();
});

function ask(array $fields = [])
{
    return test()->actingAs(test()->student)->post('/student/doubts', [
        'subject_id' => test()->subject->id, 'topic_id' => test()->topic->id, 'body' => 'Why is Kangra the most populous district?', ...$fields,
    ]);
}

test('the doubts page opens with the ask form and the student\'s doubts', function () {
    $this->actingAs($this->student)->get('/student/doubts')->assertOk()->assertInertia(fn ($page) => $page
        ->component('student/doubts/index')
        ->has('doubts', 0)
        ->where('subjects', []));
});

test('a student asks a doubt with a photo, and it waits in the admin inbox', function () {
    ask(['photo' => doubtPhoto()])->assertSessionHasNoErrors();

    $doubt = Doubt::first();
    expect($doubt->status)->toBe('open')->and($doubt->topic_id)->toBe($this->topic->id);
    Storage::disk('local')->assertExists($doubt->image_path);

    $this->get("/student/doubts/{$doubt->id}")->assertInertia(fn ($page) => $page
        ->component('student/doubts/show')
        ->where('doubt.photo_url', route('doubts.image', $doubt)));
    $this->get("/doubts/{$doubt->id}/image")->assertOk();

    $this->actingAs(User::factory()->superAdmin()->create())->get('/admin/doubts')->assertInertia(fn ($page) => $page
        ->component('admin/doubts/index')
        ->where('doubts.data.0.id', $doubt->id)
        ->where('counts.open', 1));
});

test('too short doubts are refused', function () {
    ask(['body' => 'help'])->assertSessionHasErrors('body');
});

test('a question from the student\'s own quiz can be attached; an unseen one cannot', function () {
    $seen = Question::create(['subject_id' => $this->subject->id, 'topic_id' => $this->topic->id, 'text' => 'Largest district?', 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A', 'difficulty' => 'easy']);
    $unseen = Question::create(['subject_id' => $this->subject->id, 'text' => 'Secret?', 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'B', 'difficulty' => 'easy']);
    $attempt = $this->student->quizAttempts()->create(['mode' => 'random', 'title' => 'Random', 'total_questions' => 1]);
    $attempt->answers()->create(['question_id' => $seen->id, 'position' => 1]);

    $this->actingAs($this->student)->get("/student/doubts?question={$seen->id}")->assertInertia(fn ($page) => $page->where('attach.id', $seen->id));
    $this->get("/student/doubts?question={$unseen->id}")->assertInertia(fn ($page) => $page->where('attach', null));

    // The subject and topic come from the question.
    ask(['subject_id' => null, 'topic_id' => null, 'question_id' => $seen->id])->assertSessionHasNoErrors();
    expect(Doubt::first()->only('question_id', 'subject_id', 'topic_id'))->toBe(['question_id' => $seen->id, 'subject_id' => $this->subject->id, 'topic_id' => $this->topic->id]);

    ask(['question_id' => $unseen->id])->assertSessionHasErrors('question_id');
});

test('a team answer marks it answered and unread until the student opens it; follow-ups reopen it', function () {
    ask();
    $doubt = Doubt::first();
    $this->travel(1)->minutes();

    $this->actingAs(User::factory()->staff([Permission::Doubts])->create())
        ->post("/admin/doubts/{$doubt->id}/reply", ['body' => 'Because of its large area and fertile valleys.'])->assertSessionHasNoErrors();
    expect($doubt->fresh()->status)->toBe('answered');

    $this->actingAs($this->student)->get('/student/doubts')->assertInertia(fn ($page) => $page->where('doubtsUnread', 1)->where('doubts.0.unread', true));
    $this->get("/student/doubts/{$doubt->id}")->assertInertia(fn ($page) => $page->where('doubt.replies.0.from_team', true));
    $this->get('/student/doubts')->assertInertia(fn ($page) => $page->where('doubtsUnread', 0));

    $this->post("/student/doubts/{$doubt->id}/reply", ['body' => 'Thanks, and what about Shimla?']);
    expect($doubt->fresh()->status)->toBe('open');

    $this->post("/student/doubts/{$doubt->id}/resolve");
    expect($doubt->fresh()->status)->toBe('closed');
});

test('admins close and reopen doubts, and the open tab lists the longest waiting first', function () {
    ask(['body' => 'First doubt, asked earlier.']);
    $this->travel(5)->minutes();
    ask(['body' => 'Second doubt, asked later.']);
    $this->actingAs(User::factory()->superAdmin()->create());

    $this->get('/admin/doubts')->assertInertia(fn ($page) => $page->where('doubts.data.0.preview', 'First doubt, asked earlier.'));

    $first = Doubt::first();
    $this->post("/admin/doubts/{$first->id}/status", ['status' => 'closed']);
    expect($first->fresh()->status)->toBe('closed');
    $this->get('/admin/doubts?status=closed')->assertInertia(fn ($page) => $page->has('doubts.data', 1));

    $this->post("/admin/doubts/{$first->id}/status", ['status' => 'open']);
    expect($first->fresh()->status)->toBe('open');
});

test('doubts and their photos stay private', function () {
    ask(['photo' => doubtPhoto()]);
    $doubt = Doubt::first();

    $other = User::factory()->create();
    $this->actingAs($other)->get("/student/doubts/{$doubt->id}")->assertNotFound();
    $this->get("/doubts/{$doubt->id}/image")->assertNotFound();
    $this->post("/student/doubts/{$doubt->id}/reply", ['body' => 'Not mine'])->assertNotFound();

    $staff = User::factory()->staff([Permission::Questions])->create();
    $this->actingAs($staff)->get('/admin/doubts')->assertForbidden();
    $this->get("/doubts/{$doubt->id}/image")->assertNotFound();

    $this->actingAs(User::factory()->staff([Permission::Doubts])->create())->get("/doubts/{$doubt->id}/image")->assertOk();
});
