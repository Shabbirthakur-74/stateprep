import { cn } from '@/lib/utils';

/** Cut-offs set by an admin under Settings. */
export interface ResultBands {
    pass: number;
    review: number;
}

const looks = {
    pass: { label: 'Passed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    review: { label: 'Review', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    retry: { label: 'Retry', className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
};

export function resultBand(percent: number | null, bands: ResultBands): keyof typeof looks | null {
    if (percent === null) return null;
    if (percent >= bands.pass) return 'pass';
    if (percent >= bands.review) return 'review';
    return 'retry';
}

/** "Passed", "Review" or "Retry" for a score, using the admin's cut-offs. */
export function ResultBadge({ percent, bands, className }: { percent: number | null; bands: ResultBands; className?: string }) {
    const band = resultBand(percent, bands);
    if (!band) return null;

    return (
        <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold', looks[band].className, className)}>
            {looks[band].label}
        </span>
    );
}

/** Explains what each label means, for legends. */
export function bandRanges(bands: ResultBands) {
    return [
        { band: 'pass' as const, label: looks.pass.label, className: looks.pass.className, text: `${bands.pass}% or more` },
        { band: 'review' as const, label: looks.review.label, className: looks.review.className, text: `${bands.review}–${bands.pass - 1}%` },
        { band: 'retry' as const, label: looks.retry.label, className: looks.retry.className, text: `Below ${bands.review}%` },
    ];
}
