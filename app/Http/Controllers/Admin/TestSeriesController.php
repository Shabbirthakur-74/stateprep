<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\SavesCover;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\MockTest;
use App\Models\TestSeries;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Test series: a pack of mock tests in a chosen order, with its own cover, price and description.
 */
class TestSeriesController extends Controller
{
    use SavesCover;

    public function index(): Response
    {
        return Inertia::render('admin/test-series/index', [
            'series' => TestSeries::with('exam:id,name')->withCount('mockTests')->latest()->get()
                ->map(fn (TestSeries $series) => [
                    'id' => $series->id,
                    'title' => $series->title,
                    'exam' => $series->exam?->name,
                    'cover_url' => $series->coverUrl(),
                    'tests_count' => $series->mock_tests_count,
                    'is_free' => $series->is_free,
                    'price' => $series->price,
                    'is_published' => $series->is_published,
                ]),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('admin/test-series/form', [...$this->formOptions(), 'defaults' => ['exam_id' => $request->integer('exam') ?: null]]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $series = new TestSeries($this->attributes($data));
        $this->saveCover($series, $request);
        $this->syncTests($series, $data['mock_test_ids']);

        return to_route('admin.test-series.index')->with('status', "“{$series->title}” created.");
    }

    public function edit(TestSeries $series): Response
    {
        return Inertia::render('admin/test-series/form', [
            ...$this->formOptions(),
            'series' => [
                ...$series->only('id', 'exam_id', 'title', 'description', 'is_free', 'price', 'is_published'),
                'cover_url' => $series->coverUrl(),
                'mock_test_ids' => $series->mockTests()->pluck('mock_tests.id'),
            ],
        ]);
    }

    public function update(Request $request, TestSeries $series): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $series->fill($this->attributes($data));
        $this->saveCover($series, $request);
        $this->syncTests($series, $data['mock_test_ids']);

        return to_route('admin.test-series.index')->with('status', "“{$series->title}” saved.");
    }

    public function destroy(TestSeries $series): RedirectResponse
    {
        $series->delete();

        return to_route('admin.test-series.index')->with('status', "“{$series->title}” deleted.");
    }

    private function rules(): array
    {
        return [
            'exam_id' => ['nullable', 'exists:exams,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            ...$this->priceRules(),
            ...$this->coverRules(),
            'mock_test_ids' => ['required', 'array', 'min:1'],
            'mock_test_ids.*' => ['integer', 'distinct', 'exists:mock_tests,id'],
        ];
    }

    private function attributes(array $data): array
    {
        return [
            ...collect($data)->only('exam_id', 'title', 'description', 'is_free', 'is_published')->all(),
            'price' => $data['is_free'] ? null : ($data['price'] ?? null),
        ];
    }

    /** Keeps the tests in the order they were chosen. */
    private function syncTests(TestSeries $series, array $ids): void
    {
        $series->mockTests()->sync(collect($ids)->values()->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all());
    }

    private function formOptions(): array
    {
        return [
            'exams' => Exam::orderBy('name')->get(['id', 'name']),
            'tests' => MockTest::with('exam:id,name')->withCount('questions')->orderBy('title')->get()
                ->map(fn (MockTest $test) => [
                    'id' => $test->id,
                    'title' => $test->title,
                    'type' => $test->type,
                    'exam' => $test->exam?->name,
                    'questions_count' => $test->questions_count,
                    'is_published' => $test->is_published,
                ]),
        ];
    }
}
