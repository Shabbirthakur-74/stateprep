import { ScoreTrendChart, type TrendPoint } from '@/components/score-trend-chart';
import { EmptyState, Eyebrow, PageHeading, Panel, Pill, plural, ProgressBar, shortName, StatTile, type ExamSummary } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    Award,
    CircleCheck,
    ClipboardList,
    Clock,
    Crosshair,
    Gauge,
    LineChart,
    ListChecks,
    Medal,
    ShieldAlert,
    Target,
    TrendingUp,
    Trophy,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

interface Subject {
    id: number;
    exam_ids: number[];
    name: string;
    questions_count: number;
}

interface Overview {
    quizzes: number;
    answered: number;
    correct: number;
    accuracy: number | null;
    average_percent: number | null;
    seconds: number;
    streak: number;
}

interface Props {
    exams: ExamSummary[];
    subjects: Subject[];
    overview: Overview;
    bySubject: Record<string, { answered: number; correct: number }>;
    byDifficulty: Record<'easy' | 'medium' | 'hard', number | null>;
    trend: TrendPoint[];
}

/** A subject needs this many answered questions before it is called a strength or a focus area. */
const MIN_ANSWERED = 5;

const difficulties = [
    { key: 'easy', label: 'Easy', bar: 'bg-emerald-500' },
    { key: 'medium', label: 'Medium', bar: 'bg-amber-500' },
    { key: 'hard', label: 'Hard', bar: 'bg-rose-500' },
] as const;

const percent = (value: number | null) => (value === null ? '—' : `${value}%`);

const hours = (seconds: number) => (seconds < 3600 ? `${Math.round(seconds / 60)}m` : `${(seconds / 3600).toFixed(1)}h`);

export default function Performance({ exams, subjects, overview, bySubject, byDifficulty, trend }: Props) {
    const [examId, setExamId] = useState<number | null>(null);
    const exam = exams.find((e) => e.id === examId) ?? null;
    const hasData = overview.answered > 0;

    const rows = subjects
        .filter((s) => (examId === null || s.exam_ids.includes(examId)) && s.questions_count > 0)
        .map((s) => {
            const stat = bySubject[s.id];
            return {
                ...s,
                answered: stat?.answered ?? 0,
                accuracy: stat && stat.answered > 0 ? Math.round((stat.correct * 100) / stat.answered) : null,
            };
        });
    const rated = rows.filter((r) => r.answered >= MIN_ANSWERED && r.accuracy !== null).sort((a, b) => b.accuracy! - a.accuracy!);
    const strengths = rated.filter((r) => r.accuracy! >= 60).slice(0, 3);
    const focus = [...rated]
        .reverse()
        .filter((r) => r.accuracy! < 60)
        .slice(0, 3);
    const best = trend.reduce<number | null>((max, p) => (p.percent !== null && (max === null || p.percent > max) ? p.percent : max), null);

    return (
        <StudentLayout title="My Performance">
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={TrendingUp}>Performance • Analytics</Eyebrow>}
                    title="My Performance"
                    description="Accuracy, speed and subject-wise analysis across every quiz you finish. Mock tests and papers will join once they open."
                    aside={
                        <label className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm">
                            <Target className="size-4 text-indigo-600" />
                            <span className="text-muted-foreground">Exam:</span>
                            <select
                                aria-label="Exam"
                                value={examId ?? ''}
                                onChange={(e) => setExamId(e.target.value ? Number(e.target.value) : null)}
                                className="bg-transparent font-medium outline-none"
                            >
                                <option value="">All Exams</option>
                                {exams.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {shortName(e.name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    }
                />

                {!hasData && (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                        <p className="flex items-start gap-2">
                            <Gauge className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                            <span>
                                <span className="font-semibold">No performance data yet.</span>{' '}
                                <span className="text-muted-foreground">Finish a quiz and your analysis will start filling in here.</span>
                            </span>
                        </p>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                    <StatTile label="Overall Accuracy" value={percent(overview.accuracy)} hint="Correct of attempted" icon={Crosshair} />
                    <StatTile
                        label="Average Score"
                        value={percent(overview.average_percent)}
                        hint={`Across ${overview.quizzes} ${overview.quizzes === 1 ? 'quiz' : 'quizzes'}`}
                        icon={TrendingUp}
                    />
                    <StatTile label="Questions Attempted" value={String(overview.answered)} hint={`${overview.correct} correct`} icon={ListChecks} />
                    <StatTile label="Time Spent" value={hours(overview.seconds)} hint="Practising" icon={Clock} />
                    <StatTile label="State Rank" value="—" hint="From full mock tests" icon={Trophy} />
                    <StatTile label="Percentile" value="—" hint="Among all aspirants" icon={Medal} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
                    <div className="min-w-0 space-y-6">
                        <Panel>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                                        <LineChart className="size-5 text-indigo-600" /> Score Trend
                                    </h2>
                                    <p className="text-muted-foreground text-sm">Your score in each finished quiz, oldest to newest</p>
                                </div>
                                <Pill tone="slate">Last {trend.length || 10} quizzes</Pill>
                            </div>
                            {trend.length < 2 ? (
                                <EmptyState
                                    icon={LineChart}
                                    title="Your score trend appears after two quizzes"
                                    description="Each quiz you finish adds a point here, so you can see whether your scores are climbing."
                                    className="mt-5 py-10"
                                >
                                    <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                                        <Link href={route('student.quizzes')}>
                                            <Zap /> Take a quiz
                                        </Link>
                                    </Button>
                                </EmptyState>
                            ) : (
                                <div className="mt-5">
                                    <ScoreTrendChart points={trend} />
                                </div>
                            )}
                        </Panel>

                        <Panel>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-display text-lg font-semibold">Subject-wise Analysis</h2>
                                    <p className="text-muted-foreground text-sm">
                                        {exam ? shortName(exam.name) : 'All subjects'} • accuracy and coverage
                                    </p>
                                </div>
                                <Pill tone="indigo">{plural(rows.length, 'Subject')}</Pill>
                            </div>
                            {rows.length === 0 ? (
                                <p className="text-muted-foreground mt-4 text-sm">No subjects with questions for this exam yet.</p>
                            ) : (
                                <ul className="mt-5 divide-y">
                                    {rows.map((row) => (
                                        <li key={row.id} className="grid gap-2 py-3.5 sm:grid-cols-[1.4fr_2fr_auto] sm:items-center sm:gap-6">
                                            <div>
                                                <p className="text-sm font-medium">{row.name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {row.answered} answered • {row.questions_count} in the bank
                                                </p>
                                            </div>
                                            <ProgressBar value={row.accuracy ?? 0} />
                                            {row.accuracy === null ? (
                                                <Pill tone="slate" className="justify-self-start">
                                                    Not attempted
                                                </Pill>
                                            ) : (
                                                <Pill
                                                    tone={row.accuracy >= 60 ? 'green' : row.accuracy >= 40 ? 'amber' : 'red'}
                                                    className="justify-self-start"
                                                >
                                                    {row.accuracy}% accuracy
                                                </Pill>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Panel>
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <Award className="size-4 text-emerald-600" /> Strengths
                                </h2>
                                {strengths.length === 0 ? (
                                    <p className="text-muted-foreground mt-3 text-sm">
                                        Subjects where you score 60% or more (after {MIN_ANSWERED}+ answers) will be highlighted here.
                                    </p>
                                ) : (
                                    <ul className="mt-3 space-y-2 text-sm">
                                        {strengths.map((s) => (
                                            <li key={s.id} className="flex justify-between">
                                                {s.name} <span className="font-semibold text-emerald-600">{s.accuracy}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                            <Panel>
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <ShieldAlert className="size-4 text-rose-600" /> Focus Areas
                                </h2>
                                {focus.length === 0 ? (
                                    <p className="text-muted-foreground mt-3 text-sm">
                                        Subjects below 60% accuracy will show here, with a quick way to practise them.
                                    </p>
                                ) : (
                                    <ul className="mt-3 space-y-2 text-sm">
                                        {focus.map((s) => (
                                            <li key={s.id} className="flex items-center justify-between gap-2">
                                                <span>{s.name}</span>
                                                <span className="flex items-center gap-3">
                                                    <span className="font-semibold text-rose-600">{s.accuracy}%</span>
                                                    <Link
                                                        href={route('student.quizzes')}
                                                        className="text-xs font-medium text-indigo-600 hover:underline"
                                                    >
                                                        Practise
                                                    </Link>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <Panel>
                            <h2 className="font-semibold">Accuracy by Difficulty</h2>
                            <ul className="mt-4 space-y-4">
                                {difficulties.map(({ key, label, bar }) => (
                                    <li key={key}>
                                        <div className="mb-1.5 flex justify-between text-sm">
                                            <span>{label}</span>
                                            <span className="text-muted-foreground">{percent(byDifficulty[key])}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div className={cn('h-full rounded-full', bar)} style={{ width: `${byDifficulty[key] ?? 0}%` }} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Panel>

                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <Clock className="size-4 text-indigo-600" /> Time Management
                            </h2>
                            <dl className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                                {[
                                    ['Avg. per question', overview.answered ? `${Math.round(overview.seconds / overview.answered)}s` : '—'],
                                    ['Total time', hours(overview.seconds)],
                                    ['Quizzes finished', String(overview.quizzes)],
                                    ['Best (last 10)', percent(best)],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                                        <dt className="text-muted-foreground">{label}</dt>
                                        <dd className="mt-1 text-base font-semibold">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </Panel>

                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <CircleCheck className="size-4 text-indigo-600" /> Next Steps
                            </h2>
                            <ul className="mt-3 space-y-2">
                                <li>
                                    <Button variant="outline" className="w-full justify-start" asChild>
                                        <Link href={route('student.quizzes')}>
                                            <Zap /> Practise a topic quiz
                                        </Link>
                                    </Button>
                                </li>
                                <li>
                                    <Button variant="outline" className="w-full justify-start" asChild>
                                        <Link href={route('student.mock-tests')}>
                                            <ClipboardList /> Browse mock tests
                                        </Link>
                                    </Button>
                                </li>
                                <li>
                                    <Button variant="outline" className="w-full justify-start" asChild>
                                        <Link href={route('student.attempted-tests')}>
                                            <ListChecks /> Review attempted tests
                                        </Link>
                                    </Button>
                                </li>
                            </ul>
                        </Panel>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
