import { Cover, Pill, shortName, type Paper } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import { useComingSoon } from '@/layouts/student-layout';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Bookmark, ClipboardList, FileStack, Lock, Timer } from 'lucide-react';

/**
 * One mock test or previous year paper, with its pattern and price. Free ones start straight away; paid ones open once payments are live.
 */
export function PaperCard({ paper, kind, className }: { paper: Paper; kind: 'mock' | 'pyq'; className?: string }) {
    const comingSoon = useComingSoon();

    const start = () => {
        if (!paper.is_free) return comingSoon('Paid tests');
        if (confirm(`Start "${paper.title}"? The ${paper.duration_minutes}-minute timer begins straight away and keeps running if you leave.`)) {
            router.post(route('student.tests.start', paper.id));
        }
    };
    const Icon = kind === 'pyq' ? FileStack : ClipboardList;

    return (
        <article className={cn('bg-card flex gap-4 rounded-2xl border p-5 shadow-sm', className)}>
            <Cover url={paper.cover_url} icon={Icon} className="size-20 shrink-0 rounded-xl sm:size-24" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="slate">{shortName(paper.exam.name)}</Pill>
                    {paper.year && <Pill tone="violet">{paper.year}</Pill>}
                    {paper.is_free ? (
                        <Pill tone="green">FREE</Pill>
                    ) : (
                        <Pill tone="amber">
                            <Lock className="size-3" /> ₹{paper.price}
                        </Pill>
                    )}
                </div>
                <h3 className="font-display mt-2 font-semibold">{paper.title}</h3>
                <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span>{paper.questions_count} Questions</span>
                    <span>{paper.total_marks} Marks</span>
                    <span className="inline-flex items-center gap-1">
                        <Timer className="size-3.5" /> {paper.duration_minutes} Minutes
                    </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                    +{paper.marks_per_question} correct{paper.negative_marks ? ` / −${paper.negative_marks} wrong` : ', no negative marking'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={start}>
                        {paper.is_free ? (kind === 'pyq' ? 'Practice Paper' : 'Start Test') : 'Unlock Access'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => comingSoon('Saving to My Library')}>
                        <Bookmark className="size-4" /> Save
                    </Button>
                </div>
            </div>
        </article>
    );
}
