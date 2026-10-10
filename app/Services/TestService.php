<?php

namespace App\Services;

use App\Models\MockTest;
use App\Models\TestAttempt;
use App\Models\TestSeries;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Timed mock tests and previous year papers: starting, saving answers and scoring.
 * Answers can be changed until the attempt is submitted or its time runs out.
 */
class TestService
{
    /**
     * Whether a student may take this test now. Paid content stays locked until payments open.
     */
    public static function canTake(MockTest $test, ?TestSeries $series = null): bool
    {
        if (! $test->is_published || ! $test->exam?->is_active || $test->questions()->doesntExist()) {
            return false;
        }

        if ($series) {
            return $series->is_published && $series->is_free && $series->mockTests()->whereKey($test->id)->exists();
        }

        return $test->is_free;
    }

    /**
     * Resumes the student's unfinished attempt at this test, or starts a new one.
     */
    public function start(User $user, MockTest $test, ?TestSeries $series = null): TestAttempt
    {
        $open = $user->testAttempts()->where('mock_test_id', $test->id)->whereNull('submitted_at')->latest()->first();

        if ($open && ! $open->hasExpired()) {
            return $open;
        }
        if ($open) {
            $this->finalize($open);
        }

        $questionIds = $test->questions()->pluck('questions.id');

        return DB::transaction(function () use ($user, $test, $series, $questionIds) {
            $attempt = $user->testAttempts()->create([
                'mock_test_id' => $test->id,
                'test_series_id' => $series?->id,
                'type' => $test->type,
                'title' => $test->title,
                'ends_at' => now()->addMinutes($test->duration_minutes),
                'total_questions' => $questionIds->count(),
                'marks_per_question' => $test->marks_per_question,
                'negative_marks' => $test->negative_marks,
                'max_score' => $questionIds->count() * $test->marks_per_question,
            ]);

            $attempt->answers()->createMany($questionIds->values()->map(fn ($id, $i) => ['question_id' => $id, 'position' => $i + 1])->all());

            return $attempt;
        });
    }

    /**
     * Saves the choice (or clears it with null) and the review mark for one question.
     * Returns false when the attempt is already closed.
     */
    public function save(TestAttempt $attempt, int $questionId, ?string $option, bool $marked): bool
    {
        if ($attempt->isSubmitted()) {
            return false;
        }
        if ($attempt->hasExpired()) {
            $this->finalize($attempt);

            return false;
        }

        $attempt->answers()->where('question_id', $questionId)->firstOrFail()
            ->update(['selected_option' => $option, 'is_marked' => $marked]);

        return true;
    }

    /**
     * Marks every answer, applies negative marking and closes the attempt.
     */
    public function finalize(TestAttempt $attempt): TestAttempt
    {
        if ($attempt->isSubmitted()) {
            return $attempt;
        }

        return DB::transaction(function () use ($attempt) {
            $correct = 0;
            $wrong = 0;

            foreach ($attempt->answers()->with('question:id,correct_option')->get() as $answer) {
                $isCorrect = $answer->selected_option === null ? null : $answer->selected_option === $answer->question?->correct_option;
                $answer->update(['is_correct' => $isCorrect]);
                $isCorrect === true && $correct++;
                $isCorrect === false && $wrong++;
            }

            $attempt->forceFill([
                'correct_count' => $correct,
                'wrong_count' => $wrong,
                'score' => round($correct * $attempt->marks_per_question - $wrong * $attempt->negative_marks, 2),
                'submitted_at' => min(now(), $attempt->ends_at),
            ])->save();

            return $attempt;
        });
    }
}
