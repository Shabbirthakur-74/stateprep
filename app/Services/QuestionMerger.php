<?php

namespace App\Services;

use App\Models\Question;
use Illuminate\Support\Facades\DB;

/**
 * Finds groups of duplicate questions in the bank and merges them into one. Every mock test, PYQ, quiz and
 * past student answer that used a removed copy is moved to the question that is kept, so results stay intact.
 */
class QuestionMerger
{
    /** Tables that point at questions, with the column that groups their rows (one question per group). */
    private const REFERENCES = [
        'mock_test_question' => 'mock_test_id',
        'quiz_question' => 'quiz_id',
        'test_attempt_answers' => 'test_attempt_id',
        'quiz_attempt_answers' => 'quiz_attempt_id',
    ];

    /**
     * Groups of two or more questions: exact copies (same text and options) first, then the same text with other options.
     *
     * @return list<array{match: string, questions: list<array<string, mixed>>}>
     */
    public static function groups(int $limit = 50): array
    {
        $groups = [];

        foreach (['exact' => 'fingerprint', 'same_text' => 'text_hash'] as $match => $column) {
            $hashes = Question::whereNotNull($column)->groupBy($column)->havingRaw('COUNT(*) > 1')->limit($limit)->pluck($column);

            foreach ($hashes as $hash) {
                $questions = Question::where($column, $hash)->with('subject:id,name', 'topic:id,name')->withCount(['mockTests', 'quizzes'])->orderBy('id')->get();
                $ids = $questions->pluck('id')->sort()->implode(',');

                // A group of exact copies is not shown again as "same text".
                if (isset($groups[$ids])) {
                    continue;
                }

                $groups[$ids] = [
                    'match' => $match,
                    'questions' => $questions->map(fn (Question $q) => [
                        'id' => $q->id,
                        'text' => $q->text,
                        'options' => $q->options(),
                        'correct' => $q->correct_option,
                        'subject' => $q->subject?->name,
                        'topic' => $q->topic?->name,
                        'difficulty' => $q->difficulty,
                        'used' => $q->mock_tests_count + $q->quizzes_count,
                    ])->all(),
                ];
            }
        }

        return array_values(array_slice($groups, 0, $limit));
    }

    /**
     * Keeps $keepId and folds the other questions into it. Returns how many were removed.
     *
     * @param  list<int>  $mergeIds
     */
    public function merge(int $keepId, array $mergeIds): int
    {
        $mergeIds = array_values(array_diff(array_unique($mergeIds), [$keepId]));

        return DB::transaction(function () use ($keepId, $mergeIds) {
            foreach (self::REFERENCES as $table => $owner) {
                // Where the owner already has the kept question, the copy's row is dropped instead of moved.
                foreach ($mergeIds as $id) {
                    $taken = DB::table($table)->where('question_id', $keepId)->pluck($owner);
                    $rows = DB::table($table)->where('question_id', $id);
                    (clone $rows)->whereIn($owner, $taken)->delete();
                    $rows->update(['question_id' => $keepId]);
                }
            }

            return Question::whereIn('id', $mergeIds)->delete();
        });
    }
}
