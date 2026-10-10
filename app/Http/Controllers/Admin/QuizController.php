<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\SavesCover;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Subject;
use App\Models\Topic;
use App\Services\QuestionSet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ready-made quizzes. A quiz without an exam is a general quiz on the student Quizzes screen; a quiz with an exam
 * belongs to that exam's bundle. Questions are chosen on the shared Questions screen. "Generate" makes many draft
 * quizzes at once: one per topic, or a numbered set.
 */
class QuizController extends Controller
{
    use SavesCover;

    public function index(Request $request): Response
    {
        $filter = $request->query('exam', 'all');

        return Inertia::render('admin/quizzes/index', [
            'quizzes' => Quiz::with('exam:id,name', 'subject:id,name', 'topic:id,name')
                ->withCount(['questions', 'attempts'])
                ->when($filter === 'general', fn ($q) => $q->whereNull('exam_id'))
                ->when(is_numeric($filter), fn ($q) => $q->where('exam_id', $filter))
                ->latest('id')
                ->paginate(30)
                ->withQueryString()
                ->through(fn (Quiz $quiz) => [
                    'id' => $quiz->id,
                    'title' => $quiz->title,
                    'exam' => $quiz->exam?->name,
                    'subject' => $quiz->subject?->name,
                    'topic' => $quiz->topic?->name,
                    'cover_url' => $quiz->coverUrl(),
                    'questions_count' => $quiz->questions_count,
                    'attempts_count' => $quiz->attempts_count,
                    'is_free' => $quiz->is_free,
                    'is_published' => $quiz->is_published,
                ]),
            'filter' => $filter,
            ...$this->options(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('admin/quizzes/form', [
            ...$this->options(),
            'defaults' => ['exam_id' => $request->integer('exam') ?: null],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules($request));

        $quiz = new Quiz($this->attributes($data));
        $this->saveCover($quiz, $request);

        return to_route('admin.sets.show', ['quiz', $quiz->id])->with('status', "“{$quiz->title}” created. Now add its questions.");
    }

    public function edit(Quiz $quiz): Response
    {
        return Inertia::render('admin/quizzes/form', [
            ...$this->options(),
            'quiz' => [
                ...$quiz->only('id', 'exam_id', 'subject_id', 'topic_id', 'title', 'description', 'is_free', 'is_published'),
                'cover_url' => $quiz->coverUrl(),
                'questions_count' => $quiz->questions()->count(),
            ],
        ]);
    }

    public function update(Request $request, Quiz $quiz): RedirectResponse
    {
        $data = $request->validate($this->rules($request));

        $quiz->fill($this->attributes($data));
        $this->saveCover($quiz, $request);

        return to_route('admin.quizzes.index')->with('status', "“{$quiz->title}” saved.");
    }

    public function destroy(Quiz $quiz): RedirectResponse
    {
        $quiz->delete();

        return back()->with('status', "“{$quiz->title}” deleted. Its questions are still in the bank.");
    }

    /**
     * Publishes or unpublishes several quizzes at once, e.g. a freshly generated set after review.
     */
    public function publish(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:quizzes,id'],
            'publish' => ['required', 'boolean'],
        ]);

        $count = Quiz::whereIn('id', $data['ids'])->update(['is_published' => $data['publish']]);

        return back()->with('status', $count.' quizzes '.($data['publish'] ? 'published.' : 'moved back to draft.'));
    }

    /**
     * Makes many draft quizzes at once. "per_topic": one quiz for every topic of the chosen subjects.
     * "numbered": N quizzes ("Prefix 1", "Prefix 2", …), each split evenly across the chosen subjects.
     * Every quiz draws unused questions, so the quizzes do not overlap each other or the rest of the bundle.
     */
    public function generate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'exam_id' => ['nullable', 'exists:exams,id'],
            'mode' => ['required', Rule::in(['per_topic', 'numbered'])],
            'subject_ids' => ['nullable', 'required_if:mode,per_topic', 'array'],
            'subject_ids.*' => ['integer', 'exists:subjects,id'],
            'per_quiz' => ['required', 'integer', 'between:1,100'],
            'quizzes' => ['nullable', 'required_if:mode,numbered', 'integer', 'between:1,50'],
            'prefix' => ['nullable', 'required_if:mode,numbered', 'string', 'max:200'],
            'difficulty' => ['nullable', Rule::in(Question::DIFFICULTIES)],
            'top_up' => ['nullable', 'boolean'],
        ]);

        $exam = isset($data['exam_id']) ? Exam::find($data['exam_id']) : null;
        $subjects = $this->generationSubjects($exam, $data['subject_ids'] ?? []);
        $topUp = (bool) ($data['top_up'] ?? false);
        $difficulty = $data['difficulty'] ?? null;
        $created = 0;
        $notes = [];

        $make = function (array $attributes, array $rows) use ($exam, $topUp, &$created, &$notes) {
            $quiz = Quiz::create([...$attributes, 'exam_id' => $exam?->id, 'is_free' => $exam === null, 'is_published' => false]);
            $result = (new QuestionSet($quiz))->draw($rows, $topUp);

            if ($result['added'] === 0) {
                $quiz->delete();
                $notes[] = "{$attributes['title']}: not created, no unused questions left";

                return;
            }

            $created++;
            foreach ($result['shortfalls'] as $note) {
                $notes[] = "{$attributes['title']}: {$note}";
            }
        };

        if ($data['mode'] === 'per_topic') {
            foreach ($subjects as $subject) {
                foreach ($subject->topics()->whereHas('questions')->get() as $topic) {
                    $make(
                        ['title' => "{$subject->name} • {$topic->name}", 'subject_id' => $subject->id, 'topic_id' => $topic->id],
                        [['subject_id' => $subject->id, 'topic_id' => $topic->id, 'difficulty' => $difficulty, 'count' => $data['per_quiz']]],
                    );
                }
            }
        } else {
            foreach (range(1, $data['quizzes']) as $n) {
                $make(
                    ['title' => trim($data['prefix'])." {$n}", 'subject_id' => $subjects->count() === 1 ? $subjects->first()->id : null],
                    $this->spread($subjects, $data['per_quiz'], $difficulty),
                );
            }
        }

        return to_route('admin.quizzes.index', ['exam' => $exam?->id ?? 'general'])
            ->with('status', $created === 1 ? '1 draft quiz created. Review it, then publish.' : "{$created} draft quizzes created. Review them, then publish.")
            ->with('import_errors', array_slice($notes, 0, 50));
    }

    /**
     * Splits a quiz's questions evenly across subjects, e.g. 20 over 3 subjects → 7, 7, 6.
     */
    private function spread($subjects, int $total, ?string $difficulty): array
    {
        $count = max(1, $subjects->count());

        return $subjects->values()
            ->map(fn (Subject $subject, $i) => [
                'subject_id' => $subject->id,
                'topic_id' => null,
                'difficulty' => $difficulty,
                'count' => intdiv($total, $count) + ($i < $total % $count ? 1 : 0),
            ])
            ->filter(fn ($row) => $row['count'] > 0)
            ->values()
            ->all();
    }

    /**
     * The chosen subjects, or every subject the exam covers (the whole bank for a general quiz). For an exam, only
     * its own subjects are allowed.
     */
    private function generationSubjects(?Exam $exam, array $ids)
    {
        $allowed = $exam?->subjects()->pluck('subjects.id')->all();

        return Subject::whereHas('questions')
            ->when($ids, fn ($q) => $q->whereIn('id', $ids))
            ->when($allowed, fn ($q) => $q->whereIn('id', $allowed))
            ->orderBy('name')
            ->get();
    }

    private function rules(Request $request): array
    {
        return [
            'exam_id' => ['nullable', 'exists:exams,id'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'topic_id' => ['nullable', Rule::exists('topics', 'id')->where('subject_id', $request->input('subject_id'))],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_free' => ['nullable', 'boolean'],
            'is_published' => ['required', 'boolean'],
            ...$this->coverRules(),
        ];
    }

    private function attributes(array $data): array
    {
        return [
            ...collect($data)->only('exam_id', 'subject_id', 'topic_id', 'title', 'description', 'is_published')->all(),
            'topic_id' => ($data['subject_id'] ?? null) ? ($data['topic_id'] ?? null) : null,
            // General quizzes are always free; in a bundle, "free" marks a sample anyone with an account can play.
            'is_free' => empty($data['exam_id']) || (bool) ($data['is_free'] ?? false),
        ];
    }

    private function options(): array
    {
        return [
            'exams' => Exam::with('subjects:id')->orderBy('name')->get(['id', 'name'])
                ->map(fn (Exam $e) => ['id' => $e->id, 'name' => $e->name, 'subject_ids' => $e->subjects->pluck('id')]),
            'subjects' => Subject::with('topics:id,subject_id,name')->withCount('questions')->orderBy('name')->get(['id', 'name']),
        ];
    }
}
