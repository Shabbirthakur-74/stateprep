import { AskDoubtLink } from '@/components/doubt-thread';
import { ResultBadge, type ResultBands } from '@/components/result-badge';
import { Panel, Pill } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Bookmark, CircleCheck, CircleMinus, CircleX, Clock, Eraser, Flag, RotateCcw, Timer, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Letter = 'A' | 'B' | 'C' | 'D';

interface Question {
    id: number;
    position: number;
    text: string;
    options: Record<Letter, string>;
    subject: string | null;
    topic: string | null;
    selected: Letter | null;
    marked: boolean;
    /** Only present once the attempt is over. */
    is_correct: boolean | null;
    correct: Letter | null;
    explanation: string | null;
}

interface Attempt {
    id: number;
    title: string;
    type: 'mock' | 'pyq';
    submitted: boolean;
    ends_at: string;
    server_now: string;
    total: number;
    correct: number;
    wrong: number;
    score: number | null;
    max_score: number;
    percent: number | null;
    seconds: number | null;
    marks_per_question: number;
    negative_marks: number;
    series: { id: number; title: string } | null;
}

interface Props {
    attempt: Attempt;
    questions: Question[];
    bySubject: { subject: string; total: number; correct: number; wrong: number }[];
    bands: ResultBands;
}

const letters: Letter[] = ['A', 'B', 'C', 'D'];

const clock = (seconds: number) => {
    const s = Math.max(0, seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

const backLink = (attempt: Attempt) =>
    attempt.series
        ? { href: route('student.test-series.show', attempt.series.id), label: attempt.series.title }
        : attempt.type === 'pyq'
          ? { href: route('student.pyqs'), label: 'PYQs' }
          : { href: route('student.mock-tests'), label: 'Mock Tests' };

/** Seconds left on the attempt, kept in step with the server clock. */
function useCountdown(endsAt: string, serverNow: string) {
    const skew = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
    const left = () => Math.round((new Date(endsAt).getTime() - (Date.now() + skew)) / 1000);
    const [seconds, setSeconds] = useState(left);

    useEffect(() => {
        const timer = window.setInterval(() => setSeconds(left()), 1000);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endsAt, skew]);

    return seconds;
}

function Player({ attempt, questions }: { attempt: Attempt; questions: Question[] }) {
    const [index, setIndex] = useState(() =>
        Math.max(
            0,
            questions.findIndex((q) => q.selected === null),
        ),
    );
    const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((q) => [q.id, { selected: q.selected, marked: q.marked }])));
    const [confirming, setConfirming] = useState(false);
    const submitted = useRef(false);
    const seconds = useCountdown(attempt.ends_at, attempt.server_now);
    const question = questions[index];
    const current = answers[question.id];

    const counts = useMemo(() => {
        const values = Object.values(answers);
        return {
            answered: values.filter((a) => a.selected !== null).length,
            marked: values.filter((a) => a.marked).length,
            left: values.filter((a) => a.selected === null).length,
        };
    }, [answers]);

    const save = (questionId: number, selected: Letter | null, marked: boolean) => {
        setAnswers((all) => ({ ...all, [questionId]: { selected, marked } }));
        router.put(
            route('student.tests.answer', attempt.id),
            { question_id: questionId, option: selected, marked },
            { preserveState: true, preserveScroll: true },
        );
    };

    const submit = () => {
        if (submitted.current) return;
        submitted.current = true;
        router.post(route('student.tests.submit', attempt.id));
    };

    useEffect(() => {
        if (seconds <= 0) submit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seconds <= 0]);

    const go = (to: number) => setIndex(Math.min(questions.length - 1, Math.max(0, to)));

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="bg-background/95 sticky top-16 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">{attempt.type === 'pyq' ? 'Previous Year Paper' : 'Mock Test'}</p>
                    <h1 className="font-display truncate text-lg font-bold">{attempt.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums',
                            seconds <= 300
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
                        )}
                        aria-label="Time left"
                    >
                        <Timer className="size-4" /> {clock(seconds)}
                    </span>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setConfirming(true)}>
                        <Flag /> Submit
                    </Button>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
                <Panel>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">
                                Question {index + 1} of {questions.length}
                            </span>
                            {question.subject && <Pill tone="indigo">{question.subject}</Pill>}
                        </div>
                        <span className="text-muted-foreground text-xs">
                            +{attempt.marks_per_question} correct{attempt.negative_marks ? ` • −${attempt.negative_marks} wrong` : ''}
                        </span>
                    </div>
                    <p className="mt-4 text-base leading-relaxed font-medium">{question.text}</p>
                    <ul className="mt-5 space-y-2.5" role="radiogroup" aria-label="Options">
                        {letters.map((letter) => {
                            const chosen = current.selected === letter;
                            return (
                                <li key={letter}>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={chosen}
                                        onClick={() => save(question.id, letter, current.marked)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                                            chosen ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'hover:border-indigo-300',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                                                chosen && 'border-indigo-600 bg-indigo-600 text-white',
                                            )}
                                        >
                                            {letter}
                                        </span>
                                        {question.options[letter]}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
                        <Button variant="outline" disabled={index === 0} onClick={() => go(index - 1)}>
                            <ArrowLeft /> Previous
                        </Button>
                        <Button variant="ghost" disabled={current.selected === null} onClick={() => save(question.id, null, current.marked)}>
                            <Eraser /> Clear
                        </Button>
                        <Button
                            variant="outline"
                            className={cn(current.marked && 'border-violet-500 text-violet-700')}
                            onClick={() => {
                                save(question.id, current.selected, !current.marked);
                                if (!current.marked) go(index + 1);
                            }}
                        >
                            <Bookmark /> {current.marked ? 'Unmark' : 'Mark for review & next'}
                        </Button>
                        <Button
                            className="ml-auto bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => (index === questions.length - 1 ? setConfirming(true) : go(index + 1))}
                        >
                            {index === questions.length - 1 ? 'Finish' : 'Next'} <ArrowRight />
                        </Button>
                    </div>
                </Panel>

                <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
                    <Panel className="p-4 md:p-4">
                        <h2 className="text-sm font-semibold">Question palette</h2>
                        <div className="mt-3 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
                            {questions.map((q, i) => {
                                const a = answers[q.id];
                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        aria-label={`Question ${i + 1}${a.selected ? ', answered' : ''}${a.marked ? ', marked for review' : ''}`}
                                        aria-current={i === index}
                                        onClick={() => go(i)}
                                        className={cn(
                                            'relative flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold',
                                            a.selected && !a.marked && 'border-emerald-600 bg-emerald-600 text-white',
                                            a.marked && 'border-violet-600 bg-violet-600 text-white',
                                            i === index && 'ring-2 ring-indigo-600 ring-offset-1',
                                        )}
                                    >
                                        {i + 1}
                                        {a.marked && a.selected && (
                                            <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <ul className="text-muted-foreground mt-4 space-y-1.5 text-xs">
                            <li className="flex items-center gap-2">
                                <span className="size-3 rounded bg-emerald-600" /> Answered ({counts.answered})
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="size-3 rounded bg-violet-600" /> Marked for review ({counts.marked})
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="size-3 rounded border" /> Not answered ({counts.left})
                            </li>
                        </ul>
                    </Panel>
                    <p className="text-muted-foreground px-1 text-xs">Answers save as you pick them. The test submits itself when time runs out.</p>
                </aside>
            </div>

            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Submit this test?</DialogTitle>
                        <DialogDescription>You cannot change your answers after submitting.</DialogDescription>
                    </DialogHeader>
                    <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                        {[
                            ['Answered', counts.answered],
                            ['Marked', counts.marked],
                            ['Not answered', counts.left],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                                <dt className="text-muted-foreground text-xs">{label}</dt>
                                <dd className="text-xl font-semibold">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirming(false)}>
                            Keep working
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={submit}>
                            Submit test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Result({ attempt, questions, bySubject, bands }: Props) {
    const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
    const skipped = attempt.total - attempt.correct - attempt.wrong;
    const back = backLink(attempt);
    const visible = questions.filter(
        (q) => filter === 'all' || (filter === 'correct' ? q.is_correct === true : filter === 'wrong' ? q.is_correct === false : q.selected === null),
    );

    const figures = [
        { label: 'Correct', value: attempt.correct, icon: CircleCheck, tone: 'text-emerald-600' },
        { label: 'Wrong', value: attempt.wrong, icon: CircleX, tone: 'text-rose-600' },
        { label: 'Skipped', value: skipped, icon: CircleMinus, tone: 'text-slate-500' },
        { label: 'Time taken', value: attempt.seconds === null ? '—' : clock(attempt.seconds), icon: Clock, tone: 'text-indigo-600' },
    ];

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <Link href={back.href} className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-indigo-600">
                <ArrowLeft className="size-3.5" /> {back.label}
            </Link>

            <section className="rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm md:p-8">
                <p className="flex items-center gap-2 text-sm text-white/80">
                    <Trophy className="size-4" /> {attempt.type === 'pyq' ? 'Paper' : 'Test'} submitted
                </p>
                <h1 className="font-display mt-2 text-2xl font-bold">{attempt.title}</h1>
                <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
                    <p className="font-display text-6xl font-bold">
                        {attempt.score}
                        <span className="text-2xl text-white/70"> / {attempt.max_score}</span>
                    </p>
                    <div className="pb-2">
                        <p className="text-lg font-semibold">{attempt.percent}%</p>
                        <ResultBadge percent={attempt.percent} bands={bands} className="bg-white/90" />
                    </div>
                </div>
                {attempt.negative_marks > 0 && attempt.wrong > 0 && (
                    <p className="mt-2 text-sm text-white/80">
                        Includes −{Math.round(attempt.wrong * attempt.negative_marks * 100) / 100} for {attempt.wrong} wrong answers.
                    </p>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                    <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                        <Link href={back.href}>Back to {back.label}</Link>
                    </Button>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {figures.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="bg-card rounded-xl border p-4 text-center shadow-sm">
                        <Icon className={cn('mx-auto size-5', tone)} />
                        <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
                        <p className="text-muted-foreground text-xs">{label}</p>
                    </div>
                ))}
            </div>

            {bySubject.length > 0 && (
                <Panel>
                    <h2 className="font-display text-lg font-semibold">Subject-wise breakdown</h2>
                    <table className="mt-4 w-full text-sm">
                        <thead className="text-muted-foreground text-left text-xs">
                            <tr>
                                <th className="py-2 font-medium">Subject</th>
                                <th className="py-2 text-right font-medium">Correct</th>
                                <th className="py-2 text-right font-medium">Wrong</th>
                                <th className="py-2 text-right font-medium">Skipped</th>
                                <th className="py-2 text-right font-medium">Accuracy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bySubject.map((row) => {
                                const answered = row.correct + row.wrong;
                                return (
                                    <tr key={row.subject}>
                                        <td className="py-2.5">{row.subject}</td>
                                        <td className="py-2.5 text-right text-emerald-600">{row.correct}</td>
                                        <td className="py-2.5 text-right text-rose-600">{row.wrong}</td>
                                        <td className="text-muted-foreground py-2.5 text-right">{row.total - answered}</td>
                                        <td className="py-2.5 text-right font-medium">
                                            {answered ? `${Math.round((row.correct * 100) / answered)}%` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Panel>
            )}

            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold">Solutions</h2>
                    <div className="bg-card flex rounded-lg border p-0.5 text-sm">
                        {(['all', 'correct', 'wrong', 'skipped'] as const).map((key) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={filter === key}
                                onClick={() => setFilter(key)}
                                className={cn(
                                    'rounded-md px-3 py-1 capitalize',
                                    filter === key ? 'bg-indigo-600 text-white' : 'text-muted-foreground',
                                )}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </div>
                {visible.map((q) => (
                    <Panel key={q.id}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground text-xs font-semibold">Q{q.position}</span>
                            {q.topic && <Pill tone="slate">{q.topic}</Pill>}
                            {q.is_correct === true && <Pill tone="green">Correct</Pill>}
                            {q.is_correct === false && <Pill tone="red">Wrong</Pill>}
                            {q.selected === null && <Pill tone="amber">Skipped</Pill>}
                        </div>
                        <p className="mt-3 font-medium">{q.text}</p>
                        <ul className="mt-4 space-y-2">
                            {letters.map((letter) => {
                                const right = letter === q.correct;
                                const wrongPick = letter === q.selected && !right;
                                return (
                                    <li
                                        key={letter}
                                        className={cn(
                                            'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm',
                                            right && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                                            wrongPick && 'border-rose-500 bg-rose-50 dark:bg-rose-500/10',
                                        )}
                                    >
                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                                            {letter}
                                        </span>
                                        <span className="flex-1">{q.options[letter]}</span>
                                        {right && <CircleCheck className="size-4 text-emerald-600" />}
                                        {wrongPick && <span className="text-xs text-rose-600">Your answer</span>}
                                    </li>
                                );
                            })}
                        </ul>
                        {q.explanation && (
                            <p className="text-muted-foreground mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">{q.explanation}</p>
                        )}
                        <AskDoubtLink questionId={q.id} />
                    </Panel>
                ))}
                {visible.length === 0 && <p className="text-muted-foreground text-sm">Nothing here.</p>}
            </section>

            <div className="flex justify-center">
                <Button variant="outline" asChild>
                    <Link href={back.href}>
                        <RotateCcw /> Try another test
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function TestAttempt(props: Props) {
    return (
        <StudentLayout title={props.attempt.title}>
            {props.attempt.submitted ? <Result {...props} /> : <Player attempt={props.attempt} questions={props.questions} />}
        </StudentLayout>
    );
}
