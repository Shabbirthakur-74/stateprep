import { AdminLoginDialog } from '@/components/admin-login-dialog';
import AppLogoIcon from '@/components/app-logo-icon';
import { AuthSheet, type AuthSheetMode } from '@/components/auth-sheet';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

/** Props every public page receives from the server for its login / sign-up sidebar. */
export interface PublicPageProps {
    /** Opens the login or sign-up sidebar, or the admin popup, on arrival (e.g. after being sent to /login). */
    authPrompt?: 'login' | 'register' | 'admin' | null;
}

interface PublicContext {
    openSheet: (mode: AuthSheetMode, notice?: string | null) => void;
    /** For "start" buttons: asks a guest to sign up, and sends a signed-in user to their dashboard. */
    getStarted: () => void;
}

const Context = createContext<PublicContext | null>(null);

/** Sections of the home page linked from the header. */
const navLinks = [
    { label: 'Home', hash: '' },
    { label: 'Exams', hash: '#exams' },
    { label: 'Quizzes', hash: '#tests' },
    { label: 'About', hash: '#about' },
];

const contact = [
    { label: 'Email', value: 'contact@stateprep360.com', href: 'mailto:contact@stateprep360.com' },
    { label: 'Phone', value: '+917018157169', href: 'tel:+917018157169' },
    { label: 'Address', value: 'Bir, Kangra, Himachal Pradesh - 176077' },
    { label: 'Support Hours', value: 'Mon-Sat, 9:00 AM - 7:00 PM' },
];

function Brand({ name }: { name: string }) {
    return (
        <Link href={route('home')} className="flex items-center gap-3 justify-self-start">
            <AppLogoIcon className="size-11 border p-1" />
            <span className="leading-tight">
                <span className="font-display block text-lg font-bold">{name}</span>
                <span className="text-muted-foreground block text-xs">Your Exam Success Partner</span>
            </span>
        </Link>
    );
}

export function usePublicPage(): PublicContext {
    const context = useContext(Context);
    if (!context) throw new Error('usePublicPage must be used inside PublicLayout');
    return context;
}

/**
 * Header, footer, the login / sign-up sidebar and the admin sign-in popup of the public pages.
 */
export default function PublicLayout({ children, authPrompt = null }: PublicPageProps & { children: ReactNode }) {
    const { auth, name, flash, errors } = usePage<SharedData & { errors: Record<string, string> }>().props;
    const isStaff = !!auth.user && auth.user.role !== 'student';
    const accountUrl = auth.user ? (isStaff ? route('admin.dashboard') : route('student.dashboard')) : null;

    // A message that came with the redirect to /login, e.g. a failed login.
    const arrivalNotice = authPrompt ? (errors?.email ?? flash.status ?? null) : null;

    const [sheet, setSheet] = useState<AuthSheetMode | null>(authPrompt === 'login' || authPrompt === 'register' ? authPrompt : null);
    const [notice, setNotice] = useState<string | null>(authPrompt === 'admin' ? null : arrivalNotice);
    const [adminOpen, setAdminOpen] = useState(authPrompt === 'admin');

    const openSheet = (mode: AuthSheetMode, message: string | null = null) => {
        setNotice(message);
        setSheet(mode);
    };

    const getStarted = () =>
        accountUrl
            ? router.visit(accountUrl)
            : openSheet('register', 'Create a free account to start practising mock tests, quizzes and study material.');

    // The blue public palette also has to reach dialogs and sidebars, which render in portals under <body>.
    useEffect(() => {
        document.body.classList.add('public-theme');
        return () => document.body.classList.remove('public-theme');
    }, []);

    const homeUrl = route('home');

    return (
        <Context.Provider value={{ openSheet, getStarted }}>
            <div className="public-theme bg-background text-foreground flex min-h-screen flex-col">
                <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
                    {/* Logo, links and buttons in three columns, so the links sit in the true centre. */}
                    <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:grid md:h-20 md:grid-cols-[1fr_auto_1fr] lg:px-6">
                        <Brand name={name} />
                        <nav className="hidden items-center gap-9 text-sm font-medium md:flex" aria-label="Main">
                            {navLinks.map(({ label, hash }) => (
                                <a
                                    key={label}
                                    href={homeUrl + hash}
                                    className={
                                        hash === '' && route().current('home')
                                            ? 'text-primary border-primary border-b-2 py-1.5'
                                            : 'hover:text-primary border-b-2 border-transparent py-1.5'
                                    }
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>
                        <div className="ml-auto flex items-center gap-2.5 md:ml-0 md:justify-self-end">
                            {accountUrl ? (
                                <Button className="rounded-lg px-5" asChild>
                                    <Link href={accountUrl}>{isStaff ? 'Admin dashboard' : 'My dashboard'}</Link>
                                </Button>
                            ) : (
                                <>
                                    <Button variant="outline" className="rounded-lg px-4 sm:px-6" onClick={() => openSheet('login')}>
                                        Login
                                    </Button>
                                    <Button className="rounded-lg px-4 sm:px-6" onClick={() => openSheet('register')}>
                                        Get Started
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1">{children}</main>

                <footer className="border-t">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.2fr] lg:px-6">
                        <div>
                            <Brand name={name} />
                            <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-relaxed">
                                Himachal Pradesh's dedicated mock test and state examination preparation portal for various exams including HP TET,
                                HPPSC, Patwari, Police Constable, and state commission exams.
                            </p>
                        </div>
                        <nav aria-label="Quick links">
                            <h2 className="text-xs font-semibold tracking-wider uppercase">Quick Links</h2>
                            <ul className="text-muted-foreground mt-4 space-y-3 text-sm">
                                <li>
                                    <a href={homeUrl} className="hover:text-primary">
                                        Home
                                    </a>
                                </li>
                                <li>
                                    <a href={`${homeUrl}#exams`} className="hover:text-primary">
                                        Popular Exams
                                    </a>
                                </li>
                                <li>
                                    <a href={`${homeUrl}#tests`} className="hover:text-primary">
                                        Mock Test Series
                                    </a>
                                </li>
                                <li>
                                    <a href={`${homeUrl}#about`} className="hover:text-primary">
                                        Why Choose {name}
                                    </a>
                                </li>
                            </ul>
                        </nav>
                        <div>
                            <h2 className="text-xs font-semibold tracking-wider uppercase">Contact &amp; Support</h2>
                            <dl className="mt-4 space-y-3 text-sm">
                                {contact.map(({ label, value, href }) => (
                                    <div key={label} className="flex flex-wrap gap-x-2">
                                        <dt className="font-medium">{label}:</dt>
                                        <dd className="text-muted-foreground">
                                            {href ? (
                                                <a href={href} className="text-primary hover:underline">
                                                    {value}
                                                </a>
                                            ) : (
                                                value
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t px-4 py-6 text-xs lg:px-6">
                        <p className="text-muted-foreground">
                            © {new Date().getFullYear()} {name} Edu Solutions. All rights reserved
                        </p>
                        <nav className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Legal">
                            <Link href={route('user-policy')} className="hover:text-foreground">
                                User Policy
                            </Link>
                            <Link href={route('terms')} className="hover:text-foreground">
                                Terms
                            </Link>
                            <Link href={route('privacy')} className="hover:text-foreground">
                                Privacy
                            </Link>
                            {!auth.user && (
                                <button type="button" onClick={() => setAdminOpen(true)} className="hover:text-foreground">
                                    Admin Login
                                </button>
                            )}
                        </nav>
                    </div>
                </footer>
            </div>

            <AuthSheet mode={sheet} onModeChange={setSheet} notice={notice} />
            {!auth.user && (
                <AdminLoginDialog
                    open={adminOpen}
                    onOpenChange={setAdminOpen}
                    notice={authPrompt === 'admin' ? arrivalNotice : null}
                    onStudentLogin={() => {
                        setAdminOpen(false);
                        openSheet('login');
                    }}
                />
            )}
        </Context.Provider>
    );
}
