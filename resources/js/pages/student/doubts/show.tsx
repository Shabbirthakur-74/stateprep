import { DoubtReplyForm } from '@/components/doubt-reply-form';
import { DoubtThread, StatusBadge, type DoubtThreadData } from '@/components/doubt-thread';
import { FlashStatus } from '@/components/flash-status';
import { Panel } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, CircleCheck } from 'lucide-react';

/**
 * One doubt and the conversation with the team.
 */
export default function DoubtShow({ doubt }: { doubt: DoubtThreadData }) {
    return (
        <StudentLayout title="Doubt">
            <div className="mx-auto max-w-3xl space-y-5">
                <Link href={route('student.doubts')} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
                    <ArrowLeft className="size-4" /> All doubts
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={doubt.status} audience="student" />
                        <span className="text-muted-foreground text-sm">
                            {doubt.subject ?? 'General'}
                            {doubt.topic && ` › ${doubt.topic}`}
                        </span>
                    </div>
                    {doubt.status !== 'closed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.post(route('student.doubts.resolve', doubt.id), {}, { preserveScroll: true })}
                        >
                            <CircleCheck /> Mark as resolved
                        </Button>
                    )}
                </div>

                <div className="empty:hidden">
                    <FlashStatus />
                </div>

                <DoubtThread doubt={doubt} />

                {doubt.status === 'open' && doubt.replies.every((r) => !r.from_team) && (
                    <p className="text-muted-foreground text-center text-sm">Our team has your doubt and will reply here.</p>
                )}

                <Panel>
                    <h2 className="font-semibold">{doubt.status === 'closed' ? 'Still unclear? Reply to open it again' : 'Reply'}</h2>
                    <div className="mt-3">
                        <DoubtReplyForm
                            action={route('student.doubts.reply', doubt.id)}
                            placeholder="Add more detail or ask a follow-up question..."
                            submitLabel="Send reply"
                        />
                    </div>
                </Panel>
            </div>
        </StudentLayout>
    );
}
