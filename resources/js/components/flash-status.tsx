import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function FlashStatus() {
    const { flash } = usePage<SharedData>().props;

    if (!flash.status) return null;

    return (
        <div className="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-2 text-sm text-green-700 dark:text-green-400">
            {flash.status}
        </div>
    );
}
