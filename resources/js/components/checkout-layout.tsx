import { Eyebrow, PageHeading, Panel } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout, { useComingSoon } from '@/layouts/student-layout';
import { rupees } from '@/lib/exam-bundle';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Building2, CreditCard, Lock, ShieldCheck, Smartphone, Wallet, type LucideIcon } from 'lucide-react';
import { ReactNode, useState } from 'react';

const methods = [
    { id: 'upi', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm or any UPI app', icon: Smartphone },
    { id: 'card', label: 'Debit / Credit card', hint: 'Visa, Mastercard, RuPay', icon: CreditCard },
    { id: 'netbanking', label: 'Net banking', hint: 'All major Indian banks', icon: Building2 },
    { id: 'wallet', label: 'Wallets', hint: 'Paytm, Amazon Pay and more', icon: Wallet },
];

/**
 * The payment page shared by exam bundles and the pass: the student's details, a payment method, and the order
 * summary. Choosing a method works; the payment step itself is not connected yet.
 */
export function CheckoutLayout({
    pageTitle,
    description,
    back,
    kind,
    name,
    picture,
    included,
    price,
    originalPrice,
}: {
    pageTitle: string;
    description: string;
    back: { href: string; label: string };
    /** Small label above the name, e.g. "Exam bundle". */
    kind: string;
    name: string;
    /** Cover image or an icon panel for the order summary. */
    picture: ReactNode;
    included: { icon: LucideIcon; label: string }[];
    price: number;
    originalPrice: number | null;
}) {
    const { auth } = usePage<SharedData>().props;
    const comingSoon = useComingSoon();
    const [method, setMethod] = useState('upi');
    const listPrice = originalPrice && originalPrice > price ? originalPrice : price;
    const discount = listPrice > price ? Math.round((1 - price / listPrice) * 100) : 0;

    return (
        <StudentLayout title={pageTitle}>
            <div className="mx-auto max-w-6xl space-y-6">
                <Link href={back.href} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
                    <ArrowLeft className="size-4" /> {back.label}
                </Link>

                <PageHeading eyebrow={<Eyebrow icon={Lock}>Secure checkout</Eyebrow>} title="Complete your purchase" description={description} />

                <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
                    <div className="space-y-6">
                        <Panel>
                            <h2 className="font-semibold">Your details</h2>
                            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border px-3 py-2">
                                    <dt className="text-muted-foreground text-xs">Name</dt>
                                    <dd className="text-sm font-medium">{auth.user.name}</dd>
                                </div>
                                <div className="rounded-lg border px-3 py-2">
                                    <dt className="text-muted-foreground text-xs">Email (receipt goes here)</dt>
                                    <dd className="truncate text-sm font-medium">{auth.user.email}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel>
                            <h2 className="font-semibold">Payment method</h2>
                            <div role="radiogroup" aria-label="Payment method" className="mt-4 grid gap-3 sm:grid-cols-2">
                                {methods.map(({ id, label, hint, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        role="radio"
                                        aria-checked={method === id}
                                        onClick={() => setMethod(id)}
                                        className={cn(
                                            'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                                            method === id
                                                ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 dark:bg-indigo-500/10'
                                                : 'hover:border-indigo-300',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                                method === id ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <Icon className="size-4" />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold">{label}</span>
                                            <span className="text-muted-foreground block text-xs">{hint}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    <aside>
                        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm lg:sticky lg:top-24">
                            <div className="flex items-center gap-3 border-b p-5">
                                {picture}
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs">{kind}</p>
                                    <p className="font-semibold">{name}</p>
                                </div>
                            </div>
                            <div className="space-y-5 p-5">
                                <ul className="space-y-2 text-sm">
                                    {included.map(({ icon: Icon, label }) => (
                                        <li key={label} className="flex items-start gap-2">
                                            <Icon className="mt-0.5 size-4 shrink-0 text-indigo-600" /> {label}
                                        </li>
                                    ))}
                                </ul>
                                <dl className="space-y-2 border-t pt-4 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Price</dt>
                                        <dd>{rupees(listPrice)}</dd>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                            <dt>Discount ({discount}%)</dt>
                                            <dd>−{rupees(listPrice - price)}</dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-3 text-base font-semibold">
                                        <dt>Total</dt>
                                        <dd>{rupees(price)}</dd>
                                    </div>
                                </dl>
                                <Button
                                    size="lg"
                                    className="h-12 w-full bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => comingSoon('Online payment')}
                                >
                                    <Lock /> Pay {rupees(price)}
                                </Button>
                                <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                                    <ShieldCheck className="size-4 shrink-0" /> Payments are processed securely. We never see or store your card or
                                    UPI details.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}
