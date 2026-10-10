import { AdminHeader, AdminPage, RowActions, StatusPill } from '@/components/admin-kit';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Pin } from 'lucide-react';

interface Row {
    id: number;
    title: string;
    summary: string | null;
    url: string | null;
    category: string;
    exam: string | null;
    published_on: string;
    is_pinned: boolean;
    is_published: boolean;
}

export default function NoticesIndex({ notices }: { notices: Row[] }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Notice Board', href: route('admin.notices.index') }]}>
            <Head title="Notice Board" />
            <AdminPage>
                <AdminHeader
                    title="Notice Board"
                    description="Exam notifications and announcements shown on the home page and the student dashboard."
                    createHref={route('admin.notices.create')}
                    createLabel="New notice"
                />
                <Card className="divide-y p-0">
                    {notices.length === 0 && <p className="text-muted-foreground p-6 text-sm">No notices yet.</p>}
                    {notices.map((n) => (
                        <div key={n.id} className="flex flex-wrap items-start gap-4 p-4">
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 font-medium">
                                    {n.is_pinned && <Pin className="size-3.5 shrink-0 text-indigo-600" aria-label="Pinned" />}
                                    {n.title}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {n.category} • {n.exam ?? 'General'} • {n.published_on}
                                </p>
                                {n.summary && <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">{n.summary}</p>}
                            </div>
                            <StatusPill published={n.is_published} />
                            <RowActions
                                editHref={route('admin.notices.edit', n.id)}
                                deleteHref={route('admin.notices.destroy', n.id)}
                                name={n.title}
                            />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
