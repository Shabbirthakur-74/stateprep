import { EmptyState, Panel } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { plural, rupees } from '@/lib/exam-bundle';
import { passItems, passLength, type PassCounts, type PassPlan } from '@/lib/pass';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarClock, Check, Crown, GraduationCap, ShieldCheck } from 'lucide-react';

function PlanCard({ plan, best }: { plan: PassPlan; best: boolean }) {
    return (
        <article
            className={cn(
                'bg-card relative flex flex-col rounded-2xl border p-6 shadow-sm',
                best && 'border-amber-400 shadow-lg ring-2 ring-amber-400 dark:border-amber-500 dark:ring-amber-500',
            )}
        >
            {best && (
                <span className="absolute -top-3 left-6 rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Best value{plan.saving_percent > 0 && ` · Save ${plan.saving_percent}%`}
                </span>
            )}
            <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                <CalendarClock className="size-4" /> Access for {passLength(plan)}
            </p>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-4xl font-bold">{rupees(plan.price)}</span>
                <span className="text-muted-foreground text-sm">/ {plan.months === 1 ? 'month' : plural(plan.months, 'month')}</span>
                {plan.original_price && <span className="text-muted-foreground text-base line-through">{rupees(plan.original_price)}</span>}
            </div>
            <p className="text-muted-foreground mt-1 h-5 text-sm">{plan.months > 1 && `Works out to ${rupees(plan.per_month)} a month`}</p>
            <Button
                size="lg"
                className={cn(
                    'mt-6 h-12 w-full rounded-lg',
                    best
                        ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                        : 'bg-indigo-600 hover:bg-indigo-700',
                )}
                asChild
            >
                <Link href={route('student.pass.checkout', plan.id)}>
                    Get {plan.name.toLowerCase()} <ArrowRight />
                </Link>
            </Button>
        </article>
    );
}

/**
 * StatePrep360 Pass: a monthly or yearly pass to all paid content of every exam. Leads to the payment page.
 */
export default function Pass({ plans, counts }: { plans: PassPlan[]; counts: PassCounts }) {
    // The longest plan is highlighted when there is a choice.
    const best = plans.length > 1 ? plans.reduce((a, b) => (b.months > a.months ? b : a)).id : null;

    return (
        <StudentLayout title="StatePrep360 Pass">
            <div className="mx-auto max-w-5xl space-y-8">
                <section className="overflow-hidden rounded-2xl bg-linear-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white shadow-sm md:p-10">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                        <Crown className="size-4 text-amber-300" /> StatePrep360 Pass
                    </p>
                    <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-balance md:text-4xl">
                        One pass. Every exam. Everything unlocked.
                    </h1>
                    <p className="mt-3 max-w-2xl text-white/80">
                        Full access to all content on StatePrep360: every mock test, previous year paper, test series, study material and quiz across
                        all {plural(counts.exams, 'exam')} — instead of buying exams one by one.
                    </p>
                </section>

                {plans.length === 0 ? (
                    <EmptyState
                        icon={Crown}
                        title="Pass prices are being finalised"
                        description="Check back soon to get the StatePrep360 Pass."
                        className="bg-card"
                    />
                ) : (
                    <div className={cn('grid gap-6 pt-2', plans.length > 1 && 'md:grid-cols-2')}>
                        {plans.map((plan) => (
                            <PlanCard key={plan.id} plan={plan} best={plan.id === best} />
                        ))}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
                    <Panel>
                        <h2 className="font-display text-lg font-semibold">What's included</h2>
                        <p className="text-muted-foreground text-sm">Access to all the content on the website, free and paid.</p>
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                            {passItems(counts).map(({ icon: Icon, label }) => (
                                <li key={label} className="flex items-start gap-3 text-sm">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                        <Icon className="size-4" />
                                    </span>
                                    <span className="pt-1.5">{label}</span>
                                </li>
                            ))}
                        </ul>
                        <ul className="text-muted-foreground mt-6 space-y-2 border-t pt-4 text-sm">
                            <li className="flex gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Free quizzes and free tests stay free for everyone, with
                                or without a pass.
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Your scores and progress are kept when the pass ends.
                            </li>
                        </ul>
                    </Panel>
                    <aside className="space-y-4">
                        <Panel>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <GraduationCap className="size-4 text-indigo-600" /> Preparing for one exam?
                            </h2>
                            <p className="text-muted-foreground mt-2 text-sm">You can also buy a single exam bundle from its exam page.</p>
                            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                                <Link href={route('student.exams')}>Browse exams</Link>
                            </Button>
                        </Panel>
                        <p className="text-muted-foreground flex items-start gap-2 px-1 text-xs">
                            <ShieldCheck className="size-4 shrink-0" /> Secure payment by UPI, card, net banking or wallet.
                        </p>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
