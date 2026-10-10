import { FlashStatus } from '@/components/flash-status';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Permission, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpenText,
    ClipboardList,
    FileQuestion,
    GraduationCap,
    Layers,
    Library,
    ShieldCheck,
    UserPlus,
    Users,
    Zap,
    type LucideIcon,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin dashboard', href: '/admin/dashboard' }];

interface Props {
    stats: { students: number; admins: number; newThisWeek: number; quizzesTaken: number; testsTaken: number };
    content: { exams: number; subjects: number; questions: number; tests: number; series: number; materials: number };
    recentStudents: { id: number; name: string; email: string; created_at: string }[];
}

export default function AdminDashboard({ stats, content, recentStudents }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (permission: Permission | 'manage-team') =>
        permission === 'manage-team' ? auth.user.role === 'super_admin' : auth.user.permissions.includes(permission);

    const cards = [
        { label: 'Registered students', value: stats.students, icon: Users },
        { label: 'New this week', value: stats.newThisWeek, icon: UserPlus },
        { label: 'Quizzes taken', value: stats.quizzesTaken, icon: Zap },
        { label: 'Tests taken', value: stats.testsTaken, icon: ClipboardList },
        { label: 'Admin team members', value: stats.admins, icon: ShieldCheck },
    ];

    const shortcutList: { label: string; detail: string; href: string; icon: LucideIcon; permission: Permission | 'manage-team' }[] = [
        { label: 'Exams', detail: `${content.exams} exams`, href: route('admin.exams.index'), icon: GraduationCap, permission: 'manage-exams' },
        {
            label: 'Subjects & Topics',
            detail: `${content.subjects} subjects`,
            href: route('admin.subjects.index'),
            icon: Library,
            permission: 'manage-questions',
        },
        {
            label: 'Question Bank',
            detail: `${content.questions} questions`,
            href: route('admin.questions.index'),
            icon: FileQuestion,
            permission: 'manage-questions',
        },
        {
            label: 'Mock Tests & PYQs',
            detail: `${content.tests} tests`,
            href: route('admin.mock-tests.index'),
            icon: ClipboardList,
            permission: 'manage-tests',
        },
        {
            label: 'Test Series',
            detail: `${content.series} series`,
            href: route('admin.test-series.index'),
            icon: Layers,
            permission: 'manage-tests',
        },
        {
            label: 'Study Material',
            detail: `${content.materials} items`,
            href: route('admin.materials.index'),
            icon: BookOpenText,
            permission: 'manage-materials',
        },
        { label: 'Notice Board', detail: 'Notifications', href: route('admin.notices.index'), icon: Bell, permission: 'manage-notices' },
        { label: 'Team & Access', detail: `${stats.admins} members`, href: route('admin.team.index'), icon: ShieldCheck, permission: 'manage-team' },
    ];
    const shortcuts = shortcutList.filter((s) => can(s.permission));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <FlashStatus />
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        Admin dashboard <Badge>{auth.user.role_label}</Badge>
                    </h1>
                    <p className="text-muted-foreground text-sm">Platform overview.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
                    {cards.map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardDescription>{label}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold">{value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {shortcuts.length > 0 ? (
                    <section>
                        <h2 className="mb-3 font-medium">Manage</h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {shortcuts.map(({ label, detail, href, icon: Icon }) => (
                                <Link
                                    key={label}
                                    href={href}
                                    className="hover:border-primary/50 flex items-center gap-3 rounded-xl border p-4 transition-colors"
                                >
                                    <Icon className="text-muted-foreground size-5" />
                                    <span>
                                        <span className="block text-sm font-medium">{label}</span>
                                        <span className="text-muted-foreground block text-xs">{detail}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                        You don't have access to any admin sections yet. Ask a super admin to give you access.
                    </p>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent sign-ups</CardTitle>
                        <CardDescription>The five most recently registered students.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentStudents.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No students have registered yet.</p>
                        ) : (
                            <ul className="divide-y">
                                {recentStudents.map((student) => (
                                    <li key={student.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                                        <div className="min-w-0">
                                            {can('manage-students') ? (
                                                <Link
                                                    href={route('admin.students.show', student.id)}
                                                    className="truncate font-medium hover:underline"
                                                >
                                                    {student.name}
                                                </Link>
                                            ) : (
                                                <p className="truncate font-medium">{student.name}</p>
                                            )}
                                            <p className="text-muted-foreground truncate">{student.email}</p>
                                        </div>
                                        <time className="text-muted-foreground shrink-0">{new Date(student.created_at).toLocaleDateString()}</time>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
