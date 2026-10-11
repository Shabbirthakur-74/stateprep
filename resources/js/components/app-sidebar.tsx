import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpenText,
    ClipboardList,
    FileQuestion,
    GraduationCap,
    House,
    Layers,
    LayoutGrid,
    Library,
    MessageSquareText,
    Settings,
    ShieldCheck,
    Users,
    Zap,
} from 'lucide-react';
import AppLogo from './app-logo';

const studentNavItems: NavItem[] = [{ title: 'Dashboard', url: '/student/dashboard', icon: LayoutGrid }];

const adminNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutGrid },
    { title: 'Exams', url: '/admin/exams', icon: GraduationCap, permission: 'manage-exams' },
    { title: 'Subjects & Topics', url: '/admin/subjects', icon: Library, permission: 'manage-questions' },
    { title: 'Question Bank', url: '/admin/questions', icon: FileQuestion, permission: 'manage-questions' },
    { title: 'Mock Tests & PYQs', url: '/admin/mock-tests', icon: ClipboardList, permission: 'manage-tests' },
    { title: 'Test Series', url: '/admin/test-series', icon: Layers, permission: 'manage-tests' },
    { title: 'Quizzes', url: '/admin/quizzes', icon: Zap, permission: 'manage-tests' },
    { title: 'Study Material', url: '/admin/materials', icon: BookOpenText, permission: 'manage-materials' },
    { title: 'Homepage', url: '/admin/homepage', icon: House, permission: 'manage-homepage' },
    { title: 'Doubts', url: '/admin/doubts', icon: MessageSquareText, permission: 'manage-doubts' },
    { title: 'Notice Board', url: '/admin/notices', icon: Bell, permission: 'manage-notices' },
    { title: 'Students', url: '/admin/students', icon: Users, permission: 'manage-students' },
    { title: 'Team & Access', url: '/admin/team', icon: ShieldCheck, permission: 'manage-team' },
    { title: 'Settings', url: '/admin/settings', icon: Settings, permission: 'manage-settings' },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user.role !== 'student';
    const allowed = (item: NavItem) =>
        !item.permission || (item.permission === 'manage-team' ? auth.user.role === 'super_admin' : auth.user.permissions.includes(item.permission));
    const navItems = (isAdmin ? adminNavItems : studentNavItems).filter(allowed);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={isAdmin ? '/admin/dashboard' : '/student/dashboard'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} label={isAdmin ? 'Administration' : 'Learn'} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
