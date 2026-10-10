<?php

namespace App\Services;

use App\Models\QuizAttempt;
use App\Models\TestAttempt;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * A student's progress, worked out from their finished quizzes, mock tests and previous year papers.
 */
class StudentStats
{
    public function __construct(private User $user) {}

    /**
     * @return array{quizzes: int, tests: int, answered: int, correct: int, accuracy: float|null, average_percent: float|null, seconds: int, streak: int}
     */
    public function overview(): array
    {
        $quizzes = $this->user->quizAttempts()->submitted()->get();
        $tests = $this->user->testAttempts()->submitted()->get();
        $all = $quizzes->concat($tests);
        $answered = $this->answers()->count();
        $correct = $this->answers()->where('ans.is_correct', true)->count();

        return [
            'quizzes' => $quizzes->count(),
            'tests' => $tests->count(),
            'answered' => $answered,
            'correct' => $correct,
            'accuracy' => $answered > 0 ? round($correct * 100 / $answered, 1) : null,
            'average_percent' => $all->isNotEmpty() ? round($all->avg(fn ($a) => $a->percent()), 1) : null,
            'seconds' => (int) $all->sum(fn ($a) => $a->durationSeconds()),
            'streak' => $this->streak($all->pluck('submitted_at')),
        ];
    }

    /**
     * Finished quizzes and tests together, newest first.
     *
     * @return list<array<string, mixed>>
     */
    public function attempts(?int $limit = null): array
    {
        $quizzes = $this->user->quizAttempts()->submitted()->latest('submitted_at')->when($limit, fn ($q) => $q->limit($limit))->get()->map(fn ($a) => self::summary($a));
        $tests = $this->user->testAttempts()->submitted()->latest('submitted_at')->when($limit, fn ($q) => $q->limit($limit))->get()->map(fn ($a) => self::testSummary($a));

        return $quizzes->concat($tests)->sortByDesc('submitted_at')->when($limit, fn ($c) => $c->take($limit))->values()->all();
    }

    /**
     * Quizzes and tests started but not finished. Tests whose time ran out are scored first.
     *
     * @return list<array<string, mixed>>
     */
    public function inProgress(): array
    {
        $service = app(TestService::class);
        $this->user->testAttempts()->whereNull('submitted_at')->where('ends_at', '<=', now())->get()->each(fn ($a) => $service->finalize($a));

        $quizzes = $this->user->quizAttempts()->whereNull('submitted_at')->latest()
            ->withCount(['answers as answered_count' => fn ($q) => $q->whereNotNull('selected_option')])
            ->get()
            ->map(fn (QuizAttempt $a) => ['id' => $a->id, 'kind' => 'quiz', 'title' => $a->title, 'answered' => $a->answered_count, 'total' => $a->total_questions, 'ends_at' => null, 'url' => route('student.quizzes.show', $a)]);

        $tests = $this->user->testAttempts()->whereNull('submitted_at')->latest()
            ->withCount(['answers as answered_count' => fn ($q) => $q->whereNotNull('selected_option')])
            ->get()
            ->map(fn (TestAttempt $a) => ['id' => $a->id, 'kind' => $a->type, 'title' => $a->title, 'answered' => $a->answered_count, 'total' => $a->total_questions, 'ends_at' => $a->ends_at, 'url' => route('student.tests.show', $a)]);

        return $tests->concat($quizzes)->values()->all();
    }

    /**
     * Answered and correct counts per subject.
     *
     * @return array<int, array{answered: int, correct: int}>
     */
    public function bySubject(): array
    {
        return $this->answers()
            ->selectRaw('questions.subject_id as subject_id, COUNT(*) as answered, SUM(CASE WHEN ans.is_correct = 1 THEN 1 ELSE 0 END) as correct')
            ->groupBy('questions.subject_id')
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->subject_id => ['answered' => (int) $row->answered, 'correct' => (int) $row->correct]])
            ->all();
    }

    /**
     * Accuracy per difficulty level.
     *
     * @return array<string, float|null>
     */
    public function byDifficulty(): array
    {
        $rows = $this->answers()
            ->selectRaw('questions.difficulty as difficulty, COUNT(*) as answered, SUM(CASE WHEN ans.is_correct = 1 THEN 1 ELSE 0 END) as correct')
            ->groupBy('questions.difficulty')
            ->get()
            ->keyBy('difficulty');

        return collect(['easy', 'medium', 'hard'])
            ->mapWithKeys(fn ($level) => [$level => isset($rows[$level]) && $rows[$level]->answered > 0 ? round($rows[$level]->correct * 100 / $rows[$level]->answered, 1) : null])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(QuizAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'kind' => 'quiz',
            'title' => $attempt->title,
            'mode' => $attempt->mode,
            'correct' => $attempt->correct_count,
            'wrong' => $attempt->wrong_count,
            'total' => $attempt->total_questions,
            'percent' => $attempt->percent(),
            'score' => null,
            'max_score' => null,
            'seconds' => $attempt->durationSeconds(),
            'submitted_at' => $attempt->submitted_at,
            'url' => route('student.quizzes.show', $attempt),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function testSummary(TestAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'kind' => $attempt->type,
            'title' => $attempt->title,
            'mode' => null,
            'correct' => $attempt->correct_count,
            'wrong' => $attempt->wrong_count,
            'total' => $attempt->total_questions,
            'percent' => $attempt->percent(),
            'score' => $attempt->score,
            'max_score' => $attempt->max_score,
            'seconds' => $attempt->durationSeconds(),
            'submitted_at' => $attempt->submitted_at,
            'url' => route('student.tests.show', $attempt),
        ];
    }

    /**
     * Answers given in finished quizzes and tests, joined to their questions (alias "ans").
     */
    private function answers()
    {
        $quiz = DB::table('quiz_attempt_answers as a')
            ->join('quiz_attempts as t', 't.id', '=', 'a.quiz_attempt_id')
            ->where('t.user_id', $this->user->id)->whereNotNull('t.submitted_at')->whereNotNull('a.selected_option')
            ->select('a.question_id', 'a.is_correct');

        $test = DB::table('test_attempt_answers as a')
            ->join('test_attempts as t', 't.id', '=', 'a.test_attempt_id')
            ->where('t.user_id', $this->user->id)->whereNotNull('t.submitted_at')->whereNotNull('a.selected_option')
            ->select('a.question_id', 'a.is_correct');

        return DB::query()->fromSub($quiz->unionAll($test), 'ans')->join('questions', 'questions.id', '=', 'ans.question_id');
    }

    /**
     * Days in a row, ending today or yesterday, with at least one finished quiz or test.
     *
     * @param  Collection<int, Carbon>  $dates
     */
    private function streak(Collection $dates): int
    {
        $days = $dates->map(fn (Carbon $d) => $d->toDateString())->unique()->flip();
        $day = $days->has(today()->toDateString()) ? today() : today()->subDay();
        $streak = 0;

        while ($days->has($day->toDateString())) {
            $streak++;
            $day = $day->copy()->subDay();
        }

        return $streak;
    }
}
