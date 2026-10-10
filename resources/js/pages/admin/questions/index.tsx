import { AdminHeader, AdminPage, Pagination, RowActions } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { CopyCheck, Plus, Upload } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Row {
    id: number;
    text: string;
    subject: string | null;
    topic: string | null;
    difficulty: string;
    correct: string;
}

interface Props {
    questions: { data: Row[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    filters: { subject?: string; topic?: string; difficulty?: string; search?: string };
    subjects: { id: number; name: string; topics: { id: number; name: string }[] }[];
}

const difficultyTone: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    hard: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function QuestionsIndex({ questions, filters, subjects }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const subject = subjects.find((s) => String(s.id) === filters.subject);

    const apply = (changes: Partial<Props['filters']>) =>
        router.get(route('admin.questions.index'), Object.fromEntries(Object.entries({ ...filters, ...changes }).filter(([, v]) => v)), {
            preserveState: true,
            preserveScroll: true,
        });

    const submitSearch: FormEventHandler = (e) => {
        e.preventDefault();
        apply({ search });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Question Bank', href: route('admin.questions.index') }]}>
            <Head title="Question Bank" />
            <AdminPage>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <AdminHeader title="Question Bank" description={`${questions.total} questions match. Every quiz and test draws from here.`} />
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('admin.questions.duplicates')}>
                                <CopyCheck /> Find duplicates
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.questions.import')}>
                                <Upload /> Import CSV
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link
                                href={route('admin.questions.create', {
                                    subject: filters.subject,
                                    topic: filters.topic !== 'none' ? filters.topic : undefined,
                                })}
                            >
                                <Plus /> New question
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card className="flex flex-wrap items-center gap-3 p-4">
                    <select
                        aria-label="Subject"
                        className={selectClass}
                        value={filters.subject ?? ''}
                        onChange={(e) => apply({ subject: e.target.value, topic: '' })}
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
                        disabled={!subject}
                        onChange={(e) => apply({ topic: e.target.value })}
                    >
                        <option value="">All topics</option>
                        <option value="none">Without a topic</option>
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
                        onChange={(e) => apply({ difficulty: e.target.value })}
                    >
                        <option value="">Any difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                    <form onSubmit={submitSearch} className="flex flex-1 gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question text" className="min-w-48" />
                        <Button type="submit" variant="outline">
                            Search
                        </Button>
                    </form>
                </Card>

                <Card className="divide-y p-0">
                    {questions.data.length === 0 && <p className="text-muted-foreground p-6 text-sm">No questions match these filters.</p>}
                    {questions.data.map((q) => (
                        <div key={q.id} className="flex items-start gap-4 p-4">
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm">{q.text}</p>
                                <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                                    <span>
                                        {q.subject}
                                        {q.topic ? ` › ${q.topic}` : ' › no topic'}
                                    </span>
                                    <span className={cn('rounded px-1.5 py-0.5 font-semibold capitalize', difficultyTone[q.difficulty])}>
                                        {q.difficulty}
                                    </span>
                                    <span>Answer: {q.correct}</span>
                                </p>
                            </div>
                            <RowActions
                                editHref={route('admin.questions.edit', q.id)}
                                deleteHref={route('admin.questions.destroy', q.id)}
                                name="this question"
                            />
                        </div>
                    ))}
                </Card>
                <Pagination links={questions.links} />
            </AdminPage>
        </AppLayout>
    );
}
