import { AdminHeader, AdminPage, Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ShieldCheck, UserCog } from 'lucide-react';
import { FormEventHandler } from 'react';

interface PermissionOption {
    value: string;
    label: string;
    description: string;
}

interface Member {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'staff';
    permissions: string[];
}

export default function TeamForm({ permissions, member }: { permissions: PermissionOption[]; member?: Member }) {
    const { auth } = usePage<SharedData>().props;
    const isMe = member?.id === auth.user.id;
    const { data, setData, post, put, processing, errors } = useForm({
        name: member?.name ?? '',
        email: member?.email ?? '',
        password: '',
        role: member?.role ?? ('staff' as 'super_admin' | 'staff'),
        permissions: member?.permissions ?? ([] as string[]),
    });

    const toggle = (value: string, on: boolean) =>
        setData('permissions', on ? [...data.permissions, value] : data.permissions.filter((p) => p !== value));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (member) {
            put(route('admin.team.update', member.id));
        } else {
            post(route('admin.team.store'));
        }
    };

    const title = member ? `Edit ${member.name}` : 'Add team member';
    const roles = [
        { value: 'staff' as const, label: 'Team member', text: 'Can use only the sections you tick below.', icon: UserCog },
        { value: 'super_admin' as const, label: 'Super Admin', text: 'Full access to everything, including the team.', icon: ShieldCheck },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Team & Access', href: route('admin.team.index') },
                { title: member ? 'Edit' : 'Add', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader title={title} description="Account details and what this person can access in the admin area." />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-4 p-6 sm:grid-cols-2">
                        <Field label="Name" htmlFor="name" error={errors.name}>
                            <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        </Field>
                        <Field label="Email" htmlFor="email" error={errors.email}>
                            <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                        </Field>
                        <Field
                            label={member ? 'New password' : 'Password'}
                            htmlFor="password"
                            error={errors.password}
                            hint={
                                (member
                                    ? 'Leave empty to keep the current password. '
                                    : 'Share it with them; they can sign in from the Admin Login link. ') +
                                'At least 8 characters, with a capital letter, a number and a special character.'
                            }
                            className="sm:col-span-2"
                        >
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required={!member}
                            />
                        </Field>
                    </Card>

                    <Card className="grid gap-4 p-6">
                        <h2 className="font-medium">Access level</h2>
                        {isMe && <p className="text-muted-foreground text-sm">You cannot change your own access level.</p>}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {roles.map(({ value, label, text, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    disabled={isMe}
                                    onClick={() => setData('role', value)}
                                    className={cn(
                                        'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors disabled:opacity-60',
                                        data.role === value ? 'border-primary ring-primary ring-1' : 'hover:border-primary/40',
                                    )}
                                >
                                    <Icon className="mt-0.5 size-5 shrink-0" />
                                    <span>
                                        <span className="block font-medium">{label}</span>
                                        <span className="text-muted-foreground block text-sm">{text}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        {data.role === 'staff' && (
                            <Field label="What can they manage?" error={errors.permissions}>
                                <div className="grid gap-2">
                                    {permissions.map((permission) => (
                                        <label key={permission.value} className="flex items-start gap-3 rounded-md border p-3">
                                            <Checkbox
                                                className="mt-0.5"
                                                checked={data.permissions.includes(permission.value)}
                                                onCheckedChange={(checked) => toggle(permission.value, checked === true)}
                                            />
                                            <span>
                                                <span className="block text-sm font-medium">{permission.label}</span>
                                                <span className="text-muted-foreground block text-xs">{permission.description}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <button
                                        type="button"
                                        className="text-primary hover:underline"
                                        onClick={() =>
                                            setData(
                                                'permissions',
                                                permissions.map((p) => p.value),
                                            )
                                        }
                                    >
                                        Select all
                                    </button>
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:underline"
                                        onClick={() => setData('permissions', [])}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </Field>
                        )}
                    </Card>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {member ? 'Save changes' : 'Add to team'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.team.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
