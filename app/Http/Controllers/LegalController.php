<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Terms, Privacy and User Policy. The text lives in resources/js/pages/legal.tsx.
 */
class LegalController extends Controller
{
    public function show(Request $request, string $page): Response
    {
        return Inertia::render('legal', [
            'page' => $page,
            ...HomeController::publicProps($request),
        ]);
    }
}
