import { AdminHeader, AdminPage, CoverThumb, Pagination, RowActions, StatusPill } from '@/components/admin-kit';
import { GenerateQuizzes, type QuizExamOption, type QuizSubjectOption } from '@/components/generate-quizzes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { selectClass } from '@/lib/form-styles';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, EyeOff, ListChecks, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

interface Row {
    id: number;
    title: string;
    exam: string | null;
    subject: string | null;
    topic: string | null;
    cover_url: string | null;
    questions_count: number;
    attempts_count: number;
    is_free: boolean;
    is_published: boolean;
}

interface Props {
    quizzes: { data: Row[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    filter: string;
    exams: QuizExamOption[];
    subjects: QuizSubjectOption[];
}

const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;

export default function QuizzesIndex({ quizzes, filter, exams, subjects }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [selected, setSelected] = useState<number[]>([]);
    const allPicked = quizzes.data.length > 0 && quizzes.data.every((q) => selected.includes(q.id));

    const publish = (value: boolean) =>
        router.post(route('admin.quizzes.publish'), { ids: selected, publish: value }, { preserveScroll: true, onSuccess: () => setSelected([]) });

    return (
        <AppLayout breadcrumbs={[{ title: 'Quizzes', href: route('admin.quizzes.index') }]}>
            <Head title="Quizzes" />
            <AdminPage>
                <AdminHeader
                    title="Quizzes"
                    description="Ready-made quizzes. General quizzes appear on the students' Quizzes screen; quizzes of an exam are part of that exam's bundle."
                    createHref={route('admin.quizzes.create', filter !== 'all' && filter !== 'general' ? { exam: filter } : {})}
                    createLabel="New quiz"
                />
                <div className="flex flex-wrap items-center gap-3">
                    <GenerateQuizzes exams={exams} subjects={subjects} />
                    <select
                        aria-label="Show quizzes for"
                        className={selectClass}
                        value={filter}
                        onChange={(e) => router.get(route('admin.quizzes.index'), { exam: e.target.value }, { preserveState: true })}
                    >
                        <option value="all">All quizzes</option>
                        <option value="general">General quizzes</option>
                        {exams.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.name} bundle
                            </option>
                        ))}
                    </select>
                </div>

                {flash.import_errors && flash.import_errors.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                        <p className="flex items-center gap-2 font-medium">
                            <TriangleAlert className="size-4" /> Notes from generating:
                        </p>
                        <ul className="mt-1 list-disc pl-6">
                            {flash.import_errors.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <Card className="divide-y p-0">
                    {quizzes.data.length === 0 ? (
                        <p className="text-muted-foreground p-6 text-sm">No quizzes yet. Create one, or generate a set.</p>
                    ) : (
                        <div className="bg-muted/40 flex flex-wrap items-center gap-3 px-4 py-2">
                            <Checkbox
                                aria-label="Select all on this page"
                                checked={allPicked}
                                onCheckedChange={(checked) => setSelected(checked === true ? quizzes.data.map((q) => q.id) : [])}
                            />
                            <span className="text-muted-foreground flex-1 text-xs">
                                {selected.length ? `${selected.length} selected` : 'Select quizzes to publish them together'}
                            </span>
                            <Button size="sm" variant="outline" disabled={!selected.length} onClick={() => publish(true)}>
                                <Eye /> Publish
                            </Button>
                            <Button size="sm" variant="outline" disabled={!selected.length} onClick={() => publish(false)}>
                                <EyeOff /> Unpublish
                            </Button>
                        </div>
                    )}
                    {quizzes.data.map((quiz) => (
                        <div key={quiz.id} className="flex flex-wrap items-center gap-4 p-4">
                            <Checkbox
                                aria-label={`Select ${quiz.title}`}
                                checked={selected.includes(quiz.id)}
                                onCheckedChange={(checked) =>
                                    setSelected(checked === true ? [...selected, quiz.id] : selected.filter((id) => id !== quiz.id))
                                }
                            />
                            <CoverThumb url={quiz.cover_url} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{quiz.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {quiz.exam
                                        ? `${shortName(quiz.exam)} bundle • ${quiz.is_free ? 'Free sample' : 'Included with the exam'}`
                                        : 'General quiz'}
                                    {quiz.subject && ` • ${quiz.subject}`}
                                    {quiz.topic && ` › ${quiz.topic}`} • {quiz.questions_count} questions • {quiz.attempts_count} attempts
                                </p>
                            </div>
                            <StatusPill published={quiz.is_published} />
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('admin.sets.show', ['quiz', quiz.id])}>
                                    <ListChecks /> Questions
                                </Link>
                            </Button>
                            <RowActions
                                editHref={route('admin.quizzes.edit', quiz.id)}
                                deleteHref={route('admin.quizzes.destroy', quiz.id)}
                                name={quiz.title}
                            />
                        </div>
                    ))}
                </Card>
                <Pagination links={quizzes.links} />
            </AdminPage>
        </AppLayout>
    );
}
