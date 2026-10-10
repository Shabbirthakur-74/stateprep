<?php

namespace App\Services;

use App\Models\MockTest;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Topic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The question list of a mock test, previous year paper or quiz, and the tools that build it: random draws by
 * subject, topic and difficulty, one-click swaps, hand-picking, removing and reordering.
 *
 * Draws and swaps prefer questions not "used" yet. Content of an exam avoids the questions of that exam's other
 * mocks, PYQs and quizzes, so a student who buys the bundle never meets a repeat. General quizzes avoid the
 * questions of other general quizzes.
 */
class QuestionSet
{
    public function __construct(public readonly MockTest|Quiz $set) {}

    /** "mock-test" or "quiz", as used in admin addresses. */
    public function type(): string
    {
        return $this->set instanceof Quiz ? 'quiz' : 'mock-test';
    }

    public static function resolve(string $type, int $id): self
    {
        return new self(match ($type) {
            'quiz' => Quiz::findOrFail($id),
            'mock-test' => MockTest::findOrFail($id),
            default => abort(404),
        });
    }

    /**
     * Validation rules for draw rows sent as `rows`, with the optional `top_up` tick box.
     */
    public static function rowRules(): array
    {
        return [
            'rows' => ['required', 'array', 'max:30'],
            'rows.*.subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'rows.*.topic_id' => ['nullable', 'integer', 'exists:topics,id'],
            'rows.*.difficulty' => ['nullable', Rule::in(Question::DIFFICULTIES)],
            'rows.*.count' => ['required', 'integer', 'between:1,200'],
            'top_up' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Adds random questions for each row, in row order. Unused questions come first; with $topUp, a row the unused
     * questions cannot fill is completed with questions used elsewhere in the bundle. Nothing already in this set is
     * added again. Returns how many were added and a note for every row that came up short or was topped up.
     *
     * @param  list<array{subject_id: int, topic_id?: int|null, difficulty?: string|null, count: int}>  $rows
     * @return array{added: int, shortfalls: list<string>}
     */
    public function draw(array $rows, bool $topUp = false): array
    {
        $this->checkTopics($rows);

        $inSet = $this->ids();
        $used = $this->usedElsewhere();
        $added = [];
        $notes = [];

        foreach ($rows as $row) {
            $pool = fn () => Question::where('subject_id', $row['subject_id'])
                ->when($row['topic_id'] ?? null, fn ($q, $topic) => $q->where('topic_id', $topic))
                ->when($row['difficulty'] ?? null, fn ($q, $difficulty) => $q->where('difficulty', $difficulty))
                ->whereNotIn('id', [...$inSet, ...$added]);

            $ids = $pool()->whereNotIn('id', $used)->inRandomOrder()->limit($row['count'])->pluck('id')->all();
            $unused = count($ids);

            if ($unused < $row['count'] && $topUp) {
                $ids = [...$ids, ...$pool()->whereIn('id', $used)->whereNotIn('id', $ids)->inRandomOrder()->limit($row['count'] - $unused)->pluck('id')->all()];
            }

            if ($unused < $row['count']) {
                $notes[] = count($ids) > $unused
                    ? sprintf('%s: %d unused, topped up with %d already used elsewhere', $this->rowLabel($row), $unused, count($ids) - $unused)
                    : sprintf('%s: only %d of %d added (no more unused questions)', $this->rowLabel($row), count($ids), $row['count']);
            }

            array_push($added, ...$ids);
        }

        $this->append($added);

        return ['added' => count($added), 'shortfalls' => $notes];
    }

    /**
     * Replaces one question with a random unused one from the same subject and topic, in the same place.
     */
    public function swap(int $questionId): Question
    {
        $old = Question::findOrFail($questionId);
        $replacement = Question::where('subject_id', $old->subject_id)
            ->when($old->topic_id, fn ($q, $topic) => $q->where('topic_id', $topic))
            ->whereNotIn('id', [...$this->ids(), ...$this->usedElsewhere()])
            ->inRandomOrder()
            ->first();

        if (! $replacement) {
            throw ValidationException::withMessages(['swap' => 'No unused question is left in '.$this->rowLabel(['subject_id' => $old->subject_id, 'topic_id' => $old->topic_id]).' to swap in.']);
        }

        $position = $this->set->questions()->where('questions.id', $old->id)->first()?->pivot->position;
        abort_if($position === null, 404);

        DB::transaction(function () use ($old, $replacement, $position) {
            $this->set->questions()->detach($old->id);
            $this->set->questions()->attach($replacement->id, ['position' => $position]);
        });

        return $replacement;
    }

    /**
     * Adds questions to the end, skipping any already in the set. Returns how many were added.
     *
     * @param  list<int>  $ids
     */
    public function add(array $ids): int
    {
        $new = array_values(array_diff(array_unique(array_map('intval', $ids)), $this->ids()));
        $this->append($new);

        return count($new);
    }

    public function remove(int $questionId): void
    {
        $this->set->questions()->detach($questionId);
        $this->renumber($this->ids());
    }

    public function clear(): void
    {
        $this->set->questions()->detach();
    }

    public function move(int $questionId, string $direction): void
    {
        $ids = $this->ids();
        $index = array_search($questionId, $ids, true);
        $swap = $index === false ? -1 : $index + ($direction === 'up' ? -1 : 1);

        if ($swap >= 0 && $swap < count($ids)) {
            [$ids[$index], $ids[$swap]] = [$ids[$swap], $ids[$index]];
            $this->renumber($ids);
        }
    }

    /**
     * Question ids in set order.
     *
     * @return list<int>
     */
    public function ids(): array
    {
        return $this->set->questions()->orderByPivot('position')->pluck('questions.id')->map(fn ($id) => (int) $id)->all();
    }

    /**
     * Questions already used by the other sets that share this set's scope (its exam's bundle, or the general quizzes).
     *
     * @return list<int>
     */
    public function usedElsewhere(): array
    {
        return array_keys($this->usage());
    }

    /**
     * For the given questions, the titles of the other sets in scope that already use them.
     *
     * @param  list<int>  $questionIds
     * @return array<int, list<string>>
     */
    public function usedIn(array $questionIds): array
    {
        return array_intersect_key($this->usage($questionIds), array_flip($questionIds));
    }

    /**
     * question id => titles of the other sets in scope using it.
     *
     * @return array<int, list<string>>
     */
    private function usage(?array $only = null): array
    {
        $examId = $this->set->exam_id;
        $mockId = $this->set instanceof MockTest ? $this->set->id : 0;
        $quizId = $this->set instanceof Quiz ? $this->set->id : 0;

        $quizzes = DB::table('quiz_question')
            ->join('quizzes', 'quizzes.id', '=', 'quiz_question.quiz_id')
            ->where('quizzes.id', '!=', $quizId)
            ->where(fn ($q) => $examId ? $q->where('quizzes.exam_id', $examId) : $q->whereNull('quizzes.exam_id'))
            ->when($only !== null, fn ($q) => $q->whereIn('quiz_question.question_id', $only))
            ->select('quiz_question.question_id', 'quizzes.title');

        $rows = $examId
            ? DB::table('mock_test_question')
                ->join('mock_tests', 'mock_tests.id', '=', 'mock_test_question.mock_test_id')
                ->where('mock_tests.exam_id', $examId)
                ->where('mock_tests.id', '!=', $mockId)
                ->when($only !== null, fn ($q) => $q->whereIn('mock_test_question.question_id', $only))
                ->select('mock_test_question.question_id', 'mock_tests.title')
                ->unionAll($quizzes)
                ->get()
            : $quizzes->get();

        return $rows->groupBy('question_id')->map(fn ($group) => $group->pluck('title')->unique()->values()->all())->all();
    }

    /**
     * Subjects draws and the picker offer: the exam's subjects for exam content, or null for the whole bank.
     * An exam without linked subjects falls back to the whole bank.
     *
     * @return list<int>|null
     */
    public function subjectIds(): ?array
    {
        $ids = $this->set->exam?->subjects()->pluck('subjects.id')->all();

        return $ids ?: null;
    }

    /**
     * Bank questions per subject (s), topic (t) and difficulty (d): how many in all (n) and how many unused (u)
     * for this set, so the draw rows can show "12 unused of 40".
     *
     * @return list<array{s: int, t: int|null, d: string, n: int, u: int}>
     */
    public function bankCounts(): array
    {
        $taken = [...$this->ids(), ...$this->usedElsewhere()];
        $counts = fn (Builder $query) => $query
            ->when($this->subjectIds(), fn ($q, $ids) => $q->whereIn('subject_id', $ids))
            ->selectRaw('subject_id as s, topic_id as t, difficulty as d, COUNT(*) as n')
            ->groupBy('subject_id', 'topic_id', 'difficulty')
            ->get()
            ->keyBy(fn ($r) => "{$r->s}|{$r->t}|{$r->d}");

        $all = $counts(Question::query());
        $unused = $counts(Question::whereNotIn('id', $taken));

        return $all->map(fn ($r, $key) => [
            's' => (int) $r->s,
            't' => $r->t === null ? null : (int) $r->t,
            'd' => $r->d,
            'n' => (int) $r->n,
            'u' => (int) ($unused[$key]->n ?? 0),
        ])->values()->all();
    }

    private function append(array $ids): void
    {
        $start = (int) $this->set->questions()->max('position');
        $this->set->questions()->attach(collect($ids)->values()->mapWithKeys(fn ($id, $i) => [$id => ['position' => $start + $i + 1]])->all());
    }

    private function renumber(array $ids): void
    {
        DB::transaction(function () use ($ids) {
            foreach ($ids as $i => $id) {
                $this->set->questions()->updateExistingPivot($id, ['position' => $i + 1]);
            }
        });
    }

    /** A topic chosen in a row has to belong to that row's subject. */
    private function checkTopics(array $rows): void
    {
        foreach ($rows as $i => $row) {
            if (($row['topic_id'] ?? null) && Topic::whereKey($row['topic_id'])->value('subject_id') !== (int) $row['subject_id']) {
                throw ValidationException::withMessages(["rows.{$i}.topic_id" => 'This topic belongs to another subject.']);
            }
        }
    }

    private function rowLabel(array $row): string
    {
        $label = (string) DB::table('subjects')->where('id', $row['subject_id'])->value('name');

        if ($row['topic_id'] ?? null) {
            $label .= ' › '.Topic::whereKey($row['topic_id'])->value('name');
        }

        return ($row['difficulty'] ?? null) ? "{$label} ({$row['difficulty']})" : $label;
    }
}
