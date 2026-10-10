import { AdminHeader, AdminPage, CoverThumb, RowActions, StatusPill } from '@/components/admin-kit';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface Row {
    id: number;
    title: string;
    exam: string | null;
    cover_url: string | null;
    format: string;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
}

export default function MaterialsIndex({ materials }: { materials: Row[] }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Study Material', href: route('admin.materials.index') }]}>
            <Head title="Study Material" />
            <AdminPage>
                <AdminHeader
                    title="Study Material"
                    description="Notes, PDFs and links for students, each with a cover image."
                    createHref={route('admin.materials.create')}
                    createLabel="New material"
                />
                <Card className="divide-y p-0">
                    {materials.length === 0 && <p className="text-muted-foreground p-6 text-sm">No study material yet. Add the first one.</p>}
                    {materials.map((m) => (
                        <div key={m.id} className="flex flex-wrap items-center gap-4 p-4">
                            <CoverThumb url={m.cover_url} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{m.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {m.format} • {m.exam} • {m.is_free ? 'Free' : `₹${m.price}`}
                                </p>
                            </div>
                            <StatusPill published={m.is_published} />
                            <RowActions
                                editHref={route('admin.materials.edit', m.id)}
                                deleteHref={route('admin.materials.destroy', m.id)}
                                name={m.title}
                            />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
