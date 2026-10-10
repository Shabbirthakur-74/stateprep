<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Subject;
use App\Models\Topic;
use App\Services\QuizService;
use App\Services\StudentCatalog;
use App\Services\StudentStats;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class QuizController extends Controller
{
    public function __construct(private QuizService $quizzes) {}

    /**
     * The subject bank: pick a subject, then a topic, a mixed quiz of the whole subject, or a random quiz.
     */
    public function index(Request $request): Response
    {
        $stats = new StudentStats($request->user());

        return Inertia::render('student/quizzes', [
            'subjects' => StudentCatalog::quizSubjects($request->user()),
            'ready' => StudentCatalog::readyQuizzes($request->user()),
            'lengths' => QuizService::LENGTHS,
            'overview' => $stats->overview(),
            'recent' => collect($stats->attempts(10))->where('kind', 'quiz')->take(5)->values(),
            'inProgress' => collect($stats->inProgress())->where('kind', 'quiz')->values(),
        ]);
    }

    public function start(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'mode' => ['required', Rule::in(QuizAttempt::MODES)],
            'subject_id' => ['required_unless:mode,random', 'nullable', 'exists:subjects,id'],
            'topic_id' => ['required_if:mode,topic', 'nullable', 'exists:topics,id'],
            'length' => ['required', 'integer', Rule::in(QuizService::LENGTHS)],
        ]);

        $subject = $data['mode'] === QuizAttempt::RANDOM ? null : Subject::find($data['subject_id']);
        $topic = $data['mode'] === QuizAttempt::TOPIC ? Topic::where('subject_id', $subject->id)->findOrFail($data['topic_id']) : null;

        $attempt = $this->quizzes->start($request->user(), $data['mode'], $subject, $topic, $data['length']);

        return to_route('student.quizzes.show', $attempt);
    }

    /**
     * Starts a ready-made quiz: a general one, or a free sample of an exam bundle.
     */
    public function startReady(Request $request, Quiz $quiz): RedirectResponse
    {
        $quiz = Quiz::available()->findOrFail($quiz->id);

        if (! $quiz->isPlayable()) {
            return back()->withErrors(['quiz' => "This quiz is part of the {$quiz->exam->name} bundle. Buying exams is coming soon."]);
        }

        return to_route('student.quizzes.show', $this->quizzes->startReady($request->user(), $quiz));
    }

    /**
     * The quiz player while it is running, and the result with a full review once it is finished.
     * The right answer and explanation of a question are only sent after it has been answered.
     */
    public function show(Request $request, QuizAttempt $attempt): Response
    {
        $this->authorizeOwner($request, $attempt);

        $answers = $attempt->answers()->with('question.subject:id,name', 'question.topic:id,name')->get();
        $finished = $attempt->isSubmitted();

        return Inertia::render('student/quiz-attempt', [
            'attempt' => [
                ...StudentStats::summary($attempt),
                'subject_id' => $attempt->subject_id,
                'topic_id' => $attempt->topic_id,
                'quiz_id' => $attempt->quiz_id,
                'submitted' => $finished,
            ],
            'lengths' => QuizService::LENGTHS,
            'questions' => $answers->map(function ($answer) use ($finished) {
                $question = $answer->question;
                $revealed = $finished || $answer->selected_option !== null;

                return [
                    'id' => $question->id,
                    'position' => $answer->position,
                    'text' => $question->text,
                    'options' => ['A' => $question->option_a, 'B' => $question->option_b, 'C' => $question->option_c, 'D' => $question->option_d],
                    'subject' => $question->subject?->name,
                    'topic' => $question->topic?->name,
                    'selected' => $answer->selected_option,
                    'is_correct' => $answer->is_correct,
                    'correct' => $revealed ? $question->correct_option : null,
                    'explanation' => $revealed ? $question->explanation : null,
                ];
            }),
        ]);
    }

    public function answer(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'option' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
        ]);

        $this->quizzes->answer($attempt, $data['question_id'], $data['option']);

        return back();
    }

    public function finish(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $this->authorizeOwner($request, $attempt);

        $this->quizzes->finish($attempt);

        return to_route('student.quizzes.show', $attempt);
    }

    private function authorizeOwner(Request $request, QuizAttempt $attempt): void
    {
        abort_unless($attempt->user_id === $request->user()->id, 404);
    }
}
