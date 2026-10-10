<?php

namespace App\Services;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Starting, answering and finishing quizzes. A topic quiz only uses that topic's questions, a mixed quiz
 * uses every topic of one subject, and a random quiz draws from the whole bank. Questions the student has never
 * been given come first, then ones they got wrong, then the ones they saw longest ago, so repeats only start once
 * the pool is used up. A ready-made quiz from admin plays its own questions in a fresh order every time.
 */
class QuizService
{
    /** Question counts a student can pick. */
    public const LENGTHS = [10, 20, 30];

    public function start(User $user, string $mode, ?Subject $subject, ?Topic $topic, int $length): QuizAttempt
    {
        $questions = match ($mode) {
            QuizAttempt::TOPIC => Question::where('topic_id', $topic->id),
            QuizAttempt::MIXED => Question::where('subject_id', $subject->id),
            default => Question::query(),
        };

        $ids = $questions
            ->leftJoinSub(self::seenBy($user), 'seen', 'seen.question_id', '=', 'questions.id')
            ->orderByRaw('CASE WHEN seen.question_id IS NULL THEN 0 WHEN seen.wrong = 1 THEN 1 ELSE 2 END')
            ->orderBy('seen.last_seen')
            ->inRandomOrder()
            ->limit($length)
            ->pluck('questions.id');

        if ($ids->isEmpty()) {
            throw ValidationException::withMessages(['quiz' => 'There are no questions for this quiz yet.']);
        }

        $title = match ($mode) {
            QuizAttempt::TOPIC => "{$subject->name} • {$topic->name}",
            QuizAttempt::MIXED => "{$subject->name} • Mixed",
            default => 'Random Quiz • All Subjects',
        };

        return DB::transaction(function () use ($user, $mode, $subject, $topic, $title, $ids) {
            $attempt = $user->quizAttempts()->create([
                'mode' => $mode,
                'subject_id' => $subject?->id,
                'topic_id' => $topic?->id,
                'title' => $title,
                'total_questions' => $ids->count(),
            ]);

            $attempt->answers()->createMany($ids->values()->map(fn ($id, $i) => ['question_id' => $id, 'position' => $i + 1])->all());

            return $attempt;
        });
    }

    /**
     * Starts a ready-made quiz: all of its questions, shuffled.
     */
    public function startReady(User $user, Quiz $quiz): QuizAttempt
    {
        $ids = $quiz->questions()->pluck('questions.id')->shuffle();

        if ($ids->isEmpty()) {
            throw ValidationException::withMessages(['quiz' => 'This quiz has no questions yet.']);
        }

        return DB::transaction(function () use ($user, $quiz, $ids) {
            $attempt = $user->quizAttempts()->create([
                'mode' => QuizAttempt::SET,
                'quiz_id' => $quiz->id,
                'subject_id' => $quiz->subject_id,
                'topic_id' => $quiz->topic_id,
                'title' => $quiz->title,
                'total_questions' => $ids->count(),
            ]);

            $attempt->answers()->createMany($ids->values()->map(fn ($id, $i) => ['question_id' => $id, 'position' => $i + 1])->all());

            return $attempt;
        });
    }

    /**
     * Every question the student has been given in a quiz: when they last saw it, and whether they ever got it wrong.
     */
    public static function seenBy(User $user)
    {
        return DB::table('quiz_attempt_answers')
            ->join('quiz_attempts', 'quiz_attempts.id', '=', 'quiz_attempt_answers.quiz_attempt_id')
            ->where('quiz_attempts.user_id', $user->id)
            ->groupBy('quiz_attempt_answers.question_id')
            ->selectRaw('quiz_attempt_answers.question_id, MAX(quiz_attempts.created_at) as last_seen, MAX(CASE WHEN quiz_attempt_answers.is_correct = 0 THEN 1 ELSE 0 END) as wrong');
    }

    /**
     * Records the student's choice for one question. An answer cannot be changed once given.
     */
    public function answer(QuizAttempt $attempt, int $questionId, string $option): void
    {
        $answer = $attempt->answers()->where('question_id', $questionId)->with('question:id,correct_option')->firstOrFail();

        if ($attempt->isSubmitted() || $answer->selected_option !== null) {
            return;
        }

        $answer->update(['selected_option' => $option, 'is_correct' => $option === $answer->question->correct_option]);
    }

    /**
     * Closes the quiz and stores the score. Unanswered questions count as neither right nor wrong.
     */
    public function finish(QuizAttempt $attempt): QuizAttempt
    {
        if ($attempt->isSubmitted()) {
            return $attempt;
        }

        $attempt->forceFill([
            'correct_count' => $attempt->answers()->where('is_correct', true)->count(),
            'wrong_count' => $attempt->answers()->where('is_correct', false)->count(),
            'submitted_at' => now(),
        ])->save();

        return $attempt;
    }
}
