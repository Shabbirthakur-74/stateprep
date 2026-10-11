<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Doubt;
use App\Models\Question;
use App\Models\User;
use App\Services\DoubtPresenter;
use App\Services\StudentCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asking doubts and following the conversation with the team. Every signed-in student can ask; a doubt may
 * carry a photo and a test or quiz question the student has already seen.
 */
class DoubtController extends Controller
{
    public const PHOTO_RULES = ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $unread = $user->doubts()->unreadByStudent()->pluck('id')->all();
        $question = $request->integer('question') ? Question::find($request->integer('question')) : null;

        return Inertia::render('student/doubts/index', [
            'doubts' => $user->doubts()->with('subject:id,name', 'topic:id,name')->withCount('replies')->latest('last_activity_at')->get()
                ->map(fn (Doubt $d) => [...DoubtPresenter::summary($d), 'unread' => in_array($d->id, $unread, true)]),
            'subjects' => StudentCatalog::quizSubjects(),
            // Opened from a quiz or test solution: that question is attached (only one the student has seen).
            'attach' => $question && self::hasSeen($user, $question->id) ? DoubtPresenter::question($question) : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'topic_id' => ['nullable', Rule::exists('topics', 'id')->where('subject_id', $request->input('subject_id'))],
            'body' => ['required', 'string', 'min:10', 'max:3000'],
            'photo' => self::PHOTO_RULES,
            'question_id' => ['nullable', 'integer', 'exists:questions,id'],
        ], ['body.min' => 'Please describe your doubt in a little more detail.']);

        $question = isset($data['question_id']) ? Question::find($data['question_id']) : null;
        if ($question && ! self::hasSeen($user, $question->id)) {
            throw ValidationException::withMessages(['question_id' => 'You can only ask about questions from your own quizzes and tests.']);
        }

        $doubt = $user->doubts()->create([
            // An attached question fills in its subject and topic.
            'subject_id' => $data['subject_id'] ?? $question?->subject_id,
            'topic_id' => isset($data['subject_id']) ? ($data['topic_id'] ?? null) : $question?->topic_id,
            'question_id' => $question?->id,
            'body' => $data['body'],
            'image_path' => $request->file('photo')?->store('doubts', Doubt::DISK),
        ]);

        return to_route('student.doubts.show', $doubt)->with('status', 'Your doubt has been sent. You will see the answer here.');
    }

    public function show(Request $request, Doubt $doubt): Response
    {
        $this->authorizeOwner($request, $doubt);
        $doubt->forceFill(['student_seen_at' => now()])->save();

        return Inertia::render('student/doubts/show', ['doubt' => DoubtPresenter::thread($doubt)]);
    }

    public function reply(Request $request, Doubt $doubt): RedirectResponse
    {
        $this->authorizeOwner($request, $doubt);
        $data = $request->validate(['body' => ['required', 'string', 'max:3000'], 'photo' => self::PHOTO_RULES]);

        $doubt->addReply($request->user(), $data['body'], $request->file('photo')?->store('doubts', Doubt::DISK));

        return back()->with('status', 'Reply sent.');
    }

    public function resolve(Request $request, Doubt $doubt): RedirectResponse
    {
        $this->authorizeOwner($request, $doubt);
        $doubt->update(['status' => Doubt::CLOSED]);

        return back()->with('status', 'Marked as resolved. Reply any time to open it again.');
    }

    /**
     * Whether the question appeared in one of the student's quizzes or tests.
     */
    public static function hasSeen(User $user, int $questionId): bool
    {
        return DB::table('quiz_attempt_answers')->join('quiz_attempts', 'quiz_attempts.id', '=', 'quiz_attempt_answers.quiz_attempt_id')
            ->where('quiz_attempts.user_id', $user->id)->where('quiz_attempt_answers.question_id', $questionId)->exists()
            || DB::table('test_attempt_answers')->join('test_attempts', 'test_attempts.id', '=', 'test_attempt_answers.test_attempt_id')
                ->where('test_attempts.user_id', $user->id)->where('test_attempt_answers.question_id', $questionId)->exists();
    }

    private function authorizeOwner(Request $request, Doubt $doubt): void
    {
        abort_unless($doubt->user_id === $request->user()->id, 404);
    }
}
