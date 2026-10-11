import { PhotoPicker } from '@/components/doubt-reply-form';
import { AttachedQuestion, StatusBadge, ago, type DoubtQuestion, type DoubtStatus, type DoubtSummary } from '@/components/doubt-thread';
import InputError from '@/components/input-error';
import { EmptyState, Eyebrow, MiniStat, PageHeading, Panel } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Link, useForm } from '@inertiajs/react';
import { ChevronRight, FileQuestion, ImageIcon, Lightbulb, MessageSquareText, Send, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Subject {
    id: number;
    name: string;
    topics: { id: number; name: string }[];
}

interface Props {
    doubts: DoubtSummary[];
    subjects: Subject[];
    attach: DoubtQuestion | null;
}

const tabs: { key: 'all' | DoubtStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Waiting' },
    { key: 'answered', label: 'Answered' },
    { key: 'closed', label: 'Resolved' },
];

function AskForm({ subjects, attach }: { subjects: Subject[]; attach: DoubtQuestion | null }) {
    const [question, setQuestion] = useState(attach);
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        subject_id: attach ? String(attach.subject_id) : '',
        topic_id: attach?.topic_id ? String(attach.topic_id) : '',
        body: '',
        photo: null as File | null,
    });
    const subject = subjects.find((s) => String(s.id) === data.subject_id);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((d) => ({ ...d, question_id: question?.id ?? '' }));
        post(route('student.doubts.store'), { forceFormData: true, onSuccess: () => reset() });
    };

    return (
        <Panel id="ask">
            <h2 className="font-display text-lg font-semibold">Ask a doubt</h2>
            <p className="text-muted-foreground text-sm">Our team reads every doubt and replies here. Add a photo if it helps explain.</p>
            <form onSubmit={submit} className="mt-5 grid gap-4">
                {question && (
                    <div className="relative">
                        <AttachedQuestion question={question} />
                        <button
                            type="button"
                            onClick={() => setQuestion(null)}
                            aria-label="Remove the attached question"
                            className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                    <select
                        aria-label="Subject"
                        className={selectClass}
                        value={data.subject_id}
                        onChange={(e) => setData((d) => ({ ...d, subject_id: e.target.value, topic_id: '' }))}
                    >
                        <option value="">Subject (optional)</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Topic"
                        className={selectClass}
                        value={data.topic_id}
                        disabled={!subject?.topics.length}
                        onChange={(e) => setData('topic_id', e.target.value)}
                    >
                        <option value="">Topic (optional)</option>
                        {subject?.topics.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
                <InputError message={errors.subject_id ?? errors.topic_id} />
                <div className="grid gap-1.5">
                    <textarea
                        aria-label="Your doubt"
                        className={textareaClass}
                        rows={5}
                        maxLength={3000}
                        placeholder={
                            question ? 'What is unclear about this question?' : 'Describe your doubt. The more detail, the better the answer.'
                        }
                        value={data.body}
                        onChange={(e) => setData('body', e.target.value)}
                        required
                    />
                    <InputError message={errors.body ?? (errors as Record<string, string>).question_id} />
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <PhotoPicker file={data.photo} onChange={(file) => setData('photo', file)} error={errors.photo} />
                    <Button type="submit" disabled={processing || !data.body.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                        <Send /> Send doubt
                    </Button>
                </div>
            </form>
        </Panel>
    );
}

export default function Doubts({ doubts, subjects, attach }: Props) {
    const [tab, setTab] = useState<(typeof tabs)[number]['key']>('all');
    const visible = doubts.filter((d) => tab === 'all' || d.status === tab);
    const count = (key: DoubtStatus) => doubts.filter((d) => d.status === key).length;

    return (
        <StudentLayout title="Doubts">
            <div className="mx-auto max-w-6xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={MessageSquareText}>Doubts &amp; Support</Eyebrow>}
                    title="Ask a Doubt"
                    description="Stuck on a topic or a test question? Ask here and our team will explain."
                    aside={
                        <div className="flex flex-wrap gap-3">
                            <MiniStat label="Asked" value={String(doubts.length)} hint="All time" />
                            <MiniStat label="Waiting" value={String(count('open'))} hint="For an answer" />
                            <MiniStat label="Answered" value={String(count('answered') + count('closed'))} hint="By the team" />
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
                    <div className="min-w-0 space-y-6">
                        <AskForm subjects={subjects} attach={attach} />

                        <section>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="font-display text-lg font-semibold">My doubts</h2>
                                <div className="bg-card flex rounded-lg border p-1 text-sm">
                                    {tabs.map((t) => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            aria-pressed={tab === t.key}
                                            onClick={() => setTab(t.key)}
                                            className={cn(
                                                'rounded-md px-3 py-1',
                                                tab === t.key ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {visible.length === 0 ? (
                                <EmptyState
                                    icon={MessageSquareText}
                                    title={doubts.length === 0 ? 'No doubts yet' : 'Nothing here'}
                                    description={doubts.length === 0 ? 'Doubts you ask appear here with the team’s answers.' : 'Try another tab.'}
                                    className="bg-card"
                                />
                            ) : (
                                <ul className="bg-card divide-y rounded-2xl border">
                                    {visible.map((d) => (
                                        <li key={d.id}>
                                            <Link
                                                href={route('student.doubts.show', d.id)}
                                                className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                <span
                                                    className={cn('size-2 shrink-0 rounded-full', d.unread ? 'bg-red-500' : 'bg-transparent')}
                                                    aria-hidden
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge status={d.status} audience="student" />
                                                        {d.unread && <span className="text-xs font-semibold text-red-600">New reply</span>}
                                                        <span className="text-muted-foreground text-xs">
                                                            {d.subject ?? 'General'}
                                                            {d.topic && ` › ${d.topic}`} • {ago(d.last_activity_at)}
                                                        </span>
                                                    </p>
                                                    <p className={cn('mt-1 truncate text-sm', d.unread && 'font-semibold')}>{d.preview}</p>
                                                </div>
                                                <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                                                    {d.has_question && <FileQuestion className="size-4" aria-label="Question attached" />}
                                                    {d.has_photo && <ImageIcon className="size-4" aria-label="Photo attached" />}
                                                    {d.replies_count > 0 && `${d.replies_count} ${d.replies_count === 1 ? 'reply' : 'replies'}`}
                                                    <ChevronRight className="size-4" />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    <aside className="space-y-4">
                        <section className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-500/10">
                            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                                <Lightbulb className="size-4" /> Tips for a quick answer
                            </p>
                            <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5 text-sm">
                                <li>Say exactly which step or option confuses you.</li>
                                <li>Attach a clear photo for book or handwritten questions.</li>
                                <li>
                                    From quiz and test solutions, use <span className="font-medium">Ask a doubt</span> under a question to attach it
                                    automatically.
                                </li>
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
