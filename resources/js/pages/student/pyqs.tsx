import { PaperCard } from '@/components/paper-card';
import {
    EmptyState,
    ExamPicker,
    MiniStat,
    Panel,
    Pill,
    plural,
    ProgressBar,
    shortName,
    type ExamSummary,
    type Paper,
} from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout, { useComingSoon } from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { Archive, Bookmark, CircleCheck, CircleX, FileStack, House, Lightbulb, Search, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Subject {
    id: number;
    exam_ids: number[];
    name: string;
    questions_count: number;
}

interface Sample {
    id: number;
    exam_id: number;
    subject: string;
    text: string;
    options: Record<'A' | 'B' | 'C' | 'D', string>;
    correct: 'A' | 'B' | 'C' | 'D';
    explanation: string | null;
}

interface Props {
    exams: ExamSummary[];
    papers: Paper[];
    subjects: Subject[];
    samples: Sample[];
}

const modes = ['By Question Paper (Year-wise)', 'By Subject & Topic', 'Question Drill Mode'];

/** A real question from the bank: pick an option to see the answer and explanation. Nothing is recorded. */
function SampleQuestion({ sample }: { sample: Sample }) {
    const comingSoon = useComingSoon();
    const [picked, setPicked] = useState<string | null>(null);

    return (
        <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="indigo">Interactive Live Preview</Pill>
                    <span className="text-muted-foreground text-xs">{sample.subject}</span>
                </div>
                <button
                    type="button"
                    aria-label="Bookmark question"
                    onClick={() => comingSoon('Bookmarks')}
                    className="text-muted-foreground hover:text-indigo-600"
                >
                    <Bookmark className="size-4" />
                </button>
            </div>
            <h3 className="mt-4 font-semibold">Try a sample question</h3>
            <p className="mt-2 text-sm leading-relaxed">{sample.text}</p>
            <ul className="mt-4 space-y-2">
                {(Object.keys(sample.options) as (keyof Sample['options'])[]).map((letter) => {
                    const isCorrect = picked !== null && letter === sample.correct;
                    const isWrong = picked === letter && letter !== sample.correct;
                    return (
                        <li key={letter}>
                            <button
                                type="button"
                                disabled={picked !== null}
                                onClick={() => setPicked(letter)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                                    isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                                    isWrong && 'border-rose-500 bg-rose-50 dark:bg-rose-500/10',
                                    picked === null && 'hover:border-indigo-400',
                                )}
                            >
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                                    {letter}
                                </span>
                                <span className="flex-1">{sample.options[letter]}</span>
                                {isCorrect && <CircleCheck className="size-5 text-emerald-600" />}
                                {isWrong && <CircleX className="size-5 text-rose-600" />}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {picked && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm dark:bg-slate-800/60">
                    <p className="font-semibold">{picked === sample.correct ? 'Correct!' : `The answer is ${sample.correct}.`}</p>
                    {sample.explanation && <p className="text-muted-foreground mt-1">{sample.explanation}</p>}
                    <button type="button" onClick={() => setPicked(null)} className="mt-2 text-xs font-medium text-indigo-600 hover:underline">
                        Try again
                    </button>
                </div>
            )}
        </Panel>
    );
}

function Mastery({ papers }: { papers: Paper[] }) {
    return (
        <Panel>
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">Your PYQ Mastery</h2>
                <TrendingUp className="size-4 text-indigo-600" />
            </div>
            <div className="mx-auto mt-5 flex size-32 items-center justify-center rounded-full border-[10px] border-indigo-100 dark:border-slate-800">
                <div className="text-center">
                    <p className="font-display text-2xl font-bold">0%</p>
                    <p className="text-muted-foreground text-[10px] uppercase">Overall Accuracy</p>
                </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-center text-xs">
                {[
                    ['Attempted', '0'],
                    ['Correct', '0'],
                    ['Incorrect', '0'],
                    ['Completed Papers', `0 / ${papers.length}`],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="mt-0.5 text-base font-semibold">{value}</dd>
                    </div>
                ))}
            </dl>
        </Panel>
    );
}

export default function Pyqs({ exams, papers, subjects, samples }: Props) {
    const comingSoon = useComingSoon();
    const [examId, setExamId] = useState<number | null>(null);
    const [year, setYear] = useState('');
    const [search, setSearch] = useState('');

    const exam = exams.find((e) => e.id === examId) ?? null;
    const examLabel = exam ? shortName(exam.name) : 'All Exams';
    const years = useMemo(() => [...new Set(papers.map((p) => p.year).filter((y): y is number => !!y))].sort((a, b) => b - a), [papers]);

    const visible = papers.filter(
        (p) =>
            (examId === null || p.exam.id === examId) &&
            (!year || String(p.year) === year) &&
            p.title.toLowerCase().includes(search.trim().toLowerCase()),
    );
    const examSubjects = subjects.filter((s) => (examId === null || s.exam_ids.includes(examId)) && s.questions_count > 0);
    const sample = samples.find((s) => examId === null || s.exam_id === examId);
    const totalQuestions = papers.reduce((sum, p) => sum + p.questions_count, 0);

    return (
        <StudentLayout title="Previous Year Questions">
            <div className="mx-auto max-w-7xl space-y-6">
                <nav className="text-muted-foreground flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
                    <House className="size-3.5" />
                    <Link href={route('student.dashboard')} className="hover:text-foreground">
                        Home
                    </Link>
                    / Learn &amp; Study / <span className="text-foreground">Previous Year Questions (PYQs)</span>
                </nav>

                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="max-w-xl">
                        <Pill tone="indigo">Official Archives</Pill>
                        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">Previous Year Questions (PYQs)</h1>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Practise authentic papers from past state examinations. Build pattern recognition, spot recurring topics and calibrate
                            against real-time test difficulty.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <MiniStat label="Total PYQs" value={String(totalQuestions)} hint="All subjects" />
                        <MiniStat label="Solved by You" value="0" hint="—" />
                        <MiniStat label="Mastered Papers" value="0" hint={`of ${papers.length} available`} />
                        <MiniStat label="Pass Tier" value="Free" hint="Upgrade soon" />
                    </div>
                </div>

                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 font-semibold">
                            Choose an Exam <Pill tone="slate">{plural(exams.length, 'State Exam')}</Pill>
                        </h2>
                        <Link href={route('student.exams')} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                            Explore All Himachal Exams ›
                        </Link>
                    </div>
                    <ExamPicker exams={exams} value={examId} onChange={setExamId} count={(e) => plural(e.pyq_count, 'paper')} />
                </section>

                <Panel className="space-y-4 p-4 md:p-4">
                    <div className="flex flex-wrap gap-2">
                        {modes.map((mode, index) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => index > 0 && comingSoon(mode)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-sm',
                                    index === 0 ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                        <span className="text-muted-foreground ml-auto self-center text-xs">
                            Showing {plural(visible.length, 'paper')} for {examLabel}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            aria-label="Exam year"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-background rounded-lg border px-3 py-2 text-sm"
                        >
                            <option value="">All Years</option>
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                            <Search className="text-muted-foreground size-4" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search papers by title..."
                                className="w-full bg-transparent outline-none"
                            />
                        </label>
                    </div>
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                    <div className="min-w-0 space-y-6">
                        <Panel>
                            <h2 className="font-display text-lg font-semibold">{examLabel} Solved Previous Year Papers</h2>
                            <p className="text-muted-foreground text-sm">Real exam conditions with answer keys and explanations.</p>
                            {visible.length === 0 ? (
                                <EmptyState
                                    icon={Archive}
                                    title="No papers here yet"
                                    description="Previous year papers for this selection are being added. Try another exam or year."
                                    className="mt-5 py-8"
                                />
                            ) : (
                                <div className="mt-5 space-y-3">
                                    {visible.map((paper) => (
                                        <PaperCard key={paper.id} paper={paper} kind="pyq" className="shadow-none" />
                                    ))}
                                </div>
                            )}
                        </Panel>

                        <Panel>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-display text-lg font-semibold">Practice by Subject</h2>
                                    <p className="text-muted-foreground text-sm">Target specific subjects with questions from the question bank.</p>
                                </div>
                                <Pill tone="indigo">{plural(examSubjects.length, 'Subject')}</Pill>
                            </div>
                            {examSubjects.length === 0 ? (
                                <p className="text-muted-foreground mt-4 text-sm">No subjects with questions yet.</p>
                            ) : (
                                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {examSubjects.map((subject) => (
                                        <li key={subject.id} className="rounded-xl border p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold">{subject.name}</p>
                                                <Pill tone="slate">0% Acc.</Pill>
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">Attempted 0 / {subject.questions_count} questions</p>
                                            <ProgressBar value={0} className="mt-3" />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.post(route('student.quizzes.start'), { mode: 'mixed', subject_id: subject.id, length: 10 })
                                                }
                                                className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                                            >
                                                Start Practice ({subject.questions_count} questions) ›
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        {sample && <SampleQuestion key={sample.id} sample={sample} />}
                    </div>

                    <aside className="space-y-6">
                        <Mastery papers={papers} />
                        <Panel>
                            <h2 className="font-semibold">Recent PYQ Activity</h2>
                            <p className="text-muted-foreground mt-3 text-sm">
                                Papers and questions you attempt will appear here with your accuracy.
                            </p>
                        </Panel>
                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <Lightbulb className="size-4 text-amber-500" /> Smart PYQ Bookmarks
                            </h2>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Saved questions from previous year papers sync with your personal library for revision.
                            </p>
                            <Button variant="link" className="mt-1 h-auto px-0 text-indigo-600" asChild>
                                <Link href={route('student.library')}>
                                    <FileStack /> Open My Library (0)
                                </Link>
                            </Button>
                        </Panel>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
