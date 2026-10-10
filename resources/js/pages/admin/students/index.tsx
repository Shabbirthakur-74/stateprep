import { AdminHeader, AdminPage, Pagination, RowActions } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Row {
    id: number;
    name: string;
    email: string;
    quizzes_count: number;
    tests_count: number;
    joined: string;
}

interface Props {
    students: { data: Row[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    search: string;
}

export default function StudentsIndex({ students, search }: Props) {
    const [query, setQuery] = useState(search);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('admin.students.index'), query ? { search: query } : {}, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Students', href: route('admin.students.index') }]}>
            <Head title="Students" />
            <AdminPage>
                <AdminHeader title="Students" description={`${students.total} registered students.`} />
                <form onSubmit={submit} className="flex max-w-md gap-2">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" />
                    <Button type="submit" variant="outline">
                        Search
                    </Button>
                </form>
                <Card className="divide-y p-0">
                    {students.data.length === 0 && <p className="text-muted-foreground p-6 text-sm">No students found.</p>}
                    {students.data.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                            <div className="min-w-0 flex-1">
                                <Link href={route('admin.students.show', s.id)} className="font-medium hover:underline">
                                    {s.name}
                                </Link>
                                <p className="text-muted-foreground text-xs">
                                    {s.email} • joined {s.joined}
                                </p>
                            </div>
                            <span className="text-muted-foreground text-xs">
                                {s.quizzes_count} quizzes • {s.tests_count} tests
                            </span>
                            <RowActions
                                deleteHref={route('admin.students.destroy', s.id)}
                                name={s.name}
                                confirmText="Their account and all their results are deleted."
                            />
                        </div>
                    ))}
                </Card>
                <Pagination links={students.links} />
            </AdminPage>
        </AppLayout>
    );
}
