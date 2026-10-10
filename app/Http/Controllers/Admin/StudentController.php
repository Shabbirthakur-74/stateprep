<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
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

    public function show(User $student): Response
    {
        $stats = new StudentStats($student);

        return Inertia::render('admin/students/show', [
            'student' => [...$student->only('id', 'name', 'email'), 'joined' => $student->created_at->toDateString()],
            'overview' => $stats->overview(),
            'attempts' => $stats->attempts(),
            'bands' => Setting::resultBands(),
        ]);
    }

    public function destroy(User $student): RedirectResponse
    {
        $student->delete();

        return to_route('admin.students.index')->with('status', "{$student->name}'s account and results were deleted.");
    }
}
