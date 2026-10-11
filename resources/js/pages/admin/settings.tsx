import { AdminHeader, AdminPage, Field } from '@/components/admin-kit';
import { bandRanges } from '@/components/result-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type PassPrices = { pass_monthly_price: string; pass_monthly_original: string; pass_yearly_price: string; pass_yearly_original: string };

export default function Settings({ bands, pass }: { bands: { pass: number; review: number }; pass: PassPrices }) {
    const { data, setData, put, processing, errors } = useForm({
        pass_percent: String(bands.pass),
        review_percent: String(bands.review),
        ...pass,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.update'), { preserveScroll: true });
    };

    const preview = bandRanges({ pass: Number(data.pass_percent) || 0, review: Number(data.review_percent) || 0 });
    const monthly = Number(data.pass_monthly_price) || 0;
    const yearly = Number(data.pass_yearly_price) || 0;
    const saving = monthly && yearly ? Math.round((1 - yearly / (monthly * 12)) * 100) : 0;

    const priceField = (key: keyof PassPrices, label: string, hint?: string) => (
        <Field label={label} htmlFor={key} error={errors[key]} hint={hint}>
            <Input id={key} type="number" min={1} value={data[key]} onChange={(e) => setData(key, e.target.value)} />
        </Field>
    );

    return (
        <AppLayout breadcrumbs={[{ title: 'Settings', href: route('admin.settings.edit') }]}>
            <Head title="Settings" />
            <AdminPage>
                <AdminHeader title="Settings" description="Site-wide settings." />
                <form onSubmit={submit} className="grid max-w-2xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <div>
                            <h2 className="font-medium">StatePrep360 Pass prices</h2>
                            <p className="text-muted-foreground text-sm">
                                The pass unlocks all paid content of every exam. Leave a price empty to hide that plan. The original price is optional
                                and shown struck through.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {priceField('pass_monthly_price', 'Monthly price (₹)')}
                            {priceField('pass_monthly_original', 'Monthly original price (₹)')}
                            {priceField('pass_yearly_price', 'Yearly price (₹)')}
                            {priceField('pass_yearly_original', 'Yearly original price (₹)')}
                        </div>
                        {saving > 0 && (
                            <p className="text-muted-foreground text-sm">
                                The yearly pass saves students {saving}% compared with paying monthly for 12 months.
                            </p>
                        )}
                    </Card>

                    <Card className="grid gap-5 p-6">
                        <div>
                            <h2 className="font-medium">Result cut-offs</h2>
                            <p className="text-muted-foreground text-sm">
                                How finished quizzes and tests are labelled for students and in student records, based on the percentage scored.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Passed at (%)" htmlFor="pass" error={errors.pass_percent}>
                                <Input
                                    id="pass"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={data.pass_percent}
                                    onChange={(e) => setData('pass_percent', e.target.value)}
                                />
                            </Field>
                            <Field label="Review at (%)" htmlFor="review" error={errors.review_percent} hint="Must be lower than the pass cut-off.">
                                <Input
                                    id="review"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={data.review_percent}
                                    onChange={(e) => setData('review_percent', e.target.value)}
                                />
                            </Field>
                        </div>
                        <ul className="grid gap-2 text-sm">
                            {preview.map(({ band, label, className, text }) => (
                                <li key={band} className="flex items-center gap-3">
                                    <span className={`w-16 rounded-md px-2 py-0.5 text-center text-[11px] font-semibold ${className}`}>{label}</span>
                                    <span className="text-muted-foreground">{text}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <div>
                        <Button type="submit" disabled={processing}>
                            Save settings
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
