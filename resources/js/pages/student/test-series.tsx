import { Cover, EmptyState, Eyebrow, MiniStat, PageHeading, Pill, plural, shortName } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { Link } from '@inertiajs/react';
import { Layers, Lock, Timer } from 'lucide-react';

interface Series {
    id: number;
    title: string;
    description: string | null;
    exam: { id: number; name: string } | null;
    cover_url: string | null;
    is_free: boolean;
    price: number | null;
    tests: { id: number; title: string; questions_count: number; duration_minutes: number }[];
}

function SeriesCard({ series }: { series: Series }) {
    const questions = series.tests.reduce((sum, t) => sum + t.questions_count, 0);

    return (
        <article className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm">
            <Cover url={series.cover_url} icon={Layers} className="aspect-video w-full" />
            <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                    {series.exam && <Pill tone="slate">{shortName(series.exam.name)}</Pill>}
                    {series.is_free ? (
                        <Pill tone="green">FREE</Pill>
                    ) : (
                        <Pill tone="amber">
                            <Lock className="size-3" /> ₹{series.price}
                        </Pill>
                    )}
                </div>
                <h3 className="font-display mt-3 text-lg font-semibold">{series.title}</h3>
                {series.description && <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">{series.description}</p>}
                <p className="text-muted-foreground mt-3 text-xs">
                    {plural(series.tests.length, 'test')} • {plural(questions, 'question')}
                </p>
                <ol className="mt-3 space-y-1.5 text-sm">
                    {series.tests.slice(0, 4).map((test, index) => (
                        <li key={test.id} className="flex items-center gap-2">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{test.title}</span>
                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                <Timer className="size-3" /> {test.duration_minutes}m
                            </span>
                        </li>
                    ))}
                    {series.tests.length > 4 && <li className="text-muted-foreground pl-7 text-xs">+ {series.tests.length - 4} more</li>}
                </ol>
                <div className="mt-auto pt-5">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700" asChild>
                        <Link href={route('student.test-series.show', series.id)}>{series.is_free ? 'Open Series' : 'View Series'}</Link>
                    </Button>
                </div>
            </div>
        </article>
    );
}

export default function TestSeries({ series }: { series: Series[] }) {
    return (
        <StudentLayout title="Test Series">
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={Layers}>Practice &amp; Tests • Series</Eyebrow>}
                    title="Test Series"
                    description="Complete packs of mock tests that follow each exam pattern from start to finish, taken in order."
                    aside={
                        <div className="flex flex-wrap gap-3">
                            <MiniStat label="Series" value={String(series.length)} hint="Available now" />
                            <MiniStat label="Enrolled" value="0" hint="Series started" />
                        </div>
                    }
                />
                {series.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Test series are on their way"
                        description="New series are being prepared. Check back soon."
                        className="bg-card"
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {series.map((s) => (
                            <SeriesCard key={s.id} series={s} />
                        ))}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
