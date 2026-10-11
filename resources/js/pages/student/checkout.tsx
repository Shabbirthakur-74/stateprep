import { CheckoutLayout } from '@/components/checkout-layout';
import { includedItems, plural, type ExamCounts, type ExamDetails } from '@/lib/exam-bundle';
import { CalendarClock, GraduationCap } from 'lucide-react';

/**
 * The payment page for an exam bundle.
 */
export default function Checkout({ exam, counts }: { exam: ExamDetails; counts: ExamCounts }) {
    return (
        <CheckoutLayout
            pageTitle={`Buy ${exam.name}`}
            description="Check your order, choose how to pay, and get instant access to everything in this exam."
            back={{ href: route('exams.show', exam.slug), label: 'Back to exam details' }}
            kind="Exam bundle"
            name={exam.name}
            picture={
                exam.cover_url ? (
                    <img src={exam.cover_url} alt="" className="aspect-video w-20 rounded-lg object-cover" />
                ) : (
                    <span className="flex aspect-video w-20 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15">
                        <GraduationCap className="size-6" />
                    </span>
                )
            }
            included={[
                ...includedItems(counts),
                ...(exam.validity_months ? [{ icon: CalendarClock, label: `Access for ${plural(exam.validity_months, 'month')}` }] : []),
            ]}
            price={exam.price ?? 0}
            originalPrice={exam.original_price}
        />
    );
}
