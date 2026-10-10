import { AdminHeader, AdminPage, Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Notice {
    id: number;
    exam_id: number | null;
    category: string;
    title: string;
    summary: string | null;
    url: string | null;
    published_on: string;
    is_pinned: boolean;
    is_published: boolean;
}

interface Props {
    exams: { id: number; name: string }[];
    categories: { value: string; label: string }[];
    notice?: Notice;
}

export default function NoticeForm({ exams, categories, notice }: Props) {
    const { data, setData, post, put, processing, errors } = useForm({
        exam_id: notice?.exam_id ? String(notice.exam_id) : '',
        category: notice?.category ?? categories[0]?.value ?? '',
        title: notice?.title ?? '',
        summary: notice?.summary ?? '',
        url: notice?.url ?? '',
        published_on: notice?.published_on ?? new Date().toISOString().slice(0, 10),
        is_pinned: notice?.is_pinned ?? false,
        is_published: notice?.is_published ?? true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (notice) {
            put(route('admin.notices.update', notice.id));
        } else {
            post(route('admin.notices.store'));
        }
    };

    const title = notice ? 'Edit notice' : 'New notice';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Notice Board', href: route('admin.notices.index') },
                { title: notice ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader
                    title={title}
                    description="Notices dated in the future stay hidden until that day. Notices from the last 7 days are tagged “New”."
                />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <Field label="Title" htmlFor="title" error={errors.title}>
                            <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                        </Field>
                        <Field label="Summary" htmlFor="summary" error={errors.summary}>
                            <textarea
                                id="summary"
                                className={textareaClass}
                                rows={2}
                                value={data.summary}
                                onChange={(e) => setData('summary', e.target.value)}
                            />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Category" htmlFor="category" error={errors.category}>
                                <select
                                    id="category"
                                    className={selectClass}
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                >
                                    {categories.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Exam" htmlFor="exam_id" error={errors.exam_id}>
                                <select
                                    id="exam_id"
                                    className={selectClass}
                                    value={data.exam_id}
                                    onChange={(e) => setData('exam_id', e.target.value)}
                                >
                                    <option value="">General (no exam)</option>
                                    {exams.map((exam) => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Date" htmlFor="published_on" error={errors.published_on}>
                                <Input
                                    id="published_on"
                                    type="date"
                                    value={data.published_on}
                                    onChange={(e) => setData('published_on', e.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Link (optional)" htmlFor="url" error={errors.url} hint="e.g. the official notification PDF.">
                            <Input id="url" type="url" placeholder="https://" value={data.url} onChange={(e) => setData('url', e.target.value)} />
                        </Field>
                        <div className="flex flex-wrap gap-6 text-sm">
                            <label className="flex items-center gap-2">
                                <Checkbox checked={data.is_pinned} onCheckedChange={(checked) => setData('is_pinned', checked === true)} /> Pin to the
                                top
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={data.is_published} onCheckedChange={(checked) => setData('is_published', checked === true)} />{' '}
                                Published
                            </label>
                        </div>
                    </Card>
                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {notice ? 'Save changes' : 'Post notice'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.notices.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
