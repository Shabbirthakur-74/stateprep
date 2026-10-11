<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use App\Models\Setting;
use App\Services\StudentCatalog;
use App\Services\StudentStats;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student area. Progress comes from finished quizzes; enrolments and saved items do not exist yet,
 * so those parts show empty states. Content lists come from the published catalogue.
 */
class PageController extends Controller
{
    /**
     * Sidebar entries that are not built yet: route slug => [title, what it will do].
     */
    public const COMING_SOON = [
        'personalised-tests' => ['Personalised Tests', 'Tests built around your weak topics and recent mistakes.'],
        'live-session' => ['1-on-1 Live Session', 'Book a one-on-one session with a mentor for guidance on your preparation.'],
    ];

    public function home(Request $request): Response
    {
        $stats = new StudentStats($request->user());
        $subjects = collect(StudentCatalog::quizSubjects());
        $mocks = collect(StudentCatalog::papers('mock'));
        $quiz = $subjects->sortByDesc('questions_count')->first();
        $mock = $mocks->first();

        return Inertia::render('student/dashboard', [
            'notices' => Notice::board(6),
            'exams' => StudentCatalog::exams(),
            'overview' => $stats->overview(),
            'recent' => $stats->attempts(3),
            'counts' => [
                'mocks' => $mocks->count(),
                'subjects' => $subjects->count(),
                'pyqs' => count(StudentCatalog::papers('pyq')),
            ],
            'recommended' => array_values(array_filter([
                $quiz ? ['kind' => 'quiz', 'subject_id' => $quiz['id'], 'test_id' => null, 'title' => $quiz['name'], 'questions' => min(10, $quiz['questions_count']), 'minutes' => 5, 'free' => true] : null,
                $mock ? ['kind' => 'mock', 'subject_id' => null, 'test_id' => $mock['id'], 'title' => $mock['title'], 'questions' => $mock['questions_count'], 'minutes' => $mock['duration_minutes'], 'free' => $mock['is_free']] : null,
            ])),
        ]);
    }

    public function exams(): Response
    {
        return Inertia::render('student/exams', ['exams' => StudentCatalog::exams()]);
    }

    public function library(Request $request): Response
    {
        return Inertia::render('student/library', ['materials' => StudentCatalog::savedMaterials($request->user())]);
    }

    public function pyqs(): Response
    {
        return Inertia::render('student/pyqs', [
            'exams' => StudentCatalog::exams(),
            'papers' => StudentCatalog::papers('pyq'),
            'subjects' => StudentCatalog::subjects(),
            'samples' => StudentCatalog::sampleQuestions(),
        ]);
    }

    public function mockTests(): Response
    {
        return Inertia::render('student/mock-tests', [
            'exams' => StudentCatalog::exams(),
            'papers' => StudentCatalog::papers('mock'),
        ]);
    }

    public function testSeries(): Response
    {
        return Inertia::render('student/test-series', ['series' => StudentCatalog::series()]);
    }

    public function attemptedTests(Request $request): Response
    {
        $stats = new StudentStats($request->user());

        return Inertia::render('student/attempted-tests', [
            'attempts' => $stats->attempts(),
            'inProgress' => $stats->inProgress(),
            'bands' => Setting::resultBands(),
        ]);
    }

    public function performance(Request $request): Response
    {
        $stats = new StudentStats($request->user());

        return Inertia::render('student/performance', [
            'exams' => StudentCatalog::exams(),
            'subjects' => StudentCatalog::subjects(),
            'overview' => $stats->overview(),
            'bySubject' => (object) $stats->bySubject(),
            'byDifficulty' => $stats->byDifficulty(),
            'trend' => array_reverse($stats->attempts(10)),
        ]);
    }

    public function comingSoon(Request $request): Response
    {
        $slug = $request->route()->defaults['feature'];
        [$title, $description] = self::COMING_SOON[$slug];

        return Inertia::render('student/coming-soon', ['title' => $title, 'description' => $description]);
    }
}
