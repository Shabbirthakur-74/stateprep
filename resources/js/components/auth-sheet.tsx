import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

export type AuthSheetMode = 'login' | 'register';

interface Props {
    mode: AuthSheetMode | null;
    onModeChange: (mode: AuthSheetMode | null) => void;
    /** Shown above the login/sign-up form, e.g. why the visitor was asked to log in. */
    notice?: string | null;
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '', remember: false as boolean });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { preserveState: 'errors', preserveScroll: true, onFinish: () => reset('password') });
    };

    return (
        <form className="grid gap-5" onSubmit={submit}>
            <div className="grid gap-2">
                <Label htmlFor="sheet-email">Email address</Label>
                <Input
                    id="sheet-email"
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
                <Label htmlFor="sheet-password">Password</Label>
                <Input
                    id="sheet-password"
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
                <Checkbox id="sheet-remember" checked={data.remember} onCheckedChange={(checked) => setData('remember', checked === true)} />
                <Label htmlFor="sheet-remember">Remember me</Label>
            </div>
            <Button type="submit" className="w-full" disabled={processing}>
                {processing && <LoaderCircle className="size-4 animate-spin" />}
                Log in
            </Button>
            <p className="text-muted-foreground text-center text-sm">
                Don't have an account?{' '}
                <button type="button" className="text-foreground underline underline-offset-4" onClick={onSwitch}>
                    Sign up
                </button>
            </p>
        </form>
    );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), { preserveState: 'errors', preserveScroll: true, onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <form className="grid gap-5" onSubmit={submit}>
            <div className="grid gap-2">
                <Label htmlFor="sheet-name">Name</Label>
                <Input
                    id="sheet-name"
                    required
                    autoFocus
                    autoComplete="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Full name"
                />
                <InputError message={errors.name} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="sheet-reg-email">Email address</Label>
                <Input
                    id="sheet-reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="email@example.com"
                />
                <InputError message={errors.email} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="sheet-reg-password">Password</Label>
                <Input
                    id="sheet-reg-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Password"
                />
                <InputError message={errors.password} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="sheet-reg-confirm">Confirm password</Label>
                <Input
                    id="sheet-reg-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    placeholder="Confirm password"
                />
                <InputError message={errors.password_confirmation} />
            </div>
            <Button type="submit" className="w-full" disabled={processing}>
                {processing && <LoaderCircle className="size-4 animate-spin" />}
                Create account
            </Button>
            <p className="text-muted-foreground text-center text-sm">
                Already have an account?{' '}
                <button type="button" className="text-foreground underline underline-offset-4" onClick={onSwitch}>
                    Log in
                </button>
            </p>
        </form>
    );
}

const copy: Record<AuthSheetMode, { title: string; description: string }> = {
    login: { title: 'Log in to your account', description: 'Enter your email and password to continue.' },
    register: { title: 'Create a free account', description: 'Sign up to attempt quizzes and mock tests.' },
};

/**
 * Right-hand sidebar holding the login and sign-up forms on the home page.
 */
export function AuthSheet({ mode, onModeChange, notice }: Props) {
    return (
        <Sheet open={mode !== null} onOpenChange={(open) => !open && onModeChange(null)}>
            <SheetContent className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
                {mode && (
                    <>
                        <SheetHeader>
                            <SheetTitle>{copy[mode].title}</SheetTitle>
                            <SheetDescription>{copy[mode].description}</SheetDescription>
                        </SheetHeader>

                        {notice && <p className="bg-muted rounded-md px-3 py-2 text-sm">{notice}</p>}

                        {mode === 'login' && <LoginForm onSwitch={() => onModeChange('register')} />}
                        {mode === 'register' && <RegisterForm onSwitch={() => onModeChange('login')} />}
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
