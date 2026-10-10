import { AdminHeader, AdminPage, CoverThumb, RowActions } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { ExternalLink, LayoutList } from 'lucide-react';

interface Row {
    id: number;
    name: string;
    slug: string;
    cover_url: string | null;
    is_free: boolean;
    price: number | null;
    description: string | null;
    is_active: boolean;
    subjects_count: number;
    mock_tests_count: number;
    subjects: string[];
}

export default function ExamsIndex({ exams }: { exams: Row[] }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Exams', href: route('admin.exams.index') }]}>
            <Head title="Exams" />
            <AdminPage>
                <AdminHeader
                    title="Exams"
                    description="The state exams students prepare for, their public exam pages and prices, and the bank subjects each one covers."
                    createHref={route('admin.exams.create')}
                    createLabel="New exam"
                />
                <Card className="divide-y p-0">
                    {exams.length === 0 && <p className="text-muted-foreground p-6 text-sm">No exams yet.</p>}
                    {exams.map((exam) => (
                        <div key={exam.id} className="flex flex-wrap items-center gap-4 p-4">
                            <CoverThumb url={exam.cover_url} />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-medium">
                                    {exam.name}
                                    {!exam.is_active && <span className="bg-muted rounded px-2 py-0.5 text-[11px] font-semibold">Hidden</span>}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {exam.subjects_count} subjects • {exam.mock_tests_count} tests
                                    {exam.subjects.length > 0 && ` • ${exam.subjects.join(', ')}`}
                                </p>
                                <p className="mt-1 text-xs font-medium">
                                    {exam.is_free ? (
                                        'Free'
                                    ) : exam.price ? (
                                        `₹${exam.price}`
                                    ) : (
                                        <span className="text-amber-600">No price set (not for sale)</span>
                                    )}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('admin.exams.content', exam.id)}>
                                    <LayoutList /> Content
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <a href={route('exams.show', exam.slug)} target="_blank" rel="noopener">
                                    <ExternalLink /> Page
                                </a>
                            </Button>
                            <RowActions
                                editHref={route('admin.exams.edit', exam.id)}
                                deleteHref={route('admin.exams.destroy', exam.id)}
                                name={exam.name}
                                confirmText="Its mock tests, papers and study material are deleted too."
                            />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
