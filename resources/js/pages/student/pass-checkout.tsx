import { CheckoutLayout } from '@/components/checkout-layout';
import { passItems, passLength, type PassCounts, type PassPlan } from '@/lib/pass';
import { CalendarClock, Crown } from 'lucide-react';

/**
 * The payment page for a StatePrep360 Pass.
 */
export default function PassCheckout({ plan, counts }: { plan: PassPlan; counts: PassCounts }) {
    return (
        <CheckoutLayout
            pageTitle={`Buy ${plan.name}`}
            description="Check your order, choose how to pay, and get access to all the content on StatePrep360."
            back={{ href: route('student.pass'), label: 'Back to pass plans' }}
            kind="StatePrep360 Pass"
            name={plan.name}
            picture={
                <span className="flex aspect-video w-20 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-orange-500 text-white">
                    <Crown className="size-6" />
                </span>
            }
            included={[...passItems(counts), { icon: CalendarClock, label: `Access for ${passLength(plan)} from the day you pay` }]}
            price={plan.price}
            originalPrice={plan.original_price}
        />
    );
}
