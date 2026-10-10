import { ResultBadge, type ResultBands } from '@/components/result-badge';
import { Cover, EmptyState, Panel, Pill, plural, shortName, type Paper } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout, { useComingSoon } from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, CircleCheck, Layers, Lock, Play, RotateCcw, Timer } from 'lucide-react';

interface SeriesTest extends Paper {
    attempts: number;
    best_percent: number | null;
    open_attempt_id: number | null;
}

interface Series {
    id: number;
    title: string;
    description: string | null;
    exam: { id: number; name: string } | null;
    cover_url: string | null;
    is_free: boolean;
    price: number | null;
    tests: SeriesTest[];
}

export default function SeriesShow({ series, bands }: { series: Series; bands: ResultBands }) {
    const comingSoon = useComingSoon();
    const done = series.tests.filter((t) => t.attempts > 0).length;
    const nextUp = series.tests.find((t) => t.attempts === 0)?.id;

    const start = (test: SeriesTest) => {
        if (!series.is_free) return comingSoon('Paid test series');
        if (test.open_attempt_id) return router.visit(route('student.tests.show', test.open_attempt_id));
        if (confirm(`Start "${test.title}"? The ${test.duration_minutes}-minute timer begins straight away.`)) {
            router.post(route('student.tests.start', test.id), { series: series.id });
        }
    };

    return (
        <StudentLayout title={series.title}>
            <div className="mx-auto max-w-5xl space-y-6">
                <Link
                    href={route('student.test-series')}
                    className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-indigo-600"
                >
                    <ArrowLeft className="size-3.5" /> Test Series
                </Link>

                <section className="bg-card overflow-hidden rounded-2xl border shadow-sm md:flex">
                    <Cover url={series.cover_url} icon={Layers} className="aspect-video w-full md:aspect-auto md:w-80" />
                    <div className="flex-1 p-6">
                        <div className="flex flex-wrap gap-2">
                            {series.exam && <Pill tone="slate">{shortName(series.exam.name)}</Pill>}
                            {series.is_free ? (
                                <Pill tone="green">FREE</Pill>
                            ) : (
                                <Pill tone="amber">
                                    <Lock className="size-3" /> ₹{series.price}
                                </Pill>
                            )}
                        </div>
                        <h1 className="font-display mt-3 text-2xl font-bold">{series.title}</h1>
                        {series.description && <p className="text-muted-foreground mt-2 text-sm">{series.description}</p>}
                        <p className="mt-4 text-sm">
                            <span className="font-semibold">
                                {done} of {series.tests.length}
                            </span>{' '}
                            tests attempted
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-slate-800">
                            <div
                                className="h-full rounded-full bg-indigo-600"
                                style={{ width: `${series.tests.length ? (done * 100) / series.tests.length : 0}%` }}
                            />
                        </div>
                        {!series.is_free && (
                            <Button className="mt-5 bg-indigo-600 hover:bg-indigo-700" onClick={() => comingSoon('Paid test series')}>
                                <Lock /> Unlock series · ₹{series.price}
                            </Button>
                        )}
                    </div>
                </section>

                {series.tests.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Tests are being added"
                        description="This series has no published tests yet."
                        className="bg-card"
                    />
                ) : (
                    <ol className="space-y-3">
                        {series.tests.map((test, index) => (
                            <li key={test.id}>
                                <Panel
                                    className={cn(
                                        'flex flex-wrap items-center gap-4',
                                        test.id === nextUp && 'border-indigo-300 ring-1 ring-indigo-300',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                            test.attempts > 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
                                        )}
                                    >
                                        {test.attempts > 0 ? <CircleCheck className="size-5" /> : index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                                            {test.title}
                                            {test.id === nextUp && <Pill tone="indigo">Next up</Pill>}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
                                            <span>{plural(test.questions_count, 'question')}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <Timer className="size-3" /> {test.duration_minutes} min
                                            </span>
                                            <span>{test.negative_marks ? `−${test.negative_marks} per wrong answer` : 'No negative marking'}</span>
                                        </p>
                                    </div>
                                    {test.best_percent !== null && (
                                        <span className="flex items-center gap-2 text-sm">
                                            Best <span className="font-semibold">{test.best_percent}%</span>
                                            <ResultBadge percent={test.best_percent} bands={bands} />
                                        </span>
                                    )}
                                    <Button
                                        variant={test.attempts > 0 && !test.open_attempt_id ? 'outline' : 'default'}
                                        className={cn(!(test.attempts > 0 && !test.open_attempt_id) && 'bg-indigo-600 hover:bg-indigo-700')}
                                        onClick={() => start(test)}
                                    >
                                        {!series.is_free ? (
                                            <>
                                                <Lock /> Locked
                                            </>
                                        ) : test.open_attempt_id ? (
                                            <>
                                                <Play /> Resume
                                            </>
                                        ) : test.attempts > 0 ? (
                                            <>
                                                <RotateCcw /> Retake
                                            </>
                                        ) : (
                                            <>
                                                <Play /> Start
                                            </>
                                        )}
                                    </Button>
                                </Panel>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </StudentLayout>
    );
}
