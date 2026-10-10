<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The subject bank and the topics inside each subject, on one page.
 */
class SubjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/subjects/index', [
            'subjects' => Subject::withCount('questions')
                ->with(['exams:id,name', 'topics' => fn ($q) => $q->withCount('questions')])
                ->orderBy('name')
                ->get()
                ->map(fn (Subject $subject) => [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'questions_count' => $subject->questions_count,
                    'untagged_count' => $subject->questions()->whereNull('topic_id')->count(),
                    'exams' => $subject->exams->pluck('name'),
                    'topics' => $subject->topics->map(fn (Topic $t) => ['id' => $t->id, 'name' => $t->name, 'questions_count' => $t->questions_count]),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255', 'unique:subjects,name']]);
        Subject::create($data);

        return back()->with('status', "Subject “{$data['name']}” added.");
    }

    public function update(Request $request, Subject $subject): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255', Rule::unique('subjects')->ignore($subject)]]);
        $subject->update($data);

        return back()->with('status', 'Subject renamed.');
    }

    public function destroy(Subject $subject): RedirectResponse
    {
        $subject->delete();

        return back()->with('status', "Subject “{$subject->name}” and its questions were deleted.");
    }

    public function storeTopic(Request $request, Subject $subject): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255', Rule::unique('topics')->where('subject_id', $subject->id)]]);
        $subject->topics()->create([...$data, 'position' => (int) $subject->topics()->max('position') + 1]);

        return back()->with('status', "Topic “{$data['name']}” added to {$subject->name}.");
    }

    public function updateTopic(Request $request, Topic $topic): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('topics')->where('subject_id', $topic->subject_id)->ignore($topic)],
        ]);
        $topic->update($data);

        return back()->with('status', 'Topic renamed.');
    }

    /**
     * Moves a topic one place up or down within its subject.
     */
    public function moveTopic(Request $request, Topic $topic): RedirectResponse
    {
        $direction = $request->validate(['direction' => ['required', Rule::in(['up', 'down'])]])['direction'];
        $topics = $topic->subject->topics()->get()->values();
        $index = $topics->search(fn ($t) => $t->id === $topic->id);
        $swap = $direction === 'up' ? $index - 1 : $index + 1;

        if (isset($topics[$swap])) {
            $ordered = $topics->all();
            [$ordered[$index], $ordered[$swap]] = [$ordered[$swap], $ordered[$index]];
            foreach ($ordered as $position => $t) {
                $t->update(['position' => $position]);
            }
        }

        return back();
    }

    /**
     * Deleting a topic keeps its questions in the subject, without a topic.
     */
    public function destroyTopic(Topic $topic): RedirectResponse
    {
        $topic->delete();

        return back()->with('status', "Topic “{$topic->name}” deleted. Its questions stay in the subject.");
    }
}
