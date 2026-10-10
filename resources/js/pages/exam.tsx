import { FlashStatus } from '@/components/flash-status';
import { NoticeBoard, type NoticeItem } from '@/components/notice-board';
import { Button } from '@/components/ui/button';
import PublicLayout, { usePublicPage, type PublicPageProps } from '@/layouts/public-layout';
import StudentLayout from '@/layouts/student-layout';
import { discountPercent, includedItems, plural, rupees, type ExamCounts, type ExamDetails } from '@/lib/exam-bundle';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpenText,
    CalendarClock,
    ChevronDown,
    CircleCheck,
    ClipboardList,
    FileStack,
    GraduationCap,
    Layers,
    Library,
    Lock,
    ShieldCheck,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';

interface InsideItem {
    /** Quizzes only: free samples can be played from here. */
    id?: number;
    title: string;
    detail: string;
    is_free: boolean;
}

interface Props extends PublicPageProps {
    exam: ExamDetails;
    counts: ExamCounts;
    syllabus: { name: string; questions_count: number; topics: string[] }[];
    inside: Record<'series' | 'mocks' | 'pyqs' | 'materials' | 'quizzes', InsideItem[]>;
    notices: NoticeItem[];
    otherExams: { name: string; slug: string }[];
}

const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;
const longName = (name: string) => name.match(/\((.*)\)\s*$/)?.[1] ?? null;

/** `onStart` is the "Start practising free" button of a free exam. */
function PriceCard({ exam, counts, onStart }: { exam: ExamDetails; counts: ExamCounts; onStart: () => void }) {
    const { auth } = usePage<SharedData>().props;
    const discount = discountPercent(exam);
    const included = includedItems(counts);

    return (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-lg">
            {exam.cover_url ? (
                <img src={exam.cover_url} alt="" className="aspect-video w-full object-cover" />
            ) : (
                <div className="bg-primary/10 text-primary flex aspect-[16/7] items-center justify-center">
                    <GraduationCap className="size-12" />
                </div>
            )}
            <div className="p-6">
                {exam.is_free ? (
                    <p className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">Free</p>
                ) : exam.for_sale ? (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-display text-3xl font-bold">{rupees(exam.price!)}</p>
                        {discount > 0 && (
                            <>
                                <p className="text-muted-foreground text-base line-through">{rupees(exam.original_price!)}</p>
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    {discount}% off
                                </span>
                            </>
                        )}
                    </div>
                ) : (
                    <p className="font-display text-xl font-semibold">Pricing announced soon</p>
                )}
                {exam.validity_months && !exam.is_free && (
                    <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                        <CalendarClock className="size-4" /> Full access for {plural(exam.validity_months, 'month')}
                    </p>
                )}

                {exam.is_free ? (
                    <Button size="lg" className="mt-5 h-12 w-full rounded-lg" onClick={onStart}>
                        {auth.user ? 'Open my dashboard' : 'Start practising free'} <ArrowRight />
                    </Button>
                ) : exam.for_sale ? (
                    <Button size="lg" className="mt-5 h-12 w-full rounded-lg" asChild>
                        {/* A full page load, so a visitor lands on this page with the sign-up sidebar open. */}
                        <a href={route('exams.buy', exam.slug)}>
                            Buy {shortName(exam.name)} <ArrowRight />
                        </a>
                    </Button>
                ) : (
                    <Button size="lg" className="mt-5 h-12 w-full rounded-lg" disabled>
                        Coming soon
                    </Button>
                )}
                {!auth.user && exam.for_sale && (
                    <p className="text-muted-foreground mt-2 text-center text-xs">You'll create a free account first, then go to payment.</p>
                )}

                {(included.length > 0 || exam.highlights.length > 0) && (
                    <div className="mt-6 border-t pt-5">
                        <p className="text-sm font-semibold">{exam.is_free ? 'What you get' : 'What you get when you buy'}</p>
                        <ul className="mt-3 space-y-2.5 text-sm">
                            {included.map(({ icon: Icon, label }) => (
                                <li key={label} className="flex items-start gap-2.5">
                                    <Icon className="text-primary mt-0.5 size-4 shrink-0" /> {label}
                                </li>
                            ))}
                            {exam.highlights.map((point) => (
                                <li key={point} className="flex items-start gap-2.5">
                                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {exam.for_sale && (
                    <p className="text-muted-foreground mt-5 flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="size-4" /> Secure payment • Instant access after purchase
                    </p>
                )}
            </div>
        </div>
    );
}

function SectionTitle({ id, children }: { id: string; children: string }) {
    return (
        <h2 id={id} className="font-display scroll-mt-28 text-2xl font-bold tracking-tight">
            {children}
        </h2>
    );
}

const insideGroups: { key: keyof Props['inside']; title: string; icon: LucideIcon }[] = [
    { key: 'series', title: 'Test series', icon: Layers },
    { key: 'mocks', title: 'Mock tests', icon: ClipboardList },
    { key: 'pyqs', title: 'Previous year papers', icon: FileStack },
    { key: 'materials', title: 'Study material', icon: BookOpenText },
    { key: 'quizzes', title: 'Quizzes', icon: Zap },
];

/**
 * The exam page content. Visitors see it in the public layout; signed-in students see the same page inside their dashboard.
 */
function ExamBody({
    exam,
    counts,
    syllabus,
    inside,
    notices,
    otherExams,
    authPrompt,
    student,
    onStart,
    onPlayQuiz,
}: Props & { student: boolean; onStart: () => void; onPlayQuiz: ((quizId: number) => void) | null }) {
    const full = longName(exam.name);
    const hasInside = insideGroups.some((g) => inside[g.key].length > 0);
    const nav = [
        exam.overview && { id: 'about', label: 'About' },
        exam.facts.length > 0 && { id: 'facts', label: 'Key facts' },
        { id: 'inside', label: "What's inside" },
        syllabus.length > 0 && { id: 'syllabus', label: 'Syllabus' },
        exam.faqs.length > 0 && { id: 'faqs', label: 'FAQs' },
    ].filter(Boolean) as { id: string; label: string }[];

    const stats = [
        { label: 'Mock tests', value: counts.mocks + counts.pyqs },
        { label: 'Study materials', value: counts.materials },
        { label: 'Questions', value: counts.questions },
        { label: 'Topics', value: counts.topics },
    ];

    return (
        <>
            <section
                className={cn(
                    'bg-linear-to-b from-sky-100 to-sky-50 dark:from-slate-900 dark:to-slate-950',
                    student && '-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8',
                )}
            >
                <div className="mx-auto max-w-7xl px-4 pt-8 pb-10 lg:px-6 lg:pb-14">
                    <nav aria-label="Breadcrumb" className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        {student ? (
                            <>
                                <Link href={route('student.dashboard')} className="hover:text-primary">
                                    Dashboard
                                </Link>
                                /
                                <Link href={route('student.exams')} className="hover:text-primary">
                                    My Exams
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href={route('home')} className="hover:text-primary">
                                    Home
                                </Link>
                                /
                                <a href={`${route('home')}#exams`} className="hover:text-primary">
                                    Exams
                                </a>
                            </>
                        )}
                        / <span className="text-foreground">{shortName(exam.name)}</span>
                    </nav>
                    <div className="mt-6 max-w-3xl">
                        <p className="bg-background/80 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                            <GraduationCap className="size-4" /> State exam preparation
                        </p>
                        <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">{shortName(exam.name)}</h1>
                        {full && <p className="text-primary mt-2 text-lg font-medium">{full}</p>}
                        {exam.description && <p className="text-muted-foreground mt-4 text-base md:text-lg">{exam.description}</p>}
                        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {stats.map((s) => (
                                <div key={s.label} className="bg-background/80 rounded-xl border px-4 py-3">
                                    <dd className="font-display text-2xl font-bold">{s.value.toLocaleString('en-IN')}</dd>
                                    <dt className="text-muted-foreground text-xs">{s.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            <div className={cn('mx-auto grid max-w-7xl gap-10 pb-20 lg:grid-cols-[1fr_24rem]', !student && 'px-4 lg:px-6')}>
                {/* Beside the content on large screens, first on small ones so the price is seen straight away. */}
                <aside className="pt-8 lg:col-start-2 lg:row-start-1">
                    <div className="lg:sticky lg:top-28">
                        <PriceCard exam={exam} counts={counts} onStart={onStart} />
                    </div>
                </aside>

                <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1 lg:pt-8">
                    {!authPrompt && (
                        <div className="empty:hidden">
                            <FlashStatus />
                        </div>
                    )}

                    <nav
                        aria-label="On this page"
                        className={cn(
                            'bg-background/95 sticky top-16 z-10 -mx-4 border-b px-4 py-3 backdrop-blur lg:mx-0 lg:px-0',
                            !student && 'md:top-20',
                        )}
                    >
                        <ul className="flex gap-5 overflow-x-auto text-sm font-medium [scrollbar-width:none]">
                            {nav.map((item) => (
                                <li key={item.id} className="shrink-0">
                                    <a href={`#${item.id}`} className="text-muted-foreground hover:text-primary">
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {exam.overview && (
                        <section>
                            <SectionTitle id="about">About the exam</SectionTitle>
                            <div className="text-muted-foreground mt-4 space-y-4 leading-relaxed">
                                {exam.overview.split(/\n\s*\n/).map((para, i) => (
                                    <p key={i} className="whitespace-pre-line">
                                        {para}
                                    </p>
                                ))}
                            </div>
                        </section>
                    )}

                    {exam.facts.length > 0 && (
                        <section>
                            <SectionTitle id="facts">Key facts</SectionTitle>
                            <dl className="mt-4 divide-y overflow-hidden rounded-xl border">
                                {exam.facts.map((fact) => (
                                    <div key={fact.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                                        <dt className="text-sm font-semibold">{fact.label}</dt>
                                        <dd className="text-muted-foreground text-sm">{fact.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    <section>
                        <SectionTitle id="inside">What's inside</SectionTitle>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {exam.is_free
                                ? 'Everything here is free with an account.'
                                : 'Buying the exam unlocks everything below. Items marked Free can be tried first.'}
                        </p>
                        {hasInside ? (
                            <div className="mt-5 grid gap-5 md:grid-cols-2">
                                {insideGroups
                                    .filter((g) => inside[g.key].length > 0)
                                    .map(({ key, title, icon: Icon }) => (
                                        <div key={key} className="bg-card rounded-2xl border p-5">
                                            <h3 className="flex items-center gap-2 font-semibold">
                                                <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                                                    <Icon className="size-4" />
                                                </span>
                                                {title}
                                                <span className="text-muted-foreground ml-auto text-xs font-normal">{inside[key].length}</span>
                                            </h3>
                                            <ul className="mt-4 space-y-2.5">
                                                {inside[key].slice(0, 6).map((item) => (
                                                    <li key={item.title} className="flex items-start gap-3 text-sm">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium">{item.title}</p>
                                                            <p className="text-muted-foreground text-xs">{item.detail}</p>
                                                        </div>
                                                        {key === 'quizzes' && item.is_free && item.id && onPlayQuiz ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 shrink-0 px-2 text-xs"
                                                                onClick={() => onPlayQuiz(item.id!)}
                                                            >
                                                                Try free
                                                            </Button>
                                                        ) : item.is_free || exam.is_free ? (
                                                            <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                FREE
                                                            </span>
                                                        ) : (
                                                            <Lock
                                                                className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                                                                aria-label="Included when you buy"
                                                            />
                                                        )}
                                                    </li>
                                                ))}
                                                {inside[key].length > 6 && (
                                                    <li className="text-muted-foreground text-xs">and {inside[key].length - 6} more</li>
                                                )}
                                            </ul>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground mt-5 rounded-xl border border-dashed p-6 text-center text-sm">
                                Tests and study material for this exam are being prepared.
                            </p>
                        )}
                    </section>

                    {syllabus.length > 0 && (
                        <section>
                            <SectionTitle id="syllabus">Syllabus covered</SectionTitle>
                            <p className="text-muted-foreground mt-1 text-sm">Subjects and topics in our practice bank for this exam.</p>
                            <div className="mt-5 space-y-3">
                                {syllabus.map((subject) => (
                                    <details key={subject.name} className="group bg-card rounded-xl border">
                                        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                                            <Library className="text-primary size-4 shrink-0" />
                                            <span className="flex-1 font-medium">{subject.name}</span>
                                            <span className="text-muted-foreground text-xs">
                                                {plural(subject.topics.length, 'topic')} • {plural(subject.questions_count, 'question')}
                                            </span>
                                            <ChevronDown className="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
                                        </summary>
                                        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                                            {subject.topics.length ? (
                                                subject.topics.map((topic) => (
                                                    <span key={topic} className="bg-muted rounded-md px-2.5 py-1 text-xs">
                                                        {topic}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Topics are being added.</span>
                                            )}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </section>
                    )}

                    {notices.length > 0 && <NoticeBoard notices={notices} />}

                    {exam.faqs.length > 0 && (
                        <section>
                            <SectionTitle id="faqs">Frequently asked questions</SectionTitle>
                            <div className="mt-5 divide-y rounded-xl border">
                                {exam.faqs.map((faq) => (
                                    <details key={faq.question} className="group px-4">
                                        <summary className="flex cursor-pointer list-none items-center gap-3 py-4 font-medium [&::-webkit-details-marker]:hidden">
                                            <span className="flex-1">{faq.question}</span>
                                            <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
                                        </summary>
                                        <p className="text-muted-foreground pb-4 text-sm leading-relaxed whitespace-pre-line">{faq.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    )}

                    {otherExams.length > 0 && (
                        <section>
                            <h2 className="font-display text-lg font-semibold">Explore other exams</h2>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {otherExams.map((other) => (
                                    <li key={other.slug}>
                                        <Link
                                            href={route('exams.show', other.slug)}
                                            className={cn(
                                                'hover:border-primary hover:text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
                                            )}
                                        >
                                            <CircleCheck className="text-primary size-3.5" /> {shortName(other.name)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}

function PublicExamBody(props: Props) {
    const { getStarted } = usePublicPage();
    const { auth } = usePage<SharedData>().props;

    // Visitors sign up to play a free sample; team accounts cannot play.
    return <ExamBody {...props} student={false} onStart={getStarted} onPlayQuiz={auth.user ? null : () => getStarted()} />;
}

export default function ExamPage(props: Props) {
    const { auth } = usePage<SharedData>().props;
    const title = `${shortName(props.exam.name)}: exam details, mock tests and study material`;
    let page: ReactNode;

    if (auth.user?.role === 'student') {
        // The blue public palette is kept, so the page looks the same as before signing in.
        page = (
            <StudentLayout title={title}>
                <div className="public-theme">
                    <ExamBody
                        {...props}
                        student
                        onStart={() => router.visit(route('student.dashboard'))}
                        onPlayQuiz={(id) => router.post(route('student.quizzes.ready', id))}
                    />
                </div>
            </StudentLayout>
        );
    } else {
        page = (
            <PublicLayout authPrompt={props.authPrompt}>
                <Head title={title} />
                <PublicExamBody {...props} />
            </PublicLayout>
        );
    }

    return page;
}
