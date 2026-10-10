import { AdminHeader, AdminPage, CoverField, Field, PricingFields } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Material {
    id: number;
    exam_id: number;
    title: string;
    description: string | null;
    external_url: string | null;
    file_name: string | null;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
    cover_url: string | null;
}

interface Props {
    exams: { id: number; name: string }[];
    fileTypes: string[];
    maxFileMb: number;
    material?: Material;
}

export default function MaterialForm({ exams, fileTypes, maxFileMb, material, defaults }: Props & { defaults?: { exam_id: number | null } }) {
    const [source, setSource] = useState<'file' | 'link'>(material?.external_url ? 'link' : 'file');
    const { data, setData, post, transform, processing, errors } = useForm({
        exam_id: String(material?.exam_id ?? defaults?.exam_id ?? exams[0]?.id ?? ''),
        title: material?.title ?? '',
        description: material?.description ?? '',
        file: null as File | null,
        external_url: material?.external_url ?? '',
        is_free: material?.is_free ?? true,
        price: material?.price ? String(material.price) : '',
        is_published: material?.is_published ?? false,
        cover: null as File | null,
        remove_cover: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Only send the source that is selected, so switching tabs never sends both.
        transform((d) => ({
            ...d,
            file: source === 'file' ? d.file : null,
            external_url: source === 'link' ? d.external_url : '',
            ...(material ? { _method: 'put' } : {}),
        }));
        post(material ? route('admin.materials.update', material.id) : route('admin.materials.store'), { forceFormData: true });
    };

    const title = material ? `Edit “${material.title}”` : 'New study material';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Study Material', href: route('admin.materials.index') },
                { title: material ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader title={title} description="Upload a file or link to outside material, and give it a cover image." />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Title" htmlFor="title" error={errors.title}>
                                <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                            </Field>
                            <Field label="Exam" htmlFor="exam_id" error={errors.exam_id}>
                                <select
                                    id="exam_id"
                                    className={selectClass}
                                    value={data.exam_id}
                                    onChange={(e) => setData('exam_id', e.target.value)}
                                >
                                    {exams.map((exam) => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <Field label="Description" htmlFor="description" error={errors.description}>
                            <textarea
                                id="description"
                                className={textareaClass}
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                        </Field>

                        <div className="grid gap-3">
                            <div className="flex w-fit rounded-md border p-0.5">
                                {(['file', 'link'] as const).map((kind) => (
                                    <button
                                        key={kind}
                                        type="button"
                                        onClick={() => setSource(kind)}
                                        className={cn(
                                            'rounded px-3 py-1.5 text-sm',
                                            source === kind ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                                        )}
                                    >
                                        {kind === 'file' ? 'Upload a file' : 'Link to outside material'}
                                    </button>
                                ))}
                            </div>
                            {source === 'file' ? (
                                <Field
                                    label="File"
                                    htmlFor="file"
                                    error={errors.file}
                                    hint={`${fileTypes.join(', ').toUpperCase()}, up to ${maxFileMb} MB.${material?.file_name ? ` Current file: ${material.file_name}. Leave empty to keep it.` : ''}`}
                                >
                                    <Input id="file" type="file" onChange={(e) => setData('file', e.target.files?.[0] ?? null)} />
                                </Field>
                            ) : (
                                <Field label="Link" htmlFor="external_url" error={errors.external_url}>
                                    <Input
                                        id="external_url"
                                        type="url"
                                        placeholder="https://"
                                        value={data.external_url}
                                        onChange={(e) => setData('external_url', e.target.value)}
                                    />
                                </Field>
                            )}
                        </div>

                        <PricingFields
                            isFree={data.is_free}
                            price={data.price}
                            isPublished={data.is_published}
                            onChange={(field, value) => setData(field, value as never)}
                            errors={errors}
                        />
                    </Card>

                    <Card className="p-6">
                        <CoverField
                            currentUrl={material?.cover_url ?? null}
                            file={data.cover}
                            remove={data.remove_cover}
                            onFile={(file) => setData('cover', file)}
                            onRemove={(remove) => setData('remove_cover', remove)}
                            error={errors.cover}
                        />
                    </Card>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {material ? 'Save changes' : 'Create material'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.materials.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
