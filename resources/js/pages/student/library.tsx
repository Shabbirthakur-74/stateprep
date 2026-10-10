import { MaterialCard, type Material } from '@/components/material-card';
import { EmptyState, MiniStat, Panel, Pill, shortName } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout, { useComingSoon } from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    Bookmark,
    BookOpenText,
    ClipboardList,
    CloudDownload,
    FileStack,
    FileText,
    Flag,
    FolderOpen,
    House,
    LayoutGrid,
    Lightbulb,
    List,
    Plus,
    Search,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

const isPdf = (m: Material) => m.format === 'PDF';

// Saved study material splits into PDFs and other notes. Questions, PYQs and mock tests can't be saved yet.
const filters: { label: string; icon: typeof LayoutGrid; match: ((m: Material) => boolean) | null }[] = [
    { label: 'All', icon: LayoutGrid, match: () => true },
    { label: 'Study Notes', icon: BookOpenText, match: (m) => !isPdf(m) },
    { label: 'Bookmarked Questions', icon: Flag, match: null },
    { label: 'PYQs', icon: FileStack, match: null },
    { label: 'Mock Tests', icon: ClipboardList, match: null },
    { label: 'PDFs & Formulas', icon: FileText, match: isPdf },
];

export default function MyLibrary({ materials }: { materials: Material[] }) {
    const comingSoon = useComingSoon();
    const [filter, setFilter] = useState('All');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [exam, setExam] = useState('all');
    const [sort, setSort] = useState<'recent' | 'title'>('recent');

    const active = filters.find((f) => f.label === filter)!;
    const exams = [...new Map(materials.filter((m) => m.exam).map((m) => [String(m.exam!.id), m.exam!.name])).entries()];
    const visible = materials
        .filter((m) => (active.match ? active.match(m) : false))
        .filter((m) => exam === 'all' || String(m.exam?.id) === exam)
        .filter((m) => m.title.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : 0));
    const pdfs = materials.filter(isPdf).length;

    return (
        <StudentLayout title="My Library">
            <div className="mx-auto max-w-7xl space-y-6">
                <nav className="text-muted-foreground flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
                    <House className="size-3.5" />
                    <Link href={route('student.dashboard')} className="hover:text-foreground">
                        Home
                    </Link>
                    / <span className="text-foreground">My Library</span>
                    <Pill tone="violet" className="ml-1">
                        Personal Vault
                    </Pill>
                </nav>

                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="max-w-xl">
                        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">My Library</h1>
                        <p className="text-muted-foreground mt-3 text-sm">
                            Your centralised repository of saved study material, flagged test problems, formula guides and revision dossiers.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <MiniStat
                            label="Total Saved"
                            value={String(materials.length)}
                            hint={materials.length ? 'Ready to revise' : 'Nothing saved yet'}
                        />
                        <MiniStat label="Tricky MCQs" value="0" hint="Flag to revise" />
                        <MiniStat label="Revision PDFs" value={String(pdfs)} hint="Saved PDF notes" />
                        <MiniStat label="Offline Ready" value="0" hint="0 MB cached" />
                    </div>
                </div>

                <Panel className="space-y-4 p-4 md:p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                            <Search className="text-muted-foreground size-4" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search your saved notes and PDFs..."
                                className="w-full bg-transparent outline-none"
                            />
                        </label>
                        <select
                            value={exam}
                            onChange={(e) => setExam(e.target.value)}
                            aria-label="Target exam"
                            className="bg-background rounded-lg border px-3 py-2 text-sm"
                        >
                            <option value="all">Target: All Exams</option>
                            {exams.map(([id, name]) => (
                                <option key={id} value={id}>
                                    {shortName(name)}
                                </option>
                            ))}
                        </select>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as 'recent' | 'title')}
                            aria-label="Sort"
                            className="bg-background rounded-lg border px-3 py-2 text-sm"
                        >
                            <option value="recent">Sort: Recently Saved</option>
                            <option value="title">Sort: Title A–Z</option>
                        </select>
                        <div className="flex rounded-lg border p-1">
                            {(['grid', 'list'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    aria-label={`${mode} view`}
                                    aria-pressed={view === mode}
                                    onClick={() => setView(mode)}
                                    className={cn(
                                        'rounded-md p-1.5',
                                        view === mode ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15' : 'text-muted-foreground',
                                    )}
                                >
                                    {mode === 'grid' ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {filters.map(({ label, icon: Icon, match }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setFilter(label)}
                                className={cn(
                                    'inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                                    filter === label ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:border-indigo-300',
                                )}
                            >
                                <Icon className="size-4" /> {label}
                                <span className={cn('rounded px-1.5 text-[11px]', filter === label ? 'bg-white/20' : 'bg-muted')}>
                                    {match ? materials.filter(match).length : 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                    <div className="min-w-0">
                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <span className="size-2 rounded-full bg-indigo-600" /> Recently Saved &amp; Quick Pickups
                        </h2>
                        {materials.length === 0 ? (
                            <Panel>
                                <EmptyState
                                    icon={Bookmark}
                                    title="You haven't saved anything yet"
                                    description="Tap the bookmark on any study material to save it here for revision. Saving questions, PYQs and mock tests is coming soon."
                                    className="border-0 py-12"
                                >
                                    <Button variant="outline" asChild>
                                        <Link href={route('student.pyqs')}>
                                            <FileStack /> Browse PYQs
                                        </Link>
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href={route('student.quizzes')}>
                                            <Zap /> Try a quiz
                                        </Link>
                                    </Button>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                                        <Link href={route('student.study-material')}>
                                            <BookOpenText /> Browse study material
                                        </Link>
                                    </Button>
                                </EmptyState>
                            </Panel>
                        ) : visible.length === 0 ? (
                            <Panel>
                                <EmptyState
                                    icon={active.match ? Search : Bookmark}
                                    title={active.match ? 'Nothing matches' : `Saving ${filter.toLowerCase()} is coming soon`}
                                    description={
                                        active.match
                                            ? 'Try another search term, exam or filter.'
                                            : 'For now you can save study material. Questions, PYQs and mock tests will follow.'
                                    }
                                    className="border-0 py-12"
                                />
                            </Panel>
                        ) : view === 'grid' ? (
                            <div className="grid gap-5 sm:grid-cols-2">
                                {visible.map((m) => (
                                    <MaterialCard key={m.id} material={m} />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {visible.map((m) => (
                                    <MaterialCard key={m.id} material={m} layout="list" />
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="space-y-6">
                        <Panel>
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <FolderOpen className="size-4 text-indigo-600" /> My Collections
                                </h2>
                                <Pill tone="slate">0 Folders</Pill>
                            </div>
                            <p className="text-muted-foreground mt-3 text-sm">
                                Group your resources into revision packs for focused sprint sessions.
                            </p>
                            <Button variant="outline" className="mt-4 w-full border-dashed text-indigo-600" onClick={() => comingSoon('Collections')}>
                                <Plus /> Create New Collection
                            </Button>
                        </Panel>

                        <section className="bg-card rounded-2xl border border-l-4 border-l-rose-600 p-5 shadow-sm md:p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <Flag className="size-4 text-rose-600" /> Tricky MCQ Drill
                                </h2>
                                <Pill tone="red">0 Pending</Pill>
                            </div>
                            <p className="text-muted-foreground mt-3 text-sm">
                                Rapid-fire review of questions you flagged as difficult or answered incorrectly in mock exams.
                            </p>
                            <Button disabled className="mt-4 w-full bg-rose-600 hover:bg-rose-700">
                                <Zap /> Flag questions to start a drill
                            </Button>
                        </section>

                        <Panel>
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <CloudDownload className="size-4 text-emerald-600" /> Offline Storage
                                </h2>
                                <span className="text-muted-foreground text-xs">0 MB / 1 GB</span>
                            </div>
                            <p className="text-muted-foreground mt-3 text-sm">No PDFs cached for offline study yet.</p>
                        </Panel>

                        <section className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-500/10">
                            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                                <Lightbulb className="size-4" /> Fast Bookmarking Pro-Tip
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Tap the bookmark on any study material, or the Save button while reading it, to keep it here. Tap it again to remove
                                it.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
