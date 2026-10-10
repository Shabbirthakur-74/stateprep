import { AdminHeader, AdminPage, CoverThumb, RowActions, StatusPill } from '@/components/admin-kit';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface Row {
    id: number;
    title: string;
    exam: string | null;
    cover_url: string | null;
    tests_count: number;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
}

export default function TestSeriesIndex({ series }: { series: Row[] }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Test Series', href: route('admin.test-series.index') }]}>
            <Head title="Test Series" />
            <AdminPage>
                <AdminHeader
                    title="Test Series"
                    description="Packs of mock tests taken in order, each with its own cover, description and price."
                    createHref={route('admin.test-series.create')}
                    createLabel="New series"
                />
                <Card className="divide-y p-0">
                    {series.length === 0 && <p className="text-muted-foreground p-6 text-sm">No test series yet. Create the first one.</p>}
                    {series.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                            <CoverThumb url={s.cover_url} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{s.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {s.exam ?? 'Any exam'} • {s.tests_count} tests • {s.is_free ? 'Free' : `₹${s.price}`}
                                </p>
                            </div>
                            <StatusPill published={s.is_published} />
                            <RowActions
                                editHref={route('admin.test-series.edit', s.id)}
                                deleteHref={route('admin.test-series.destroy', s.id)}
                                name={s.title}
                            />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
