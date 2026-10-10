<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Subject;
use App\Services\QuestionImporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The question bank: browse with filters, add and edit single questions, or import many from CSV.
 */
class QuestionController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only('subject', 'topic', 'difficulty', 'search');

        $questions = Question::with('subject:id,name', 'topic:id,name')
            ->when($filters['subject'] ?? null, fn ($q, $id) => $q->where('subject_id', $id))
            ->when($filters['topic'] ?? null, fn ($q, $id) => $id === 'none' ? $q->whereNull('topic_id') : $q->where('topic_id', $id))
            ->when($filters['difficulty'] ?? null, fn ($q, $d) => $q->where('difficulty', $d))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where('text', 'like', "%{$s}%"))
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Question $q) => [
                'id' => $q->id,
                'text' => $q->text,
                'subject' => $q->subject?->name,
                'topic' => $q->topic?->name,
                'difficulty' => $q->difficulty,
                'correct' => $q->correct_option,
            ]);

        return Inertia::render('admin/questions/index', [
            'questions' => $questions,
            'filters' => $filters,
            'subjects' => $this->subjectOptions(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('admin/questions/form', [
            'subjects' => $this->subjectOptions(),
            'defaults' => ['subject_id' => $request->integer('subject') ?: null, 'topic_id' => $request->integer('topic') ?: null],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Question::create($this->validated($request));

        return $request->boolean('add_another')
            ? back()->with('status', 'Question added. Add the next one.')
            : to_route('admin.questions.index')->with('status', 'Question added.');
    }

    public function edit(Question $question): Response
    {
        return Inertia::render('admin/questions/form', [
            'subjects' => $this->subjectOptions(),
            'question' => $question->only('id', 'subject_id', 'topic_id', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation', 'difficulty'),
        ]);
    }

    public function update(Request $request, Question $question): RedirectResponse
    {
        $question->update($this->validated($request, $question));

        return to_route('admin.questions.index')->with('status', 'Question saved.');
    }

    public function destroy(Question $question): RedirectResponse
    {
        $question->delete();

        return back()->with('status', 'Question deleted.');
    }

    public function importForm(): Response
    {
        return Inertia::render('admin/questions/import', ['columns' => QuestionImporter::COLUMNS]);
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, QuestionImporter::COLUMNS);
            fputcsv($out, ['Himachal Pradesh GK', 'Districts', 'How many districts does Himachal Pradesh have?', '10', '11', '12', '13', 'C', 'Himachal Pradesh has 12 districts.', 'easy']);
            fclose($out);
        }, 'question-import-template.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * The form fields. A question that looks like one already in the bank is refused with a warning,
     * unless "Save anyway" (allow_duplicate) is ticked.
     */
    private function validated(Request $request, ?Question $question = null): array
    {
        $data = $request->validate([
            'subject_id' => ['required', 'exists:subjects,id'],
            'topic_id' => ['nullable', Rule::exists('topics', 'id')->where('subject_id', $request->input('subject_id'))],
            'text' => ['required', 'string', 'max:5000'],
            'option_a' => ['required', 'string', 'max:500'],
            'option_b' => ['required', 'string', 'max:500'],
            'option_c' => ['required', 'string', 'max:500'],
            'option_d' => ['required', 'string', 'max:500'],
            'correct_option' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
            'explanation' => ['nullable', 'string', 'max:5000'],
            'difficulty' => ['required', Rule::in(Question::DIFFICULTIES)],
        ]);

        if (! $request->boolean('allow_duplicate')) {
            $found = Question::findDuplicate($data['text'], [$data['option_a'], $data['option_b'], $data['option_c'], $data['option_d']], $question?->id);

            if ($found) {
                $match = $found['question']->load('subject:id,name');
                throw ValidationException::withMessages([
                    'text' => sprintf(
                        '%s already in the bank (#%d, %s): “%s”. Tick “Save anyway” to keep both.',
                        $found['match'] === 'exact' ? 'This question is' : 'A very similar question is',
                        $match->id,
                        $match->subject?->name,
                        Str::limit($match->text, 120),
                    ),
                ]);
            }
        }

        return $data;
    }

    private function subjectOptions()
    {
        return Subject::with('topics:id,subject_id,name,position')->orderBy('name')->get(['id', 'name'])
            ->map(fn (Subject $s) => ['id' => $s->id, 'name' => $s->name, 'topics' => $s->topics->map->only('id', 'name')]);
    }
}
