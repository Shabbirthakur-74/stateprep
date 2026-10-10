<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\HomeCard;
use App\Models\MockTest;
use App\Models\Notice;
use App\Models\Quiz;
use App\Models\StudyMaterial;
use App\Models\Subject;
use App\Models\TestSeries;
use Illuminate\Database\Eloquent\Model;

/**
 * What visitors see before signing in: the homepage exam list and carousels, and the public exam pages.
 */
class PublicCatalog
{
    /**
     * Exams listed under "Exams We Cover".
     *
     * @return list<array{name: string, slug: string}>
     */
    public static function homeExams(): array
    {
        return Exam::onHome()->get(['name', 'slug'])->map->only('name', 'slug')->all();
    }

    /**
     * Cards of a homepage carousel, skipping anything that is no longer published.
     *
     * @return list<array<string, mixed>>
     */
    public static function homeCards(string $section): array
    {
        return HomeCard::forSection($section)
            ->filter(fn (HomeCard $card) => $card->cardable && self::isPublic($card->cardable))
            ->map(fn (HomeCard $card) => self::card($card))
            ->values()
            ->all();
    }

    /**
     * Whether the item a card points at can be shown to visitors.
     */
    public static function isPublic(Model $item): bool
    {
        $examActive = $item->exam === null ? $item instanceof TestSeries : $item->exam->is_active;

        return $item->is_published && $examActive && (! $item instanceof MockTest || $item->questions()->exists());
    }

    /**
     * @return array<string, mixed>
     */
    private static function card(HomeCard $card): array
    {
        $item = $card->cardable;
        $exam = $item->exam;

        [$kind, $description, $highlights, $action] = match (true) {
            $item instanceof TestSeries => self::seriesCard($item),
            $item instanceof MockTest => self::testCard($item),
            default => self::materialCard($item),
        };

        return [
            'id' => $card->id,
            'kind' => $kind,
            'exam' => $exam?->name,
            'badge' => $card->badge,
            'title' => $item->title,
            'description' => $description,
            'highlights' => array_slice(array_values(array_filter($card->highlights ?? [])) ?: $highlights, 0, 3),
            'tag' => $card->tag ?: ($item->is_free ? 'Free' : '₹'.self::money($item->price)),
            'tone' => $item->is_free ? 'green' : 'blue',
            'action' => $action,
            // Cards lead to the exam's page, where its content is listed and the exam can be bought.
            'href' => $exam?->is_active ? route('exams.show', $exam->slug).'#inside' : null,
        ];
    }

    private static function seriesCard(TestSeries $series): array
    {
        $tests = $series->mockTests()->where('is_published', true)->withCount('questions')->get();
        $count = $tests->count();

        return [
            'series',
            $series->description ?: "{$count} full-length mock tests in one pack.",
            [self::plural($count, 'Mock Test'), self::plural($tests->sum('questions_count'), 'Question'), $series->is_free ? 'Free' : 'Full Solutions'],
            'Explore Test Series',
        ];
    }

    private static function testCard(MockTest $test): array
    {
        $questions = $test->questions()->count();
        $pyq = $test->type === 'pyq';
        $year = $test->year ? " ({$test->year})" : '';

        return [
            $pyq ? 'pyq' : 'mock',
            $pyq
                ? "Previous year paper{$year} • {$questions} questions • {$test->duration_minutes} minutes • Detailed solutions."
                : "{$questions} questions • {$test->duration_minutes} minutes • Latest exam pattern • Detailed solutions.",
            [self::plural($questions, 'Question'), "{$test->duration_minutes} Minutes", $test->negative_marks > 0 ? 'Negative Marking' : 'No Negative'],
            $pyq ? 'Practise this Paper' : ($test->is_free ? 'Start Free Mock' : 'Explore Mock Test'),
        ];
    }

    private static function materialCard(StudyMaterial $material): array
    {
        return [
            'material',
            $material->description ?: 'Focused notes and revision material for quick, exam-ready preparation.',
            [$material->formatLabel(), 'Read Online', $material->is_free ? 'Free' : 'Premium'],
            'Explore Study Material',
        ];
    }

    /**
     * Everything the public exam page shows.
     *
     * @return array<string, mixed>
     */
    public static function examPage(Exam $exam): array
    {
        $subjects = $exam->subjects()->with('topics:id,subject_id,name')->withCount('questions')->orderBy('name')->get();
        $tests = MockTest::where('exam_id', $exam->id)->where('is_published', true)->has('questions')->withCount('questions')
            ->orderByDesc('year')->orderBy('title')->get();
        $series = TestSeries::where('exam_id', $exam->id)->where('is_published', true)
            ->withCount(['mockTests' => fn ($q) => $q->where('is_published', true)])->orderBy('title')->get();
        $materials = StudyMaterial::available()->where('exam_id', $exam->id)->orderBy('title')->get();
        $quizzes = Quiz::available()->where('exam_id', $exam->id)->withCount('questions')->orderByDesc('is_free')->orderBy('title')->get();
        [$pyqs, $mocks] = $tests->partition(fn (MockTest $test) => $test->type === 'pyq');

        return [
            'exam' => [
                ...$exam->only('id', 'name', 'slug', 'description', 'overview', 'is_free', 'price', 'original_price', 'validity_months'),
                'cover_url' => $exam->coverUrl(),
                'facts' => $exam->facts ?? [],
                'highlights' => $exam->highlights ?? [],
                'faqs' => $exam->faqs ?? [],
                'for_sale' => $exam->isForSale(),
            ],
            'counts' => [
                'mocks' => $mocks->count(),
                'pyqs' => $pyqs->count(),
                'series' => $series->count(),
                'materials' => $materials->count(),
                'quizzes' => $quizzes->count(),
                'subjects' => $subjects->count(),
                'topics' => $subjects->sum(fn (Subject $s) => $s->topics->count()),
                'questions' => $subjects->sum('questions_count'),
            ],
            'syllabus' => $subjects->map(fn (Subject $subject) => [
                'name' => $subject->name,
                'questions_count' => $subject->questions_count,
                'topics' => $subject->topics->pluck('name'),
            ])->all(),
            'inside' => [
                'series' => $series->map(fn (TestSeries $s) => ['title' => $s->title, 'detail' => self::plural($s->mock_tests_count, 'test'), 'is_free' => $s->is_free])->all(),
                'mocks' => $mocks->map(fn (MockTest $t) => ['title' => $t->title, 'detail' => "{$t->questions_count} Qs • {$t->duration_minutes} min", 'is_free' => $t->is_free])->values()->all(),
                'pyqs' => $pyqs->map(fn (MockTest $t) => ['title' => $t->title, 'detail' => trim(($t->year ? "{$t->year} • " : '')."{$t->questions_count} Qs"), 'is_free' => $t->is_free])->values()->all(),
                'materials' => $materials->map(fn (StudyMaterial $m) => ['title' => $m->title, 'detail' => $m->formatLabel(), 'is_free' => $m->is_free])->all(),
                // Free sample quizzes can be played from the exam page.
                'quizzes' => $quizzes->map(fn (Quiz $q) => ['id' => $q->id, 'title' => $q->title, 'detail' => "{$q->questions_count} questions", 'is_free' => $q->is_free])->all(),
            ],
            'notices' => Notice::board(5, $exam->id),
            'otherExams' => collect(self::homeExams())->reject(fn ($e) => $e['slug'] === $exam->slug)->values()->all(),
        ];
    }

    private static function plural(int $n, string $word): string
    {
        return $n.' '.$word.($n === 1 ? '' : 's');
    }

    public static function money(?float $amount): string
    {
        return rtrim(rtrim(number_format((float) $amount, 2, '.', ','), '0'), '.');
    }
}
