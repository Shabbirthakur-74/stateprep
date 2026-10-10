import { MaterialCard, type Material } from '@/components/material-card';
import { EmptyState, Eyebrow, MiniStat, PageHeading } from '@/components/student-kit';
import StudentLayout from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { BookOpenText, Search } from 'lucide-react';
import { useState } from 'react';

export default function StudyMaterial({ materials }: { materials: Material[] }) {
    const [search, setSearch] = useState('');
    const [savedOnly, setSavedOnly] = useState(false);
    const savedCount = materials.filter((m) => m.saved).length;
    const visible = materials.filter((m) => m.title.toLowerCase().includes(search.trim().toLowerCase()) && (!savedOnly || m.saved));

    return (
        <StudentLayout title="Study Material">
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={BookOpenText}>Learn &amp; Study • Notes</Eyebrow>}
                    title="Study Material"
                    description="Notes, PDFs and revision summaries for your exams. Read them right here, and save the ones you want to My Library."
                    aside={
                        <div className="flex flex-wrap gap-3">
                            <MiniStat label="Materials" value={String(materials.length)} hint="Available now" />
                            <MiniStat label="Free" value={String(materials.filter((m) => m.is_free).length)} hint="Read any time" />
                            <MiniStat label="Saved" value={String(savedCount)} hint="In My Library" />
                        </div>
                    }
                />
                <div className="flex flex-wrap items-center gap-3">
                    <label className="bg-card flex max-w-md flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                        <Search className="text-muted-foreground size-4" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search study material..."
                            className="w-full bg-transparent outline-none"
                        />
                    </label>
                    <div className="bg-card flex rounded-lg border p-1 text-sm">
                        {[
                            { label: 'All', value: false, count: materials.length },
                            { label: 'Saved', value: true, count: savedCount },
                        ].map((tab) => (
                            <button
                                key={tab.label}
                                type="button"
                                aria-pressed={savedOnly === tab.value}
                                onClick={() => setSavedOnly(tab.value)}
                                className={cn(
                                    'rounded-md px-3 py-1',
                                    savedOnly === tab.value ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label} <span className="opacity-75">({tab.count})</span>
                            </button>
                        ))}
                    </div>
                </div>
                {visible.length === 0 ? (
                    <EmptyState
                        icon={BookOpenText}
                        title={
                            materials.length === 0
                                ? 'Study material is on its way'
                                : savedOnly && savedCount === 0
                                  ? 'Nothing saved yet'
                                  : 'Nothing matches'
                        }
                        description={
                            materials.length === 0
                                ? 'Notes and PDFs are being prepared. Check back soon.'
                                : savedOnly && savedCount === 0
                                  ? 'Tap the bookmark on any material to save it to My Library.'
                                  : 'Try another search term.'
                        }
                        className="bg-card"
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {visible.map((m) => (
                            <MaterialCard key={m.id} material={m} />
                        ))}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
