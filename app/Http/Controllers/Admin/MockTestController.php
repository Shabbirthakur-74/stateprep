<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\SavesCover;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\MockTest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mock tests and previous year papers: details, marking, price and cover. Questions are chosen on the shared
 * Questions screen (QuestionSetController), which opens straight after a test is created.
 */
class MockTestController extends Controller
{
    use SavesCover;

    public function index(): Response
    {
        return Inertia::render('admin/mock-tests/index', [
            'tests' => MockTest::with('exam:id,name')->withCount('questions')->latest()->get()
                ->map(fn (MockTest $test) => [
                    'id' => $test->id,
                    'title' => $test->title,
                    'type' => $test->type,
                    'year' => $test->year,
                    'exam' => $test->exam?->name,
                    'cover_url' => $test->coverUrl(),
                    'questions_count' => $test->questions_count,
                    'duration_minutes' => $test->duration_minutes,
                    'is_free' => $test->is_free,
                    'price' => $test->price,
                    'is_published' => $test->is_published,
                ]),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('admin/mock-tests/form', [
            ...$this->formOptions(),
            // Opened from an exam's Content screen: that exam, and mock or PYQ, are chosen already.
            'defaults' => ['exam_id' => $request->integer('exam') ?: null, 'type' => $request->query('type') === 'pyq' ? 'pyq' : 'mock'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules(creating: true));

        $test = new MockTest($this->attributes($data));
        $this->saveCover($test, $request);

        return to_route('admin.sets.show', ['mock-test', $test->id])
            ->with('status', $test->type === 'pyq'
                ? "“{$test->title}” created. Now import the paper's questions from CSV, or pick them from the bank."
                : "“{$test->title}” created. Now add its questions.");
    }

    public function edit(MockTest $mockTest): Response
    {
        return Inertia::render('admin/mock-tests/form', [
            ...$this->formOptions(),
            'test' => [
                ...$mockTest->only('id', 'exam_id', 'title', 'type', 'year', 'duration_minutes', 'marks_per_question', 'negative_marks', 'is_free', 'price', 'is_published'),
                'cover_url' => $mockTest->coverUrl(),
                'questions_count' => $mockTest->questions()->count(),
            ],
        ]);
    }

    public function update(Request $request, MockTest $mockTest): RedirectResponse
    {
        $data = $request->validate($this->rules(creating: false));

        $mockTest->fill($this->attributes($data));
        $this->saveCover($mockTest, $request);

        return to_route('admin.mock-tests.index')->with('status', "“{$mockTest->title}” saved.");
    }

    public function destroy(MockTest $mockTest): RedirectResponse
    {
        $mockTest->delete();

        return to_route('admin.mock-tests.index')->with('status', "“{$mockTest->title}” deleted.");
    }

    private function rules(bool $creating): array
    {
        return [
            'exam_id' => ['required', 'exists:exams,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(MockTest::TYPES)],
            'year' => ['nullable', 'required_if:type,pyq', 'integer', 'between:1990,'.(now()->year + 1)],
            'duration_minutes' => ['required', 'integer', 'between:1,600'],
            'marks_per_question' => ['required', 'numeric', 'between:0.25,10'],
            'negative_marks' => ['required', 'numeric', 'between:0,10'],
            ...$this->priceRules(),
            ...$this->coverRules(),
        ];
    }

    private function attributes(array $data): array
    {
        return [
            ...collect($data)->only('exam_id', 'title', 'type', 'duration_minutes', 'marks_per_question', 'negative_marks', 'is_free', 'is_published')->all(),
            'year' => $data['type'] === 'pyq' ? ($data['year'] ?? null) : null,
            'price' => $data['is_free'] ? null : ($data['price'] ?? null),
        ];
    }

    private function formOptions(): array
    {
        return ['exams' => Exam::orderBy('name')->get(['id', 'name'])];
    }
}
