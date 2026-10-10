import { AdminHeader, AdminPage, Field, Pagination } from '@/components/admin-kit';
import { DrawRows, emptyRow, rowsPayload, type BankCount, type BankSubject, type DrawRow } from '@/components/draw-rows';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Check, Download, FileUp, Pencil, Plus, Repeat, Search, Shuffle, Trash2, TriangleAlert } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface QuestionRow {
    id: number;
    text: string;
    subject: string | null;
    topic: string | null;
    difficulty: string;
    correct: string;
    used_in: string[];
}

interface SetInfo {
    type: 'mock-test' | 'quiz';
    id: number;
    title: string;
    kind: string;
    exam: string | null;
    is_published: boolean;
    marks_per_question: number | null;
    negative_marks: number | null;
    duration_minutes: number | null;
    is_pyq: boolean;
    edit_url: string;
    back_url: string;
    scope: string;
    limited_to_exam: boolean;
}

interface Props {
    set: SetInfo;
    questions: QuestionRow[];
    breakdown: { subject: string; count: number }[];
    bank: { data: QuestionRow[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    filters: Partial<Record<'subject' | 'topic' | 'difficulty' | 'search' | 'show_used', string>>;
    subjects: BankSubject[];
    bank_counts: BankCount[];
    columns: string[];
}

type Tab = 'draw' | 'pick' | 'import';

const difficultyTone: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    hard: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

function Meta({ q }: { q: QuestionRow }) {
    return (
        <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>
                {q.subject ?? 'No subject'}
                {q.topic && ` › ${q.topic}`}
            </span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize', difficultyTone[q.difficulty])}>{q.difficulty}</span>
            <span>Answer {q.correct}</span>
            {q.used_in.length > 0 && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    Also in {q.used_in.slice(0, 2).join(', ')}
                    {q.used_in.length > 2 && ` +${q.used_in.length - 2}`}
                </span>
            )}
        </p>
    );
}

function InSet({ set, questions }: { set: SetInfo; questions: QuestionRow[] }) {
    const options = { preserveScroll: true };
    const params = (q: QuestionRow) => [set.type, set.id, q.id];

    return (
        <ol className="divide-y">
            {questions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-3 py-3">
                    <span className="text-muted-foreground w-8 shrink-0 pt-0.5 text-right text-sm tabular-nums">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm">{q.text}</p>
                        <Meta q={q} />
                    </div>
                    <div className="flex shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Swap for another unused question of the same subject and topic"
                            aria-label={`Swap question ${i + 1}`}
                            onClick={() => router.post(route('admin.sets.swap', params(q)), {}, options)}
                        >
                            <Repeat />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === 0}
                            aria-label={`Move question ${i + 1} up`}
                            onClick={() => router.post(route('admin.sets.move', params(q)), { direction: 'up' }, options)}
                        >
                            <ArrowUp />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === questions.length - 1}
                            aria-label={`Move question ${i + 1} down`}
                            onClick={() => router.post(route('admin.sets.move', params(q)), { direction: 'down' }, options)}
                        >
                            <ArrowDown />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            aria-label={`Remove question ${i + 1}`}
                            onClick={() => router.delete(route('admin.sets.remove', params(q)), options)}
                        >
                            <Trash2 />
                        </Button>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function DrawPanel({ set, subjects, bank }: { set: SetInfo; subjects: BankSubject[]; bank: BankCount[] }) {
    const [rows, setRows] = useState<DrawRow[]>([emptyRow()]);
    const [topUp, setTopUp] = useState(false);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const payload = rowsPayload(rows);

    const draw = () =>
        router.post(
            route('admin.sets.draw', [set.type, set.id]),
            { rows: payload, top_up: topUp },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onError: setErrors,
                onSuccess: () => {
                    setErrors({});
                    setRows([emptyRow()]);
                },
            },
        );

    return (
        <div className="grid gap-4">
            <p className="text-muted-foreground text-sm">
                Say how many questions to take from each subject. They are picked at random from questions not used yet in {set.scope}, and added to
                the end.
            </p>
            <DrawRows rows={rows} onChange={setRows} subjects={subjects} bank={bank} errors={errors} />
            <label className="flex items-start gap-2 text-sm">
                <Checkbox className="mt-0.5" checked={topUp} onCheckedChange={(checked) => setTopUp(checked === true)} />
                <span>
                    Top up with already-used questions when there aren't enough unused ones
                    <span className="text-muted-foreground block text-xs">Students who buy the bundle may then see those questions twice.</span>
                </span>
            </label>
            <Button onClick={draw} disabled={busy || payload.length === 0} className="justify-self-start">
                <Shuffle /> Add random questions
            </Button>
        </div>
    );
}

function PickPanel({ set, bank, filters, subjects }: { set: SetInfo; bank: Props['bank']; filters: Props['filters']; subjects: BankSubject[] }) {
    const [selected, setSelected] = useState<number[]>([]);
    const [search, setSearch] = useState(filters.search ?? '');
    const subject = subjects.find((s) => String(s.id) === filters.subject);

    const filter = (changes: Props['filters']) =>
        router.get(
            route('admin.sets.show', [set.type, set.id]),
            Object.fromEntries(Object.entries({ ...filters, ...changes }).filter(([, v]) => v)),
            { preserveState: true, preserveScroll: true, only: ['bank', 'filters'] },
        );

    const add = (ids: number[]) =>
        router.post(route('admin.sets.add', [set.type, set.id]), { ids }, { preserveScroll: true, onSuccess: () => setSelected([]) });

    const allPicked = bank.data.length > 0 && bank.data.every((q) => selected.includes(q.id));

    return (
        <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
                <select
                    aria-label="Subject"
                    className={selectClass}
                    value={filters.subject ?? ''}
                    onChange={(e) => filter({ subject: e.target.value, topic: '' })}
                >
                    <option value="">All subjects</option>
                    {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Topic"
                    className={selectClass}
                    value={filters.topic ?? ''}
                    disabled={!subject?.topics.length}
                    onChange={(e) => filter({ topic: e.target.value })}
                >
                    <option value="">All topics</option>
                    {subject?.topics.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Difficulty"
                    className={selectClass}
                    value={filters.difficulty ?? ''}
                    onChange={(e) => filter({ difficulty: e.target.value })}
                >
                    <option value="">Any difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <form
                onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    filter({ search });
                }}
                className="flex gap-2"
            >
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search question text..."
                    aria-label="Search questions"
                />
                <Button type="submit" variant="outline">
                    <Search /> Search
                </Button>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2">
                    <Checkbox checked={filters.show_used === '1'} onCheckedChange={(checked) => filter({ show_used: checked === true ? '1' : '' })} />{' '}
                    Also show questions used elsewhere in the bundle
                </label>
                <span className="text-muted-foreground">{bank.total} available</span>
            </div>

            {bank.data.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No questions match these filters.</p>
            ) : (
                <div className="rounded-lg border">
                    <div className="bg-muted/50 flex items-center gap-3 border-b px-3 py-2">
                        <Checkbox
                            aria-label="Select all on this page"
                            checked={allPicked}
                            onCheckedChange={(checked) => setSelected(checked === true ? bank.data.map((q) => q.id) : [])}
                        />
                        <span className="text-muted-foreground flex-1 text-xs">Select all on this page</span>
                        <Button size="sm" disabled={selected.length === 0} onClick={() => add(selected)}>
                            <Plus /> Add selected ({selected.length})
                        </Button>
                    </div>
                    <ul className="divide-y">
                        {bank.data.map((q) => (
                            <li key={q.id} className="flex items-start gap-3 px-3 py-3">
                                <Checkbox
                                    className="mt-0.5"
                                    aria-label={`Select: ${q.text}`}
                                    checked={selected.includes(q.id)}
                                    onCheckedChange={(checked) =>
                                        setSelected(checked === true ? [...selected, q.id] : selected.filter((id) => id !== q.id))
                                    }
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm">{q.text}</p>
                                    <Meta q={q} />
                                </div>
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => add([q.id])}>
                                    <Plus /> Add
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <Pagination links={bank.links} />
        </div>
    );
}

function ImportPanel({ set, columns }: { set: SetInfo; columns: string[] }) {
    const { data, setData, post, processing, errors } = useForm({ file: null as File | null });

    return (
        <form
            className="grid gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                post(route('admin.sets.import', [set.type, set.id]), { forceFormData: true });
            }}
        >
            <p className="text-muted-foreground text-sm">
                {set.is_pyq
                    ? "Upload the paper's questions in order. They are added to the question bank and to this paper."
                    : 'Upload questions to add them to the question bank and to this ' + (set.type === 'quiz' ? 'quiz.' : 'test.')}{' '}
                Questions already in the bank are not added twice: you'll see a preview first and decide what to do with any duplicates.
            </p>
            <p className="bg-muted rounded-md px-3 py-2 font-mono text-xs break-words">{columns.join(',')}</p>
            <Field label="CSV file" htmlFor="file" error={errors.file}>
                <Input id="file" type="file" accept=".csv,text/csv" onChange={(e) => setData('file', e.target.files?.[0] ?? null)} />
            </Field>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!data.file || processing}>
                    <FileUp /> Upload and preview
                </Button>
                <Button type="button" variant="outline" asChild>
                    <a href={route('admin.questions.template')}>
                        <Download /> Download template
                    </a>
                </Button>
            </div>
        </form>
    );
}

export default function QuestionSetPage({ set, questions, breakdown, bank, filters, subjects, bank_counts, columns }: Props) {
    const { flash, errors } = usePage<SharedData & { errors: Record<string, string> }>().props;
    const [tab, setTab] = useState<Tab>(set.is_pyq ? 'import' : 'draw');
    const totalMarks = set.marks_per_question === null ? null : Math.round(questions.length * set.marks_per_question * 100) / 100;
    const label = set.type === 'quiz' ? 'quiz' : 'test';

    const clear = () =>
        confirm(`Remove all ${questions.length} questions from this ${label}? They stay in the question bank.`) &&
        router.delete(route('admin.sets.clear', [set.type, set.id]), { preserveScroll: true });

    const details = [
        set.kind,
        set.exam ?? 'No exam',
        set.duration_minutes && `${set.duration_minutes} min`,
        set.marks_per_question !== null && `+${set.marks_per_question} / −${set.negative_marks}`,
    ]
        .filter(Boolean)
        .join(' • ');

    return (
        <AppLayout
            breadcrumbs={[
                { title: set.type === 'quiz' ? 'Quizzes' : 'Mock Tests & PYQs', href: set.back_url },
                { title: 'Questions', href: '#' },
            ]}
        >
            <Head title={`Questions: ${set.title}`} />
            <AdminPage>
                <AdminHeader title={set.title} description={details} />
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={set.edit_url}>
                            <Pencil /> Edit details
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={set.back_url}>All {set.type === 'quiz' ? 'quizzes' : 'tests'}</Link>
                    </Button>
                </div>

                {errors.swap && (
                    <p className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
                        {errors.swap}
                    </p>
                )}
                {flash.import_errors && flash.import_errors.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                        <p className="flex items-center gap-2 font-medium">
                            <TriangleAlert className="size-4" /> Some rows could not be filled with unused questions:
                        </p>
                        <ul className="mt-1 list-disc pl-6">
                            {flash.import_errors.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                        <p className="mt-1">Add questions to the bank, choose another topic, or tick “top up” when drawing.</p>
                    </div>
                )}
                {!set.limited_to_exam && set.exam && (
                    <p className="text-muted-foreground text-sm">
                        {set.exam} has no subjects linked yet, so the whole bank is offered. Link its subjects under Exams to narrow this down.
                    </p>
                )}

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="gap-0 p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">In this {label}</h2>
                                <p className="text-muted-foreground text-sm">
                                    {questions.length} questions{totalMarks !== null && ` • ${totalMarks} marks`}
                                    {!set.is_published && ' • Draft: students cannot see it yet'}
                                </p>
                            </div>
                            {questions.length > 0 && (
                                <Button variant="ghost" size="sm" className="text-red-600" onClick={clear}>
                                    <Trash2 /> Remove all
                                </Button>
                            )}
                        </div>
                        {breakdown.length > 0 && (
                            <ul className="mt-4 flex flex-wrap gap-2">
                                {breakdown.map((b) => (
                                    <li key={b.subject} className="bg-muted rounded-md px-2.5 py-1 text-xs">
                                        {b.subject}: <span className="font-semibold">{b.count}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="mt-4">
                            {questions.length === 0 ? (
                                <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                                    No questions yet. Add some with the tools alongside.
                                </p>
                            ) : (
                                <InSet set={set} questions={questions} />
                            )}
                        </div>
                    </Card>

                    <Card className="h-fit gap-0 p-6 xl:sticky xl:top-4">
                        <h2 className="font-semibold">Add questions</h2>
                        <div className="mt-3 mb-5 flex rounded-lg border p-1 text-sm" role="tablist">
                            {(
                                [
                                    ['draw', 'Random by subject', Shuffle],
                                    ['pick', 'Pick from bank', Check],
                                    ['import', 'Import CSV', FileUp],
                                ] as const
                            ).map(([key, text, Icon]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === key}
                                    onClick={() => setTab(key)}
                                    className={cn(
                                        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5',
                                        tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                                    )}
                                >
                                    <Icon className="size-3.5" /> {text}
                                </button>
                            ))}
                        </div>
                        {tab === 'draw' && <DrawPanel set={set} subjects={subjects} bank={bank_counts} />}
                        {tab === 'pick' && <PickPanel set={set} bank={bank} filters={filters} subjects={subjects} />}
                        {tab === 'import' && <ImportPanel set={set} columns={columns} />}
                    </Card>
                </div>
            </AdminPage>
        </AppLayout>
    );
}
