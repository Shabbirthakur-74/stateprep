import { EmptyState, examIcon, Eyebrow, longName, PageHeading, Panel, Pill, plural, shortName, type ExamSummary } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    CircleCheck,
    ClipboardList,
    FileStack,
    Gauge,
    GraduationCap,
    PlayCircle,
    Search,
    ShoppingBag,
    Target,
} from 'lucide-react';
import { useState } from 'react';

const tabs = ['All', 'Active', 'Completed'] as const;

function Catalogue({ exams }: { exams: ExamSummary[] }) {
    return (
        <section id="catalogue" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Eyebrow icon={Search}>Government Exam Catalog</Eyebrow>
                    <h2 className="font-display mt-2 text-2xl font-bold tracking-tight">Explore Himachal Pradesh State Exams</h2>
                    <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                        Expand your career options with preparation packs built around official state exam patterns.
                    </p>
                </div>
                <p className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Topic quizzes and sample questions are free to explore.
                </p>
            </div>

            {exams.length === 0 ? (
                <EmptyState
                    icon={GraduationCap}
                    title="Exams are on their way"
                    description="New exam packages are being prepared. Check back soon."
                    className="mt-6"
                />
            ) : (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {exams.map((exam, index) => {
                        const Icon = examIcon(index);
                        return (
                            <li key={exam.id} className="bg-card flex flex-col rounded-2xl border p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <Pill tone="indigo">Preparation Package Available</Pill>
                                    <Icon className="text-muted-foreground size-4 shrink-0" />
                                </div>
                                <h3 className="font-display mt-3 text-lg font-semibold">{shortName(exam.name)}</h3>
                                <p className="text-muted-foreground line-clamp-2 text-xs">{longName(exam.name) ?? exam.description}</p>
                                <ul className="text-muted-foreground mt-4 space-y-2.5 text-xs">
                                    <li className="flex items-start gap-2">
                                        <BookOpen className="mt-0.5 size-3.5 shrink-0 text-indigo-600" />
                                        {plural(exam.subjects_count, 'Subject')} • {plural(exam.questions_count, 'Question')} in the bank
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-indigo-600" />
                                        {plural(exam.mock_count, 'Mock Test')} • {plural(exam.pyq_count, 'Previous Year Paper')}
                                    </li>
                                </ul>
                                <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] dark:bg-slate-800/60">
                                    <CircleCheck className="mt-px size-3.5 shrink-0 text-emerald-600" /> Free: topic quizzes on every subject
                                </p>
                                <div className="mt-auto pt-4">
                                    <Button variant="outline" className="w-full justify-between" asChild>
                                        <Link href={route('exams.show', exam.slug)}>
                                            View Overview &amp; Buy <ArrowRight />
                                        </Link>
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

export default function MyExams({ exams }: { exams: ExamSummary[] }) {
    const [tab, setTab] = useState<(typeof tabs)[number]>('All');

    return (
        <StudentLayout title="My Exams">
            <div className="mx-auto max-w-7xl space-y-8">
                <PageHeading
                    eyebrow={<Eyebrow icon={GraduationCap}>Academic Hub • Enrollments</Eyebrow>}
                    title="My Exams"
                    description="Access, organise and accelerate your Himachal Pradesh state examination preparation."
                    aside={
                        <span className="bg-card inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
                            <Target className="size-4 text-indigo-600" /> No exam target set
                        </span>
                    }
                />

                <div className="flex flex-wrap items-center gap-3">
                    <label className="bg-card flex min-w-60 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                        <Search className="text-muted-foreground size-4" />
                        <input
                            disabled
                            placeholder="Search your enrolled exams, modules or test codes"
                            className="w-full bg-transparent outline-none"
                        />
                    </label>
                    <div className="bg-card flex rounded-lg border p-1" role="tablist">
                        {tabs.map((name) => (
                            <button
                                key={name}
                                type="button"
                                role="tab"
                                aria-selected={tab === name}
                                onClick={() => setTab(name)}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-sm',
                                    tab === name ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {name} (0)
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                    <div className="min-w-0">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <span className="h-5 w-1 rounded-full bg-indigo-600" /> Enrolled State Examinations (0 Active)
                            </h2>
                            <span className="text-muted-foreground text-xs">Synchronised with State Board Syllabi 2025-26</span>
                        </div>
                        <Panel>
                            <EmptyState
                                icon={ShoppingBag}
                                title="You haven't purchased any exams yet"
                                description="When you enrol in an exam package, it appears here with your syllabus progress, scores and a quick way to continue preparing."
                                className="border-0 py-10"
                            >
                                <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                                    <a href="#catalogue">
                                        Explore exams <ArrowRight />
                                    </a>
                                </Button>
                            </EmptyState>
                        </Panel>
                    </div>

                    <aside className="space-y-6">
                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <Gauge className="size-4 text-indigo-600" /> Exam Health
                            </h2>
                            <p className="text-muted-foreground mt-3 text-sm">
                                Your readiness, study progress and next milestone will show here once you enrol in an exam.
                            </p>
                        </Panel>
                        <section className="rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-sm">
                            <span className="rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold uppercase">In Progress Lesson</span>
                            <p className="font-display mt-4 text-lg font-semibold">No lesson in progress</p>
                            <p className="mt-1 text-sm text-white/80">Start a module and you can pick up exactly where you left off.</p>
                            <PlayCircle className="mt-4 size-6 text-white/70" />
                        </section>
                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <CalendarDays className="size-4 text-indigo-600" /> Upcoming Milestones
                            </h2>
                            <p className="text-muted-foreground mt-3 text-sm">Scheduled live mocks and drills for your exams will be listed here.</p>
                            <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
                                <FileStack className="size-3.5" /> Nothing scheduled yet
                            </p>
                        </Panel>
                    </aside>
                </div>

                <Catalogue exams={exams} />
            </div>
        </StudentLayout>
    );
}
