<?php

use App\Enums\Permission;
use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;

/** $count questions in a subject (and topic), with distinct texts. */
function bankQuestions(Subject $subject, int $count, ?Topic $topic = null, string $difficulty = 'easy'): array
{
    return collect(range(1, $count))->map(fn ($i) => Question::create([
        'subject_id' => $subject->id, 'topic_id' => $topic?->id, 'text' => "{$subject->name} {$topic?->name} {$difficulty} question {$i}",
        'option_a' => "a{$i}", 'option_b' => "b{$i}", 'option_c' => "c{$i}", 'option_d' => "d{$i}", 'correct_option' => 'A', 'difficulty' => $difficulty,
    ])->id)->all();
}

beforeEach(function () {
    $this->actingAs(User::factory()->superAdmin()->create());
    $this->maths = Subject::create(['name' => 'Maths']);
    $this->gk = Subject::create(['name' => 'HP GK']);
    $this->districts = $this->gk->topics()->create(['name' => 'Districts']);
    $this->exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $this->exam->subjects()->attach([$this->maths->id, $this->gk->id]);
    $this->mathsIds = bankQuestions($this->maths, 10);
    $this->districtIds = bankQuestions($this->gk, 6, $this->districts);
    $this->mock = MockTest::create(['exam_id' => $this->exam->id, 'title' => 'Mock 1', 'duration_minutes' => 30]);
});

function draw(MockTest|Quiz $set, array $rows, bool $topUp = false)
{
    $type = $set instanceof Quiz ? 'quiz' : 'mock-test';

    return test()->post("/admin/sets/{$type}/{$set->id}/draw", ['rows' => $rows, 'top_up' => $topUp]);
}

test('questions are drawn per subject and topic, in row order', function () {
    draw($this->mock, [
        ['subject_id' => $this->maths->id, 'count' => 4],
        ['subject_id' => $this->gk->id, 'topic_id' => $this->districts->id, 'count' => 3],
    ])->assertSessionHasNoErrors()->assertSessionHas('status', '7 questions added.');

    $ids = $this->mock->questions()->pluck('questions.id')->all();
    expect($ids)->toHaveCount(7)
        ->and(array_slice($ids, 0, 4))->each->toBeIn($this->mathsIds)
        ->and(array_slice($ids, 4))->each->toBeIn($this->districtIds);
});

test('a second mock of the same exam only gets questions not used yet, and says when it runs short', function () {
    draw($this->mock, [['subject_id' => $this->maths->id, 'count' => 7]]);
    $second = MockTest::create(['exam_id' => $this->exam->id, 'title' => 'Mock 2', 'duration_minutes' => 30]);

    draw($second, [['subject_id' => $this->maths->id, 'count' => 5]])
        ->assertSessionHas('import_errors', ['Maths: only 3 of 5 added (no more unused questions)']);

    expect(array_intersect($second->questions()->pluck('questions.id')->all(), $this->mock->questions()->pluck('questions.id')->all()))->toBeEmpty()
        ->and($second->questions()->count())->toBe(3);
});

test('top up fills a short row with questions already used in the bundle', function () {
    draw($this->mock, [['subject_id' => $this->maths->id, 'count' => 8]]);
    $quiz = Quiz::create(['exam_id' => $this->exam->id, 'title' => 'TET Quiz']);

    draw($quiz, [['subject_id' => $this->maths->id, 'count' => 5]], topUp: true)
        ->assertSessionHas('import_errors', ['Maths: 2 unused, topped up with 3 already used elsewhere']);

    expect($quiz->questions()->count())->toBe(5);
});

test('another exam and general quizzes can reuse the same questions', function () {
    draw($this->mock, [['subject_id' => $this->maths->id, 'count' => 10]]);

    $other = MockTest::create(['exam_id' => Exam::create(['name' => 'HPAS', 'is_active' => true])->id, 'title' => 'HPAS Mock', 'duration_minutes' => 30]);
    draw($other, [['subject_id' => $this->maths->id, 'count' => 10]]);
    $general = Quiz::create(['title' => 'Maths practice']);
    draw($general, [['subject_id' => $this->maths->id, 'count' => 10]]);

    expect($other->questions()->count())->toBe(10)->and($general->questions()->count())->toBe(10);

    // But two general quizzes don't overlap.
    $second = Quiz::create(['title' => 'Maths practice 2']);
    draw($second, [['subject_id' => $this->maths->id, 'count' => 10]]);
    expect($second->questions()->count())->toBe(0);
});

test('a topic from another subject is refused', function () {
    draw($this->mock, [['subject_id' => $this->maths->id, 'topic_id' => $this->districts->id, 'count' => 2]])
        ->assertSessionHasErrors('rows.0.topic_id');
});

test('swap replaces one question with an unused one from the same topic, in the same place', function () {
    draw($this->mock, [['subject_id' => $this->gk->id, 'topic_id' => $this->districts->id, 'count' => 3]]);
    $before = $this->mock->questions()->pluck('questions.id')->all();

    $this->post("/admin/sets/mock-test/{$this->mock->id}/{$before[1]}/swap")->assertSessionHasNoErrors();

    $after = $this->mock->fresh()->questions()->pluck('questions.id')->all();
    expect($after[0])->toBe($before[0])
        ->and($after[2])->toBe($before[2])
        ->and($after[1])->not->toBeIn($before)
        ->and($after[1])->toBeIn($this->districtIds);

    // Once the topic is used up there is nothing left to swap in.
    draw($this->mock, [['subject_id' => $this->gk->id, 'topic_id' => $this->districts->id, 'count' => 10]]);
    $this->post("/admin/sets/mock-test/{$this->mock->id}/{$after[0]}/swap")->assertSessionHasErrors('swap');
});

test('questions are hand-picked, reordered and removed without leaving the bank', function () {
    $this->post("/admin/sets/mock-test/{$this->mock->id}/add", ['ids' => [$this->mathsIds[0], $this->mathsIds[1], $this->mathsIds[0]]])
        ->assertSessionHas('status', '2 questions added.');

    $this->post("/admin/sets/mock-test/{$this->mock->id}/{$this->mathsIds[1]}/move", ['direction' => 'up']);
    expect($this->mock->questions()->pluck('questions.id')->all())->toBe([$this->mathsIds[1], $this->mathsIds[0]]);

    $this->delete("/admin/sets/mock-test/{$this->mock->id}/{$this->mathsIds[1]}");
    expect($this->mock->questions()->pluck('questions.id')->all())->toBe([$this->mathsIds[0]]);

    $this->delete("/admin/sets/mock-test/{$this->mock->id}");
    expect($this->mock->questions()->count())->toBe(0)->and(Question::count())->toBe(16);
});

test('the questions screen shows the set, hides used questions and offers only the exam subjects', function () {
    Subject::create(['name' => 'Unrelated']);
    $this->post("/admin/sets/mock-test/{$this->mock->id}/add", ['ids' => [$this->mathsIds[0], $this->mathsIds[1]]]);
    $quiz = Quiz::create(['exam_id' => $this->exam->id, 'title' => 'TET Quiz']);
    $this->post("/admin/sets/quiz/{$quiz->id}/add", ['ids' => [$this->mathsIds[9]]]);

    $this->get("/admin/sets/mock-test/{$this->mock->id}?subject={$this->maths->id}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('admin/question-sets/show')
        ->where('set.title', 'Mock 1')
        ->where('breakdown', [['subject' => 'Maths', 'count' => 2]])
        ->where('bank.total', 7)
        ->has('subjects', 2));

    $this->get("/admin/sets/mock-test/{$this->mock->id}?subject={$this->maths->id}&show_used=1")
        ->assertInertia(fn ($page) => $page->where('bank.total', 8));
});

test('the questions screen needs the tests section', function () {
    $this->actingAs(User::factory()->staff([Permission::Questions])->create());

    $this->get("/admin/sets/mock-test/{$this->mock->id}")->assertForbidden();
});
