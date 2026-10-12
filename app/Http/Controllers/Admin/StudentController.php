<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Doubt;
use App\Models\Setting;
use App\Models\User;
use App\Services\StudentStats;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Student accounts and their results.
 */
class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search'));

        return Inertia::render('admin/students/index', [
            'students' => User::where('role', Role::Student)
                ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")))
                ->withCount([
                    'quizAttempts as quizzes_count' => fn ($q) => $q->whereNotNull('submitted_at'),
                    'testAttempts as tests_count' => fn ($q) => $q->whereNotNull('submitted_at'),
                ])
                ->latest()
                ->paginate(25)
                ->withQueryString()
                ->through(fn (User $u) => [
                    ...$u->only('id', 'name', 'email', 'quizzes_count', 'tests_count'),
                    'joined' => $u->created_at->toDateString(),
                ]),
            'search' => $search,
        ]);
    }

    /**
     * Everything about one student: their details and chosen exams, purchases, activity, and how they are doing
     * subject by subject and topic by topic.
     */
    public function show(Request $request, User $student): Response
    {
        $stats = new StudentStats($student);
        $profile = $student->profile;
        $attempts = $stats->attempts();

        return Inertia::render('admin/students/show', [
            'student' => [...$student->only('id', 'name', 'email'), 'joined' => $student->created_at->toDateString()],
            'profile' => $profile ? [
                ...$profile->only('phone', 'gender', 'district', 'qualification'),
                'date_of_birth' => $profile->date_of_birth->toDateString(),
                'age' => (int) $profile->date_of_birth->diffInYears(now()),
            ] : null,
            'exams' => $student->targetExams()->orderBy('name')->get(['exams.id', 'exams.name', 'exams.slug'])
                ->map(fn ($exam) => [
                    ...$exam->only('id', 'name', 'slug'),
                    'content_url' => $request->user()->can('manage-exams') ? route('admin.exams.content', $exam->id) : null,
                ]),
            'activity' => [
                'last_active' => $attempts[0]['submitted_at'] ?? null,
                'doubts' => $student->doubts()->count(),
                'open_doubts' => $student->doubts()->where('status', Doubt::OPEN)->count(),
                'doubts_url' => $request->user()->can('manage-doubts') ? route('admin.doubts.index', ['status' => 'all', 'search' => $student->name]) : null,
                'saved_materials' => $student->savedMaterials()->count(),
            ],
            'overview' => $stats->overview(),
            'subjects' => $stats->subjectBreakdown(),
            'byDifficulty' => $stats->byDifficulty(),
            'trend' => array_reverse(array_slice($attempts, 0, 10)),
            'attempts' => $attempts,
            'bands' => Setting::resultBands(),
        ]);
    }

    public function destroy(User $student): RedirectResponse
    {
        $student->delete();

        return to_route('admin.students.index')->with('status', "{$student->name}'s account and results were deleted.");
    }
}
