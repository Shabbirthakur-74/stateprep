<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Doubt;
use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\QuizAttempt;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestAttempt;
use App\Models\TestSeries;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'students' => User::where('role', Role::Student)->count(),
                'admins' => User::whereIn('role', Role::staff())->count(),
                'newThisWeek' => User::where('role', Role::Student)->where('created_at', '>=', now()->subWeek())->count(),
                'quizzesTaken' => QuizAttempt::whereNotNull('submitted_at')->count(),
                'testsTaken' => TestAttempt::whereNotNull('submitted_at')->count(),
            ],
            'content' => [
                'exams' => Exam::count(),
                'subjects' => Subject::count(),
                'questions' => Question::count(),
                'tests' => MockTest::count(),
                'series' => TestSeries::count(),
                'materials' => StudyMaterial::count(),
            ],
            'openDoubts' => request()->user()->can('manage-doubts') ? Doubt::where('status', Doubt::OPEN)->count() : null,
            'recentStudents' => User::where('role', Role::Student)
                ->latest()->limit(5)->get(['id', 'name', 'email', 'created_at']),
        ]);
    }
}
