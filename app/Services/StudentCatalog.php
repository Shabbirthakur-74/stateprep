<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestSeries;
use App\Models\User;

/**
 * Published content shaped for the student screens: exams, the subject bank with its topics,
 * timed papers (mock tests and previous year papers), test series and study material.
 */
class StudentCatalog
{
    /**
     * Active exams with how much published content each one has.
     *
     * @return list<array<string, mixed>>
     */
    public static function exams(): array
    {
        $papers = self::paperQuery()->get(['id', 'exam_id', 'type']);
        $questionsPerSubject = Question::selectRaw('subject_id, COUNT(*) as total')->groupBy('subject_id')->pluck('total', 'subject_id');

        return Exam::where('is_active', true)
            ->with('subjects:id')
            ->orderBy('name')
            ->get()
            ->map(fn (Exam $exam) => [
                'id' => $exam->id,
                'name' => $exam->name,
                'slug' => $exam->slug,
                'description' => $exam->description,
                'subjects_count' => $exam->subjects->count(),
                'questions_count' => (int) $exam->subjects->sum(fn ($s) => $questionsPerSubject[$s->id] ?? 0),
                'mock_count' => $papers->where('exam_id', $exam->id)->where('type', 'mock')->count(),
                'pyq_count' => $papers->where('exam_id', $exam->id)->where('type', 'pyq')->count(),
            ])
            ->all();
    }

    /**
     * The subject bank for the Quizzes screen: subjects with questions, each with its topics.
     *
     * @return list<array<string, mixed>>
     */
    public static function quizSubjects(?User $student = null): array
    {
        // Questions the student has been given in quizzes, counted per subject and per topic ("18 of 30 seen").
        $seen = $student
            ? Question::joinSub(QuizService::seenBy($student), 'seen', 'seen.question_id', '=', 'questions.id')->get(['subject_id', 'topic_id'])
            : collect();

        return Subject::whereHas('questions')
            ->withCount('questions')
            ->with(['topics' => fn ($q) => $q->withCount('questions')])
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'questions_count' => $subject->questions_count,
                'seen' => $seen->where('subject_id', $subject->id)->count(),
                'topics' => $subject->topics
                    ->filter(fn ($topic) => $topic->questions_count > 0)
                    ->map(fn ($topic) => ['id' => $topic->id, 'name' => $topic->name, 'questions_count' => $topic->questions_count, 'seen' => $seen->where('topic_id', $topic->id)->count()])
                    ->values()
                    ->all(),
            ])
            ->all();
    }

    /**
     * Published general quizzes made in admin, with the student's attempts and best score.
     *
     * @return list<array<string, mixed>>
     */
    public static function readyQuizzes(User $student): array
    {
        $results = $student->quizAttempts()->whereNotNull('quiz_id')->whereNotNull('submitted_at')
            ->get(['quiz_id', 'correct_count', 'total_questions'])
            ->groupBy('quiz_id');

        return Quiz::available()->whereNull('exam_id')
            ->with('subject:id,name', 'topic:id,name')
            ->withCount('questions')
            ->orderBy('title')
            ->get()
            ->map(fn (Quiz $quiz) => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'description' => $quiz->description,
                'subject' => $quiz->subject?->name,
                'topic' => $quiz->topic?->name,
                'cover_url' => $quiz->coverUrl(),
                'questions_count' => $quiz->questions_count,
                'attempts' => $results->get($quiz->id)?->count() ?? 0,
                'best_percent' => $results->get($quiz->id)?->max(fn ($a) => $a->total_questions ? round($a->correct_count / $a->total_questions * 100) : 0),
            ])
            ->all();
    }

    /**
     * Published mock tests or previous year papers.
     *
     * @param  'mock'|'pyq'  $type
     * @return list<array<string, mixed>>
     */
    public static function papers(string $type): array
    {
        return self::paperQuery()
            ->where('type', $type)
            ->withCount('questions')
            ->with('exam:id,name')
            ->orderByDesc('year')
            ->orderBy('title')
            ->get()
            ->map(fn (MockTest $test) => self::paper($test))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function paper(MockTest $test): array
    {
        return [
            'id' => $test->id,
            'title' => $test->title,
            'year' => $test->year,
            'exam' => $test->exam,
            'cover_url' => $test->coverUrl(),
            'questions_count' => $test->questions_count,
            'total_marks' => round($test->questions_count * $test->marks_per_question, 2),
            'duration_minutes' => $test->duration_minutes,
            'marks_per_question' => $test->marks_per_question,
            'negative_marks' => $test->negative_marks,
            'is_free' => $test->is_free,
            'price' => $test->price,
        ];
    }

    /**
     * Published test series with the published tests inside them.
     *
     * @return list<array<string, mixed>>
     */
    public static function series(): array
    {
        return TestSeries::where('is_published', true)
            ->with(['exam:id,name', 'mockTests' => fn ($q) => $q->where('is_published', true)->withCount('questions')])
            ->orderBy('title')
            ->get()
            ->map(fn (TestSeries $series) => [
                ...self::seriesSummary($series),
                'tests' => $series->mockTests->map(fn (MockTest $test) => [
                    'id' => $test->id,
                    'title' => $test->title,
                    'questions_count' => $test->questions_count,
                    'duration_minutes' => $test->duration_minutes,
                ])->all(),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function seriesSummary(TestSeries $series): array
    {
        return [
            'id' => $series->id,
            'title' => $series->title,
            'description' => $series->description,
            'exam' => $series->exam,
            'cover_url' => $series->coverUrl(),
            'is_free' => $series->is_free,
            'price' => $series->price,
        ];
    }

    /**
     * Published study material, flagged with whether the student saved it.
     *
     * @return list<array<string, mixed>>
     */
    public static function materials(User $student): array
    {
        $saved = $student->savedMaterials()->pluck('study_materials.id')->all();

        return StudyMaterial::available()
            ->with('exam:id,name')
            ->orderBy('title')
            ->get()
            ->map(fn (StudyMaterial $material) => [...self::material($material), 'saved' => in_array($material->id, $saved, true)])
            ->all();
    }

    /**
     * The student's saved study material that is still published, most recently saved first.
     *
     * @return list<array<string, mixed>>
     */
    public static function savedMaterials(User $student): array
    {
        return $student->savedMaterials()
            ->available()
            ->with('exam:id,name')
            ->orderByPivot('created_at', 'desc')
            ->orderByPivot('id', 'desc')
            ->get()
            ->map(fn (StudyMaterial $material) => [
                ...self::material($material),
                'saved' => true,
                'saved_at' => $material->pivot->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function material(StudyMaterial $material): array
    {
        return [
            'id' => $material->id,
            'title' => $material->title,
            'description' => $material->description,
            'exam' => $material->exam,
            'cover_url' => $material->coverUrl(),
            'format' => $material->formatLabel(),
            'is_free' => $material->is_free,
            'price' => $material->price,
        ];
    }

    /**
     * Bank subjects with the exams they belong to, for "Practice by subject" and performance analysis.
     *
     * @return list<array<string, mixed>>
     */
    public static function subjects(): array
    {
        return Subject::withCount('questions')
            ->with('exams:id')
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'exam_ids' => $subject->exams->pluck('id')->all(),
                'name' => $subject->name,
                'questions_count' => $subject->questions_count,
            ])
            ->all();
    }

    /**
     * One sample question per exam, answer included, for the "try a question" preview.
     *
     * @return list<array<string, mixed>>
     */
    public static function sampleQuestions(): array
    {
        return Exam::where('is_active', true)->get(['id'])
            ->map(function (Exam $exam) {
                $question = Question::whereHas('subject.exams', fn ($q) => $q->where('exams.id', $exam->id))
                    ->with('subject:id,name')
                    ->whereNotNull('explanation')
                    ->orderBy('id')
                    ->first();

                return $question ? [
                    'id' => $question->id,
                    'exam_id' => $exam->id,
                    'subject' => $question->subject->name,
                    'text' => $question->text,
                    'options' => ['A' => $question->option_a, 'B' => $question->option_b, 'C' => $question->option_c, 'D' => $question->option_d],
                    'correct' => $question->correct_option,
                    'explanation' => $question->explanation,
                ] : null;
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Published papers that belong to an active exam and actually contain questions.
     */
    private static function paperQuery()
    {
        return MockTest::where('is_published', true)
            ->whereHas('exam', fn ($q) => $q->where('is_active', true))
            ->has('questions');
    }
}
