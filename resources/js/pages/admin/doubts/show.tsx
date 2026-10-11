import { AdminHeader, AdminPage } from '@/components/admin-kit';
import { DoubtReplyForm } from '@/components/doubt-reply-form';
import { DoubtThread, StatusBadge, type DoubtThreadData } from '@/components/doubt-thread';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CircleCheck, RotateCcw, UserRound } from 'lucide-react';

interface Props {
    doubt: DoubtThreadData;
    student: { id: number; name: string; email: string; url: string | null };
}

export default function DoubtAnswer({ doubt, student }: Props) {
    const setStatus = (status: 'open' | 'closed') => router.post(route('admin.doubts.status', doubt.id), { status }, { preserveScroll: true });

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Doubts', href: route('admin.doubts.index') },
                { title: `#${doubt.id}`, href: '#' },
            ]}
        >
            <Head title={`Doubt #${doubt.id}`} />
            <AdminPage>
                <AdminHeader
                    title={`Doubt from ${student.name}`}
                    description={`${doubt.subject ?? 'No subject'}${doubt.topic ? ` › ${doubt.topic}` : ''}`}
                />
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('admin.doubts.index')}>
                            <ArrowLeft /> Inbox
                        </Link>
                    </Button>
                    <StatusBadge status={doubt.status} audience="team" />
                    <span className="ml-auto" />
                    {doubt.status === 'closed' ? (
                        <Button variant="outline" size="sm" onClick={() => setStatus('open')}>
                            <RotateCcw /> Reopen
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setStatus('closed')}>
                            <CircleCheck /> Close
                        </Button>
                    )}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
                    <div className="min-w-0 space-y-5">
                        <DoubtThread doubt={doubt} />
                        <Card className="gap-3 p-5">
                            <h2 className="font-semibold">Answer</h2>
                            <DoubtReplyForm
                                action={route('admin.doubts.reply', doubt.id)}
                                placeholder="Explain step by step. The student sees this on their Doubts page."
                                submitLabel="Send answer"
                            />
                        </Card>
                    </div>
                    <Card className="h-fit gap-2 p-5 text-sm">
                        <p className="flex items-center gap-2 font-semibold">
                            <UserRound className="size-4" /> {student.name}
                        </p>
                        <p className="text-muted-foreground break-all">{student.email}</p>
                        {student.url && (
                            <Link href={student.url} className="text-primary text-sm hover:underline">
                                View their results
                            </Link>
                        )}
                    </Card>
                </div>
            </AdminPage>
        </AppLayout>
    );
}
