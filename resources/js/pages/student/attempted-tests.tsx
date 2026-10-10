import { bandRanges, ResultBadge, type ResultBands } from '@/components/result-badge';
import { EmptyState, Eyebrow, MiniStat, PageHeading, Panel, Pill } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, ClipboardList, FileStack, History, Hourglass, Lightbulb, ListChecks, Search, Zap } from 'lucide-react';
import { useState } from 'react';

type Kind = 'quiz' | 'mock' | 'pyq';

interface Attempt {
    id: number;
    kind: Kind;
    title: string;
    mode: 'topic' | 'mixed' | 'random' | null;
    correct: number;
    total: number;
    percent: number | null;
    score: number | null;
    max_score: number | null;
    seconds: number | null;
    submitted_at: string;
    url: string;
}

interface InProgress {
    id: number;
    kind: Kind;
    title: string;
    answered: number;
    total: number;
    ends_at: string | null;
    url: string;
}

const types = [
    { key: 'all', label: 'All Attempts', icon: History },
    { key: 'mock', label: 'Mock Tests', icon: ClipboardList },
    { key: 'quiz', label: 'Quizzes', icon: Zap },
    { key: 'pyq', label: 'PYQs', icon: FileStack },
] as const;

const typeLabel = (a: Attempt) =>
    a.kind === 'mock'
        ? 'Mock Test'
        : a.kind === 'pyq'
          ? 'PYQ Paper'
          : { topic: 'Topic Quiz', mixed: 'Mixed Quiz', random: 'Random Quiz' }[a.mode ?? 'topic'];

const columns = ['Test', 'Type', 'Attempted On', 'Score', 'Percent', 'Time Taken', ''];

const grid = 'md:grid md:grid-cols-[2fr_1fr_1fr_0.9fr_0.7fr_0.8fr_0.9fr] md:items-center md:gap-3';

const duration = (seconds: number | null) => (seconds === null ? '—' : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`);

export default function AttemptedTests({ attempts, inProgress, bands }: { attempts: Attempt[]; inProgress: InProgress[]; bands: ResultBands }) {
    const [type, setType] = useState<(typeof types)[number]['key']>('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'recent' | 'score'>('recent');

    const count = (kind: Kind) => attempts.filter((a) => a.kind === kind).length;
    const counts = { all: attempts.length, quiz: count('quiz'), mock: count('mock'), pyq: count('pyq') };
    const visible = attempts
        .filter((a) => (type === 'all' || a.kind === type) && a.title.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => (sort === 'score' ? (b.percent ?? 0) - (a.percent ?? 0) : b.submitted_at.localeCompare(a.submitted_at)));

    return (
        <StudentLayout title="Attempted Tests">
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={History}>Practice &amp; Tests • History</Eyebrow>}
                    title="Attempted Tests"
                    description="Every mock test, quiz and previous year paper you finish, with your score and a link to the full solutions."
                    aside={
                        <div className="flex flex-wrap gap-3">
                            <MiniStat label="Total Attempts" value={String(counts.all)} hint="All time" />
                            <MiniStat label="Mock Tests" value={String(counts.mock)} hint="Full length" />
                            <MiniStat label="Quizzes" value={String(counts.quiz)} hint="Topic drills" />
                            <MiniStat label="PYQs" value={String(counts.pyq)} hint="Papers solved" />
                        </div>
                    }
                />

                <Panel className="space-y-4 p-4 md:p-4">
                    <div className="flex flex-wrap gap-2">
                        {types.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={type === key}
                                onClick={() => setType(key)}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                                    type === key ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:border-indigo-300',
                                )}
                            >
                                <Icon className="size-4" /> {label}
                                <span className={cn('rounded px-1.5 text-[11px]', type === key ? 'bg-white/20' : 'bg-muted')}>{counts[key]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                            <Search className="text-muted-foreground size-4" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search attempted tests..."
                                className="w-full bg-transparent outline-none"
                            />
                        </label>
                        <select
                            aria-label="Sort"
                            value={sort}
                            onChange={(e) => setSort(e.target.value as typeof sort)}
                            className="bg-background rounded-lg border px-3 py-2 text-sm"
                        >
                            <option value="recent">Sort: Most Recent</option>
                            <option value="score">Sort: Highest Score</option>
                        </select>
                    </div>
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                    <Panel className="min-w-0 p-0 md:p-0">
                        <div
                            className={cn('text-muted-foreground hidden border-b px-6 py-3 text-[11px] font-semibold tracking-wider uppercase', grid)}
                        >
                            {columns.map((column, index) => (
                                <span key={index}>{column}</span>
                            ))}
                        </div>
                        {visible.length === 0 ? (
                            <EmptyState
                                icon={ListChecks}
                                title={attempts.length === 0 ? "You haven't attempted any tests yet" : 'Nothing matches'}
                                description={
                                    attempts.length === 0
                                        ? 'Once you finish a mock test, quiz or previous year paper, it shows up here with your score, time taken and solutions.'
                                        : 'Try another type or search term.'
                                }
                                className="m-6 py-12"
                            >
                                {attempts.length === 0 && (
                                    <>
                                        <Button variant="outline" asChild>
                                            <Link href={route('student.quizzes')}>
                                                <Zap /> Try a quiz
                                            </Link>
                                        </Button>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                                            <Link href={route('student.mock-tests')}>
                                                <ClipboardList /> Take a mock test
                                            </Link>
                                        </Button>
                                    </>
                                )}
                            </EmptyState>
                        ) : (
                            <ul className="divide-y">
                                {visible.map((attempt) => (
                                    <li
                                        key={`${attempt.kind}-${attempt.id}`}
                                        className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 text-sm', grid)}
                                    >
                                        <div className="min-w-0 flex-1 md:flex-none">
                                            <p className="truncate font-medium">{attempt.title}</p>
                                            <ResultBadge percent={attempt.percent} bands={bands} className="mt-1" />
                                        </div>
                                        <span className="text-muted-foreground">{typeLabel(attempt)}</span>
                                        <span className="text-muted-foreground">
                                            {new Date(attempt.submitted_at).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        <span className="font-medium">
                                            {attempt.score !== null ? `${attempt.score}/${attempt.max_score}` : `${attempt.correct}/${attempt.total}`}
                                        </span>
                                        <span className="font-semibold text-indigo-600">{attempt.percent}%</span>
                                        <span className="text-muted-foreground">{duration(attempt.seconds)}</span>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={attempt.url}>View Result</Link>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <aside className="space-y-6">
                        <Panel>
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <Hourglass className="size-4 text-amber-500" /> In Progress
                                </h2>
                                <Pill tone="slate">{inProgress.length}</Pill>
                            </div>
                            {inProgress.length === 0 ? (
                                <p className="text-muted-foreground mt-3 text-sm">
                                    Tests and quizzes you start but don't finish wait here so you can resume them.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-2">
                                    {inProgress.map((attempt) => (
                                        <li key={`${attempt.kind}-${attempt.id}`}>
                                            <Link
                                                href={attempt.url}
                                                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:border-indigo-300"
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-medium">{attempt.title}</span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {attempt.answered} of {attempt.total} answered
                                                        {attempt.ends_at &&
                                                            ` • ends ${new Date(attempt.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                                                    </span>
                                                </span>
                                                <ArrowRight className="size-4 text-indigo-600" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                        <Panel>
                            <h2 className="font-semibold">Reading your results</h2>
                            <ul className="text-muted-foreground mt-3 space-y-2.5 text-sm">
                                {bandRanges(bands).map(({ band, label, className, text }) => (
                                    <li key={band} className="flex items-center gap-2">
                                        <span className={cn('w-16 rounded-md px-2 py-0.5 text-center text-[11px] font-semibold', className)}>
                                            {label}
                                        </span>{' '}
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                        <section className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-500/10">
                            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                                <Lightbulb className="size-4" /> Review every attempt
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Going through the solutions of wrong and skipped questions is the fastest way to raise your next score.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
