import { cn } from '@/lib/utils';
import { BookOpen, Building2, Check, Landmark, Laptop, Map, Scale, Shield, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/** An exam with how much published content it has, as sent by StudentCatalog::exams(). */
export interface ExamSummary {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    subjects_count: number;
    questions_count: number;
    mock_count: number;
    pyq_count: number;
}

export interface Paper {
    id: number;
    title: string;
    year: number | null;
    exam: { id: number; name: string };
    cover_url: string | null;
    questions_count: number;
    total_marks: number;
    duration_minutes: number;
    marks_per_question: number;
    negative_marks: number;
    is_free: boolean;
    price: number | null;
}

/**
 * A content cover photo, or a soft indigo panel with an icon when no photo has been uploaded.
 */
export function Cover({ url, icon: Icon, className }: { url: string | null; icon: LucideIcon; className?: string }) {
    return url ? (
        <img src={url} alt="" loading="lazy" className={cn('bg-muted object-cover', className)} />
    ) : (
        <div
            className={cn(
                'flex items-center justify-center bg-linear-to-br from-indigo-50 to-violet-100 text-indigo-500 dark:from-slate-800 dark:to-indigo-950 dark:text-indigo-300',
                className,
            )}
        >
            <Icon className="size-1/4 max-h-10 min-h-5 max-w-10 min-w-5" />
        </div>
    );
}

/** "HPAS (HPPSC Himachal Administrative Service)" → "HPAS". */
export const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;

/** "HPAS (HPPSC Himachal Administrative Service)" → "HPPSC Himachal Administrative Service", or null. */
export const longName = (name: string) => name.match(/\((.*)\)\s*$/)?.[1] ?? null;

const examIcons: LucideIcon[] = [Landmark, Shield, BookOpen, Map, Laptop, Scale, Building2];

export const examIcon = (index: number) => examIcons[index % examIcons.length];

export function Panel({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
    return (
        <section id={id} className={cn('bg-card rounded-2xl border p-5 shadow-sm md:p-6', className)}>
            {children}
        </section>
    );
}

export function Eyebrow({ icon: Icon, children }: { icon?: LucideIcon; children: string }) {
    return (
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-indigo-600 uppercase dark:text-indigo-300">
            {Icon && <Icon className="size-3.5" />}
            {children}
        </p>
    );
}

export function Pill({ tone = 'indigo', className, children }: { tone?: keyof typeof pillTones; className?: string; children: ReactNode }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold', pillTones[tone], className)}>
            {children}
        </span>
    );
}

const pillTones = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export function PageHeading({ eyebrow, title, description, aside }: { eyebrow?: ReactNode; title: string; description: string; aside?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
                {eyebrow}
                <h1 className="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{description}</p>
            </div>
            {aside}
        </div>
    );
}

export function StatTile({
    label,
    value,
    hint,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    hint: string;
    icon?: LucideIcon;
    accent?: string;
}) {
    return (
        <div className="bg-card rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <p className="text-muted-foreground text-sm">{label}</p>
                {Icon && (
                    <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <Icon className="size-4" />
                    </span>
                )}
            </div>
            <p className={cn('font-display mt-2 text-3xl font-semibold', accent)}>{value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        </div>
    );
}

/** Small figure box used in page headers, e.g. "Total saved 0". */
export function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <div className="bg-card min-w-24 rounded-xl border px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">{label}</p>
            <p className="font-display mt-1 text-2xl font-semibold">{value}</p>
            <p className="text-muted-foreground text-[11px]">{hint}</p>
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    children,
    className,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center', className)}>
            <span className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Icon className="size-7" />
            </span>
            <h3 className="font-display mt-4 text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">{description}</p>
            {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
        </div>
    );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
    return (
        <div className={cn('h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-slate-800', className)} role="img" aria-label={`${value}%`}>
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${value}%` }} />
        </div>
    );
}

/**
 * Row of exam cards to filter a screen by exam. `null` means all exams.
 */
export function ExamPicker({
    exams,
    value,
    onChange,
    count,
}: {
    exams: ExamSummary[];
    value: number | null;
    onChange: (examId: number | null) => void;
    /** What to show under each exam, e.g. "3 papers". */
    count: (exam: ExamSummary) => string;
}) {
    const options: { id: number | null; title: string; subtitle: string; meta: string; icon: LucideIcon }[] = [
        { id: null, title: 'All Exams', subtitle: `${exams.length} state exams`, meta: '', icon: Building2 },
        ...exams.map((exam, index) => ({
            id: exam.id,
            title: shortName(exam.name),
            subtitle: longName(exam.name) ?? exam.description ?? '',
            meta: count(exam),
            icon: examIcon(index),
        })),
    ];

    return (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {options.map(({ id, title, subtitle, meta, icon: Icon }) => {
                const selected = value === id;
                return (
                    <button
                        key={id ?? 'all'}
                        type="button"
                        onClick={() => onChange(id)}
                        aria-pressed={selected}
                        className={cn(
                            'bg-card relative flex w-40 shrink-0 flex-col items-start rounded-xl border p-3.5 text-left transition-colors',
                            selected ? 'border-indigo-600 ring-1 ring-indigo-600' : 'hover:border-indigo-300',
                        )}
                    >
                        {selected && (
                            <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <Check className="size-3" />
                            </span>
                        )}
                        <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                            <Icon className="size-4" />
                        </span>
                        <span className="mt-2.5 text-sm font-semibold">{title}</span>
                        <span className="text-muted-foreground line-clamp-2 text-[11px] leading-snug">{subtitle}</span>
                        {meta && <span className="mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">{meta}</span>}
                    </button>
                );
            })}
        </div>
    );
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
