import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [], label = 'Platform' }: { items: NavItem[]; label?: string }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                            <SidebarMenuButton disabled className="cursor-not-allowed opacity-60">
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                <span className="bg-sidebar-accent text-sidebar-accent-foreground ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
                                    Soon
                                </span>
                            </SidebarMenuButton>
                        ) : (
                            <SidebarMenuButton asChild isActive={[item.url, ...(item.activeFor ?? [])].some((url) => page.url.startsWith(url))}>
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
