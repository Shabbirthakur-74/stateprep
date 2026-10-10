<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Subject;
use App\Services\QuestionImporter;
use App\Services\QuestionSet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The Questions screen shared by mock tests, previous year papers and quizzes: the questions in order with a
 * per-subject count, and three ways to add more — random by subject, picking from the bank, or a CSV import.
 */
class QuestionSetController extends Controller
{
    public function show(Request $request, string $type, int $id): Response
    {
        $set = QuestionSet::resolve($type, $id);
        $item = $set->set;
        $questions = $item->questions()->with('subject:id,name', 'topic:id,name')->get();
        $inSet = $questions->pluck('id')->all();
        $subjectIds = $set->subjectIds();
        $filters = $request->only('subject', 'topic', 'difficulty', 'search', 'show_used');
        $usage = $set->usedIn($inSet);

        $bank = Question::with('subject:id,name', 'topic:id,name')
            ->when($subjectIds, fn ($q, $ids) => $q->whereIn('subject_id', $ids))
            ->when($filters['subject'] ?? null, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($filters['topic'] ?? null, fn ($q, $t) => $q->where('topic_id', $t))
            ->when($filters['difficulty'] ?? null, fn ($q, $d) => $q->where('difficulty', $d))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where('text', 'like', "%{$s}%"))
            ->whereNotIn('id', $inSet)
            // Questions used elsewhere in the bundle are hidden unless asked for.
            ->when(! ($filters['show_used'] ?? false), fn ($q) => $q->whereNotIn('id', $set->usedElsewhere()))
            ->orderBy('subject_id')
            ->orderBy('id')
            ->paginate(20)
            ->withQueryString();
        $bankUsage = $set->usedIn($bank->pluck('id')->all());

        return Inertia::render('admin/question-sets/show', [
            'set' => [
                'type' => $set->type(),
                'id' => $item->id,
                'title' => $item->title,
                'kind' => $item instanceof Quiz ? ($item->isGeneral() ? 'General quiz' : 'Bundle quiz') : ($item->type === 'pyq' ? "Previous year paper {$item->year}" : 'Mock test'),
                'exam' => $item->exam?->name,
                'is_published' => $item->is_published,
                'marks_per_question' => $item instanceof Quiz ? null : $item->marks_per_question,
                'negative_marks' => $item instanceof Quiz ? null : $item->negative_marks,
                'duration_minutes' => $item instanceof Quiz ? null : $item->duration_minutes,
                'is_pyq' => $item instanceof Quiz ? false : $item->type === 'pyq',
                'edit_url' => $item instanceof Quiz ? route('admin.quizzes.edit', $item) : route('admin.mock-tests.edit', $item),
                'back_url' => $item instanceof Quiz ? route('admin.quizzes.index') : route('admin.mock-tests.index'),
                'scope' => $item->exam ? "{$item->exam->name}'s other mocks, PYQs and quizzes" : 'the other general quizzes',
                'limited_to_exam' => $subjectIds !== null,
            ],
            'questions' => $questions->map(fn (Question $q) => [...$this->row($q), 'used_in' => $usage[$q->id] ?? []])->all(),
            'breakdown' => $questions->groupBy(fn (Question $q) => $q->subject?->name ?? 'No subject')
                ->map(fn ($group, $name) => ['subject' => $name, 'count' => $group->count()])
                ->values()
                ->all(),
            'bank' => $bank->through(fn (Question $q) => [...$this->row($q), 'used_in' => $bankUsage[$q->id] ?? []]),
            'filters' => $filters,
            'subjects' => Subject::with('topics:id,subject_id,name')
                ->when($subjectIds, fn ($q, $ids) => $q->whereIn('id', $ids))
                ->orderBy('name')
                ->get(['id', 'name']),
            'bank_counts' => $set->bankCounts(),
            'columns' => QuestionImporter::COLUMNS,
        ]);
    }

    public function draw(Request $request, string $type, int $id): RedirectResponse
    {
        $data = $request->validate(QuestionSet::rowRules());

        $result = QuestionSet::resolve($type, $id)->draw($data['rows'], (bool) ($data['top_up'] ?? false));

        return back()
            ->with('status', $result['added'] === 1 ? '1 question added.' : "{$result['added']} questions added.")
            ->with('import_errors', $result['shortfalls']);
    }

    public function add(Request $request, string $type, int $id): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:200'],
            'ids.*' => ['integer', 'exists:questions,id'],
        ]);

        $added = QuestionSet::resolve($type, $id)->add($data['ids']);

        return back()->with('status', $added === 1 ? '1 question added.' : "{$added} questions added.");
    }

    public function swap(string $type, int $id, Question $question): RedirectResponse
    {
        $new = QuestionSet::resolve($type, $id)->swap($question->id);

        return back()->with('status', 'Swapped for: '.Str::limit($new->text, 80));
    }

    public function move(Request $request, string $type, int $id, Question $question): RedirectResponse
    {
        $request->validate(['direction' => ['required', Rule::in(['up', 'down'])]]);

        QuestionSet::resolve($type, $id)->move($question->id, $request->input('direction'));

        return back();
    }

    public function remove(string $type, int $id, Question $question): RedirectResponse
    {
        QuestionSet::resolve($type, $id)->remove($question->id);

        return back()->with('status', 'Question removed. It is still in the bank.');
    }

    public function clear(string $type, int $id): RedirectResponse
    {
        QuestionSet::resolve($type, $id)->clear();

        return back()->with('status', 'All questions removed. They are still in the bank.');
    }

    private function row(Question $q): array
    {
        return [
            'id' => $q->id,
            'text' => Str::limit($q->text, 220),
            'subject' => $q->subject?->name,
            'topic' => $q->topic?->name,
            'difficulty' => $q->difficulty,
            'correct' => $q->correct_option,
        ];
    }
}
