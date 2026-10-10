import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';

const targets: Record<string, string> = {
    login: 'student login',
    register: 'sign up',
    'admin.login': 'admin login',
};

export default function AlreadySignedIn({ dashboardUrl, next }: { dashboardUrl: string; next: string }) {
    const { auth } = usePage<SharedData>().props;
    const target = targets[next] ?? 'login';

    return (
        <>
            <Head title="Already signed in" />
            <div className="bg-background min-h-svh" />

            {/* Dismissing the popup keeps the current session and returns to the dashboard. */}
            <Dialog open onOpenChange={(open) => !open && router.visit(dashboardUrl)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>You're already signed in</DialogTitle>
                        <DialogDescription>
                            You're signed in as <span className="text-foreground font-medium">{auth.user.name}</span> ({auth.user.role_label},{' '}
                            {auth.user.email}). Log out to use the {target} page with a different account.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => router.visit(dashboardUrl)}>
                            Stay signed in
                        </Button>
                        <Button onClick={() => router.post(route('logout'), { next })}>Log out &amp; continue</Button>
                    </DialogFooter>
                    <p className="text-muted-foreground text-xs">
                        Tip: to use a student and an admin account at the same time, open one in a private window.
                    </p>
                </DialogContent>
            </Dialog>
        </>
    );
}
