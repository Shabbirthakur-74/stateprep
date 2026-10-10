import { AdminHeader, AdminPage, CoverField, Field, PricingFields } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Series {
    id: number;
    exam_id: number | null;
    title: string;
    description: string | null;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
    cover_url: string | null;
    mock_test_ids: number[];
}

interface TestOption {
    id: number;
    title: string;
    type: 'mock' | 'pyq';
    exam: string | null;
    questions_count: number;
    is_published: boolean;
}

export default function TestSeriesForm({
    exams,
    tests,
    series,
    defaults,
}: {
    exams: { id: number; name: string }[];
    tests: TestOption[];
    series?: Series;
    defaults?: { exam_id: number | null };
}) {
    const { data, setData, post, transform, processing, errors } = useForm({
        exam_id: series?.exam_id ? String(series.exam_id) : defaults?.exam_id ? String(defaults.exam_id) : '',
        title: series?.title ?? '',
        description: series?.description ?? '',
        is_free: series?.is_free ?? true,
        price: series?.price ? String(series.price) : '',
        is_published: series?.is_published ?? false,
        cover: null as File | null,
        remove_cover: false as boolean,
        mock_test_ids: series?.mock_test_ids ?? ([] as number[]),
    });

    const chosen = data.mock_test_ids.map((id) => tests.find((t) => t.id === id)).filter((t): t is TestOption => !!t);
    const toggle = (id: number, on: boolean) =>
        setData('mock_test_ids', on ? [...data.mock_test_ids, id] : data.mock_test_ids.filter((t) => t !== id));
    const move = (index: number, by: -1 | 1) => {
        const ids = [...data.mock_test_ids];
        [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
        setData('mock_test_ids', ids);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (series) {
            transform((d) => ({ ...d, _method: 'put' }));
            post(route('admin.test-series.update', series.id), { forceFormData: true });
        } else {
            post(route('admin.test-series.store'), { forceFormData: true });
        }
    };

    const title = series ? `Edit “${series.title}”` : 'New test series';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Test Series', href: route('admin.test-series.index') },
                { title: series ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader title={title} description="Pick the mock tests in this series and put them in the order students should take them." />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Title" htmlFor="title" error={errors.title}>
                                <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                            </Field>
                            <Field label="Exam (optional)" htmlFor="exam_id" error={errors.exam_id}>
                                <select
                                    id="exam_id"
                                    className={selectClass}
                                    value={data.exam_id}
                                    onChange={(e) => setData('exam_id', e.target.value)}
                                >
                                    <option value="">Any exam</option>
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
                            currentUrl={series?.cover_url ?? null}
                            file={data.cover}
                            remove={data.remove_cover}
                            onFile={(file) => setData('cover', file)}
                            onRemove={(remove) => setData('remove_cover', remove)}
                            error={errors.cover}
                        />
                    </Card>

                    <Card className="grid gap-4 p-6">
                        <h2 className="font-medium">Tests in this series</h2>
                        {chosen.length > 0 && (
                            <ol className="grid gap-2">
                                {chosen.map((test, index) => (
                                    <li key={test.id} className="bg-muted/40 flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                        <span className="text-muted-foreground w-5 text-right">{index + 1}.</span>
                                        <span className="flex-1">{test.title}</span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Move up"
                                            disabled={index === 0}
                                            onClick={() => move(index, -1)}
                                        >
                                            <ArrowUp />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Move down"
                                            disabled={index === chosen.length - 1}
                                            onClick={() => move(index, 1)}
                                        >
                                            <ArrowDown />
                                        </Button>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <Field label="Available tests" error={errors.mock_test_ids}>
                            <div className="grid max-h-80 gap-2 overflow-y-auto">
                                {tests.map((test) => (
                                    <label key={test.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                                        <Checkbox
                                            checked={data.mock_test_ids.includes(test.id)}
                                            onCheckedChange={(checked) => toggle(test.id, checked === true)}
                                        />
                                        <span className="flex-1">{test.title}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {test.exam} • {test.questions_count} Qs{test.is_published ? '' : ' • draft'}
                                        </span>
                                    </label>
                                ))}
                                {tests.length === 0 && <p className="text-muted-foreground text-sm">Create some mock tests first.</p>}
                            </div>
                        </Field>
                    </Card>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {series ? 'Save changes' : 'Create series'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.test-series.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
