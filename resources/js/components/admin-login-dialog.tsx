import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Opens the student login sidebar instead. */
    onStudentLogin: () => void;
    notice?: string | null;
}

/**
 * Admin sign-in, shown as a popup over the public pages. Administrator accounts only.
 */
export function AdminLoginDialog({ open, onOpenChange, onStudentLogin, notice }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '', remember: false as boolean });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.login'), { preserveState: 'errors', preserveScroll: true, onFinish: () => reset('password') });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="items-center text-center sm:text-center">
                    <div className="bg-muted mb-1 flex size-11 items-center justify-center rounded-lg">
                        <ShieldCheck className="size-5" />
                    </div>
                    <DialogTitle>Admin sign in</DialogTitle>
                    <DialogDescription>Restricted area. Administrator accounts only.</DialogDescription>
                </DialogHeader>

                {notice && <p className="bg-muted rounded-md px-3 py-2 text-sm">{notice}</p>}

                <form className="grid gap-5" onSubmit={submit}>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-email">Email address</Label>
                        <Input
                            id="admin-email"
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-password">Password</Label>
                        <Input
                            id="admin-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Checkbox id="admin-remember" checked={data.remember} onCheckedChange={(checked) => setData('remember', checked === true)} />
                        <Label htmlFor="admin-remember">Remember me</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Log in
                    </Button>
                    <p className="text-muted-foreground text-center text-sm">
                        Not an administrator?{' '}
                        <button type="button" className="text-foreground underline underline-offset-4" onClick={onStudentLogin}>
                            Student log in
                        </button>
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
}
