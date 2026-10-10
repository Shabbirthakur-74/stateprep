import { AdminHeader, AdminPage, CoverField, Field, PricingFields } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass } from '@/lib/form-styles';
import { Head, Link, useForm } from '@inertiajs/react';
import { ListChecks } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Test {
    id: number;
    exam_id: number;
    title: string;
    type: 'mock' | 'pyq';
    year: number | null;
    duration_minutes: number;
    marks_per_question: number;
    negative_marks: number;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
    cover_url: string | null;
    questions_count: number;
}

interface Props {
    exams: { id: number; name: string }[];
    test?: Test;
    /** Opened from an exam's Content screen. */
    defaults?: { exam_id: number | null; type: 'mock' | 'pyq' };
}

export default function MockTestForm({ exams, test, defaults }: Props) {
    const { data, setData, post, transform, processing, errors } = useForm({
        exam_id: String(test?.exam_id ?? defaults?.exam_id ?? exams[0]?.id ?? ''),
        title: test?.title ?? '',
        type: test?.type ?? defaults?.type ?? 'mock',
        year: test?.year ? String(test.year) : '',
        duration_minutes: String(test?.duration_minutes ?? 60),
        marks_per_question: String(test?.marks_per_question ?? 1),
        negative_marks: String(test?.negative_marks ?? 0),
        is_free: test?.is_free ?? true,
        price: test?.price ? String(test.price) : '',
        is_published: test?.is_published ?? false,
        cover: null as File | null,
        remove_cover: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (test) {
            transform((d) => ({ ...d, _method: 'put' }));
            post(route('admin.mock-tests.update', test.id), { forceFormData: true });
        } else {
            post(route('admin.mock-tests.store'), { forceFormData: true });
        }
    };

    const title = test ? `Edit “${test.title}”` : 'New test';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Mock Tests & PYQs', href: route('admin.mock-tests.index') },
                { title: test ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader title={title} description="Details, marking, price and cover of a mock test or previous year paper." />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
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
                            <Field label="Type" htmlFor="type" error={errors.type}>
                                <select
                                    id="type"
                                    className={selectClass}
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value as 'mock' | 'pyq')}
                                >
                                    <option value="mock">Mock test</option>
                                    <option value="pyq">Previous year paper</option>
                                </select>
                            </Field>
                        </div>
                        <Field label="Title" htmlFor="title" error={errors.title}>
                            <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-4">
                            {data.type === 'pyq' && (
                                <Field label="Year" htmlFor="year" error={errors.year}>
                                    <Input id="year" type="number" value={data.year} onChange={(e) => setData('year', e.target.value)} />
                                </Field>
                            )}
                            <Field label="Duration (min)" htmlFor="duration" error={errors.duration_minutes}>
                                <Input
                                    id="duration"
                                    type="number"
                                    min={1}
                                    value={data.duration_minutes}
                                    onChange={(e) => setData('duration_minutes', e.target.value)}
                                />
                            </Field>
                            <Field label="Marks / correct" htmlFor="marks" error={errors.marks_per_question}>
                                <Input
                                    id="marks"
                                    type="number"
                                    step="0.25"
                                    value={data.marks_per_question}
                                    onChange={(e) => setData('marks_per_question', e.target.value)}
                                />
                            </Field>
                            <Field label="Minus / wrong" htmlFor="negative" error={errors.negative_marks}>
                                <Input
                                    id="negative"
                                    type="number"
                                    step="0.01"
                                    value={data.negative_marks}
                                    onChange={(e) => setData('negative_marks', e.target.value)}
                                />
                            </Field>
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
                            currentUrl={test?.cover_url ?? null}
                            file={data.cover}
                            remove={data.remove_cover}
                            onFile={(file) => setData('cover', file)}
                            onRemove={(remove) => setData('remove_cover', remove)}
                            error={errors.cover}
                        />
                    </Card>

                    <Card className="grid gap-3 p-6">
                        <div>
                            <h2 className="font-medium">Questions</h2>
                            <p className="text-muted-foreground text-sm">
                                {test
                                    ? `This test has ${test.questions_count} questions.`
                                    : 'After creating the test you choose its questions: random by subject (e.g. 25 from Maths, 25 from HP GK), picked from the bank, or imported from a CSV file. For a previous year paper, import the paper from CSV.'}
                            </p>
                        </div>
                        {test && (
                            <Button type="button" variant="outline" className="justify-self-start" asChild>
                                <Link href={route('admin.sets.show', ['mock-test', test.id])}>
                                    <ListChecks /> Manage questions ({test.questions_count})
                                </Link>
                            </Button>
                        )}
                    </Card>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {test ? 'Save changes' : 'Create test & add questions'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.mock-tests.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
