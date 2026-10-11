import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Planned feature that is not built yet: rendered greyed out with a "Soon" tag. */
    disabled?: boolean;
    /** Extra URL prefixes that also mark this item as the current page. */
    activeFor?: string[];
    /** Only shown to users holding this permission (or 'manage-team' for super admins). */
    permission?: Permission | 'manage-team';
}

export type Permission =
    | 'manage-exams'
    | 'manage-questions'
    | 'manage-tests'
    | 'manage-materials'
    | 'manage-homepage'
    | 'manage-notices'
    | 'manage-doubts'
    | 'manage-students'
    | 'manage-settings';

export type Role = 'student' | 'super_admin' | 'staff';

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash: { status?: string | null; import_errors?: string[] | null };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: Role;
    role_label: string;
    permissions: Permission[];
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
