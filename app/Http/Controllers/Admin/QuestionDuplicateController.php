<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\QuestionMerger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Find duplicates" in the question bank, and merging a group into one question.
 */
class QuestionDuplicateController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/questions/duplicates', ['groups' => QuestionMerger::groups()]);
    }

    public function merge(Request $request, QuestionMerger $merger): RedirectResponse
    {
        $data = $request->validate([
            'keep_id' => ['required', 'integer', 'exists:questions,id'],
            'merge_ids' => ['required', 'array', 'min:1'],
            'merge_ids.*' => ['integer', 'exists:questions,id'],
        ]);

        $removed = $merger->merge($data['keep_id'], $data['merge_ids']);

        return back()->with('status', $removed === 1 ? '1 duplicate merged into the kept question.' : "{$removed} duplicates merged into the kept question.");
    }
}
