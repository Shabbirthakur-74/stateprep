import { AskDoubtLink } from '@/components/doubt-thread';
import { Panel, Pill, ProgressBar } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CircleCheck, CircleMinus, CircleX, Clock, Flag, RotateCcw, Trophy } from 'lucide-react';
import { useState } from 'react';

type Letter = 'A' | 'B' | 'C' | 'D';

interface Question {
    id: number;
    position: number;
    text: string;
    options: Record<Letter, string>;
    subject: string | null;
    topic: string | null;
    selected: Letter | null;
    is_correct: boolean | null;
    /** Only present once the question has been answered (or the quiz is over). */
    correct: Letter | null;
    explanation: string | null;
}

interface Attempt {
    id: number;
    title: string;
    mode: 'topic' | 'mixed' | 'random' | 'set';
    subject_id: number | null;
    topic_id: number | null;
    /** Set for a ready-made quiz from admin: retaking plays the same quiz again. */
    quiz_id: number | null;
    correct: number;
    wrong: number;
    total: number;
    percent: number | null;
    seconds: number | null;
    submitted: boolean;
}

const letters: Letter[] = ['A', 'B', 'C', 'D'];

const duration = (seconds: number | null) => (seconds === null ? '—' : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`);

function Options({ question, onPick, disabled }: { question: Question; onPick?: (letter: Letter) => void; disabled?: boolean }) {
    const answered = question.correct !== null;

    return (
        <ul className="space-y-2.5">
            {letters.map((letter) => {
                const isRight = answered && letter === question.correct;
                const isWrongPick = answered && letter === question.selected && letter !== question.correct;
                return (
                    <li key={letter}>
                        <button
                            type="button"
                            disabled={answered || disabled}
                            onClick={() => onPick?.(letter)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                                isRight && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                                isWrongPick && 'border-rose-500 bg-rose-50 dark:bg-rose-500/10',
                                !answered && 'hover:border-indigo-400 hover:bg-indigo-50/50',
                            )}
                        >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                                {letter}
                            </span>
                            <span className="flex-1">{question.options[letter]}</span>
                            {isRight && <CircleCheck className="size-5 text-emerald-600" />}
                            {isWrongPick && <CircleX className="size-5 text-rose-600" />}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function Explanation({ question }: { question: Question }) {
    if (question.correct === null) return null;

    const verdict = question.selected === null ? 'Not answered.' : question.is_correct ? 'Correct!' : `Not quite. The answer is ${question.correct}.`;

    return (
        <div
            className={cn(
                'mt-4 rounded-xl p-4 text-sm',
                question.is_correct ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-indigo-50 dark:bg-slate-800/60',
            )}
        >
            <p className="font-semibold">{verdict}</p>
            {question.explanation && <p className="text-muted-foreground mt-1">{question.explanation}</p>}
            <AskDoubtLink questionId={question.id} />
        </div>
    );
}

function Player({ attempt, questions }: { attempt: Attempt; questions: Question[] }) {
    const firstOpen = questions.findIndex((q) => q.selected === null);
    const [index, setIndex] = useState(firstOpen === -1 ? questions.length - 1 : firstOpen);
    const [saving, setSaving] = useState(false);
    const question = questions[index];
    const answeredCount = questions.filter((q) => q.selected !== null).length;
    const isLast = index === questions.length - 1;

    const pick = (letter: Letter) => {
        setSaving(true);
        router.put(
            route('student.quizzes.answer', attempt.id),
            { question_id: question.id, option: letter },
            { preserveScroll: true, preserveState: true, onFinish: () => setSaving(false) },
        );
    };

    const finish = () => {
        const left = questions.length - answeredCount;
        if (left > 0 && !confirm(`${left} question${left === 1 ? ' is' : 's are'} still unanswered. Finish anyway?`)) return;
        router.post(route('student.quizzes.finish', attempt.id));
    };

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link
                        href={route('student.quizzes')}
                        className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-indigo-600"
                    >
                        <ArrowLeft className="size-3.5" /> Quizzes
                    </Link>
                    <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">{attempt.title}</h1>
                </div>
                <Button variant="outline" onClick={finish}>
                    <Flag /> Finish quiz
                </Button>
            </div>

            <div>
                <div className="text-muted-foreground mb-2 flex justify-between text-xs">
                    <span>
                        Question {index + 1} of {questions.length}
                    </span>
                    <span>{answeredCount} answered</span>
                </div>
                <ProgressBar value={Math.round((answeredCount * 100) / questions.length)} />
            </div>

            <nav className="flex flex-wrap gap-1.5" aria-label="Questions">
                {questions.map((q, i) => (
                    <button
                        key={q.id}
                        type="button"
                        aria-label={`Question ${i + 1}`}
                        aria-current={i === index}
                        onClick={() => setIndex(i)}
                        className={cn(
                            'flex size-8 items-center justify-center rounded-lg border text-xs font-medium',
                            q.is_correct === true && 'border-emerald-500 bg-emerald-500 text-white',
                            q.is_correct === false && 'border-rose-500 bg-rose-500 text-white',
                            q.selected === null && 'bg-card',
                            i === index && 'ring-2 ring-indigo-600 ring-offset-1',
                        )}
                    >
                        {i + 1}
                    </button>
                ))}
            </nav>

            <Panel>
                <div className="flex flex-wrap gap-2">
                    {question.subject && <Pill tone="indigo">{question.subject}</Pill>}
                    {question.topic && <Pill tone="slate">{question.topic}</Pill>}
                </div>
                <p className="mt-4 text-base leading-relaxed font-medium">{question.text}</p>
                <div className="mt-5">
                    <Options question={question} onPick={pick} disabled={saving} />
                </div>
                <Explanation question={question} />
            </Panel>

            <div className="flex items-center justify-between gap-3">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                    <ArrowLeft /> Previous
                </Button>
                {isLast ? (
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={finish}>
                        <Flag /> Finish &amp; see score
                    </Button>
                ) : (
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setIndex(index + 1)}>
                        Next <ArrowRight />
                    </Button>
                )}
            </div>
        </div>
    );
}

function Result({ attempt, questions, lengths }: { attempt: Attempt; questions: Question[]; lengths: number[] }) {
    const skipped = attempt.total - attempt.correct - attempt.wrong;
    const length = lengths.find((n) => n >= attempt.total) ?? lengths[lengths.length - 1];

    const retake = () =>
        attempt.quiz_id
            ? router.post(route('student.quizzes.ready', attempt.quiz_id))
            : router.post(route('student.quizzes.start'), {
                  mode: attempt.mode,
                  subject_id: attempt.subject_id,
                  topic_id: attempt.topic_id,
                  length,
              });

    const figures = [
        { label: 'Correct', value: attempt.correct, icon: CircleCheck, tone: 'text-emerald-600' },
        { label: 'Wrong', value: attempt.wrong, icon: CircleX, tone: 'text-rose-600' },
        { label: 'Skipped', value: skipped, icon: CircleMinus, tone: 'text-slate-500' },
        { label: 'Time', value: duration(attempt.seconds), icon: Clock, tone: 'text-indigo-600' },
    ];

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Link href={route('student.quizzes')} className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:text-indigo-600">
                <ArrowLeft className="size-3.5" /> Quizzes
            </Link>

            <section className="rounded-2xl bg-linear-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm md:p-8">
                <p className="flex items-center gap-2 text-sm text-white/80">
                    <Trophy className="size-4" /> Quiz complete
                </p>
                <h1 className="font-display mt-2 text-2xl font-bold">{attempt.title}</h1>
                <p className="font-display mt-6 text-6xl font-bold">{attempt.percent}%</p>
                <p className="mt-1 text-white/80">
                    {attempt.correct} of {attempt.total} correct
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                    <Button className="bg-white text-indigo-700 hover:bg-white/90" onClick={retake}>
                        <RotateCcw /> Try another set
                    </Button>
                    <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                        <Link href={route('student.quizzes')}>Choose another quiz</Link>
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

            <section className="space-y-4">
                <h2 className="font-display text-lg font-semibold">Review answers</h2>
                {questions.map((question) => (
                    <Panel key={question.id}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground text-xs font-semibold">Q{question.position}</span>
                            {question.topic && <Pill tone="slate">{question.topic}</Pill>}
                            {question.is_correct === true && <Pill tone="green">Correct</Pill>}
                            {question.is_correct === false && <Pill tone="red">Wrong</Pill>}
                            {question.selected === null && <Pill tone="amber">Skipped</Pill>}
                        </div>
                        <p className="mt-3 font-medium">{question.text}</p>
                        <div className="mt-4">
                            <Options question={question} disabled />
                        </div>
                        <Explanation question={question} />
                    </Panel>
                ))}
            </section>
        </div>
    );
}

export default function QuizAttempt({ attempt, questions, lengths }: { attempt: Attempt; questions: Question[]; lengths: number[] }) {
    return (
        <StudentLayout title={attempt.title}>
            {attempt.submitted ? (
                <Result attempt={attempt} questions={questions} lengths={lengths} />
            ) : (
                <Player attempt={attempt} questions={questions} />
            )}
        </StudentLayout>
    );
}
