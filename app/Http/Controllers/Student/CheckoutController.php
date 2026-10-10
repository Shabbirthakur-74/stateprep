<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Services\PublicCatalog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The payment page for an exam bundle. The online payment step itself is not connected yet.
 */
class CheckoutController extends Controller
{
    public function show(Request $request, Exam $exam): Response
    {
        abort_unless($exam->is_active && $exam->isForSale(), 404);

        $page = PublicCatalog::examPage($exam);

        return Inertia::render('student/checkout', [
            'exam' => $page['exam'],
            'counts' => $page['counts'],
        ]);
    }
}
