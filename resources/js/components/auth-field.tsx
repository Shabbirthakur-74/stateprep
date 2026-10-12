import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

/**
 * A labelled input for the login and sign-up forms. The error under it comes from the browser checks first, then
 * from the server (e.g. "These credentials do not match"), and is linked to the input for screen readers.
 */
export function AuthField({
    id,
    label,
    error,
    className,
    ...input
}: { id: string; label: string; error?: string } & Omit<ComponentProps<typeof Input>, 'id'>) {
    const errorId = `${id}-error`;

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(error && 'border-red-500 focus-visible:ring-red-500/30', className)}
                {...input}
            />
            <InputError id={errorId} message={error} />
        </div>
    );
}
