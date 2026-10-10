<?php

namespace App\Http\Controllers\Admin;

use App\Enums\NoticeCategory;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Notice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Exam notifications and announcements for the notice board on the home page and student dashboard.
 */
class NoticeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/notices/index', [
            'notices' => Notice::with('exam:id,name')->orderByDesc('is_pinned')->orderByDesc('published_on')->latest('id')->get()
                ->map(fn (Notice $n) => [
                    ...$n->only('id', 'title', 'summary', 'url', 'is_pinned', 'is_published'),
                    'category' => $n->category->label(),
                    'exam' => $n->exam?->name,
                    'published_on' => $n->published_on->toDateString(),
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/notices/form', $this->formOptions());
    }

    public function store(Request $request): RedirectResponse
    {
        Notice::create($this->validated($request));

        return to_route('admin.notices.index')->with('status', 'Notice posted.');
    }

    public function edit(Notice $notice): Response
    {
        return Inertia::render('admin/notices/form', [
            ...$this->formOptions(),
            'notice' => [
                ...$notice->only('id', 'exam_id', 'title', 'summary', 'url', 'is_pinned', 'is_published'),
                'category' => $notice->category->value,
                'published_on' => $notice->published_on->toDateString(),
            ],
        ]);
    }

    public function update(Request $request, Notice $notice): RedirectResponse
    {
        $notice->update($this->validated($request));

        return to_route('admin.notices.index')->with('status', 'Notice saved.');
    }

    public function destroy(Notice $notice): RedirectResponse
    {
        $notice->delete();

        return back()->with('status', 'Notice deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'exam_id' => ['nullable', 'exists:exams,id'],
            'category' => ['required', Rule::enum(NoticeCategory::class)],
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:500'],
            'url' => ['nullable', 'url', 'max:2048'],
            'published_on' => ['required', 'date'],
            'is_pinned' => ['required', 'boolean'],
            'is_published' => ['required', 'boolean'],
        ]);
    }

    private function formOptions(): array
    {
        return [
            'exams' => Exam::orderBy('name')->get(['id', 'name']),
            'categories' => array_map(fn ($c) => ['value' => $c->value, 'label' => $c->label()], NoticeCategory::cases()),
        ];
    }
}
