import { AdminHeader, AdminPage } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { CircleCheck, Merge } from 'lucide-react';
import { useState } from 'react';

interface DuplicateQuestion {
    id: number;
    text: string;
    options: string[];
    correct: string;
    subject: string | null;
    topic: string | null;
    difficulty: string;
    used: number;
}

interface Group {
    match: 'exact' | 'same_text';
    questions: DuplicateQuestion[];
}

function GroupCard({ group }: { group: Group }) {
    // Keep the copy used in the most tests and quizzes by default.
    const [keep, setKeep] = useState(() => [...group.questions].sort((a, b) => b.used - a.used || a.id - b.id)[0].id);
    const others = group.questions.filter((q) => q.id !== keep).map((q) => q.id);

    const merge = () =>
        confirm(
            `Merge ${others.length} ${others.length === 1 ? 'copy' : 'copies'} into question #${keep}? Tests, quizzes and past results move to the kept question.`,
        ) && router.post(route('admin.questions.merge'), { keep_id: keep, merge_ids: others }, { preserveScroll: true });

    return (
        <Card className="gap-3 p-5">
            <p className="text-xs font-semibold">
                {group.match === 'exact' ? (
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Exact copies</span>
                ) : (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                        Same question text, different options — check before merging
                    </span>
                )}
            </p>
            <ul className="grid gap-2">
                {group.questions.map((q) => (
                    <li key={q.id}>
                        <label
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
                                keep === q.id && 'border-emerald-500 bg-emerald-500/5',
                            )}
                        >
                            <input
                                type="radio"
                                name={`keep-${group.questions[0].id}`}
                                className="mt-1"
                                checked={keep === q.id}
                                onChange={() => setKeep(q.id)}
                            />
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="font-medium">
                                    #{q.id} {q.text}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {q.options.map((o, j) => `${'ABCD'[j]}) ${o}`).join('   ')} • Answer {q.correct}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {q.subject}
                                    {q.topic && ` › ${q.topic}`} • {q.difficulty} • used in {q.used}{' '}
                                    {q.used === 1 ? 'test or quiz' : 'tests and quizzes'}
                                </p>
                            </div>
                            {keep === q.id && (
                                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    <CircleCheck className="size-4" /> Keep
                                </span>
                            )}
                        </label>
                    </li>
                ))}
            </ul>
            <Button size="sm" className="justify-self-start" onClick={merge}>
                <Merge /> Merge into #{keep}
            </Button>
        </Card>
    );
}

export default function Duplicates({ groups }: { groups: Group[] }) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Question Bank', href: route('admin.questions.index') },
                { title: 'Duplicates', href: '#' },
            ]}
        >
            <Head title="Duplicate questions" />
            <AdminPage>
                <AdminHeader
                    title="Duplicate questions"
                    description="Questions that look the same once spacing, capitals, punctuation, numbering and option order are ignored. Pick the one to keep; the others are merged into it, and every test, quiz and past result that used them moves across."
                />
                {groups.length === 0 ? (
                    <Card className="text-muted-foreground p-8 text-center text-sm">No duplicates found. The bank is clean.</Card>
                ) : (
                    <div className="grid max-w-4xl gap-4">
                        {groups.map((group) => (
                            <GroupCard key={group.questions.map((q) => q.id).join('-')} group={group} />
                        ))}
                    </div>
                )}
            </AdminPage>
        </AppLayout>
    );
}
