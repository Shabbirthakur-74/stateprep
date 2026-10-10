import { AdminHeader, AdminPage, RowActions } from '@/components/admin-kit';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

interface Member {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'staff';
    role_label: string;
    permissions: string[];
    is_me: boolean;
}

export default function TeamIndex({ members }: { members: Member[] }) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;

    return (
        <AppLayout breadcrumbs={[{ title: 'Team & Access', href: route('admin.team.index') }]}>
            <Head title="Team & Access" />
            <AdminPage>
                <AdminHeader
                    title="Team & Access"
                    description="Add team members and choose which admin sections each one can use. Super admins have full access."
                    createHref={route('admin.team.create')}
                    createLabel="Add team member"
                />
                {errors.member && <p className="text-sm text-red-600">{errors.member}</p>}
                <Card className="divide-y p-0">
                    {members.map((member) => (
                        <div key={member.id} className="flex flex-wrap items-start gap-4 p-4">
                            <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full font-semibold">
                                {member.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-medium">
                                    {member.name}
                                    {member.is_me && <span className="text-muted-foreground text-xs">(you)</span>}
                                    <span
                                        className={
                                            member.role === 'super_admin'
                                                ? 'inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                                                : 'bg-muted rounded px-2 py-0.5 text-[11px] font-semibold'
                                        }
                                    >
                                        {member.role === 'super_admin' && <ShieldCheck className="size-3" />}
                                        {member.role_label}
                                    </span>
                                </p>
                                <p className="text-muted-foreground text-sm">{member.email}</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {member.role === 'super_admin'
                                        ? 'Full access, including the team'
                                        : member.permissions.length
                                          ? `Can manage: ${member.permissions.join(', ')}`
                                          : 'No sections yet: can only see the dashboard'}
                                </p>
                            </div>
                            {member.is_me ? (
                                <RowActions editHref={route('admin.team.edit', member.id)} name={member.name} />
                            ) : (
                                <RowActions
                                    editHref={route('admin.team.edit', member.id)}
                                    deleteHref={route('admin.team.destroy', member.id)}
                                    name={member.name}
                                />
                            )}
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
