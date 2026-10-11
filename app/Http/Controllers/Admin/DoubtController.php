<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Student\DoubtController as StudentDoubtController;
use App\Models\Doubt;
use App\Models\Subject;
use App\Services\DoubtPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The shared Doubts inbox: every student's doubt lands here, open ones oldest first, and anyone with the Doubts
 * section can answer, close or reopen them.
 */
class DoubtController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = in_array($request->query('status'), [...Doubt::STATUSES, 'all'], true) ? $request->query('status') : Doubt::OPEN;
        $filters = $request->only('subject', 'search');

        $doubts = Doubt::with('user:id,name', 'subject:id,name', 'topic:id,name')->withCount('replies')
            ->when($tab !== 'all', fn ($q) => $q->where('status', $tab))
            ->when($filters['subject'] ?? null, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('body', 'like', "%{$s}%")->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"))))
            // Waiting doubts: whoever has waited longest first. Everything else: latest activity first.
            ->when($tab === Doubt::OPEN, fn ($q) => $q->oldest('last_activity_at'), fn ($q) => $q->latest('last_activity_at'))
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Doubt $d) => DoubtPresenter::summary($d));

        return Inertia::render('admin/doubts/index', [
            'doubts' => $doubts,
            'tab' => $tab,
            'filters' => $filters,
            'counts' => Doubt::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status'),
            'subjects' => Subject::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Request $request, Doubt $doubt): Response
    {
        $doubt->load('user:id,name,email');

        return Inertia::render('admin/doubts/show', [
            'doubt' => DoubtPresenter::thread($doubt),
            'student' => [
                ...$doubt->user->only('id', 'name', 'email'),
                'url' => $request->user()->can('manage-students') ? route('admin.students.show', $doubt->user_id) : null,
            ],
        ]);
    }

    public function reply(Request $request, Doubt $doubt): RedirectResponse
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:5000'], 'photo' => StudentDoubtController::PHOTO_RULES]);

        $doubt->addReply($request->user(), $data['body'], $request->file('photo')?->store('doubts', Doubt::DISK));

        return back()->with('status', 'Answer sent. The student will see it on their Doubts page.');
    }

    public function status(Request $request, Doubt $doubt): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in([Doubt::OPEN, Doubt::CLOSED])]]);

        $doubt->update(['status' => $data['status']]);

        return back()->with('status', $data['status'] === Doubt::CLOSED ? 'Doubt closed.' : 'Doubt reopened.');
    }
}
