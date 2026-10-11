import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookMarked,
    BookOpenText,
    ChevronDown,
    CircleHelp,
    ClipboardList,
    Crown,
    FileStack,
    Gift,
    GraduationCap,
    History,
    House,
    Layers,
    LogOut,
    Menu,
    MessageSquareText,
    MonitorPlay,
    ReceiptText,
    Search,
    Settings,
    Sparkles,
    TrendingUp,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';

interface NavLink {
    title: string;
    route: string;
    icon: LucideIcon;
}

const navGroups: { label: string; tone: string; links: NavLink[] }[] = [
    {
        label: 'Main',
        tone: 'bg-sky-50 border-sky-100 dark:bg-sky-500/5 dark:border-sky-500/15',
        links: [{ title: 'Home', route: 'student.dashboard', icon: House }],
    },
    {
        label: 'My Preparation',
        tone: 'bg-violet-50 border-violet-100 dark:bg-violet-500/5 dark:border-violet-500/15',
        links: [
            { title: 'My Exams', route: 'student.exams', icon: GraduationCap },
            { title: 'My Library', route: 'student.library', icon: BookMarked },
        ],
    },
    {
        label: 'Learn & Study',
        tone: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/15',
        links: [
            { title: 'Study Material', route: 'student.study-material', icon: BookOpenText },
            { title: 'PYQs', route: 'student.pyqs', icon: FileStack },
            { title: 'Quizzes', route: 'student.quizzes', icon: Zap },
        ],
    },
    {
        label: 'Practice & Tests',
        tone: 'bg-orange-50 border-orange-100 dark:bg-orange-500/5 dark:border-orange-500/15',
        links: [
            { title: 'Mock Tests', route: 'student.mock-tests', icon: ClipboardList },
            { title: 'Test Series', route: 'student.test-series', icon: Layers },
            { title: 'Personalised Tests', route: 'student.personalised-tests', icon: Sparkles },
            { title: 'Attempted Tests', route: 'student.attempted-tests', icon: History },
        ],
    },
    {
        label: 'Performance',
        tone: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/15',
        links: [{ title: 'My Performance', route: 'student.performance', icon: TrendingUp }],
    },
    {
        label: 'Doubts & Support',
        tone: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/15',
        links: [
            { title: 'Doubts', route: 'student.doubts', icon: MessageSquareText },
            { title: '1-on-1 Live Session', route: 'student.live-session', icon: MonitorPlay },
        ],
    },
];

/** Account menu entries that are not built yet; each opens the "coming soon" popup. */
const accountLinks: { title: string; icon: LucideIcon }[] = [
    { title: 'Refer & Earn', icon: Gift },
    { title: 'My Transactions', icon: ReceiptText },
    { title: 'Settings', icon: Settings },
];

// A tinted background a shade darker than the menu panel, so each entry reads as its own button.
const menuItemClass = 'my-0.5 cursor-pointer rounded-md bg-slate-100 focus:bg-slate-200 dark:bg-slate-800 dark:focus:bg-slate-700';

const COMING_SOON_EVENT = 'student:coming-soon';

/**
 * Opens the "coming soon" popup for a feature that is not built yet. Sent as a window event, so it works
 * from page components that render the layout themselves as well as from components inside it.
 */
export function useComingSoon() {
    return useCallback((feature: string) => window.dispatchEvent(new CustomEvent(COMING_SOON_EVENT, { detail: feature })), []);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    const { doubtsUnread } = usePage<SharedData & { doubtsUnread: number }>().props;
    return (
        <nav className="space-y-3" aria-label="Student">
            {navGroups.map((group) => (
                <div key={group.label} className={cn('rounded-xl border p-2.5', group.tone)}>
                    <p className="text-muted-foreground px-2 pt-1 pb-2 text-[10px] font-semibold tracking-wider uppercase">{group.label}</p>
                    <ul className="space-y-0.5">
                        {group.links.map(({ title, route: name, icon: Icon }) => {
                            const active = route().current(name);
                            return (
                                <li key={name}>
                                    <Link
                                        href={route(name)}
                                        onClick={onNavigate}
                                        prefetch
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                                            active
                                                ? 'bg-indigo-600 font-medium text-white shadow-sm'
                                                : 'hover:bg-background/80 text-foreground/80 hover:text-foreground',
                                        )}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        {title}
                                        {name === 'student.doubts' && doubtsUnread > 0 && (
                                            <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                                                {doubtsUnread}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

/**
 * Shell of every student screen: top bar with search, doubts, notifications and the account menu,
 * and the colour-grouped sidebar.
 */
export default function StudentLayout({ title, children }: { title: string; children: ReactNode }) {
    const { auth, name, doubtsUnread } = usePage<SharedData & { doubtsUnread: number }>().props;
    const [comingSoon, setComingSoon] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const firstName = auth.user.name.split(' ')[0];

    useEffect(() => {
        const open = (event: Event) => setComingSoon((event as CustomEvent<string>).detail);
        window.addEventListener(COMING_SOON_EVENT, open);
        return () => window.removeEventListener(COMING_SOON_EVENT, open);
    }, []);

    const search = (event: FormEvent) => {
        event.preventDefault();
        setComingSoon('Search');
    };

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
                    <div className="flex h-16 items-center gap-3 px-4 lg:gap-6 lg:px-6">
                        <button
                            type="button"
                            className="hover:bg-muted -ml-1 rounded-md p-2 lg:hidden"
                            aria-label="Open menu"
                            onClick={() => setMenuOpen(true)}
                        >
                            <Menu className="size-5" />
                        </button>
                        <Link href={route('student.dashboard')} className="flex shrink-0 items-center gap-2.5 lg:w-56">
                            <AppLogoIcon className="size-10 border p-0.5" />
                            <span className="hidden leading-tight sm:block">
                                <span className="font-display block font-semibold">{name}</span>
                                <span className="text-muted-foreground block text-[11px]">Education that fits you</span>
                            </span>
                        </Link>

                        <form onSubmit={search} className="hidden max-w-xl flex-1 md:block">
                            <label className="flex items-center gap-2 rounded-lg bg-indigo-50/70 px-3 py-2 text-sm dark:bg-slate-800/70">
                                <Search className="text-muted-foreground size-4" />
                                <input
                                    type="search"
                                    placeholder="Search exams, topics, questions, or study material..."
                                    className="placeholder:text-muted-foreground w-full bg-transparent outline-none"
                                />
                            </label>
                        </form>

                        <div className="ml-auto flex items-center gap-2 sm:gap-3">
                            <Button
                                size="sm"
                                className="bg-linear-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
                                aria-label="Buy Pass"
                                asChild
                            >
                                <Link href={route('student.pass')}>
                                    <Crown className="size-4" /> <span className="hidden sm:inline">Buy Pass</span>
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden border-indigo-200 text-indigo-700 sm:inline-flex dark:text-indigo-300"
                                asChild
                            >
                                <Link href={route('student.doubts')} className="relative">
                                    <CircleHelp className="size-4" /> Ask Doubt
                                    {doubtsUnread > 0 && (
                                        <span
                                            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-red-500"
                                            aria-label="New answers to your doubts"
                                        />
                                    )}
                                </Link>
                            </Button>
                            <button
                                type="button"
                                aria-label="Notifications"
                                onClick={() => setComingSoon('Notifications')}
                                className="hover:bg-muted relative rounded-full p-2"
                            >
                                <Bell className="size-5" />
                                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="hover:bg-muted flex items-center gap-2 rounded-lg p-1 pr-2 text-left">
                                    <span className="flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                                        {firstName.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="hidden leading-tight sm:block">
                                        <span className="block text-sm font-medium">{auth.user.name}</span>
                                        <span className="text-muted-foreground block text-[11px]">Student</span>
                                    </span>
                                    <ChevronDown className="text-muted-foreground size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60">
                                    <DropdownMenuLabel className="font-normal">
                                        <span className="block font-medium">{auth.user.name}</span>
                                        <span className="text-muted-foreground block truncate text-xs">{auth.user.email}</span>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {accountLinks.map(({ title, icon: Icon }) => (
                                        <DropdownMenuItem key={title} className={menuItemClass} onSelect={() => setComingSoon(title)}>
                                            <Icon /> {title}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="cursor-pointer rounded-md bg-red-600 text-white focus:bg-red-700 focus:text-white [&_svg]:text-white"
                                        onSelect={() => setConfirmLogout(true)}
                                    >
                                        <LogOut /> Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                <div className="flex">
                    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r bg-white p-4 lg:block dark:bg-slate-950">
                        <SidebarNav />
                    </aside>
                    <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
                </div>
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" className="w-72 overflow-y-auto p-4">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <div className="pt-8">
                        <SidebarNav onNavigate={() => setMenuOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="items-center text-center sm:text-center">
                        <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                            <LogOut className="size-6" />
                        </span>
                        <DialogTitle>Are you sure you want to log out?</DialogTitle>
                        <DialogDescription>You'll need to log in again to continue practising.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setConfirmLogout(false)}>
                            No
                        </Button>
                        <Button className="bg-red-600 text-white hover:bg-red-700" asChild>
                            <Link method="post" href={route('logout')} as="button">
                                Yes, log out
                            </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={comingSoon !== null} onOpenChange={(open) => !open && setComingSoon(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="items-center text-center sm:text-center">
                        <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                            <Sparkles className="size-6" />
                        </span>
                        <DialogTitle>{comingSoon} is coming soon</DialogTitle>
                        <DialogDescription>We're building this right now. It will be available here shortly.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setComingSoon(null)}>
                            Got it
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
