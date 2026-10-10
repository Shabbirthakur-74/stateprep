import { FlashStatus } from '@/components/flash-status';
import { type NoticeItem } from '@/components/notice-board';
import { EmptyState, examIcon, longName, Panel, Pill, plural, shortName, StatTile, type ExamSummary } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout, { useComingSoon } from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    CircleCheck,
    ClipboardCheck,
    ClipboardList,
    Compass,
    FileStack,
    History,
    Megaphone,
    Play,
    Sparkles,
    Target,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

interface Recommendation {
    kind: 'quiz' | 'mock';
    subject_id: number | null;
    test_id: number | null;
    title: string;
    questions: number;
    minutes: number;
    free: boolean;
}

interface Overview {
    quizzes: number;
    tests: number;
    answered: number;
    accuracy: number | null;
    average_percent: number | null;
    streak: number;
}

interface AttemptSummary {
    id: number;
    kind: 'quiz' | 'mock' | 'pyq';
    url: string;
    title: string;
    correct: number;
    total: number;
    percent: number | null;
    submitted_at: string;
}

interface Props {
    notices: NoticeItem[];
    exams: ExamSummary[];
    overview: Overview;
    recent: AttemptSummary[];
    counts: { mocks: number; subjects: number; pyqs: number };
    recommended: Recommendation[];
}

const noticeTone: Record<NoticeItem['category'], 'indigo' | 'green' | 'amber' | 'violet' | 'slate'> = {
    notification: 'indigo',
    admit_card: 'green',
    answer_key: 'amber',
    result: 'violet',
    syllabus: 'indigo',
    announcement: 'slate',
};

function formatDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [hasImage, setHasImage] = useState(true);

    return (
        <section className="relative overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900">
            {hasImage && (
                <img
                    src="/images/hero.jpg"
                    alt=""
                    onError={() => setHasImage(false)}
                    className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-50 [mask-image:linear-gradient(to_right,transparent,black_60%)] md:block"
                />
            )}
            <div className="relative flex flex-wrap items-end justify-between gap-6 p-6 md:p-8">
                <div className="max-w-xl">
                    <Pill tone="indigo" className="rounded-full px-3 py-1">
                        <Target className="size-3" /> No target exam set yet
                    </Pill>
                    <h1 className="font-display mt-5 text-3xl font-bold tracking-tight md:text-4xl">Welcome, {auth.user.name.split(' ')[0]}! 👋</h1>
                    <p className="text-muted-foreground mt-3">
                        Pick your exam and start practising. Every mock test, quiz and paper you attempt will show up here, so you can see your
                        progress grow.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <span className="text-muted-foreground hidden items-center gap-1.5 text-xs md:inline-flex">
                        <BadgeCheck className="size-4 text-emerald-600" /> Student account
                    </span>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                        <Link href={route('student.exams')}>
                            Start Preparation <ArrowRight />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

function CurrentFocus() {
    return (
        <Panel>
            <div className="flex items-center justify-between gap-2">
                <Pill tone="indigo">Current Focus</Pill>
                <Pill tone="slate">Not started</Pill>
            </div>
            <EmptyState
                icon={Compass}
                title="You haven't started a module yet"
                description="Choose an exam to follow. Your current topic, mastery and time left will be tracked here."
                className="mt-5 border-indigo-100 py-8 dark:border-slate-800"
            >
                <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                    <Link href={route('student.exams')}>
                        Explore Exams <ArrowRight />
                    </Link>
                </Button>
            </EmptyState>
        </Panel>
    );
}

function QuickPractice({ counts }: { counts: Props['counts'] }) {
    const cards = [
        {
            tag: 'Full Length Mock',
            tone: 'indigo' as const,
            title: 'Mock Tests',
            text: `${plural(counts.mocks, 'full paper')} available`,
            route: 'student.mock-tests',
            action: 'Start',
            icon: ClipboardList,
        },
        {
            tag: 'Daily Drills',
            tone: 'green' as const,
            title: 'Quizzes',
            text: `${plural(counts.subjects, 'subject')} with topic quizzes`,
            route: 'student.quizzes',
            action: 'Start',
            icon: Zap,
        },
        {
            tag: 'Solved Papers',
            tone: 'violet' as const,
            title: 'PYQs Archive',
            text: `${plural(counts.pyqs, 'paper')} with solutions`,
            route: 'student.pyqs',
            action: 'Practice',
            icon: FileStack,
        },
    ];

    return (
        <section>
            <div className="flex items-end justify-between gap-2">
                <div>
                    <h2 className="font-display text-xl font-semibold">Quick Practice</h2>
                    <p className="text-muted-foreground text-sm">Daily precision drills to hone your speed and accuracy</p>
                </div>
                <Link href={route('student.library')} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                    View Library ›
                </Link>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                {cards.map(({ tag, tone, title, text, route: name, action, icon: Icon }) => (
                    <li key={title} className="bg-card flex flex-col rounded-2xl border p-5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <Pill tone={tone}>{tag}</Pill>
                            <Icon className="text-muted-foreground size-4" />
                        </div>
                        <h3 className="font-display mt-3 text-lg font-semibold">{title}</h3>
                        <p className="text-muted-foreground text-sm">{text}</p>
                        <Button variant="outline" className="mt-4 w-full" asChild>
                            <Link href={route(name)}>
                                {action} <Play className="size-3.5" />
                            </Link>
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function RecentActivity({ recent }: { recent: AttemptSummary[] }) {
    return (
        <Panel>
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
                    <History className="size-5 text-indigo-600" /> Recent Activity
                </h2>
                <Link href={route('student.attempted-tests')} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                    View All History
                </Link>
            </div>
            {recent.length === 0 ? (
                <EmptyState
                    icon={ClipboardCheck}
                    title="No activity yet"
                    description="Your attempted mock tests, quizzes and papers will appear here with your score and result."
                    className="mt-5 py-8"
                >
                    <Button variant="outline" asChild>
                        <Link href={route('student.quizzes')}>Try a quiz</Link>
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                        <Link href={route('student.mock-tests')}>Take a mock test</Link>
                    </Button>
                </EmptyState>
            ) : (
                <ul className="mt-5 space-y-3">
                    {recent.map((attempt) => (
                        <li key={attempt.id} className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                            <span
                                className={cn(
                                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                    attempt.kind === 'quiz' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700',
                                )}
                            >
                                {attempt.kind === 'quiz' ? <Zap className="size-5" /> : <ClipboardList className="size-5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{attempt.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {new Date(attempt.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                                    • {attempt.total} Questions
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-display text-lg font-semibold text-indigo-600">{attempt.percent}%</p>
                                <p className="text-muted-foreground text-xs">
                                    {attempt.correct} / {attempt.total} correct
                                </p>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                                <Link href={attempt.url}>View Result</Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function ExploreExams({ exams }: { exams: ExamSummary[] }) {
    return (
        <section>
            <div className="flex items-end justify-between gap-2">
                <div>
                    <h2 className="font-display text-xl font-semibold">Explore State Exams</h2>
                    <p className="text-muted-foreground text-sm">Himachal Pradesh Public Service &amp; Departmental Recruitment Modules</p>
                </div>
                <Link href={route('student.exams')} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                    Browse All ({exams.length}) ›
                </Link>
            </div>
            {exams.length === 0 ? (
                <EmptyState icon={Compass} title="Exams are on their way" description="Check back soon." className="mt-4" />
            ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                    {exams.slice(0, 4).map((exam, index) => {
                        const Icon = examIcon(index);
                        return (
                            <li key={exam.id} className="bg-card flex flex-col rounded-2xl border p-5 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <span className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                        <Icon className="size-5" />
                                    </span>
                                    <Pill tone="slate">{plural(exam.subjects_count, 'Subject')}</Pill>
                                </div>
                                <h3 className="font-display mt-3 text-lg font-semibold">{shortName(exam.name)}</h3>
                                <p className="text-muted-foreground line-clamp-2 text-sm">{longName(exam.name) ?? exam.description}</p>
                                <Button variant="secondary" className="mt-4 w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800" asChild>
                                    <Link href={route('exams.show', exam.slug)}>
                                        Explore <ArrowRight />
                                    </Link>
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function ExamProgress({ recommended }: { recommended: Recommendation[] }) {
    const comingSoon = useComingSoon();

    return (
        <Panel>
            <h2 className="font-display text-xl font-semibold">Your Exam Progress</h2>
            <div className="mt-4 rounded-xl bg-indigo-50/70 p-4 text-center dark:bg-slate-800/60">
                <p className="text-sm font-semibold">Not enrolled in any exam yet</p>
                <p className="text-muted-foreground mt-1 text-xs">Enrol in an exam to track your overall completion and exam date.</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                    <Link href={route('student.exams')}>Browse exams</Link>
                </Button>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider uppercase">Recommended for you</h3>
                <Sparkles className="text-muted-foreground size-4" />
            </div>
            {recommended.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">Recommendations appear once content is published.</p>
            ) : (
                <ul className="mt-3 space-y-3">
                    {recommended.map((item) => (
                        <li key={item.kind} className="flex items-center gap-3 rounded-xl border p-3">
                            <span
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                    item.kind === 'quiz' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700',
                                )}
                            >
                                {item.kind === 'quiz' ? <Zap className="size-4" /> : <ClipboardList className="size-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                                    <span className="truncate">{item.kind === 'quiz' ? `${item.title} Drill` : item.title}</span>
                                    <Pill tone={item.free ? 'green' : 'indigo'}>{item.free ? 'FREE' : 'PRO'}</Pill>
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {item.questions} Qs • {item.minutes} Mins
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant={item.kind === 'quiz' ? 'outline' : 'default'}
                                className={cn('shrink-0', item.kind === 'mock' && 'bg-indigo-600 hover:bg-indigo-700')}
                                onClick={() =>
                                    item.kind === 'quiz'
                                        ? router.post(route('student.quizzes.start'), { mode: 'mixed', subject_id: item.subject_id, length: 10 })
                                        : item.free
                                          ? router.post(route('student.tests.start', item.test_id!))
                                          : comingSoon('Paid tests')
                                }
                            >
                                {item.kind === 'quiz' ? 'Take Drill' : 'Start Test'}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function LatestUpdates({ notices }: { notices: NoticeItem[] }) {
    const [all, setAll] = useState(false);
    const shown = all ? notices : notices.slice(0, 3);

    return (
        <Panel>
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
                    <Megaphone className="size-5 text-indigo-600" /> Latest Updates
                </h2>
                <Pill tone="slate">State Board</Pill>
            </div>
            {notices.length === 0 ? (
                <p className="text-muted-foreground mt-4 text-sm">No updates right now.</p>
            ) : (
                <ul className="mt-3 divide-y">
                    {shown.map((notice) => {
                        const body = (
                            <>
                                <div className="flex items-center gap-2">
                                    <Pill tone={notice.isNew ? 'red' : noticeTone[notice.category]}>
                                        {notice.isNew ? 'New' : notice.categoryLabel}
                                    </Pill>
                                    <span className="text-muted-foreground text-xs">{formatDate(notice.publishedOn)}</span>
                                    {notice.url && <ArrowRight className="text-muted-foreground ml-auto size-4" />}
                                </div>
                                <p className="mt-1.5 text-sm">{notice.title}</p>
                            </>
                        );
                        return (
                            <li key={notice.id} className="py-3">
                                {notice.url ? (
                                    <a href={notice.url} target="_blank" rel="noopener noreferrer" className="block hover:text-indigo-600">
                                        {body}
                                    </a>
                                ) : (
                                    body
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {notices.length > 3 && (
                <button
                    type="button"
                    onClick={() => setAll((value) => !value)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                >
                    {all ? 'Show fewer updates' : 'View All Updates & Circulars'} <ArrowRight className="size-4" />
                </button>
            )}
        </Panel>
    );
}

function ProPass() {
    const comingSoon = useComingSoon();
    const { name } = usePage<SharedData>().props;

    return (
        <section className="rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold">
                <Sparkles className="size-3" /> Standard Scholar Tier
            </span>
            <h2 className="font-display mt-3 text-xl font-semibold">Accelerate with {name} Pro Pass</h2>
            <p className="mt-2 text-sm text-white/85">
                Unlock full mock test series with rank prediction, a state-wide leaderboard and in-depth question breakdowns.
            </p>
            <ul className="mt-4 space-y-2 text-xs font-medium">
                <li className="flex items-center gap-2">
                    <CircleCheck className="size-4" /> Solved previous year papers
                </li>
                <li className="flex items-center gap-2">
                    <CircleCheck className="size-4" /> Mistake notebook &amp; revision planner
                </li>
            </ul>
            <Button className="mt-5 w-full bg-white text-indigo-700 hover:bg-white/90" onClick={() => comingSoon('Pro Pass')}>
                Upgrade to Pro Pass <ArrowRight />
            </Button>
        </section>
    );
}

const percent = (value: number | null) => (value === null ? '—' : `${value}%`);

export default function StudentDashboard({ notices, exams, overview, recent, counts, recommended }: Props) {
    return (
        <StudentLayout title="Student dashboard">
            <div className="mx-auto max-w-7xl space-y-6">
                <FlashStatus />
                <Welcome />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile label="Tests Attempted" value={String(overview.tests)} hint="Mock tests & PYQ papers" icon={ClipboardList} />
                    <StatTile
                        label="Quizzes Completed"
                        value={String(overview.quizzes)}
                        hint={overview.streak > 0 ? `${overview.streak}-day streak` : 'Daily drills'}
                        icon={Zap}
                    />
                    <StatTile
                        label="Questions Solved"
                        value={String(overview.answered)}
                        hint={overview.accuracy === null ? 'Accuracy shows after your first quiz' : `${overview.accuracy}% accuracy`}
                        icon={CircleCheck}
                    />
                    <StatTile
                        label="Average Score"
                        value={percent(overview.average_percent)}
                        hint={overview.average_percent === null ? 'Finish a quiz to see your score' : 'Across finished quizzes'}
                        icon={TrendingUp}
                        accent="text-indigo-600"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
                    <div className="min-w-0 space-y-6">
                        <CurrentFocus />
                        <QuickPractice counts={counts} />
                        <RecentActivity recent={recent} />
                        <ExploreExams exams={exams} />
                    </div>
                    <div className="space-y-6">
                        <ExamProgress recommended={recommended} />
                        <LatestUpdates notices={notices} />
                        <ProPass />
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}
