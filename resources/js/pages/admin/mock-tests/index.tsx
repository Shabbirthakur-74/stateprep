import { AdminHeader, AdminPage, CoverThumb, RowActions, StatusPill } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { ListChecks } from 'lucide-react';

interface Row {
    id: number;
    title: string;
    type: 'mock' | 'pyq';
    year: number | null;
    exam: string | null;
    cover_url: string | null;
    questions_count: number;
    duration_minutes: number;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
}

export default function MockTestsIndex({ tests }: { tests: Row[] }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Mock Tests & PYQs', href: route('admin.mock-tests.index') }]}>
            <Head title="Mock Tests & PYQs" />
            <AdminPage>
                <AdminHeader
                    title="Mock Tests & PYQs"
                    description="Timed papers built from the question bank. Add a cover image so they stand out for students."
                    createHref={route('admin.mock-tests.create')}
                    createLabel="New test"
                />
                <Card className="divide-y p-0">
                    {tests.length === 0 && <p className="text-muted-foreground p-6 text-sm">No tests yet. Create the first one.</p>}
                    {tests.map((test) => (
                        <div key={test.id} className="flex flex-wrap items-center gap-4 p-4">
                            <CoverThumb url={test.cover_url} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{test.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {test.type === 'pyq' ? `Previous year paper ${test.year ?? ''}` : 'Mock test'} • {test.exam} •{' '}
                                    {test.questions_count} questions • {test.duration_minutes} min • {test.is_free ? 'Free' : `₹${test.price}`}
                                </p>
                            </div>
                            <StatusPill published={test.is_published} />
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('admin.sets.show', ['mock-test', test.id])}>
                                    <ListChecks /> Questions
                                </Link>
                            </Button>
                            <RowActions
                                editHref={route('admin.mock-tests.edit', test.id)}
                                deleteHref={route('admin.mock-tests.destroy', test.id)}
                                name={test.title}
                            />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
