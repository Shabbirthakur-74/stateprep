import { AuthField } from '@/components/auth-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
    confirmationError,
    emailError,
    nameError,
    newPasswordError,
    normalizeEmail,
    passwordChecklist,
    passwordError,
    useClientValidation,
} from '@/lib/auth-validation';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { Check, Circle, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

export type AuthSheetMode = 'login' | 'register';

interface Props {
    mode: AuthSheetMode | null;
    onModeChange: (mode: AuthSheetMode | null) => void;
    /** Shown above the login/sign-up form, e.g. why the visitor was asked to log in. */
    notice?: string | null;
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });
    const { errorFor, touch, check } = useClientValidation(
        { email: emailError(data.email), password: passwordError(data.password) },
        { email: 'sheet-email', password: 'sheet-password' },
    );

    const change = (field: 'email' | 'password', value: string) => {
        setData(field, value);
        clearErrors(field);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!check()) return;
        transform((d) => ({ ...d, email: normalizeEmail(d.email) }));
        post(route('login'), { preserveState: 'errors', preserveScroll: true, onFinish: () => reset('password') });
    };

    return (
        <form className="grid gap-5" onSubmit={submit} noValidate>
            <AuthField
                id="sheet-email"
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
                id="sheet-password"
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

type RegisterField = 'name' | 'email' | 'password' | 'password_confirmation';

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const { errorFor, touch, check } = useClientValidation<RegisterField>(
        {
            name: nameError(data.name),
            email: emailError(data.email),
            password: newPasswordError(data.password),
            password_confirmation: confirmationError(data.password, data.password_confirmation),
        },
        { name: 'sheet-name', email: 'sheet-reg-email', password: 'sheet-reg-password', password_confirmation: 'sheet-reg-confirm' },
    );

    const change = (field: RegisterField, value: string) => {
        setData(field, value);
        clearErrors(field);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!check()) return;
        transform((d) => ({ ...d, name: d.name.trim().replace(/\s+/g, ' '), email: normalizeEmail(d.email) }));
        post(route('register'), { preserveState: 'errors', preserveScroll: true, onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <form className="grid gap-5" onSubmit={submit} noValidate>
            <AuthField
                id="sheet-name"
                label="Name"
                autoFocus
                autoComplete="name"
                value={data.name}
                onChange={(e) => change('name', e.target.value)}
                onBlur={() => touch('name')}
                placeholder="Full name"
                error={errorFor('name') ?? errors.name}
            />
            <AuthField
                id="sheet-reg-email"
                label="Email address"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={data.email}
                onChange={(e) => change('email', e.target.value)}
                onBlur={() => touch('email')}
                placeholder="email@example.com"
                error={errorFor('email') ?? errors.email}
            />
            <div className="grid gap-1.5">
                <AuthField
                    id="sheet-reg-password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={data.password}
                    onChange={(e) => change('password', e.target.value)}
                    onBlur={() => touch('password')}
                    placeholder="Password"
                    error={errorFor('password') ?? errors.password}
                />
                <ul className="grid gap-1 text-xs" aria-label="Password requirements">
                    {passwordChecklist(data.password).map(({ label, met }) => (
                        <li
                            key={label}
                            className={cn('flex items-center gap-1.5', met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}
                        >
                            {met ? <Check className="size-3.5" /> : <Circle className="size-3.5" />} {label}
                        </li>
                    ))}
                </ul>
            </div>
            <AuthField
                id="sheet-reg-confirm"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={data.password_confirmation}
                onChange={(e) => change('password_confirmation', e.target.value)}
                onBlur={() => touch('password_confirmation')}
                placeholder="Confirm password"
                error={errorFor('password_confirmation') ?? errors.password_confirmation}
            />
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
