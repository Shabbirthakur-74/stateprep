import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { CircleCheck, ImageIcon, MessageCircleQuestion, ShieldCheck } from 'lucide-react';

export type DoubtStatus = 'open' | 'answered' | 'closed';

/** A doubt in a list, from DoubtPresenter::summary(). */
export interface DoubtSummary {
    id: number;
    preview: string;
    status: DoubtStatus;
    subject: string | null;
    topic: string | null;
    student: string | null;
    replies_count: number;
    has_photo: boolean;
    has_question: boolean;
    created_at: string;
    last_activity_at: string;
    unread?: boolean;
}

export interface DoubtQuestion {
    id: number;
    text: string;
    options: Record<'A' | 'B' | 'C' | 'D', string>;
    correct: 'A' | 'B' | 'C' | 'D';
    explanation: string | null;
    subject_id: number;
    topic_id: number | null;
    subject: string | null;
    topic: string | null;
}

/** The full conversation, from DoubtPresenter::thread(). */
export interface DoubtThreadData extends DoubtSummary {
    body: string;
    student_id: number;
    photo_url: string | null;
    question: DoubtQuestion | null;
    replies: { id: number; body: string; from_team: boolean; author: string; photo_url: string | null; created_at: string }[];
}

export const statusInfo: Record<DoubtStatus, { student: string; team: string; tone: string }> = {
    open: { student: 'Waiting for answer', team: 'Open', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
    answered: { student: 'Answered', team: 'Answered', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    closed: { student: 'Resolved', team: 'Closed', tone: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' },
};

export function StatusBadge({ status, audience }: { status: DoubtStatus; audience: 'student' | 'team' }) {
    return <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', statusInfo[status].tone)}>{statusInfo[status][audience]}</span>;
}

/** "5 min ago", "3 h ago", or a date. */
export function ago(iso: string) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Under a question in quiz and test solutions: opens the Ask a doubt page with this question attached. */
export function AskDoubtLink({ questionId }: { questionId: number }) {
    return (
        <Link
            href={route('student.doubts', { question: questionId })}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
        >
            <MessageCircleQuestion className="size-3.5" /> Still unclear? Ask a doubt
        </Link>
    );
}

export function AttachedQuestion({ question }: { question: DoubtQuestion }) {
    return (
        <div className="rounded-xl border bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Question{question.subject && ` • ${question.subject}`}
                {question.topic && ` › ${question.topic}`}
            </p>
            <p className="mt-2 font-medium">{question.text}</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {(Object.keys(question.options) as (keyof DoubtQuestion['options'])[]).map((letter) => (
                    <li
                        key={letter}
                        className={cn('flex gap-2', letter === question.correct && 'font-semibold text-emerald-700 dark:text-emerald-400')}
                    >
                        <span>{letter})</span> {question.options[letter]}
                        {letter === question.correct && <CircleCheck className="mt-0.5 size-3.5" />}
                    </li>
                ))}
            </ul>
            {question.explanation && <p className="text-muted-foreground mt-2 text-xs">Explanation: {question.explanation}</p>}
        </div>
    );
}

function Photo({ url }: { url: string }) {
    return (
        <a href={url} target="_blank" rel="noopener" className="mt-3 block w-fit">
            <img src={url} alt="Attached photo" className="max-h-72 rounded-lg border object-contain" />
            <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <ImageIcon className="size-3" /> Open full size
            </span>
        </a>
    );
}

function Bubble({ team, author, when, body, photo }: { team: boolean; author: string; when: string; body: string; photo: string | null }) {
    return (
        <div className={cn('flex', team ? 'justify-start' : 'justify-end')}>
            <div
                className={cn(
                    'max-w-[85%] rounded-2xl border px-4 py-3',
                    team
                        ? 'rounded-tl-sm bg-white dark:bg-slate-900'
                        : 'rounded-tr-sm border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10',
                )}
            >
                <p className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-semibold">{author}</span>
                    {team && (
                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                            <ShieldCheck className="size-3" /> StatePrep360 team
                        </span>
                    )}
                    <span className="text-muted-foreground">{ago(when)}</span>
                </p>
                <p className="mt-1.5 text-sm whitespace-pre-line">{body}</p>
                {photo && <Photo url={photo} />}
            </div>
        </div>
    );
}

/**
 * The doubt (with its question and photo) followed by every reply. The student's messages sit on the right,
 * the team's on the left.
 */
export function DoubtThread({ doubt }: { doubt: DoubtThreadData }) {
    return (
        <div className="space-y-4">
            {doubt.question && <AttachedQuestion question={doubt.question} />}
            <Bubble team={false} author={doubt.student ?? 'Student'} when={doubt.created_at} body={doubt.body} photo={doubt.photo_url} />
            {doubt.replies.map((reply) => (
                <Bubble
                    key={reply.id}
                    team={reply.from_team}
                    author={reply.author}
                    when={reply.created_at}
                    body={reply.body}
                    photo={reply.photo_url}
                />
            ))}
        </div>
    );
}
