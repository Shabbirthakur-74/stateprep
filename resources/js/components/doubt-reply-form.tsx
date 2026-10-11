import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { textareaClass } from '@/lib/form-styles';
import { useForm } from '@inertiajs/react';
import { ImagePlus, Send, X } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

/**
 * Picks one photo (JPG, PNG or WebP up to 4 MB) and shows a preview with a remove button.
 */
export function PhotoPicker({ file, onChange, error }: { file: File | null; onChange: (file: File | null) => void; error?: string }) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return setPreview(null);
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    return (
        <div className="grid gap-2">
            {preview ? (
                <div className="relative w-fit">
                    <img src={preview} alt="Photo to attach" className="max-h-40 rounded-lg border object-contain" />
                    <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => onChange(null)}
                        className="absolute -top-2 -right-2 rounded-full bg-slate-900 p-1 text-white shadow"
                    >
                        <X className="size-3" />
                    </button>
                </div>
            ) : (
                <label className="text-muted-foreground hover:text-foreground inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
                    <ImagePlus className="size-4" /> Attach a photo
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                    />
                </label>
            )}
            <InputError message={error} />
        </div>
    );
}

/**
 * The reply box under a doubt's conversation.
 */
export function DoubtReplyForm({ action, placeholder, submitLabel }: { action: string; placeholder: string; submitLabel: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({ body: '', photo: null as File | null });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(action, { forceFormData: true, preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            <textarea
                aria-label="Your reply"
                className={textareaClass}
                rows={4}
                placeholder={placeholder}
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
                required
            />
            <InputError message={errors.body} />
            <div className="flex flex-wrap items-start justify-between gap-3">
                <PhotoPicker file={data.photo} onChange={(file) => setData('photo', file)} error={errors.photo} />
                <Button type="submit" disabled={processing || !data.body.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                    <Send /> {submitLabel}
                </Button>
            </div>
        </form>
    );
}
