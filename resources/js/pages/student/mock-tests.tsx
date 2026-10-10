import { PaperCard } from '@/components/paper-card';
import { EmptyState, ExamPicker, Eyebrow, MiniStat, PageHeading, Panel, plural, type ExamSummary, type Paper } from '@/components/student-kit';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { BarChart3, ClipboardList, Info, Search } from 'lucide-react';
import { useState } from 'react';

const priceFilters = [
    { key: 'all', label: 'All' },
    { key: 'free', label: 'Free' },
    { key: 'paid', label: 'Paid' },
] as const;

const instructions = [
    'Each test runs on a fixed timer that starts as soon as you begin and cannot be paused.',
    'Use the question palette to jump between questions and mark any for review.',
    'Negative marking, where shown, applies exactly as in the real exam.',
    'Your score, accuracy and solutions appear right after you submit.',
];

export default function MockTests({ exams, papers }: { exams: ExamSummary[]; papers: Paper[] }) {
    const [examId, setExamId] = useState<number | null>(null);
    const [price, setPrice] = useState<(typeof priceFilters)[number]['key']>('all');
    const [search, setSearch] = useState('');

    const visible = papers.filter(
        (p) =>
            (examId === null || p.exam.id === examId) &&
            (price === 'all' || (price === 'free' ? p.is_free : !p.is_free)) &&
            p.title.toLowerCase().includes(search.trim().toLowerCase()),
    );

    return (
        <StudentLayout title="Mock Tests">
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={ClipboardList}>Practice &amp; Tests • Full Length</Eyebrow>}
                    title="Mock Tests"
                    description="Full-length timed tests that follow the real exam pattern, so exam day feels familiar."
                    aside={
                        <div className="flex flex-wrap gap-3">
                            <MiniStat label="Mock Tests" value={String(papers.length)} hint="Across all exams" />
                            <MiniStat label="Attempted" value="0" hint="Tests taken" />
                            <MiniStat label="Best Score" value="—" hint="No attempts yet" />
                        </div>
                    }
                />

                <section>
                    <h2 className="mb-3 font-semibold">Choose an Exam</h2>
                    <ExamPicker exams={exams} value={examId} onChange={setExamId} count={(e) => plural(e.mock_count, 'mock test')} />
                </section>

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                    <div className="min-w-0 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-card flex rounded-lg border p-1">
                                {priceFilters.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={price === key}
                                        onClick={() => setPrice(key)}
                                        className={cn(
                                            'rounded-md px-3 py-1.5 text-sm',
                                            price === key ? 'bg-indigo-600 text-white' : 'text-muted-foreground',
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <label className="bg-card flex min-w-56 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                                <Search className="text-muted-foreground size-4" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search mock tests..."
                                    className="w-full bg-transparent outline-none"
                                />
                            </label>
                        </div>
                        {visible.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="No mock tests here yet"
                                description="Mock tests for this selection are being prepared. Try another exam or filter."
                                className="bg-card"
                            />
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {visible.map((paper) => (
                                    <PaperCard key={paper.id} paper={paper} kind="mock" />
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="space-y-6">
                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <BarChart3 className="size-4 text-indigo-600" /> Your Mock Performance
                            </h2>
                            <p className="text-muted-foreground mt-3 text-sm">Scores, accuracy and rank from your mock tests will be charted here.</p>
                        </Panel>
                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <Info className="size-4 text-indigo-600" /> Exam Day Instructions
                            </h2>
                            <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-4 text-sm">
                                {instructions.map((line) => (
                                    <li key={line}>{line}</li>
                                ))}
                            </ol>
                        </Panel>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
