import { Cover, Pill, shortName } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import { useComingSoon } from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { Bookmark, BookmarkCheck, BookOpen, BookOpenText, Lock } from 'lucide-react';
import { useState } from 'react';

/** A study material card, as sent by StudentCatalog::material(). */
export interface Material {
    id: number;
    title: string;
    description: string | null;
    exam: { id: number; name: string } | null;
    cover_url: string | null;
    format: string;
    is_free: boolean;
    price: number | null;
    saved: boolean;
    saved_at?: string | null;
}

/**
 * Saves the material to My Library, or removes it.
 */
export function SaveButton({
    material,
    compact = false,
    className,
}: {
    material: Pick<Material, 'id' | 'title' | 'saved'>;
    compact?: boolean;
    className?: string;
}) {
    const [busy, setBusy] = useState(false);
    const label = material.saved ? 'Saved' : 'Save';

    const toggle = () => {
        const options = { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) };
        if (material.saved) {
            router.delete(route('student.study-material.unsave', material.id), options);
        } else {
            router.post(route('student.study-material.save', material.id), {}, options);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size={compact ? 'icon' : 'default'}
            disabled={busy}
            onClick={toggle}
            aria-pressed={material.saved}
            aria-label={material.saved ? `Remove "${material.title}" from My Library` : `Save "${material.title}" to My Library`}
            title={material.saved ? 'Remove from My Library' : 'Save to My Library'}
            className={cn(
                material.saved &&
                    'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300',
                className,
            )}
        >
            {material.saved ? <BookmarkCheck /> : <Bookmark />}
            {!compact && label}
        </Button>
    );
}

function ReadButton({ material, className }: { material: Material; className?: string }) {
    const comingSoon = useComingSoon();

    return material.is_free ? (
        <Button className={cn('bg-indigo-600 hover:bg-indigo-700', className)} asChild>
            <Link href={route('student.study-material.show', material.id)}>
                <BookOpen /> Read
            </Link>
        </Button>
    ) : (
        <Button variant="outline" className={className} onClick={() => comingSoon('Paid study material')}>
            <Lock /> Unlock · ₹{material.price}
        </Button>
    );
}

function Tags({ material }: { material: Material }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Pill tone="violet">{material.format}</Pill>
            {material.exam && <Pill tone="slate">{shortName(material.exam.name)}</Pill>}
            {material.is_free ? (
                <Pill tone="green">FREE</Pill>
            ) : (
                <Pill tone="amber">
                    <Lock className="size-3" /> ₹{material.price}
                </Pill>
            )}
        </div>
    );
}

const savedOn = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function MaterialCard({ material, layout = 'grid' }: { material: Material; layout?: 'grid' | 'list' }) {
    if (layout === 'list') {
        return (
            <article className="bg-card flex items-center gap-4 rounded-2xl border p-3 shadow-sm">
                <Cover url={material.cover_url} icon={BookOpenText} className="hidden aspect-video w-32 shrink-0 rounded-lg sm:flex" />
                <div className="min-w-0 flex-1">
                    <Tags material={material} />
                    <h3 className="mt-1.5 truncate font-semibold">{material.title}</h3>
                    {material.saved_at && <p className="text-muted-foreground text-xs">Saved {savedOn(material.saved_at)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <SaveButton material={material} compact />
                    <ReadButton material={material} />
                </div>
            </article>
        );
    }

    return (
        <article className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm">
            <Cover url={material.cover_url} icon={BookOpenText} className="aspect-video w-full" />
            <div className="flex flex-1 flex-col p-5">
                <Tags material={material} />
                <h3 className="font-display mt-3 text-lg font-semibold">{material.title}</h3>
                {material.description && <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">{material.description}</p>}
                {material.saved_at && <p className="text-muted-foreground mt-2 text-xs">Saved {savedOn(material.saved_at)}</p>}
                <div className="mt-auto flex gap-2 pt-5">
                    <ReadButton material={material} className="flex-1" />
                    <SaveButton material={material} compact />
                </div>
            </div>
        </article>
    );
}
