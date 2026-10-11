import { AdminHeader, AdminPage, Pagination } from '@/components/admin-kit';
import { StatusBadge, ago, type DoubtStatus, type DoubtSummary } from '@/components/doubt-thread';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight, FileQuestion, ImageIcon, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Props {
    doubts: { data: DoubtSummary[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    tab: DoubtStatus | 'all';
    filters: { subject?: string; search?: string };
    counts: Partial<Record<DoubtStatus, number>>;
    subjects: { id: number; name: string }[];
}

const tabs: { key: DoubtStatus | 'all'; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'answered', label: 'Answered' },
    { key: 'closed', label: 'Closed' },
    { key: 'all', label: 'All' },
];

export default function DoubtsInbox({ doubts, tab, filters, counts, subjects }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

    const go = (changes: Record<string, string | undefined>) =>
        router.get(route('admin.doubts.index'), Object.fromEntries(Object.entries({ status: tab, ...filters, ...changes }).filter(([, v]) => v)), {
            preserveState: true,
        });

    return (
        <AppLayout breadcrumbs={[{ title: 'Doubts', href: route('admin.doubts.index') }]}>
            <Head title="Doubts" />
            <AdminPage>
                <AdminHeader
                    title="Doubts"
                    description="Every student's doubt lands here. Open doubts are waiting for an answer, longest-waiting first."
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex rounded-lg border p-1 text-sm" role="tablist">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.key}
                                onClick={() => go({ status: t.key })}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md px-3 py-1',
                                    tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {t.label}
                                <span className={cn('rounded px-1.5 text-[11px]', tab === t.key ? 'bg-white/20' : 'bg-muted')}>
                                    {t.key === 'all' ? total : (counts[t.key] ?? 0)}
                                </span>
                            </button>
                        ))}
                    </div>
                    <select
                        aria-label="Subject"
                        className={selectClass}
                        value={filters.subject ?? ''}
                        onChange={(e) => go({ subject: e.target.value })}
                    >
                        <option value="">All subjects</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <form
                        className="flex gap-2"
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            go({ search });
                        }}
                    >
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search doubts or students..."
                            aria-label="Search"
                        />
                        <Button type="submit" variant="outline" size="icon" aria-label="Search">
                            <Search />
                        </Button>
                    </form>
                </div>

                <Card className="divide-y p-0">
                    {doubts.data.length === 0 && (
                        <p className="text-muted-foreground p-6 text-sm">
                            {tab === 'open' ? 'No doubts waiting. All caught up.' : 'No doubts here.'}
                        </p>
                    )}
                    {doubts.data.map((d) => (
                        <Link key={d.id} href={route('admin.doubts.show', d.id)} className="hover:bg-muted/50 flex items-center gap-4 p-4">
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-xs">
                                    <StatusBadge status={d.status} audience="team" />
                                    <span className="font-medium">{d.student}</span>
                                    <span className="text-muted-foreground">
                                        {d.subject ?? 'No subject'}
                                        {d.topic && ` › ${d.topic}`} • asked {ago(d.created_at)}
                                        {d.status === 'open' && d.replies_count > 0 && ` • follow-up ${ago(d.last_activity_at)}`}
                                    </span>
                                </p>
                                <p className="mt-1 truncate text-sm">{d.preview}</p>
                            </div>
                            <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                                {d.has_question && <FileQuestion className="size-4" aria-label="Question attached" />}
                                {d.has_photo && <ImageIcon className="size-4" aria-label="Photo attached" />}
                                {d.replies_count > 0 && `${d.replies_count} ${d.replies_count === 1 ? 'reply' : 'replies'}`}
                                <ChevronRight className="size-4" />
                            </span>
                        </Link>
                    ))}
                </Card>
                <Pagination links={doubts.links} />
            </AdminPage>
        </AppLayout>
    );
}
