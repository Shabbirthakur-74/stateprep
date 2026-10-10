import { EmptyState, Eyebrow, MiniStat, PageHeading, Panel, Pill, plural } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, BookOpen, Check, Dices, Hourglass, Layers, Lightbulb, ListChecks, Play, Shuffle, Zap } from 'lucide-react';
import { useState } from 'react';

interface Topic {
    id: number;
    name: string;
    questions_count: number;
    /** Questions of this topic the student has already been given. */
    seen: number;
}

interface Subject {
    id: number;
    name: string;
    questions_count: number;
    seen: number;
    topics: Topic[];
}

/** A ready-made quiz from admin. */
interface ReadyQuiz {
    id: number;
    title: string;
    description: string | null;
    subject: string | null;
    topic: string | null;
    cover_url: string | null;
    questions_count: number;
    attempts: number;
    best_percent: number | null;
}

/** "18 of 30 seen", turning green once every question has been seen. */
function Seen({ seen, total }: { seen: number; total: number }) {
    if (seen === 0) return null;
    const done = seen >= total;
    return (
        <span className={cn('text-[11px] font-medium', done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
            {done ? 'All questions seen' : `${seen} of ${total} seen`}
        </span>
    );
}

interface Summary {
    id: number;
    title: string;
    correct: number;
    total: number;
    percent: number | null;
    submitted_at: string;
}

interface Props {
    subjects: Subject[];
    ready: ReadyQuiz[];
    lengths: number[];
    overview: { quizzes: number; streak: number };
    recent: Summary[];
    inProgress: { id: number; title: string; answered: number; total: number }[];
}

type StartPayload = { mode: 'topic' | 'mixed' | 'random'; subject_id?: number; topic_id?: number };

export default function Quizzes({ subjects, ready, lengths, overview, recent, inProgress }: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [subjectId, setSubjectId] = useState<number | null>(subjects[0]?.id ?? null);
    const [length, setLength] = useState(lengths[0] ?? 10);
    const [starting, setStarting] = useState<string | null>(null);

    const subject = subjects.find((s) => s.id === subjectId) ?? null;
    const totalQuestions = subjects.reduce((sum, s) => sum + s.questions_count, 0);

    const start = (key: string, payload: StartPayload) => {
        setStarting(key);
        router.post(route('student.quizzes.start'), { ...payload, length }, { onFinish: () => setStarting(null) });
    };

    const startReady = (quiz: ReadyQuiz) => {
        setStarting(`ready-${quiz.id}`);
        router.post(route('student.quizzes.ready', quiz.id), {}, { onFinish: () => setStarting(null) });
    };

    // Ready-made quizzes grouped by subject; quizzes across subjects go under "Mixed".
    const readyGroups = Object.entries(
        ready.reduce<Record<string, ReadyQuiz[]>>((groups, quiz) => {
            const key = quiz.subject ?? 'Mixed subjects';
            return { ...groups, [key]: [...(groups[key] ?? []), quiz] };
        }, {}),
    );

    const lengthPicker = (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Questions:</span>
            <div className="bg-card flex rounded-lg border p-0.5">
                {lengths.map((n) => (
                    <button
                        key={n}
                        type="button"
                        aria-pressed={length === n}
                        onClick={() => setLength(n)}
                        className={cn(
                            'rounded-md px-2.5 py-1',
                            length === n ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <StudentLayout title="Quizzes">
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={Zap}>Learn &amp; Study • Subject Bank</Eyebrow>}
                    title="Quizzes"
                    description="Pick a subject, then a topic: a topic quiz only asks questions from that topic. You can also mix every topic of a subject, or take a random quiz across all subjects."
                    aside={
                        <div className="flex flex-wrap gap-3">
                            <MiniStat label="Subjects" value={String(subjects.length)} hint="In the bank" />
                            <MiniStat label="Questions" value={String(totalQuestions)} hint="All subjects" />
                            <MiniStat label="Completed" value={String(overview.quizzes)} hint="Quizzes taken" />
                            <MiniStat label="Streak" value={`${overview.streak}d`} hint="Days in a row" />
                        </div>
                    }
                />

                {errors.quiz && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{errors.quiz}</p>}

                {inProgress.map((attempt) => (
                    <div
                        key={attempt.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
                    >
                        <p className="flex items-center gap-2">
                            <Hourglass className="size-4 text-amber-600" />
                            <span className="font-medium">{attempt.title}</span>
                            <span className="text-muted-foreground">
                                {attempt.answered} of {attempt.total} answered
                            </span>
                        </p>
                        <Button size="sm" variant="outline" asChild>
                            <Link href={route('student.quizzes.show', attempt.id)}>
                                Resume <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                ))}

                {ready.length > 0 && (
                    <section>
                        <h2 className="font-display text-lg font-semibold">Ready-made quizzes</h2>
                        <p className="text-muted-foreground text-sm">Quizzes put together by our team. Question order changes every time you play.</p>
                        <div className="mt-4 space-y-5">
                            {readyGroups.map(([group, quizzes]) => (
                                <div key={group}>
                                    <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">{group}</p>
                                    <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                        {quizzes.map((quiz) => (
                                            <li key={quiz.id} className="bg-card flex flex-col rounded-xl border p-4">
                                                <p className="font-semibold">{quiz.title}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {plural(quiz.questions_count, 'question')}
                                                    {quiz.topic && ` • ${quiz.topic}`}
                                                </p>
                                                {quiz.description && (
                                                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{quiz.description}</p>
                                                )}
                                                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                                                    <span className="text-muted-foreground text-xs">
                                                        {quiz.attempts > 0
                                                            ? `Best ${quiz.best_percent}% • ${plural(quiz.attempts, 'attempt')}`
                                                            : 'Not tried yet'}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        className="bg-indigo-600 hover:bg-indigo-700"
                                                        disabled={starting !== null}
                                                        onClick={() => startReady(quiz)}
                                                    >
                                                        <Play /> {quiz.attempts > 0 ? 'Play again' : 'Start'}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {subjects.length === 0 ? (
                    <EmptyState
                        icon={ListChecks}
                        title="Quizzes are on their way"
                        description="Questions are being added to the bank. Check back soon."
                        className="bg-card"
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                        <div className="min-w-0 space-y-6">
                            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
                                        <Dices className="size-6" />
                                    </span>
                                    <div>
                                        <h2 className="font-display text-lg font-semibold">Random Quiz</h2>
                                        <p className="text-sm text-white/80">A surprise mix from every subject in the bank.</p>
                                    </div>
                                </div>
                                <Button
                                    className="bg-white text-indigo-700 hover:bg-white/90"
                                    disabled={starting !== null}
                                    onClick={() => start('random', { mode: 'random' })}
                                >
                                    <Shuffle /> Start {length}-question random quiz
                                </Button>
                            </section>

                            <section>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="font-display text-lg font-semibold">1. Choose a subject</h2>
                                    {lengthPicker}
                                </div>
                                <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                    {subjects.map((s) => {
                                        const selected = s.id === subjectId;
                                        return (
                                            <li key={s.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={selected}
                                                    onClick={() => setSubjectId(s.id)}
                                                    className={cn(
                                                        'bg-card relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                                                        selected ? 'border-indigo-600 ring-1 ring-indigo-600' : 'hover:border-indigo-300',
                                                    )}
                                                >
                                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                                        <BookOpen className="size-5" />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block font-semibold">{s.name}</span>
                                                        <span className="text-muted-foreground block text-xs">
                                                            {plural(s.topics.length, 'topic')} • {plural(s.questions_count, 'question')}
                                                        </span>
                                                        <Seen seen={s.seen} total={s.questions_count} />
                                                    </span>
                                                    {selected && (
                                                        <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                                                            <Check className="size-3" />
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            {subject && (
                                <Panel>
                                    <h2 className="font-display text-lg font-semibold">2. Choose a topic in {subject.name}</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Each quiz asks up to {length} questions. Topics with fewer questions use all of them.
                                    </p>
                                    <ul className="mt-5 space-y-2.5">
                                        <li className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                                            <Layers className="size-5 text-indigo-600" />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold">Mixed • All topics</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {plural(subject.questions_count, 'question')} across every topic of {subject.name}
                                                </p>
                                            </div>
                                            <Button
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                                disabled={starting !== null}
                                                onClick={() => start(`mixed-${subject.id}`, { mode: 'mixed', subject_id: subject.id })}
                                            >
                                                <Play /> Start mixed
                                            </Button>
                                        </li>
                                        {subject.topics.map((topic) => (
                                            <li key={topic.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                                                <span className="size-2 rounded-full bg-indigo-400" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium">{topic.name}</p>
                                                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                                                        {plural(topic.questions_count, 'question')}{' '}
                                                        <Seen seen={topic.seen} total={topic.questions_count} />
                                                    </p>
                                                </div>
                                                <Pill tone="green">FREE</Pill>
                                                <Button
                                                    variant="outline"
                                                    disabled={starting !== null}
                                                    onClick={() =>
                                                        start(`topic-${topic.id}`, { mode: 'topic', subject_id: subject.id, topic_id: topic.id })
                                                    }
                                                >
                                                    <Zap /> Start
                                                </Button>
                                            </li>
                                        ))}
                                        {subject.topics.length === 0 && (
                                            <li className="text-muted-foreground text-sm">This subject has no topics yet. Use the mixed quiz.</li>
                                        )}
                                    </ul>
                                </Panel>
                            )}
                        </div>

                        <aside className="space-y-6">
                            <Panel>
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold">Recent Quizzes</h2>
                                    <Link href={route('student.attempted-tests')} className="text-xs font-medium text-indigo-600 hover:underline">
                                        View all
                                    </Link>
                                </div>
                                {recent.length === 0 ? (
                                    <p className="text-muted-foreground mt-3 text-sm">Quizzes you finish appear here with your score.</p>
                                ) : (
                                    <ul className="mt-3 divide-y">
                                        {recent.map((attempt) => (
                                            <li key={attempt.id}>
                                                <Link
                                                    href={route('student.quizzes.show', attempt.id)}
                                                    className="flex items-center gap-3 py-2.5 hover:text-indigo-600"
                                                >
                                                    <span className="min-w-0 flex-1 truncate text-sm">{attempt.title}</span>
                                                    <span className="text-sm font-semibold">{attempt.percent}%</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                            <Panel>
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <Lightbulb className="size-4 text-amber-500" /> How quizzes work
                                </h2>
                                <ul className="text-muted-foreground mt-3 space-y-2.5 text-sm">
                                    <li className="flex gap-2">
                                        <ListChecks className="mt-0.5 size-4 shrink-0 text-indigo-600" /> A topic quiz only asks questions from that
                                        topic.
                                    </li>
                                    <li className="flex gap-2">
                                        <Zap className="mt-0.5 size-4 shrink-0 text-indigo-600" /> See the right answer and explanation after each
                                        question.
                                    </li>
                                    <li className="flex gap-2">
                                        <Shuffle className="mt-0.5 size-4 shrink-0 text-indigo-600" /> New questions come first: you only see repeats
                                        once a topic is used up, starting with the ones you got wrong.
                                    </li>
                                    <li className="flex gap-2">
                                        <Check className="mt-0.5 size-4 shrink-0 text-indigo-600" /> Your score counts towards My Performance.
                                    </li>
                                </ul>
                            </Panel>
                        </aside>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
