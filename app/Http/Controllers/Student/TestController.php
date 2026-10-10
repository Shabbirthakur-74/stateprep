<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\MockTest;
use App\Models\Setting;
use App\Models\TestAttempt;
use App\Models\TestSeries;
use App\Services\StudentCatalog;
use App\Services\TestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TestController extends Controller
{
    public function __construct(private TestService $tests) {}

    public function start(Request $request, MockTest $mockTest): RedirectResponse
    {
        $series = $request->filled('series') ? TestSeries::find($request->integer('series')) : null;

        if (! TestService::canTake($mockTest, $series)) {
            return back()->withErrors(['test' => $mockTest->is_free ? 'This test is not available right now.' : 'This test is part of paid content, which opens soon.']);
        }

        $attempt = $this->tests->start($request->user(), $mockTest, $series);

        return to_route('student.tests.show', $attempt);
    }

    /**
     * The exam player while the attempt is running; the scorecard with solutions once it is over.
     * Correct answers and explanations are only sent after submission.
     */
    public function show(Request $request, TestAttempt $attempt): Response
    {
        $this->authorizeOwner($request, $attempt);

        if ($attempt->hasExpired()) {
            $this->tests->finalize($attempt);
        }

        $finished = $attempt->isSubmitted();
        $answers = $attempt->answers()->with('question.subject:id,name', 'question.topic:id,name')->get();

        return Inertia::render('student/test-attempt', [
            'attempt' => [
                'id' => $attempt->id,
                'title' => $attempt->title,
                'type' => $attempt->type,
                'submitted' => $finished,
                'ends_at' => $attempt->ends_at->toIso8601String(),
                'server_now' => now()->toIso8601String(),
                'total' => $attempt->total_questions,
                'correct' => $attempt->correct_count,
                'wrong' => $attempt->wrong_count,
                'score' => $attempt->score,
                'max_score' => $attempt->max_score,
                'percent' => $attempt->percent(),
                'seconds' => $attempt->durationSeconds(),
                'marks_per_question' => $attempt->marks_per_question,
                'negative_marks' => $attempt->negative_marks,
                'series' => $attempt->series ? ['id' => $attempt->series->id, 'title' => $attempt->series->title] : null,
            ],
            'questions' => $answers->map(fn ($answer) => [
                'id' => $answer->question_id,
                'position' => $answer->position,
                'text' => $answer->question->text,
                'options' => ['A' => $answer->question->option_a, 'B' => $answer->question->option_b, 'C' => $answer->question->option_c, 'D' => $answer->question->option_d],
                'subject' => $answer->question->subject?->name,
                'topic' => $answer->question->topic?->name,
                'selected' => $answer->selected_option,
                'marked' => $answer->is_marked,
                'is_correct' => $finished ? $answer->is_correct : null,
                'correct' => $finished ? $answer->question->correct_option : null,
                'explanation' => $finished ? $answer->question->explanation : null,
            ]),
            'bySubject' => $finished ? $answers->groupBy(fn ($a) => $a->question->subject?->name ?? 'Other')->map(fn ($group, $name) => [
                'subject' => $name,
                'total' => $group->count(),
                'correct' => $group->where('is_correct', true)->count(),
                'wrong' => $group->where('is_correct', false)->count(),
            ])->values() : [],
            'bands' => Setting::resultBands(),
        ]);
    }

    public function answer(Request $request, TestAttempt $attempt): RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'option' => ['nullable', Rule::in(['A', 'B', 'C', 'D'])],
            'marked' => ['required', 'boolean'],
        ]);

        $saved = $this->tests->save($attempt, $data['question_id'], $data['option'] ?? null, $data['marked']);

        return $saved ? back() : to_route('student.tests.show', $attempt);
    }

    public function submit(Request $request, TestAttempt $attempt): RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);

        $this->tests->finalize($attempt);

        return to_route('student.tests.show', $attempt);
    }

    /**
     * A test series with its tests in order and the student's best result in each.
     */
    public function series(Request $request, TestSeries $series): Response
    {
        abort_unless($series->is_published, 404);

        $attempts = $request->user()->testAttempts()->whereIn('mock_test_id', $series->mockTests()->pluck('mock_tests.id'))->get();

        return Inertia::render('student/series-show', [
            'series' => [
                ...StudentCatalog::seriesSummary($series->load('exam:id,name')),
                'tests' => $series->mockTests()->where('is_published', true)->withCount('questions')->with('exam:id,name')->get()
                    ->map(function (MockTest $test) use ($attempts) {
                        $mine = $attempts->where('mock_test_id', $test->id);
                        $best = $mine->whereNotNull('submitted_at')->max(fn ($a) => $a->percent());
                        $open = $mine->first(fn ($a) => $a->submitted_at === null && $a->ends_at->isFuture());

                        return [
                            ...StudentCatalog::paper($test),
                            'attempts' => $mine->whereNotNull('submitted_at')->count(),
                            'best_percent' => $best,
                            'open_attempt_id' => $open?->id,
                        ];
                    }),
            ],
            'bands' => Setting::resultBands(),
        ]);
    }

    private function authorizeOwner(Request $request, TestAttempt $attempt): void
    {
        abort_unless($attempt->user_id === $request->user()->id, 404);
    }
}
