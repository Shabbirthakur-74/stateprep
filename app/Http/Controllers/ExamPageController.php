<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Services\PublicCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public exam pages: what the exam is and what buying it unlocks, open to everyone without signing in.
 */
class ExamPageController extends Controller
{
    public function show(Request $request, Exam $exam): Response
    {
        abort_unless($exam->is_active, 404);

        return Inertia::render('exam', [
            ...PublicCatalog::examPage($exam),
            ...HomeController::publicProps($request),
        ]);
    }

    /**
     * The "Buy" button. Students go to payment; visitors sign up first and then carry on to payment.
     */
    public function buy(Request $request, Exam $exam): RedirectResponse
    {
        abort_unless($exam->is_active, 404);

        $user = $request->user();

        if (! $user) {
            // Remember the purchase, so signing up (or logging in) continues straight to payment.
            return redirect()->guest(route('exams.show', [$exam->slug, 'auth' => 'register']))
                ->with('status', "Create your free account to buy {$exam->name}. You'll go straight to payment after signing up.");
        }

        if (! $user->isStudent()) {
            return back()->with('status', 'Team accounts cannot buy exams. Log out and use a student account.');
        }

        if (! $exam->isForSale()) {
            return to_route('student.dashboard');
        }

        return to_route('student.checkout', $exam->slug);
    }
}
