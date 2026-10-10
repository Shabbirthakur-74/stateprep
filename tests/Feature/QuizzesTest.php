<?php

use App\Models\Exam;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Subject;
use App\Models\User;

/** A subject with two topics of $perTopic questions each. */
function topicBank(string $name = 'HP GK', int $perTopic = 5): Subject
{
    $subject = Subject::create(['name' => $name]);
    foreach (['Districts', 'Rivers'] as $topicName) {
        $topic = $subject->topics()->create(['name' => $topicName]);
        foreach (range(1, $perTopic) as $i) {
            Question::create([
                'subject_id' => $subject->id, 'topic_id' => $topic->id, 'text' => "{$name} {$topicName} Q{$i}",
                'option_a' => "a{$i}", 'option_b' => "b{$i}", 'option_c' => "c{$i}", 'option_d' => "d{$i}", 'correct_option' => 'A', 'difficulty' => 'easy',
            ]);
        }
    }

    return $subject;
}

describe('admin', function () {
    beforeEach(fn () => $this->actingAs(User::factory()->superAdmin()->create()));

    test('quiz screens open', function (string $url) {
        $this->get($url)->assertOk();
    })->with(['/admin/quizzes', '/admin/quizzes/create', '/admin/quizzes?exam=general']);

    test('a general quiz is always free and opens its questions screen when created', function () {
        $this->post('/admin/quizzes', ['title' => 'GK Warm-up', 'is_free' => false, 'is_published' => true])
            ->assertRedirect('/admin/sets/quiz/'.Quiz::first()->id);

        expect(Quiz::first()->is_free)->toBeTrue()->and(Quiz::first()->isGeneral())->toBeTrue();
    });

    test('a bundle quiz can be a free sample', function () {
        $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);

        $this->post('/admin/quizzes', ['exam_id' => $exam->id, 'title' => 'TET Sample', 'is_free' => true, 'is_published' => true]);
        $this->post('/admin/quizzes', ['exam_id' => $exam->id, 'title' => 'TET Quiz 1', 'is_published' => true]);

        expect(Quiz::where('title', 'TET Sample')->first()->is_free)->toBeTrue()
            ->and(Quiz::where('title', 'TET Quiz 1')->first()->is_free)->toBeFalse();
    });

    test('one quiz per topic is generated as drafts, without overlap', function () {
        $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
        $gk = topicBank();
        $exam->subjects()->attach($gk);

        $this->post('/admin/quizzes/generate', ['exam_id' => $exam->id, 'mode' => 'per_topic', 'subject_ids' => [$gk->id], 'per_quiz' => 3])
            ->assertSessionHas('status', '2 draft quizzes created. Review them, then publish.');

        $quizzes = Quiz::orderBy('id')->get();
        expect($quizzes->pluck('title')->all())->toBe(['HP GK • Districts', 'HP GK • Rivers'])
            ->and($quizzes->every(fn ($q) => ! $q->is_published && ! $q->is_free && $q->exam_id === $exam->id))->toBeTrue()
            ->and($quizzes[0]->questions()->count())->toBe(3);
    });

    test('a numbered set splits questions across subjects and stops when unused questions run out', function () {
        $gk = topicBank('HP GK', 5);
        $polity = topicBank('Polity', 5);

        $this->post('/admin/quizzes/generate', ['mode' => 'numbered', 'subject_ids' => [$gk->id, $polity->id], 'per_quiz' => 8, 'quizzes' => 4, 'prefix' => 'Practice Quiz'])
            ->assertSessionHasNoErrors();

        // 20 questions in all: 2 full quizzes of 8, a third with the last 4, and no fourth.
        $quizzes = Quiz::orderBy('id')->withCount('questions')->get();
        expect($quizzes->pluck('title')->all())->toBe(['Practice Quiz 1', 'Practice Quiz 2', 'Practice Quiz 3'])
            ->and($quizzes->pluck('questions_count')->all())->toBe([8, 8, 4])
            ->and(Quiz::first()->questions()->where('subject_id', $gk->id)->count())->toBe(4);

        $all = $quizzes->flatMap(fn ($q) => $q->questions()->pluck('questions.id'));
        expect($all->count())->toBe($all->unique()->count());
    });

    test('quizzes are published together', function () {
        $a = Quiz::create(['title' => 'A']);
        $b = Quiz::create(['title' => 'B']);

        $this->post('/admin/quizzes/publish', ['ids' => [$a->id, $b->id], 'publish' => true]);

        expect($a->fresh()->is_published && $b->fresh()->is_published)->toBeTrue();
    });

    test('the exam content screen lists everything in the bundle', function () {
        $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
        Quiz::create(['exam_id' => $exam->id, 'title' => 'TET Quiz']);
        $exam->mockTests()->create(['title' => 'TET PYQ 2023', 'type' => 'pyq', 'year' => 2023, 'duration_minutes' => 30]);

        $this->get("/admin/exams/{$exam->id}/content")->assertOk()->assertInertia(fn ($page) => $page
            ->component('admin/exams/content')
            ->where('tabs.quizzes.0.title', 'TET Quiz')
            ->where('tabs.pyqs.0.title', 'TET PYQ 2023')
            ->has('tabs.mocks', 0));

        $this->get("/admin/mock-tests/create?exam={$exam->id}&type=pyq")
            ->assertInertia(fn ($page) => $page->where('defaults', ['exam_id' => $exam->id, 'type' => 'pyq']));
    });
});

describe('students', function () {
    beforeEach(function () {
        $this->gk = topicBank();
        $this->exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
        $this->actingAs($this->student = User::factory()->create());
    });

    function readyQuiz(array $attributes, array $questionIds): Quiz
    {
        $quiz = Quiz::create(['is_published' => true, ...$attributes]);
        $quiz->questions()->attach(collect($questionIds)->values()->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all());

        return $quiz;
    }

    test('general quizzes are listed and played with all their questions, and can be played again', function () {
        $quiz = readyQuiz(['title' => 'GK Warm-up', 'subject_id' => $this->gk->id], Question::limit(4)->pluck('id')->all());
        readyQuiz(['title' => 'Draft', 'is_published' => false], Question::limit(2)->pluck('id')->all());
        readyQuiz(['title' => 'TET Bundle Quiz', 'exam_id' => $this->exam->id], Question::limit(2)->pluck('id')->all());

        $this->get('/student/quizzes')->assertInertia(fn ($page) => $page->has('ready', 1)->where('ready.0.title', 'GK Warm-up'));

        $this->post("/student/quizzes/ready/{$quiz->id}")->assertRedirect();
        $attempt = QuizAttempt::first();
        expect($attempt->mode)->toBe('set')
            ->and($attempt->quiz_id)->toBe($quiz->id)
            ->and($attempt->answers()->pluck('question_id')->sort()->values()->all())->toBe($quiz->questions()->pluck('questions.id')->sort()->values()->all());

        $this->get("/student/quizzes/{$attempt->id}")->assertInertia(fn ($page) => $page->where('attempt.quiz_id', $quiz->id));
    });

    test('bundle quizzes show on the exam page; free samples play, the rest stay locked', function () {
        $sample = readyQuiz(['title' => 'TET Sample', 'exam_id' => $this->exam->id, 'is_free' => true], Question::limit(3)->pluck('id')->all());
        $locked = readyQuiz(['title' => 'TET Quiz 1', 'exam_id' => $this->exam->id, 'is_free' => false], Question::limit(3)->pluck('id')->all());

        $this->get("/exams/{$this->exam->slug}")->assertInertia(fn ($page) => $page
            ->where('counts.quizzes', 2)
            ->where('inside.quizzes.0.title', 'TET Sample')
            ->where('inside.quizzes.0.id', $sample->id));

        $this->post("/student/quizzes/ready/{$sample->id}")->assertRedirect();
        $this->post("/student/quizzes/ready/{$locked->id}")->assertSessionHasErrors('quiz');
        expect(QuizAttempt::count())->toBe(1);
    });

    test('topic quizzes give unseen questions first, then the ones answered wrong', function () {
        $topic = $this->gk->topics()->first();
        $start = fn () => $this->post('/student/quizzes', ['mode' => 'topic', 'subject_id' => $this->gk->id, 'topic_id' => $topic->id, 'length' => 10]);
        $ids = fn () => QuizAttempt::latest('id')->first()->answers()->pluck('question_id')->all();

        // The topic has 5 questions, so the first quiz uses all of them; answer two wrong.
        $start();
        $first = QuizAttempt::latest('id')->first();
        foreach ($first->answers()->orderBy('position')->get() as $i => $answer) {
            $answer->update(['selected_option' => $i < 2 ? 'B' : 'A', 'is_correct' => $i >= 2]);
        }
        $wrong = $first->answers()->where('is_correct', false)->pluck('question_id')->all();
        $first->forceFill(['submitted_at' => now()])->save();

        // Five more questions arrive in the topic: the next quiz gives those five first, then the two answered wrong.
        foreach (range(6, 10) as $i) {
            Question::create(['subject_id' => $this->gk->id, 'topic_id' => $topic->id, 'text' => "New Q{$i}", 'option_a' => 'a', 'option_b' => 'b', 'option_c' => 'c', 'option_d' => "d{$i}", 'correct_option' => 'A', 'difficulty' => 'easy']);
        }
        $this->travel(1)->minutes();
        $this->post('/student/quizzes', ['mode' => 'topic', 'subject_id' => $this->gk->id, 'topic_id' => $topic->id, 'length' => 10]);
        $second = QuizAttempt::latest('id')->first()->answers()->orderBy('position')->pluck('question_id')->all();

        $new = Question::where('text', 'like', 'New Q%')->pluck('id')->all();
        expect(array_slice($second, 0, 5))->each->toBeIn($new)
            ->and(array_slice($second, 5, 2))->each->toBeIn($wrong);
    });

    test('the quizzes screen shows how many questions of each topic were seen', function () {
        $this->post('/student/quizzes', ['mode' => 'topic', 'subject_id' => $this->gk->id, 'topic_id' => $this->gk->topics()->first()->id, 'length' => 10]);

        $this->get('/student/quizzes')->assertInertia(fn ($page) => $page
            ->where('subjects.0.seen', 5)
            ->where('subjects.0.topics.0.seen', 5)
            ->where('subjects.0.topics.1.seen', 0));
    });
});
