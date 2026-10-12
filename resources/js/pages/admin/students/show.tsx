import { AdminHeader, AdminPage, RowActions } from '@/components/admin-kit';
import { ResultBadge, type ResultBands } from '@/components/result-badge';
import { ScoreTrendChart, type TrendPoint } from '@/components/score-trend-chart';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import { ChevronDown, Crown, GraduationCap, ShoppingBag } from 'lucide-react';
import { ReactNode } from 'react';

interface Attempt extends TrendPoint {
    kind: 'quiz' | 'mock' | 'pyq';
    correct: number;
    total: number;
    score: number | null;
    max_score: number | null;
}

interface SubjectStat {
    subject: string;
    answered: number;
    correct: number;
    accuracy: number;
    topics: { topic: string; answered: number; correct: number; accuracy: number }[];
}

interface Props {
    student: { id: number; name: string; email: string; joined: string };
    /** Details given after sign-up; null until the student fills them in. */
    profile: { phone: string; date_of_birth: string; age: number; gender: string | null; district: string; qualification: string | null } | null;
    exams: { id: number; name: string; slug: string; content_url: string | null }[];
    activity: { last_active: string | null; doubts: number; open_doubts: number; doubts_url: string | null; saved_materials: number };
    overview: { quizzes: number; tests: number; answered: number; accuracy: number | null; average_percent: number | null };
    subjects: SubjectStat[];
    byDifficulty: Record<'easy' | 'medium' | 'hard', number | null>;
    trend: Attempt[];
    attempts: Attempt[];
    bands: ResultBands;
}

const kindLabel = { quiz: 'Quiz', mock: 'Mock test', pyq: 'PYQ paper' };
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function Section({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
    return (
        <Card className="gap-0 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold">
                    {icon} {title}
                </h2>
                {action}
            </div>
            {children}
        </Card>
    );
}

/** Accuracy as a bar, coloured with the same cut-offs as result labels (Settings), with the number beside it. */
function AccuracyBar({ value, bands }: { value: number; bands: ResultBands }) {
    const tone = value >= bands.pass ? 'bg-emerald-500' : value >= bands.review ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="flex items-center gap-3">
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full" role="img" aria-label={`${value}% correct`}>
                <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(2, value)}%` }} />
            </div>
            <span className="w-12 text-right text-sm font-semibold tabular-nums">{value}%</span>
        </div>
    );
}

export default function StudentShow({ student, profile, exams, activity, overview, subjects, byDifficulty, trend, attempts, bands }: Props) {
    const figures = [
        ['Quizzes', overview.quizzes],
        ['Tests', overview.tests],
        ['Questions answered', overview.answered],
        ['Accuracy', overview.accuracy === null ? '—' : `${overview.accuracy}%`],
        ['Average score', overview.average_percent === null ? '—' : `${overview.average_percent}%`],
    ];
    const weakest = subjects.find((s) => s.answered >= 5 && s.accuracy < bands.review);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Students', href: route('admin.students.index') },
                { title: student.name, href: '#' },
            ]}
        >
            <Head title={student.name} />
            <AdminPage>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <AdminHeader
                        title={student.name}
                        description={`${student.email} • joined ${student.joined}${activity.last_active ? ` • last test or quiz ${when(activity.last_active)}` : ''}`}
                    />
                    <RowActions
                        deleteHref={route('admin.students.destroy', student.id)}
                        name={student.name}
                        confirmText="Their account and all their results are deleted."
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <Section title="Details">
                        {profile ? (
                            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                                {[
                                    ['Mobile', `+91 ${profile.phone.slice(0, 5)} ${profile.phone.slice(5)}`],
                                    ['Date of birth', `${profile.date_of_birth} (${profile.age} years)`],
                                    ['District', profile.district],
                                    ['Gender', profile.gender ?? '—'],
                                    ['Qualification', profile.qualification ?? '—'],
                                    ['Saved study material', String(activity.saved_materials)],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-muted-foreground text-xs">{label}</dt>
                                        <dd className="font-medium">{value}</dd>
                                    </div>
                                ))}
                                <div>
                                    <dt className="text-muted-foreground text-xs">Doubts asked</dt>
                                    <dd className="font-medium">
                                        {activity.doubts}
                                        {activity.open_doubts > 0 && ` (${activity.open_doubts} waiting)`}
                                        {activity.doubts > 0 && activity.doubts_url && (
                                            <Link href={activity.doubts_url} className="text-primary ml-2 text-xs hover:underline">
                                                View
                                            </Link>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Not filled in yet. They are asked the next time they open their dashboard.
                            </p>
                        )}
                    </Section>

                    <div className="grid gap-6">
                        <Section title="Preparing for" icon={<GraduationCap className="size-4" />}>
                            {exams.length ? (
                                <ul className="flex flex-wrap gap-2">
                                    {exams.map((exam) => (
                                        <li key={exam.id}>
                                            {exam.content_url ? (
                                                <Link
                                                    href={exam.content_url}
                                                    title={exam.name}
                                                    className="hover:border-primary inline-flex rounded-full border px-3 py-1 text-sm font-medium"
                                                >
                                                    {shortName(exam.name)}
                                                </Link>
                                            ) : (
                                                <span title={exam.name} className="inline-flex rounded-full border px-3 py-1 text-sm font-medium">
                                                    {shortName(exam.name)}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No exams chosen yet.</p>
                            )}
                        </Section>

                        <Section title="Purchases" icon={<ShoppingBag className="size-4" />}>
                            <ul className="divide-y text-sm">
                                <li className="flex items-center justify-between gap-3 pb-2">
                                    <span className="flex items-center gap-2">
                                        <Crown className="size-4 text-amber-500" /> StatePrep360 Pass
                                    </span>
                                    <span className="text-muted-foreground">None</span>
                                </li>
                                {exams.map((exam) => (
                                    <li key={exam.id} className="flex items-center justify-between gap-3 py-2">
                                        <span>{shortName(exam.name)} bundle</span>
                                        <span className="text-muted-foreground">Not purchased</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-muted-foreground mt-3 text-xs">
                                Online payment isn't connected yet, so no student can buy anything. Purchases will be listed here once it is.
                            </p>
                        </Section>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {figures.map(([label, value]) => (
                        <Card key={label} className="gap-1 p-4">
                            <p className="text-muted-foreground text-xs">{label}</p>
                            <p className="text-2xl font-semibold">{value}</p>
                        </Card>
                    ))}
                </div>

                <Section
                    title="Performance by subject"
                    action={<span className="text-muted-foreground text-xs">Weakest first • from all finished quizzes and tests</span>}
                >
                    {subjects.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No answered questions yet.</p>
                    ) : (
                        <div className="grid gap-2">
                            {weakest && (
                                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
                                    Needs the most help with <span className="font-semibold">{weakest.subject}</span>: {weakest.accuracy}% correct
                                    over {weakest.answered} questions.
                                </p>
                            )}
                            {subjects.map((s) => (
                                <details key={s.subject} className="group rounded-lg border">
                                    <summary className="grid cursor-pointer list-none items-center gap-2 px-4 py-3 sm:grid-cols-[14rem_1fr_9rem_1rem] [&::-webkit-details-marker]:hidden">
                                        <span className="font-medium">{s.subject}</span>
                                        <AccuracyBar value={s.accuracy} bands={bands} />
                                        <span className="text-muted-foreground text-xs sm:text-right">
                                            {s.correct} of {s.answered} correct
                                        </span>
                                        <ChevronDown className="text-muted-foreground hidden size-4 transition-transform group-open:rotate-180 sm:block" />
                                    </summary>
                                    <ul className="divide-y border-t">
                                        {s.topics.map((t) => (
                                            <li
                                                key={t.topic}
                                                className="grid items-center gap-2 px-4 py-2 pl-8 text-sm sm:grid-cols-[13rem_1fr_9rem_1rem]"
                                            >
                                                <span className="text-muted-foreground">{t.topic}</span>
                                                <AccuracyBar value={t.accuracy} bands={bands} />
                                                <span className="text-muted-foreground text-xs sm:text-right">
                                                    {t.correct} of {t.answered} correct
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ))}
                        </div>
                    )}
                </Section>

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                    <Section title="Score trend (last 10)">
                        {trend.length < 2 ? (
                            <p className="text-muted-foreground text-sm">The trend appears after two finished quizzes or tests.</p>
                        ) : (
                            <ScoreTrendChart points={trend} />
                        )}
                    </Section>
                    <Section title="Accuracy by difficulty">
                        <ul className="grid gap-4">
                            {(['easy', 'medium', 'hard'] as const).map((level) => (
                                <li key={level} className="grid gap-1.5 text-sm">
                                    <span className="capitalize">{level}</span>
                                    {byDifficulty[level] === null ? (
                                        <span className="text-muted-foreground text-xs">No {level} questions answered yet</span>
                                    ) : (
                                        <AccuracyBar value={byDifficulty[level]!} bands={bands} />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Section>
                </div>

                <Card className="divide-y p-0">
                    <h2 className="p-4 font-medium">Results</h2>
                    {attempts.length === 0 && <p className="text-muted-foreground p-4 text-sm">No finished quizzes or tests yet.</p>}
                    {attempts.map((a) => (
                        <div key={`${a.kind}-${a.id}`} className="flex flex-wrap items-center gap-4 p-4 text-sm">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{a.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {kindLabel[a.kind]} • {when(a.submitted_at)}
                                </p>
                            </div>
                            <span className="text-muted-foreground">
                                {a.score !== null ? `${a.score} / ${a.max_score} marks` : `${a.correct} / ${a.total} correct`}
                            </span>
                            <span className="w-14 text-right font-semibold">{a.percent}%</span>
                            <ResultBadge percent={a.percent} bands={bands} />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
