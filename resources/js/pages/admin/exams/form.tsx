import { AdminHeader, AdminPage, CoverField, Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { textareaClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, ReactNode } from 'react';

// Type aliases rather than interfaces, so useForm accepts them as form data.
type Fact = { label: string; value: string };

type Faq = { question: string; answer: string };

interface Exam {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    overview: string | null;
    facts: Fact[];
    highlights: string[];
    faqs: Faq[];
    is_free: boolean;
    price: number | null;
    original_price: number | null;
    validity_months: number | null;
    cover_url: string | null;
    subject_ids: number[];
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <Card className="grid gap-5 p-6">
            <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {children}
        </Card>
    );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label={label} className="text-muted-foreground shrink-0">
            <Trash2 />
        </Button>
    );
}

export default function ExamForm({ subjects, exam }: { subjects: { id: number; name: string; questions_count: number }[]; exam?: Exam }) {
    const { data, setData, post, transform, processing, errors } = useForm({
        name: exam?.name ?? '',
        description: exam?.description ?? '',
        is_active: exam?.is_active ?? true,
        subject_ids: exam?.subject_ids ?? ([] as number[]),
        overview: exam?.overview ?? '',
        facts: exam?.facts ?? ([] as Fact[]),
        highlights: exam?.highlights ?? ([] as string[]),
        faqs: exam?.faqs ?? ([] as Faq[]),
        is_free: exam?.is_free ?? false,
        price: exam?.price?.toString() ?? '',
        original_price: exam?.original_price?.toString() ?? '',
        validity_months: exam?.validity_months?.toString() ?? '12',
        cover: null as File | null,
        remove_cover: false as boolean,
    });
    const err = errors as Record<string, string | undefined>;

    const toggle = (id: number, on: boolean) => setData('subject_ids', on ? [...data.subject_ids, id] : data.subject_ids.filter((s) => s !== id));

    const setFact = (i: number, key: keyof Fact, value: string) =>
        setData(
            'facts',
            data.facts.map((f, j) => (j === i ? { ...f, [key]: value } : f)),
        );
    const setFaq = (i: number, key: keyof Faq, value: string) =>
        setData(
            'faqs',
            data.faqs.map((f, j) => (j === i ? { ...f, [key]: value } : f)),
        );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Empty lists vanish from multipart forms, so they are sent as an empty string the server reads as "none".
        transform((d) => ({
            ...d,
            facts: d.facts.length ? d.facts : '',
            highlights: d.highlights.length ? d.highlights : '',
            faqs: d.faqs.length ? d.faqs : '',
            subject_ids: d.subject_ids.length ? d.subject_ids : '',
            price: d.is_free ? '' : d.price,
            original_price: d.is_free ? '' : d.original_price,
            ...(exam ? { _method: 'put' } : {}),
        }));
        post(exam ? route('admin.exams.update', exam.id) : route('admin.exams.store'), { forceFormData: true });
    };

    const title = exam ? `Edit ${exam.name}` : 'New exam';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Exams', href: route('admin.exams.index') },
                { title: exam ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader
                    title={title}
                    description="Name the exam, choose the subjects it covers, and write its public exam page, where visitors read about it and buy it."
                />
                {exam && (
                    <Button variant="outline" size="sm" className="mb-4" asChild>
                        <a href={route('exams.show', exam.slug)} target="_blank" rel="noopener">
                            <ExternalLink /> View public page
                        </a>
                    </Button>
                )}
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Section title="Basics" description="Shown on the homepage, the exam page and to students.">
                        <Field
                            label="Name"
                            htmlFor="name"
                            error={errors.name}
                            hint='Put the full name in brackets to show it under a short name, e.g. "HPAS (HPPSC Himachal Administrative Service)".'
                        >
                            <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        </Field>
                        <Field
                            label="Short description"
                            htmlFor="description"
                            error={errors.description}
                            hint="One or two sentences under the exam name."
                        >
                            <textarea
                                id="description"
                                className={textareaClass}
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                        </Field>
                        <CoverField
                            currentUrl={exam?.cover_url ?? null}
                            file={data.cover}
                            remove={data.remove_cover}
                            onFile={(file) => setData('cover', file)}
                            onRemove={(remove) => setData('remove_cover', remove)}
                            error={errors.cover}
                        />
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={data.is_active} onCheckedChange={(checked) => setData('is_active', checked === true)} /> Active (exam
                            page is public and students can see it)
                        </label>
                    </Section>

                    <Section title="Price" description="What students pay to buy this exam: everything published for it, in one bundle.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Access" error={errors.is_free}>
                                <div className="flex rounded-md border p-0.5">
                                    {[false, true].map((free) => (
                                        <button
                                            key={String(free)}
                                            type="button"
                                            onClick={() => setData('is_free', free)}
                                            className={cn(
                                                'flex-1 rounded px-3 py-1.5 text-sm',
                                                data.is_free === free ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                                            )}
                                        >
                                            {free ? 'Free' : 'Paid'}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Access period (months)" htmlFor="validity" error={errors.validity_months} hint="Leave empty for no expiry.">
                                <Input
                                    id="validity"
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={data.validity_months}
                                    onChange={(e) => setData('validity_months', e.target.value)}
                                />
                            </Field>
                            {!data.is_free && (
                                <>
                                    <Field label="Price (₹)" htmlFor="price" error={errors.price}>
                                        <Input
                                            id="price"
                                            type="number"
                                            min={1}
                                            value={data.price}
                                            onChange={(e) => setData('price', e.target.value)}
                                        />
                                    </Field>
                                    <Field
                                        label="Original price (₹)"
                                        htmlFor="original_price"
                                        error={errors.original_price}
                                        hint="Optional. Shown struck through, with the discount."
                                    >
                                        <Input
                                            id="original_price"
                                            type="number"
                                            min={1}
                                            value={data.original_price}
                                            onChange={(e) => setData('original_price', e.target.value)}
                                        />
                                    </Field>
                                </>
                            )}
                        </div>
                    </Section>

                    <Section
                        title="About the exam"
                        description="The main text of the exam page: what the exam is, who can apply, how selection works."
                    >
                        <Field label="Overview" htmlFor="overview" error={errors.overview} hint="Leave a blank line between paragraphs.">
                            <textarea
                                id="overview"
                                className={textareaClass}
                                rows={8}
                                value={data.overview}
                                onChange={(e) => setData('overview', e.target.value)}
                            />
                        </Field>
                    </Section>

                    <Section title="Key facts" description='Short facts shown as a table, e.g. "Conducted by" → "HPPSC", "Mode" → "Offline (OMR)".'>
                        {data.facts.map((fact, i) => (
                            <div key={i} className="grid gap-1">
                                <div className="flex items-start gap-2">
                                    <Input
                                        aria-label={`Fact ${i + 1} label`}
                                        placeholder="Label"
                                        value={fact.label}
                                        onChange={(e) => setFact(i, 'label', e.target.value)}
                                        className="w-2/5"
                                    />
                                    <Input
                                        aria-label={`Fact ${i + 1} value`}
                                        placeholder="Value"
                                        value={fact.value}
                                        onChange={(e) => setFact(i, 'value', e.target.value)}
                                    />
                                    <RemoveButton
                                        label={`Remove fact ${i + 1}`}
                                        onClick={() =>
                                            setData(
                                                'facts',
                                                data.facts.filter((_, j) => j !== i),
                                            )
                                        }
                                    />
                                </div>
                                {(err[`facts.${i}.label`] || err[`facts.${i}.value`]) && (
                                    <p className="text-sm text-red-600">{err[`facts.${i}.label`] ?? err[`facts.${i}.value`]}</p>
                                )}
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            className="justify-self-start"
                            onClick={() => setData('facts', [...data.facts, { label: '', value: '' }])}
                        >
                            <Plus /> Add fact
                        </Button>
                    </Section>

                    <Section
                        title="What students get"
                        description="Selling points listed beside the price. Counts of tests, papers, material and questions are added automatically."
                    >
                        {data.highlights.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Input
                                    aria-label={`Highlight ${i + 1}`}
                                    placeholder="e.g. Bilingual solutions (Hindi & English)"
                                    value={item}
                                    onChange={(e) =>
                                        setData(
                                            'highlights',
                                            data.highlights.map((h, j) => (j === i ? e.target.value : h)),
                                        )
                                    }
                                />
                                <RemoveButton
                                    label={`Remove highlight ${i + 1}`}
                                    onClick={() =>
                                        setData(
                                            'highlights',
                                            data.highlights.filter((_, j) => j !== i),
                                        )
                                    }
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            className="justify-self-start"
                            onClick={() => setData('highlights', [...data.highlights, ''])}
                        >
                            <Plus /> Add point
                        </Button>
                    </Section>

                    <Section title="FAQs" description="Common questions, shown at the bottom of the exam page.">
                        {data.faqs.map((faq, i) => (
                            <div key={i} className="grid gap-2 rounded-lg border p-3">
                                <div className="flex items-start gap-2">
                                    <Input
                                        aria-label={`Question ${i + 1}`}
                                        placeholder="Question"
                                        value={faq.question}
                                        onChange={(e) => setFaq(i, 'question', e.target.value)}
                                    />
                                    <RemoveButton
                                        label={`Remove question ${i + 1}`}
                                        onClick={() =>
                                            setData(
                                                'faqs',
                                                data.faqs.filter((_, j) => j !== i),
                                            )
                                        }
                                    />
                                </div>
                                <textarea
                                    aria-label={`Answer ${i + 1}`}
                                    placeholder="Answer"
                                    className={textareaClass}
                                    rows={3}
                                    value={faq.answer}
                                    onChange={(e) => setFaq(i, 'answer', e.target.value)}
                                />
                                {(err[`faqs.${i}.question`] || err[`faqs.${i}.answer`]) && (
                                    <p className="text-sm text-red-600">{err[`faqs.${i}.question`] ?? err[`faqs.${i}.answer`]}</p>
                                )}
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            className="justify-self-start"
                            onClick={() => setData('faqs', [...data.faqs, { question: '', answer: '' }])}
                        >
                            <Plus /> Add question
                        </Button>
                    </Section>

                    <Section title="Subjects covered" description="The syllabus on the exam page lists these subjects with their topics.">
                        <Field label="Subjects" error={errors.subject_ids} hint="Manage the subjects themselves under Subjects & Topics.">
                            <div className="grid gap-2 sm:grid-cols-2">
                                {subjects.map((subject) => (
                                    <label key={subject.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                                        <Checkbox
                                            checked={data.subject_ids.includes(subject.id)}
                                            onCheckedChange={(checked) => toggle(subject.id, checked === true)}
                                        />
                                        <span className="flex-1">{subject.name}</span>
                                        <span className="text-muted-foreground text-xs">{subject.questions_count} Qs</span>
                                    </label>
                                ))}
                                {subjects.length === 0 && <p className="text-muted-foreground text-sm">No subjects yet.</p>}
                            </div>
                        </Field>
                    </Section>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {exam ? 'Save changes' : 'Create exam'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.exams.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
