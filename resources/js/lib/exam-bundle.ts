import { BookOpenText, ClipboardList, FileStack, Layers, ListChecks, Zap, type LucideIcon } from 'lucide-react';

/** An exam as shown on its public page and at checkout, from PublicCatalog::examPage(). */
export interface ExamDetails {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    overview: string | null;
    cover_url: string | null;
    facts: { label: string; value: string }[];
    highlights: string[];
    faqs: { question: string; answer: string }[];
    is_free: boolean;
    price: number | null;
    original_price: number | null;
    validity_months: number | null;
    for_sale: boolean;
}

/** How much published content the exam has. */
export interface ExamCounts {
    mocks: number;
    pyqs: number;
    series: number;
    materials: number;
    quizzes: number;
    subjects: number;
    topics: number;
    questions: number;
}

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const plural = (n: number, word: string, many = `${word}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? word : many}`;

/** Percentage saved against the original price, or 0. */
export const discountPercent = (exam: Pick<ExamDetails, 'price' | 'original_price'>) =>
    exam.price && exam.original_price && exam.original_price > exam.price ? Math.round((1 - exam.price / exam.original_price) * 100) : 0;

/** What buying the exam unlocks, counted from the published content. Empty kinds are left out. */
export function includedItems(counts: ExamCounts): { icon: LucideIcon; label: string }[] {
    return [
        { icon: Layers, label: plural(counts.series, 'test series'), n: counts.series },
        { icon: ClipboardList, label: plural(counts.mocks, 'full mock test'), n: counts.mocks },
        { icon: FileStack, label: plural(counts.pyqs, 'previous year paper'), n: counts.pyqs },
        { icon: BookOpenText, label: plural(counts.materials, 'study material'), n: counts.materials },
        { icon: Zap, label: plural(counts.quizzes, 'quiz', 'quizzes'), n: counts.quizzes },
        {
            icon: ListChecks,
            label: `${plural(counts.questions, 'practice question')} across ${plural(counts.subjects, 'subject')}`,
            n: counts.questions,
        },
    ]
        .filter((item) => item.n > 0)
        .map(({ icon, label }) => ({ icon, label }));
}
