import { AdminHeader, AdminPage } from '@/components/admin-kit';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Check, FileQuestion, Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Topic {
    id: number;
    name: string;
    questions_count: number;
}

interface Subject {
    id: number;
    name: string;
    questions_count: number;
    untagged_count: number;
    exams: string[];
    topics: Topic[];
}

/** A name that turns into a text box when its pencil is clicked. */
function InlineName({ name, updateUrl, className }: { name: string; updateUrl: string; className?: string }) {
    const [editing, setEditing] = useState(false);
    const form = useForm({ name });

    const save: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(updateUrl, { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    if (!editing) {
        return (
            <span className={className}>
                {name}
                <button
                    type="button"
                    aria-label={`Rename ${name}`}
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-foreground ml-2 align-middle"
                >
                    <Pencil className="size-3.5" />
                </button>
            </span>
        );
    }

    return (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="h-8 w-56" autoFocus />
            <Button type="submit" size="icon" variant="ghost" aria-label="Save" disabled={form.processing}>
                <Check />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditing(false)}>
                <X />
            </Button>
            <InputError message={form.errors.name} />
        </form>
    );
}

function AddForm({ url, placeholder, label }: { url: string; placeholder: string; label: string }) {
    const form = useForm({ name: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(url, { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <form onSubmit={submit} className="grid gap-1">
            <div className="flex gap-2">
                <Input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder={placeholder}
                    className="h-9 max-w-xs"
                />
                <Button type="submit" size="sm" variant="outline" disabled={form.processing || !form.data.name.trim()}>
                    <Plus /> {label}
                </Button>
            </div>
            <InputError message={form.errors.name} />
        </form>
    );
}

export default function SubjectsIndex({ subjects }: { subjects: Subject[] }) {
    const destroy = (url: string, message: string) => confirm(message) && router.delete(url, { preserveScroll: true });
    const move = (topic: Topic, direction: 'up' | 'down') =>
        router.post(route('admin.topics.move', topic.id), { direction }, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={[{ title: 'Subjects & Topics', href: route('admin.subjects.index') }]}>
            <Head title="Subjects & Topics" />
            <AdminPage>
                <AdminHeader
                    title="Subjects & Topics"
                    description="The shared subject bank. Students pick a subject, then a topic, for their quizzes. Exams link to these subjects."
                />
                <Card className="p-5">
                    <h2 className="mb-2 font-medium">Add a subject</h2>
                    <AddForm url={route('admin.subjects.store')} placeholder="e.g. Himachal Pradesh GK" label="Add subject" />
                </Card>

                {subjects.map((subject) => (
                    <Card key={subject.id} className="gap-0 p-0">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
                            <div>
                                <InlineName
                                    name={subject.name}
                                    updateUrl={route('admin.subjects.update', subject.id)}
                                    className="text-lg font-semibold"
                                />
                                <p className="text-muted-foreground text-xs">
                                    {subject.questions_count} questions
                                    {subject.untagged_count > 0 && ` (${subject.untagged_count} without a topic)`} •{' '}
                                    {subject.exams.length ? `Used in ${subject.exams.join(', ')}` : 'Not linked to an exam'}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={route('admin.questions.index', { subject: subject.id })}>
                                        <FileQuestion /> Questions
                                    </Link>
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Delete ${subject.name}`}
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() =>
                                        destroy(
                                            route('admin.subjects.destroy', subject.id),
                                            `Delete “${subject.name}”? Its ${subject.questions_count} questions and all its topics are deleted too. This cannot be undone.`,
                                        )
                                    }
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        </div>
                        <ul className="divide-y">
                            {subject.topics.map((topic, index) => (
                                <li key={topic.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                                    <span className="text-muted-foreground w-5 text-right text-xs">{index + 1}.</span>
                                    <div className="min-w-0 flex-1">
                                        <InlineName name={topic.name} updateUrl={route('admin.topics.update', topic.id)} className="text-sm" />
                                    </div>
                                    <Link
                                        href={route('admin.questions.index', { subject: subject.id, topic: topic.id })}
                                        className="text-muted-foreground text-xs hover:underline"
                                    >
                                        {topic.questions_count} questions
                                    </Link>
                                    <div className="flex">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Move up"
                                            disabled={index === 0}
                                            onClick={() => move(topic, 'up')}
                                        >
                                            <ArrowUp />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Move down"
                                            disabled={index === subject.topics.length - 1}
                                            onClick={() => move(topic, 'down')}
                                        >
                                            <ArrowDown />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Delete ${topic.name}`}
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() =>
                                                destroy(
                                                    route('admin.topics.destroy', topic.id),
                                                    `Delete the topic “${topic.name}”? Its ${topic.questions_count} questions stay in ${subject.name} without a topic.`,
                                                )
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                            {subject.topics.length === 0 && <li className="text-muted-foreground px-5 py-3 text-sm">No topics yet.</li>}
                        </ul>
                        <div className="border-t p-5">
                            <AddForm url={route('admin.topics.store', subject.id)} placeholder="e.g. Districts" label="Add topic" />
                        </div>
                    </Card>
                ))}
            </AdminPage>
        </AppLayout>
    );
}
