import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

/** One exam notification, as sent by Notice::board() on the server. */
export interface NoticeItem {
    id: number;
    title: string;
    summary: string | null;
    url: string | null;
    category: 'notification' | 'admit_card' | 'answer_key' | 'result' | 'syllabus' | 'announcement';
    categoryLabel: string;
    exam: string | null;
    publishedOn: string;
    isPinned: boolean;
    isNew: boolean;
}

const categoryStyles: Record<NoticeItem['category'], string> = {
    notification: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    admit_card: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    answer_key: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    result: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    syllabus: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    announcement: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
};

/** Notices shown before "View All" is pressed. */
const COLLAPSED_COUNT = 4;

function formatDate(date: string) {
    // Dates arrive as YYYY-MM-DD; parse as local time so the day never shifts across time zones.
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function NoticeRow({ notice }: { notice: NoticeItem }) {
    const body = (
        <>
            <div className="flex items-center justify-between gap-3">
                <span
                    className={cn(
                        'rounded px-2 py-0.5 text-[10px] leading-4 font-semibold tracking-wide uppercase',
                        notice.isNew
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : categoryStyles[notice.category],
                    )}
                >
                    {notice.isNew ? 'New' : notice.categoryLabel}
                </span>
                <time dateTime={notice.publishedOn} className="text-muted-foreground shrink-0 text-xs">
                    {formatDate(notice.publishedOn)}
                </time>
            </div>
            <p className="mt-2 text-sm font-semibold">{notice.title}</p>
            {notice.summary && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{notice.summary}</p>}
        </>
    );

    const rowClass = 'block rounded-xl bg-sky-50 px-4 py-3.5 dark:bg-slate-800/60';

    return notice.url ? (
        <a href={notice.url} target="_blank" rel="noopener noreferrer" className={cn(rowClass, 'hover:ring-primary/40 transition hover:ring-1')}>
            {body}
        </a>
    ) : (
        <div className={rowClass}>{body}</div>
    );
}

/**
 * Exam notifications (recruitment notices, admit cards, answer keys, results) on the home page.
 */
export function NoticeBoard({ notices, className }: { notices: NoticeItem[]; className?: string }) {
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? notices : notices.slice(0, COLLAPSED_COUNT);

    return (
        <section className={cn('bg-card flex flex-col rounded-2xl border p-6 shadow-sm', className)} aria-labelledby="notice-board-heading">
            <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <h2 id="notice-board-heading" className="font-display text-xl font-semibold">
                        Notice Board
                    </h2>
                    <p className="text-muted-foreground text-sm">Latest updates and important announcements.</p>
                </div>
                {notices.length > COLLAPSED_COUNT && (
                    <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="text-primary mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
                    >
                        {expanded ? 'Show less' : 'View All'}
                        <ArrowRight className={cn('size-3.5 transition-transform', expanded && '-rotate-90')} />
                    </button>
                )}
            </header>

            {notices.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">No notices right now. Check back soon.</p>
            ) : (
                <ul className={cn('space-y-3', expanded && 'max-h-[30rem] overflow-y-auto pr-1')}>
                    {shown.map((notice) => (
                        <li key={notice.id}>
                            <NoticeRow notice={notice} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
