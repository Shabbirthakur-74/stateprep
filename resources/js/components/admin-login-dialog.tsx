import { AuthField } from '@/components/auth-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { emailError, normalizeEmail, passwordError, useClientValidation } from '@/lib/auth-validation';
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
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });
    const { errorFor, touch, check } = useClientValidation(
        { email: emailError(data.email), password: passwordError(data.password) },
        { email: 'admin-email', password: 'admin-password' },
    );

    const change = (field: 'email' | 'password', value: string) => {
        setData(field, value);
        clearErrors(field);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!check()) return;
        transform((d) => ({ ...d, email: normalizeEmail(d.email) }));
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

                <form className="grid gap-5" onSubmit={submit} noValidate>
                    <AuthField
                        id="admin-email"
                        label="Email address"
                        type="email"
                        inputMode="email"
                        autoFocus
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => change('email', e.target.value)}
                        onBlur={() => touch('email')}
                        placeholder="email@example.com"
                        error={errorFor('email') ?? errors.email}
                    />
                    <AuthField
                        id="admin-password"
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => change('password', e.target.value)}
                        onBlur={() => touch('password')}
                        placeholder="Password"
                        error={errorFor('password') ?? errors.password}
                    />
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
