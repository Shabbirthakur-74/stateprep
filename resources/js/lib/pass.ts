import { plural } from '@/lib/exam-bundle';
import { BookOpenText, ClipboardList, FileStack, GraduationCap, Layers, ListChecks, Sparkles, TrendingUp, Zap, type LucideIcon } from 'lucide-react';

/** A StatePrep360 Pass plan, from Setting::passPlans(). */
export interface PassPlan {
    id: 'monthly' | 'yearly';
    name: string;
    months: number;
    price: number;
    original_price: number | null;
    per_month: number;
    saving_percent: number;
}

/** Everything on the site the pass gives access to, from PublicCatalog::passCounts(). */
export interface PassCounts {
    exams: number;
    mocks: number;
    pyqs: number;
    series: number;
    materials: number;
    quizzes: number;
    questions: number;
    subjects: number;
    topics: number;
}

/** Everything the pass includes: all content on the site, free and paid. Empty kinds are left out. */
export function passItems(counts: PassCounts): { icon: LucideIcon; label: string }[] {
    return [
        { icon: GraduationCap, label: `All ${plural(counts.exams, 'exam bundle')} with everything inside them`, n: counts.exams },
        { icon: ClipboardList, label: `All ${plural(counts.mocks, 'mock test')}`, n: counts.mocks },
        { icon: FileStack, label: `All ${plural(counts.pyqs, 'previous year paper')}`, n: counts.pyqs },
        { icon: Layers, label: `All ${plural(counts.series, 'test series', 'test series')}`, n: counts.series },
        { icon: BookOpenText, label: `All ${plural(counts.materials, 'study material', 'study materials')} to read and save`, n: counts.materials },
        {
            icon: Zap,
            label: `All ${plural(counts.quizzes, 'ready-made quiz', 'ready-made quizzes')}, including exam bundle quizzes`,
            n: counts.quizzes,
        },
        {
            icon: ListChecks,
            label: `Unlimited topic quizzes from ${plural(counts.questions, 'question')} across ${plural(counts.subjects, 'subject')} and ${plural(counts.topics, 'topic')}`,
            n: counts.questions,
        },
        { icon: TrendingUp, label: 'Detailed solutions, scorecards and My Performance analysis', n: 1 },
        { icon: Sparkles, label: 'Everything new added while your pass is active', n: 1 },
    ]
        .filter((item) => item.n > 0)
        .map(({ icon, label }) => ({ icon, label }));
}

/** "1 month" / "12 months". */
export const passLength = (plan: PassPlan) => plural(plan.months, 'month');
