<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\SavesCover;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\MockTest;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestSeries;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Exams, their public exam page (cover, overview, key facts, what's included, FAQs and price),
 * and the bank subjects each exam covers.
 */
class ExamController extends Controller
{
    use SavesCover;

    public function index(): Response
    {
        return Inertia::render('admin/exams/index', [
            'exams' => Exam::withCount(['subjects', 'mockTests'])->with('subjects:id,name')->orderBy('name')->get()
                ->map(fn (Exam $exam) => [
                    ...$exam->only('id', 'name', 'slug', 'description', 'is_active', 'subjects_count', 'mock_tests_count', 'is_free', 'price'),
                    'cover_url' => $exam->coverUrl(),
                    'subjects' => $exam->subjects->pluck('name'),
                ]),
        ]);
    }

    /**
     * Everything in the exam's bundle, by kind, with buttons that open each form with this exam already chosen.
     */
    public function content(Request $request, Exam $exam): Response
    {
        $user = $request->user();
        $tests = MockTest::where('exam_id', $exam->id)->withCount('questions')->latest('id')->get();
        $row = fn ($item, array $extra = []) => [
            'id' => $item->id,
            'title' => $item->title,
            'cover_url' => $item->coverUrl(),
            'is_free' => $item->is_free,
            'price' => $item->price ?? null,
            'is_published' => $item->is_published,
            ...$extra,
        ];

        return Inertia::render('admin/exams/content', [
            'exam' => [...$exam->only('id', 'name', 'slug', 'is_active'), 'subjects' => $exam->subjects()->orderBy('name')->pluck('name')],
            'tabs' => [
                'mocks' => $tests->where('type', 'mock')->map(fn ($t) => $row($t, ['detail' => "{$t->questions_count} questions • {$t->duration_minutes} min", 'questions_url' => route('admin.sets.show', ['mock-test', $t->id]), 'edit_url' => route('admin.mock-tests.edit', $t)]))->values(),
                'pyqs' => $tests->where('type', 'pyq')->map(fn ($t) => $row($t, ['detail' => trim(($t->year ? "{$t->year} • " : '')."{$t->questions_count} questions"), 'questions_url' => route('admin.sets.show', ['mock-test', $t->id]), 'edit_url' => route('admin.mock-tests.edit', $t)]))->values(),
                'series' => TestSeries::where('exam_id', $exam->id)->withCount('mockTests')->latest('id')->get()
                    ->map(fn ($s) => $row($s, ['detail' => "{$s->mock_tests_count} tests", 'questions_url' => null, 'edit_url' => route('admin.test-series.edit', $s)])),
                'materials' => StudyMaterial::where('exam_id', $exam->id)->latest('id')->get()
                    ->map(fn ($m) => $row($m, ['detail' => $m->formatLabel(), 'questions_url' => null, 'edit_url' => route('admin.materials.edit', $m)])),
                'quizzes' => $exam->quizzes()->withCount('questions')->latest('id')->get()
                    ->map(fn ($q) => $row($q, ['detail' => "{$q->questions_count} questions", 'questions_url' => route('admin.sets.show', ['quiz', $q->id]), 'edit_url' => route('admin.quizzes.edit', $q)])),
            ],
            'can' => [
                'tests' => $user->can('manage-tests'),
                'materials' => $user->can('manage-materials'),
            ],
            // For "Generate quizzes".
            'quizExam' => ['id' => $exam->id, 'name' => $exam->name, 'subject_ids' => $exam->subjects()->pluck('subjects.id')],
            'quizSubjects' => Subject::with('topics:id,subject_id,name')->withCount('questions')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/exams/form', ['subjects' => $this->subjectOptions()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $exam = new Exam($this->attributes($data));
        $this->saveCover($exam, $request);
        $exam->subjects()->sync($data['subject_ids'] ?? []);

        return to_route('admin.exams.index')->with('status', "{$exam->name} created.");
    }

    public function edit(Exam $exam): Response
    {
        return Inertia::render('admin/exams/form', [
            'subjects' => $this->subjectOptions(),
            'exam' => [
                ...$exam->only('id', 'name', 'slug', 'description', 'is_active', 'overview', 'is_free', 'price', 'original_price', 'validity_months'),
                'facts' => $exam->facts ?? [],
                'highlights' => $exam->highlights ?? [],
                'faqs' => $exam->faqs ?? [],
                'cover_url' => $exam->coverUrl(),
                'subject_ids' => $exam->subjects()->pluck('subjects.id'),
            ],
        ]);
    }

    public function update(Request $request, Exam $exam): RedirectResponse
    {
        $data = $request->validate($this->rules($exam));

        $exam->fill($this->attributes($data));
        $this->saveCover($exam, $request);
        $exam->subjects()->sync($data['subject_ids'] ?? []);

        return to_route('admin.exams.index')->with('status', "{$exam->name} saved.");
    }

    public function destroy(Exam $exam): RedirectResponse
    {
        // Through the models, so cover photos and uploaded files are removed too.
        $exam->mockTests()->get()->each->delete();
        StudyMaterial::where('exam_id', $exam->id)->get()->each->delete();
        $exam->delete();

        return to_route('admin.exams.index')->with('status', "{$exam->name} deleted, along with its mock tests and study material.");
    }

    private function rules(?Exam $exam = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('exams')->ignore($exam)],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
            'subject_ids' => ['nullable', 'array'],
            'subject_ids.*' => ['integer', 'exists:subjects,id'],
            ...$this->coverRules(),
            // Public exam page.
            'overview' => ['nullable', 'string', 'max:10000'],
            'facts' => ['nullable', 'array', 'max:12'],
            'facts.*.label' => ['required', 'string', 'max:60'],
            'facts.*.value' => ['required', 'string', 'max:200'],
            'highlights' => ['nullable', 'array', 'max:12'],
            'highlights.*' => ['nullable', 'string', 'max:160'],
            'faqs' => ['nullable', 'array', 'max:20'],
            'faqs.*.question' => ['required', 'string', 'max:255'],
            'faqs.*.answer' => ['required', 'string', 'max:2000'],
            // The exam bundle.
            'is_free' => ['nullable', 'boolean'],
            'price' => ['nullable', 'required_if:is_free,0,false', 'numeric', 'min:1', 'max:99999'],
            'original_price' => ['nullable', 'numeric', 'max:99999', Rule::when(request()->filled('price'), 'gte:price')],
            'validity_months' => ['nullable', 'integer', 'min:1', 'max:60'],
        ];
    }

    private function attributes(array $data): array
    {
        return [
            ...collect($data)->only('name', 'description', 'is_active', 'overview', 'validity_months')->all(),
            'is_free' => $data['is_free'] ?? false,
            'facts' => array_values($data['facts'] ?? []),
            'highlights' => array_values(array_filter(array_map('trim', $data['highlights'] ?? []))),
            'faqs' => array_values($data['faqs'] ?? []),
            'price' => ($data['is_free'] ?? false) ? null : ($data['price'] ?? null),
            'original_price' => ($data['is_free'] ?? false) ? null : ($data['original_price'] ?? null),
        ];
    }

    private function subjectOptions()
    {
        return Subject::withCount('questions')->orderBy('name')->get(['id', 'name']);
    }
}
