import { FlashStatus } from '@/components/flash-status';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';

export function AdminHeader({
    title,
    description,
    createHref,
    createLabel,
}: {
    title: string;
    description: string;
    createHref?: string;
    createLabel?: string;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {createHref && (
                <Button asChild>
                    <Link href={createHref}>
                        <Plus /> {createLabel}
                    </Link>
                </Button>
            )}
        </div>
    );
}

export function AdminPage({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <FlashStatus />
            {children}
        </div>
    );
}

/** Small cover preview used in admin lists. */
export function CoverThumb({ url }: { url: string | null }) {
    return url ? (
        <img src={url} alt="" className="h-12 w-20 shrink-0 rounded-md border object-cover" />
    ) : (
        <div className="bg-muted text-muted-foreground flex h-12 w-20 shrink-0 items-center justify-center rounded-md border">
            <ImagePlus className="size-4" />
        </div>
    );
}

export function RowActions({
    editHref,
    deleteHref,
    name,
    confirmText,
}: {
    editHref?: string;
    deleteHref?: string;
    name: string;
    /** Extra warning shown in the delete confirmation, e.g. what else is deleted with it. */
    confirmText?: string;
}) {
    const destroy = () =>
        deleteHref &&
        confirm(`Delete “${name}”?${confirmText ? ` ${confirmText}` : ''} This cannot be undone.`) &&
        router.delete(deleteHref, { preserveScroll: true });

    return (
        <div className="flex shrink-0 gap-1">
            {editHref && (
                <Button size="icon" variant="ghost" aria-label={`Edit ${name}`} asChild>
                    <Link href={editHref}>
                        <Pencil />
                    </Link>
                </Button>
            )}
            {deleteHref && (
                <Button size="icon" variant="ghost" aria-label={`Delete ${name}`} onClick={destroy} className="text-red-600 hover:text-red-700">
                    <Trash2 />
                </Button>
            )}
        </div>
    );
}

/** Previous / next links for a Laravel paginator. */
export function Pagination({ links }: { links: { url: string | null; label: string; active: boolean }[] }) {
    if (links.length <= 3) return null;

    return (
        <nav className="flex flex-wrap gap-1" aria-label="Pages">
            {links.map((link, index) => (
                <Button key={index} size="sm" variant={link.active ? 'default' : 'outline'} disabled={!link.url} asChild={!!link.url}>
                    {link.url ? (
                        <Link href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                    ) : (
                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                    )}
                </Button>
            ))}
        </nav>
    );
}

export function Field({
    label,
    error,
    htmlFor,
    hint,
    children,
    className,
}: {
    label: string;
    error?: string;
    htmlFor?: string;
    hint?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}

/**
 * Cover photo picker with a live preview. Shows the current cover, lets the admin replace it or remove it.
 */
export function CoverField({
    currentUrl,
    file,
    remove,
    onFile,
    onRemove,
    error,
}: {
    currentUrl: string | null;
    file: File | null;
    remove: boolean;
    onFile: (file: File | null) => void;
    onRemove: (remove: boolean) => void;
    error?: string;
}) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return setPreview(null);
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview ?? (remove ? null : currentUrl);

    return (
        <Field label="Cover image" error={error} htmlFor="cover" hint="JPG, PNG or WebP, up to 4 MB. A wide image (16:9) works best.">
            <div className="flex flex-wrap items-start gap-4">
                {shown ? (
                    <img src={shown} alt="Cover preview" className="aspect-video w-56 rounded-lg border object-cover" />
                ) : (
                    <div className="bg-muted text-muted-foreground flex aspect-video w-56 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
                        <ImagePlus className="size-6" /> No cover
                    </div>
                )}
                <div className="grid gap-3">
                    <Input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                    {currentUrl && !file && (
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={remove} onCheckedChange={(checked) => onRemove(checked === true)} /> Remove current cover
                        </label>
                    )}
                </div>
            </div>
        </Field>
    );
}

/** Free / paid choice with the price box, plus the published switch. */
export function PricingFields({
    isFree,
    price,
    isPublished,
    onChange,
    errors,
}: {
    isFree: boolean;
    price: string;
    isPublished: boolean;
    onChange: (field: 'is_free' | 'price' | 'is_published', value: boolean | string) => void;
    errors: Partial<Record<string, string>>;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Access" error={errors.is_free}>
                <div className="flex rounded-md border p-0.5">
                    {[true, false].map((free) => (
                        <button
                            key={String(free)}
                            type="button"
                            onClick={() => onChange('is_free', free)}
                            className={cn(
                                'flex-1 rounded px-3 py-1.5 text-sm',
                                isFree === free ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                            )}
                        >
                            {free ? 'Free' : 'Paid'}
                        </button>
                    ))}
                </div>
            </Field>
            {!isFree && (
                <Field label="Price (₹)" htmlFor="price" error={errors.price}>
                    <Input id="price" type="number" min={1} step="1" value={price} onChange={(e) => onChange('price', e.target.value)} />
                </Field>
            )}
            <Field label="Visibility" error={errors.is_published}>
                <label className="flex h-9 items-center gap-2 text-sm">
                    <Checkbox checked={isPublished} onCheckedChange={(checked) => onChange('is_published', checked === true)} /> Published (students
                    can see it)
                </label>
            </Field>
        </div>
    );
}

export function StatusPill({ published }: { published: boolean }) {
    return (
        <span
            className={cn(
                'rounded px-2 py-0.5 text-[11px] font-semibold',
                published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
            )}
        >
            {published ? 'Published' : 'Draft'}
        </span>
    );
}
