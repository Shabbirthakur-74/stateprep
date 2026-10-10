import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { selectClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export interface BankSubject {
    id: number;
    name: string;
    topics: { id: number; name: string }[];
}

/** Bank questions per subject (s), topic (t) and difficulty (d): all (n) and unused (u), from QuestionSet::bankCounts(). */
export interface BankCount {
    s: number;
    t: number | null;
    d: string;
    n: number;
    u: number;
}

/** One "draw N questions from …" row. Empty topic or difficulty means any. */
export type DrawRow = { subject_id: string; topic_id: string; difficulty: string; count: string };

export const emptyRow = (subjectId = ''): DrawRow => ({ subject_id: subjectId, topic_id: '', difficulty: '', count: '10' });

/** Rows as the server expects them: numbers, with "any" left out. */
export const rowsPayload = (rows: DrawRow[]) =>
    rows
        .filter((r) => r.subject_id && Number(r.count) > 0)
        .map((r) => ({
            subject_id: Number(r.subject_id),
            topic_id: r.topic_id ? Number(r.topic_id) : null,
            difficulty: r.difficulty || null,
            count: Number(r.count),
        }));

const available = (bank: BankCount[], row: DrawRow) =>
    bank
        .filter(
            (b) => b.s === Number(row.subject_id) && (!row.topic_id || b.t === Number(row.topic_id)) && (!row.difficulty || b.d === row.difficulty),
        )
        .reduce((sum, b) => ({ all: sum.all + b.n, unused: sum.unused + b.u }), { all: 0, unused: 0 });

/**
 * Rows of "subject → topic → difficulty → how many", e.g. 25 from Maths and 10 easy from HP GK › Districts.
 * Each row shows how many unused questions it can draw from.
 */
export function DrawRows({
    rows,
    onChange,
    subjects,
    bank,
    errors = {},
}: {
    rows: DrawRow[];
    onChange: (rows: DrawRow[]) => void;
    subjects: BankSubject[];
    bank: BankCount[];
    errors?: Record<string, string | undefined>;
}) {
    const set = (i: number, changes: Partial<DrawRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...changes } : r)));
    const total = rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);

    return (
        <div className="grid gap-3">
            {rows.length > 0 && (
                <div className="text-muted-foreground hidden grid-cols-[1.4fr_1.4fr_1fr_5rem_2.25rem] gap-2 text-xs font-medium sm:grid">
                    <span>Subject</span>
                    <span>Topic</span>
                    <span>Difficulty</span>
                    <span>How many</span>
                </div>
            )}
            {rows.map((row, i) => {
                const subject = subjects.find((s) => s.id === Number(row.subject_id));
                const { all, unused } = row.subject_id ? available(bank, row) : { all: 0, unused: 0 };
                const short = !!row.subject_id && Number(row.count) > unused;
                const error = errors[`rows.${i}.subject_id`] ?? errors[`rows.${i}.topic_id`] ?? errors[`rows.${i}.count`];

                return (
                    <div key={i} className="grid gap-1">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_5rem_2.25rem]">
                            <select
                                aria-label={`Row ${i + 1} subject`}
                                className={cn(selectClass, 'col-span-2 sm:col-span-1')}
                                value={row.subject_id}
                                onChange={(e) => set(i, { subject_id: e.target.value, topic_id: '' })}
                            >
                                <option value="">Choose a subject</option>
                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label={`Row ${i + 1} topic`}
                                className={cn(selectClass, 'col-span-2 sm:col-span-1')}
                                value={row.topic_id}
                                disabled={!subject?.topics.length}
                                onChange={(e) => set(i, { topic_id: e.target.value })}
                            >
                                <option value="">All topics</option>
                                {subject?.topics.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label={`Row ${i + 1} difficulty`}
                                className={selectClass}
                                value={row.difficulty}
                                onChange={(e) => set(i, { difficulty: e.target.value })}
                            >
                                <option value="">Any difficulty</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                            <div className="flex gap-2 sm:contents">
                                <Input
                                    aria-label={`Row ${i + 1} number of questions`}
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={row.count}
                                    onChange={(e) => set(i, { count: e.target.value })}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Remove row ${i + 1}`}
                                    className="text-muted-foreground"
                                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        </div>
                        {row.subject_id && (
                            <p className={cn('text-xs', short ? 'text-amber-600' : 'text-muted-foreground')}>
                                {unused} unused of {all} in the bank
                                {short && ` — only ${unused} unused; tick “top up” to fill the rest with used ones`}
                            </p>
                        )}
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                );
            })}
            <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => onChange([...rows, emptyRow()])}>
                    <Plus /> Add subject
                </Button>
                {rows.length > 0 && <span className="text-sm font-medium">Total: {total} questions</span>}
            </div>
        </div>
    );
}
