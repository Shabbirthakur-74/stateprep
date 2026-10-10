import { AdminHeader, AdminPage } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { selectClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { FileCheck2 } from 'lucide-react';
import { useState } from 'react';

type Status = 'new' | 'exists' | 'possible' | 'differs' | 'repeat' | 'in_set' | 'error';

interface Row {
    line: number;
    subject: string;
    topic: string;
    text: string;
    options: string[];
    correct: string;
    status: Status;
    problem?: string;
    match: { id: number; text: string; subject: string | null; correct: string; similarity: number } | null;
    used_in: string[];
}

interface Props {
    token: string;
    file: string;
    rows: Row[];
    choices: Partial<Record<Status, string[]>>;
    target: { kind: 'bank' | 'quiz' | 'mock-test'; title: string; url: string };
}

const statusInfo: Record<Status, { label: string; tone: string }> = {
    new: { label: 'New', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    exists: { label: 'Already in bank', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
    possible: { label: 'Possible duplicate', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
    differs: { label: 'Answer differs', tone: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
    repeat: { label: 'Repeated in file', tone: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' },
    in_set: { label: 'Already added', tone: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' },
    error: { label: 'Error', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
};

const choiceLabels: Record<string, string> = {
    add: 'Add to bank',
    use: 'Use the bank question',
    existing: 'Same question: use the bank one',
    keep: 'Keep the bank answer',
    update: 'Update the bank with this answer',
    new: 'Different question: add as new',
    skip: 'Skip this row',
};

export default function ImportPreview({ token, file, rows, choices, target }: Props) {
    const [picked, setPicked] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState(false);
    const counts = rows.reduce<Partial<Record<Status, number>>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
    const intoSet = target.kind !== 'bank';

    const confirmImport = () =>
        router.post(route('admin.imports.commit', token), { choices: picked }, { onStart: () => setBusy(true), onFinish: () => setBusy(false) });

    return (
        <AppLayout
            breadcrumbs={[
                { title: target.title, href: target.url },
                { title: 'Import preview', href: '#' },
            ]}
        >
            <Head title="Import preview" />
            <AdminPage>
                <AdminHeader
                    title="Check the import"
                    description={`${file} → ${intoSet ? `the question bank and “${target.title}”` : 'the question bank'}. Nothing is saved until you press Import.`}
                />

                <Card className="flex flex-wrap items-center gap-2 p-4">
                    {(Object.keys(statusInfo) as Status[])
                        .filter((s) => counts[s])
                        .map((s) => (
                            <span key={s} className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', statusInfo[s].tone)}>
                                {statusInfo[s].label}: {counts[s]}
                            </span>
                        ))}
                    <span className="text-muted-foreground ml-auto text-xs">{rows.length} rows</span>
                </Card>

                <Card className="divide-y p-0">
                    {rows.map((row, i) => {
                        const options = choices[row.status];
                        return (
                            <div key={i} className="grid gap-3 p-4 lg:grid-cols-[1fr_18rem]">
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">Row {row.line}</span>
                                        <span className={cn('rounded px-1.5 py-0.5 font-semibold', statusInfo[row.status].tone)}>
                                            {statusInfo[row.status].label}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {row.subject}
                                            {row.topic && ` › ${row.topic}`}
                                        </span>
                                        {row.used_in.length > 0 && (
                                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                Already in this bundle: {row.used_in.slice(0, 2).join(', ')}
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1.5 text-sm font-medium">{row.text || '(no question text)'}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {row.options.map((o, j) => `${'ABCD'[j]}) ${o}`).join('   ')} • Answer {row.correct}
                                    </p>
                                    {row.problem && <p className="mt-1 text-xs text-rose-600">{row.problem}</p>}
                                    {row.match && (
                                        <div className="bg-muted/60 mt-2 rounded-md px-3 py-2 text-xs">
                                            <p className="font-medium">
                                                In the bank (#{row.match.id}, {row.match.subject}) — {row.match.similarity}% alike
                                            </p>
                                            <p className="mt-0.5">{row.match.text}</p>
                                            <p className="text-muted-foreground mt-0.5">Bank answer: {row.match.correct}</p>
                                        </div>
                                    )}
                                </div>
                                {options ? (
                                    <select
                                        aria-label={`What to do with row ${row.line}`}
                                        className={cn(selectClass, 'w-full self-start')}
                                        value={picked[i] ?? options[0]}
                                        onChange={(e) => setPicked({ ...picked, [i]: e.target.value })}
                                    >
                                        {options.map((c) => (
                                            <option key={c} value={c}>
                                                {c === 'use' && !intoSet ? 'Leave as it is' : choiceLabels[c]}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-muted-foreground self-start text-xs">Skipped</p>
                                )}
                            </div>
                        );
                    })}
                </Card>

                <div className="flex flex-wrap gap-3">
                    <Button onClick={confirmImport} disabled={busy}>
                        <FileCheck2 /> Import
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => router.delete(route('admin.imports.cancel', token))}>
                        Cancel
                    </Button>
                </div>
            </AdminPage>
        </AppLayout>
    );
}
