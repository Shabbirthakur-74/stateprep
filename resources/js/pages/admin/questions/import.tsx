import { AdminHeader, AdminPage, Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Download, Upload } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function QuestionImport({ columns }: { columns: string[] }) {
    const { flash } = usePage<SharedData>().props;
    const { data, setData, post, processing, errors, reset } = useForm({ file: null as File | null });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.questions.import.store'), { forceFormData: true, onSuccess: () => reset('file') });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Question Bank', href: route('admin.questions.index') },
                { title: 'Import', href: '#' },
            ]}
        >
            <Head title="Import questions" />
            <AdminPage>
                <AdminHeader
                    title="Import questions"
                    description="Add many questions at once from a CSV file, e.g. exported from Excel or Google Sheets."
                />

                {flash.import_errors && flash.import_errors.length > 0 && (
                    <Card className="border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
                        <p className="font-medium">Some rows were skipped:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            {flash.import_errors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    </Card>
                )}

                <Card className="grid max-w-3xl gap-4 p-6">
                    <div>
                        <h2 className="font-medium">1. Prepare the file</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            The first row must contain these column names: <code className="bg-muted rounded px-1 text-xs">{columns.join(', ')}</code>
                            . Subjects and topics that do not exist yet are created. <em>topic</em>, <em>explanation</em> and <em>difficulty</em> may
                            be empty (difficulty defaults to medium). <em>correct</em> is A, B, C or D. Questions already in the same subject are
                            skipped.
                        </p>
                        <Button variant="outline" className="mt-3" asChild>
                            <a href={route('admin.questions.template')}>
                                <Download /> Download template
                            </a>
                        </Button>
                    </div>
                    <form onSubmit={submit} className="grid gap-3 border-t pt-4">
                        <h2 className="font-medium">2. Upload it</h2>
                        <Field label="CSV file" htmlFor="file" error={errors.file}>
                            <Input id="file" type="file" accept=".csv,text/csv" onChange={(e) => setData('file', e.target.files?.[0] ?? null)} />
                        </Field>
                        <div className="flex gap-3">
                            <Button type="submit" disabled={processing || !data.file}>
                                <Upload /> Import
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('admin.questions.index')}>Back to the bank</Link>
                            </Button>
                        </div>
                    </form>
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
