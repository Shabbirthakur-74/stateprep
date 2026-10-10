import { FlashStatus } from '@/components/flash-status';
import { HeroIllustration } from '@/components/hero-illustration';
import { NoticeBoard, type NoticeItem } from '@/components/notice-board';
import { Button } from '@/components/ui/button';
import PublicLayout, { usePublicPage, type PublicPageProps } from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    GraduationCap,
    Languages,
    MapPin,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props extends PublicPageProps {
    notices: NoticeItem[];
    exams: { name: string; slug: string }[];
    testCards: SeriesCard[];
    materialCards: SeriesCard[];
    text: Record<string, string>;
}

/** Wide hero artwork. Until the file exists, the drawn illustration is shown instead. */
const HERO_IMAGE = '/images/hero.jpg';

type Badge = 'Bestseller' | 'Most Popular' | 'Trending' | 'New';

/** A homepage carousel card, as sent by PublicCatalog::homeCards(). */
interface SeriesCard {
    id: number;
    exam: string | null;
    badge: Badge | null;
    title: string;
    description: string;
    highlights: string[];
    tag: string;
    tone: 'green' | 'blue';
    action: string;
    href: string | null;
}

const badgeStyles: Record<Badge, string> = {
    Bestseller: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    'Most Popular': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    Trending: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    New: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
};

/** "HPAS (HPPSC Himachal Administrative Service)" → "HPAS". */
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;

const reasons: { title: string; description: string; icon: LucideIcon; card: string; tile: string; quote?: string }[] = [
    {
        title: 'Smart Practice Tools',
        description: 'Practice smarter with tools designed to improve your preparation.',
        icon: Zap,
        card: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20',
        tile: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    },
    {
        title: 'Detailed Score Analysis',
        description: 'Get a detailed breakdown of your strengths and weaknesses and discover insights to improve your score.',
        icon: BarChart3,
        card: 'bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20',
        tile: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
    },
    {
        title: 'Effective Study Material',
        description: 'Learn with focused, easy-to-understand study material designed for exam preparation.',
        icon: BookOpen,
        card: 'bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20',
        tile: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    },
    {
        title: 'Real Exam Experience',
        description: 'Practice with real exam mocks and gain experience.',
        icon: Languages,
        card: 'bg-violet-50 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20',
        tile: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
        quote: '“Simulate the Pressure. Master the Pattern.”',
    },
];

function Eyebrow({ children }: { children: string }) {
    return (
        <p className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
            <span className="bg-primary size-1.5 rounded-full" /> {children}
        </p>
    );
}

function Hero() {
    const { getStarted } = usePublicPage();
    const { auth } = usePage<SharedData>().props;
    const [imageMissing, setImageMissing] = useState(false);

    return (
        <section className="relative overflow-hidden bg-linear-to-b from-sky-100 to-sky-50 dark:from-slate-900 dark:to-slate-950">
            {/* Artwork fills the section on large screens and sits under the text on small ones. */}
            <div
                className={cn(
                    'relative h-64 sm:h-80 lg:absolute lg:inset-0 lg:h-auto',
                    imageMissing && 'lg:left-auto lg:w-[60%] lg:[mask-image:linear-gradient(to_right,transparent,black_18%)]',
                )}
            >
                {imageMissing ? (
                    <>
                        <HeroIllustration className="size-full" />
                        <p className="font-hand absolute top-4 left-[22%] -rotate-6 text-xl leading-tight text-[#1e3a5f] sm:text-2xl lg:top-8 lg:text-3xl">
                            From Bir Billing to Shimla…
                            <br />
                            Your Success Starts Here
                        </p>
                    </>
                ) : (
                    <img src={HERO_IMAGE} alt="" className="size-full object-cover object-right" onError={() => setImageMissing(true)} />
                )}
            </div>
            {!imageMissing && (
                <div className="absolute inset-0 hidden bg-linear-to-r from-white/60 via-white/25 via-35% to-transparent to-55% lg:block dark:from-slate-950/90 dark:via-slate-950/60" />
            )}

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:py-14 lg:px-6 lg:py-24">
                <div className="max-w-xl">
                    <p className="bg-background/80 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium sm:text-sm">
                        <MapPin className="size-4 text-rose-500" /> Himachal's First State Level Exam Practice Platform
                    </p>
                    <h1 className="font-display mt-5 text-4xl leading-tight font-bold tracking-tight text-balance md:text-5xl">
                        One Platform for All <span className="text-primary block">State Level Exams in Himachal</span>
                    </h1>
                    <p className="text-muted-foreground mt-5 max-w-lg text-base md:text-lg">
                        Practice mock tests, quizzes and previous year papers for HP TET, CTET, HPPSC and other state level exams. Build your
                        confidence and take the next step towards your dream career.
                    </p>
                    <Button size="lg" className="mt-8 h-12 rounded-lg px-6" onClick={getStarted}>
                        {auth.user ? 'Open my account' : 'Start Practicing — Free'} <ArrowRight />
                    </Button>
                </div>
            </div>
        </section>
    );
}

function ExamsWeCover({ exams, title, description }: { exams: Props['exams']; title: string; description: string }) {
    return (
        <section id="exams" className="bg-card flex scroll-mt-24 flex-col rounded-2xl border p-6 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <GraduationCap className="size-5" />
                </span>
                <div>
                    <h2 className="font-display text-xl font-semibold">{title}</h2>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>
            </div>

            {exams.length === 0 ? (
                <p className="text-muted-foreground mt-6 rounded-xl border border-dashed p-6 text-center text-sm">
                    Exams are being added. Check back soon.
                </p>
            ) : (
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {exams.map((exam) => (
                        <li key={exam.slug}>
                            <Link
                                href={route('exams.show', exam.slug)}
                                title={exam.name}
                                className="hover:border-primary flex h-full w-full flex-col items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-5 text-center text-sm font-medium transition-colors dark:border-slate-700 dark:bg-slate-800/60"
                            >
                                <CircleCheck className="text-primary size-4" />
                                {shortName(exam.name)}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <div className="text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-2 pt-8 text-xs">
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Updated syllabus 2026
                </span>
                <span className="text-foreground font-medium">Curated by State Rankers</span>
            </div>
        </section>
    );
}

function SeriesCardView({ card, outline }: { card: SeriesCard; outline: boolean }) {
    const { getStarted } = usePublicPage();
    const buttonClass = cn('mt-3 h-10 w-full rounded-lg', outline && 'border-primary text-primary hover:text-primary');
    const label = (
        <>
            {card.action} <ArrowRight />
        </>
    );

    return (
        <article className="bg-card flex h-full flex-col rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-[11px] font-semibold uppercase">
                    {card.exam ? shortName(card.exam) : 'All exams'}
                </span>
                {card.badge && (
                    <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold uppercase', badgeStyles[card.badge])}>{card.badge}</span>
                )}
            </div>
            <h3 className="font-display mt-4 text-lg leading-snug font-semibold">{card.title}</h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{card.description}</p>
            <ul className="mt-4 grid grid-cols-3 gap-2">
                {card.highlights.map((feature) => (
                    <li key={feature} className="text-muted-foreground rounded-md border px-2 py-1.5 text-[11px] leading-tight">
                        {feature}
                    </li>
                ))}
            </ul>
            <p className={cn('mt-auto pt-4 text-xs font-semibold', card.tone === 'blue' ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400')}>
                {card.tag}
            </p>
            {card.href ? (
                <Button variant={outline ? 'outline' : 'default'} className={buttonClass} asChild>
                    <Link href={card.href}>{label}</Link>
                </Button>
            ) : (
                <Button variant={outline ? 'outline' : 'default'} className={buttonClass} onClick={getStarted}>
                    {label}
                </Button>
            )}
        </article>
    );
}

/** A section heading with prev/next arrows over a horizontally scrolling row of cards, with page dots below. */
function CardCarousel({
    id,
    eyebrow,
    title,
    description,
    cards,
}: {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    cards: SeriesCard[];
}) {
    const track = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(0);

    const measure = useCallback(() => {
        const el = track.current;
        if (!el) return;
        const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05));
        setPages(total);
        const max = el.scrollWidth - el.clientWidth;
        setPage(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (total - 1)));
    }, []);

    useEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    const scrollByCards = (direction: 1 | -1) => {
        const el = track.current;
        const first = el?.firstElementChild as HTMLElement | null;
        if (!el || !first) return;
        el.scrollBy({ left: direction * (first.offsetWidth + 20), behavior: 'smooth' });
    };

    const goTo = (index: number) => {
        const el = track.current;
        if (!el) return;
        el.scrollTo({ left: ((el.scrollWidth - el.clientWidth) * index) / Math.max(1, pages - 1), behavior: 'smooth' });
    };

    return (
        <div id={id} className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Eyebrow>{eyebrow}</Eyebrow>
                    <h2 className="font-display mt-4 text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        aria-label="Previous"
                        onClick={() => scrollByCards(-1)}
                        className="bg-background hover:border-primary flex size-10 items-center justify-center rounded-full border shadow-sm"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next"
                        onClick={() => scrollByCards(1)}
                        className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full shadow-sm hover:opacity-90"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </div>
            </div>

            <div
                ref={track}
                onScroll={measure}
                className="-mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
            >
                {cards.map((card, index) => (
                    <div key={card.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-60px)/3.6)]">
                        <SeriesCardView card={card} outline={index % 2 === 1} />
                    </div>
                ))}
            </div>

            {pages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                    {Array.from({ length: pages }, (_, index) => (
                        <button
                            key={index}
                            type="button"
                            aria-label={`Go to page ${index + 1}`}
                            onClick={() => goTo(index)}
                            className={cn('h-2 rounded-full transition-all', index === page ? 'bg-primary w-7' : 'bg-primary/20 w-2')}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function WhyChooseUs() {
    const { name } = usePage<SharedData>().props;

    return (
        <section id="about" className="mx-auto grid max-w-7xl scroll-mt-24 items-center gap-10 px-4 py-20 lg:grid-cols-[1fr_1.5fr] lg:px-6">
            <div>
                <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
                    Why Choose <span className="text-primary block">{name}?</span>
                </h2>
                <p className="text-muted-foreground mt-5 max-w-sm text-lg">Everything you need to succeed in your targeted exams.</p>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2">
                {reasons.map(({ title, description, icon: Icon, card, tile, quote }) => (
                    <li key={title} className={cn('rounded-2xl border p-7', card)}>
                        <span className={cn('flex size-11 items-center justify-center rounded-xl', tile)}>
                            <Icon className="size-5" />
                        </span>
                        <h3 className="font-display mt-6 font-semibold">{title}</h3>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
                        {quote && <p className="mt-4 text-xs font-medium text-violet-700 italic dark:text-violet-300">• {quote}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function Welcome({ notices, exams, testCards, materialCards, text, authPrompt }: Props) {
    return (
        <PublicLayout authPrompt={authPrompt}>
            <Head title="State level exam practice for Himachal" />

            <Hero />

            <div className="mx-auto max-w-7xl px-4 empty:hidden lg:px-6">
                <FlashStatus />
            </div>

            <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 lg:grid-cols-[1.4fr_1fr] lg:px-6">
                <ExamsWeCover exams={exams} title={text.home_exams_title} description={text.home_exams_description} />
                <NoticeBoard notices={notices} />
            </section>

            {/* A carousel without cards is left out. */}
            {testCards.length > 0 && (
                <section className="bg-slate-50 py-16 dark:bg-slate-900/40">
                    <div className="mx-auto max-w-7xl px-4 lg:px-6">
                        <CardCarousel
                            id="tests"
                            eyebrow={text.home_tests_eyebrow}
                            title={text.home_tests_title}
                            description={text.home_tests_description}
                            cards={testCards}
                        />
                    </div>
                </section>
            )}

            {materialCards.length > 0 && (
                <section className="py-16">
                    <div className="mx-auto max-w-7xl px-4 lg:px-6">
                        <CardCarousel
                            id="materials"
                            eyebrow={text.home_materials_eyebrow}
                            title={text.home_materials_title}
                            description={text.home_materials_description}
                            cards={materialCards}
                        />
                    </div>
                </section>
            )}

            <div className="border-t">
                <WhyChooseUs />
            </div>
        </PublicLayout>
    );
}
