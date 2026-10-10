import { AdminHeader, AdminPage, Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Bell, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Section = 'tests' | 'materials';

interface ExamRow {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    show_on_home: boolean;
}

interface CardRow {
    id: number;
    badge: string | null;
    tag: string | null;
    highlights: string[];
    title: string;
    exam: string | null;
    kind: string;
    live: boolean;
    cardable_type: string;
    cardable_id: number;
}

interface Option {
    type: string;
    id: number;
    label: string;
    kind: string;
    exam: string | null;
    published: boolean;
}

interface Props {
    text: Record<string, string>;
    exams: ExamRow[];
    cards: Record<Section, CardRow[]>;
    options: Record<Section, Option[]>;
    badges: string[];
}

const sectionInfo: Record<Section, { title: string; prefix: string; empty: string; item: string }> = {
    tests: {
        title: 'Mocks / Test Series carousel',
        prefix: 'home_tests',
        empty: 'No cards yet. The section is hidden on the homepage.',
        item: 'test series, mock test or PYQ paper',
    },
    materials: {
        title: 'Study Material carousel',
        prefix: 'home_materials',
        empty: 'No cards yet. The section is hidden on the homepage.',
        item: 'study material',
    },
};

function HeadingsForm({ text }: { text: Record<string, string> }) {
    const { data, setData, put, processing, errors } = useForm(text);
    const err = errors as Record<string, string | undefined>;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.homepage.text'), { preserveScroll: true });
    };

    const field = (key: string, label: string, long = false) => (
        <Field label={label} htmlFor={key} error={err[key]}>
            {long ? (
                <textarea id={key} className={textareaClass} rows={2} value={data[key]} onChange={(e) => setData(key, e.target.value)} />
            ) : (
                <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} />
            )}
        </Field>
    );

    return (
        <Card className="p-6">
            <form onSubmit={submit} className="grid gap-6">
                <div>
                    <h2 className="font-semibold">Section headings</h2>
                    <p className="text-muted-foreground text-sm">The titles and short lines above each homepage section.</p>
                </div>
                <fieldset className="grid gap-4 sm:grid-cols-2">
                    <legend className="mb-2 text-sm font-medium">Exams We Cover</legend>
                    {field('home_exams_title', 'Title')}
                    {field('home_exams_description', 'Description')}
                </fieldset>
                {(['tests', 'materials'] as Section[]).map((section) => {
                    const p = sectionInfo[section].prefix;
                    return (
                        <fieldset key={section} className="grid gap-4 sm:grid-cols-2">
                            <legend className="mb-2 text-sm font-medium">{section === 'tests' ? 'Mocks / Test Series' : 'Study Material'}</legend>
                            {field(`${p}_eyebrow`, 'Small label')}
                            {field(`${p}_title`, 'Title')}
                            <div className="sm:col-span-2">{field(`${p}_description`, 'Description', true)}</div>
                        </fieldset>
                    );
                })}
                <Button type="submit" disabled={processing} className="justify-self-start">
                    Save headings
                </Button>
            </form>
        </Card>
    );
}

function ExamsList({ exams }: { exams: ExamRow[] }) {
    const [rows, setRows] = useState(exams);
    const [saving, setSaving] = useState(false);
    const dirty = JSON.stringify(rows) !== JSON.stringify(exams);

    const move = (i: number, by: -1 | 1) => {
        const next = [...rows];
        [next[i], next[i + by]] = [next[i + by], next[i]];
        setRows(next);
    };

    const save = () =>
        router.put(
            route('admin.homepage.exams'),
            { exams: rows.map((r) => ({ id: r.id, show_on_home: r.show_on_home })) },
            { preserveScroll: true, onStart: () => setSaving(true), onFinish: () => setSaving(false) },
        );

    return (
        <Card className="grid gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">Exams We Cover</h2>
                    <p className="text-muted-foreground text-sm">
                        Tick the exams to show and put them in order. Each one links to its exam page. Hidden (inactive) exams never show.
                    </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('admin.exams.create')}>
                        <Plus /> New exam
                    </Link>
                </Button>
            </div>
            <ul className="divide-y rounded-lg border">
                {rows.length === 0 && <li className="text-muted-foreground p-4 text-sm">No exams yet.</li>}
                {rows.map((exam, i) => (
                    <li key={exam.id} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox
                            id={`exam-${exam.id}`}
                            checked={exam.show_on_home}
                            onCheckedChange={(checked) => setRows(rows.map((r) => (r.id === exam.id ? { ...r, show_on_home: checked === true } : r)))}
                        />
                        <label htmlFor={`exam-${exam.id}`} className="min-w-0 flex-1 text-sm">
                            {exam.name}
                            {!exam.is_active && <span className="bg-muted ml-2 rounded px-2 py-0.5 text-[11px] font-semibold">Inactive</span>}
                        </label>
                        <a
                            href={route('exams.show', exam.slug)}
                            target="_blank"
                            rel="noopener"
                            className="text-muted-foreground hover:text-foreground p-1"
                            aria-label={`Open the ${exam.name} page`}
                        >
                            <ExternalLink className="size-4" />
                        </a>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={i === 0}
                            onClick={() => move(i, -1)}
                            aria-label={`Move ${exam.name} up`}
                        >
                            <ArrowUp />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={i === rows.length - 1}
                            onClick={() => move(i, 1)}
                            aria-label={`Move ${exam.name} down`}
                        >
                            <ArrowDown />
                        </Button>
                    </li>
                ))}
            </ul>
            <Button onClick={save} disabled={!dirty || saving} className="justify-self-start">
                Save exams
            </Button>
        </Card>
    );
}

function CardDialog({
    section,
    card,
    options,
    badges,
    used,
    onClose,
}: {
    section: Section;
    card: CardRow | null;
    options: Option[];
    badges: string[];
    used: string[];
    onClose: () => void;
}) {
    const choices = options.filter((o) => !used.includes(`${o.type}:${o.id}`));
    const { data, setData, post, put, transform, processing, errors } = useForm({
        section,
        item: card ? `${card.cardable_type}:${card.cardable_id}` : choices[0] ? `${choices[0].type}:${choices[0].id}` : '',
        badge: card?.badge ?? '',
        tag: card?.tag ?? '',
        highlights: [0, 1, 2].map((i) => card?.highlights[i] ?? ''),
    });
    const err = errors as Record<string, string | undefined>;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (card) {
            put(route('admin.homepage.cards.update', card.id), options);
        } else {
            // The chosen item is sent as its two fields.
            transform(({ item, ...rest }) => {
                const [cardable_type, cardable_id] = item.split(':');
                return { ...rest, cardable_type, cardable_id: Number(cardable_id) };
            });
            post(route('admin.homepage.cards.store'), options);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{card ? 'Edit card' : 'Add a card'}</DialogTitle>
                        <DialogDescription>
                            {card
                                ? card.title
                                : `Pick a ${sectionInfo[section].item}. Its title, description, exam and price come from the item itself.`}
                        </DialogDescription>
                    </DialogHeader>
                    {!card && (
                        <Field label="Item" htmlFor="item" error={err.cardable_id ?? err.cardable_type}>
                            {choices.length ? (
                                <select id="item" className={selectClass} value={data.item} onChange={(e) => setData('item', e.target.value)}>
                                    {choices.map((o) => (
                                        <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
                                            {o.kind}: {o.label}
                                            {o.exam ? ` (${o.exam})` : ''}
                                            {o.published ? '' : ' [draft]'}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-muted-foreground text-sm">Everything available is already in this carousel.</p>
                            )}
                        </Field>
                    )}
                    <Field label="Badge" htmlFor="badge" error={err.badge}>
                        <select id="badge" className={selectClass} value={data.badge} onChange={(e) => setData('badge', e.target.value)}>
                            <option value="">No badge</option>
                            {badges.map((b) => (
                                <option key={b}>{b}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Highlight chips" error={err.highlights} hint="Up to three short points. Leave empty to show automatic ones.">
                        <div className="grid gap-2 sm:grid-cols-3">
                            {data.highlights.map((h, i) => (
                                <Input
                                    key={i}
                                    aria-label={`Highlight ${i + 1}`}
                                    maxLength={30}
                                    value={h}
                                    onChange={(e) =>
                                        setData(
                                            'highlights',
                                            data.highlights.map((x, j) => (j === i ? e.target.value : x)),
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </Field>
                    <Field label="Tag line" htmlFor="tag" error={err.tag} hint='e.g. "Free Demo". Leave empty to show "Free" or the price.'>
                        <Input id="tag" maxLength={40} value={data.tag} onChange={(e) => setData('tag', e.target.value)} />
                    </Field>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || (!card && !choices.length)}>
                            {card ? 'Save card' : 'Add card'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Carousel({ section, cards, options, badges }: { section: Section; cards: CardRow[]; options: Option[]; badges: string[] }) {
    const [editing, setEditing] = useState<CardRow | 'new' | null>(null);
    const info = sectionInfo[section];

    const move = (card: CardRow, direction: 'up' | 'down') =>
        router.post(route('admin.homepage.cards.move', card.id), { direction }, { preserveScroll: true });
    const remove = (card: CardRow) =>
        confirm(`Remove "${card.title}" from the homepage? The item itself is not deleted.`) &&
        router.delete(route('admin.homepage.cards.destroy', card.id), { preserveScroll: true });

    return (
        <Card className="grid gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">{info.title}</h2>
                    <p className="text-muted-foreground text-sm">Cards appear in this order. Each one leads to its exam's page.</p>
                </div>
                <Button size="sm" onClick={() => setEditing('new')}>
                    <Plus /> Add card
                </Button>
            </div>
            <ul className="divide-y rounded-lg border">
                {cards.length === 0 && <li className="text-muted-foreground p-4 text-sm">{info.empty}</li>}
                {cards.map((card, i) => (
                    <li key={card.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                {card.title}
                                {card.badge && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase">
                                        {card.badge}
                                    </span>
                                )}
                                {!card.live && (
                                    <span
                                        className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                        title="Draft, empty, or its exam is inactive"
                                    >
                                        Not shown
                                    </span>
                                )}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {card.kind}
                                {card.exam && ` • ${card.exam}`}
                                {card.highlights.length > 0 && ` • ${card.highlights.join(' · ')}`}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(card, 'up')} aria-label={`Move ${card.title} up`}>
                            <ArrowUp />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === cards.length - 1}
                            onClick={() => move(card, 'down')}
                            aria-label={`Move ${card.title} down`}
                        >
                            <ArrowDown />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(card)} aria-label={`Edit ${card.title}`}>
                            <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(card)} aria-label={`Remove ${card.title}`} className="text-red-600">
                            <Trash2 />
                        </Button>
                    </li>
                ))}
            </ul>
            {editing && (
                <CardDialog
                    section={section}
                    card={editing === 'new' ? null : editing}
                    options={options}
                    badges={badges}
                    used={cards.map((c) => `${c.cardable_type}:${c.cardable_id}`)}
                    onClose={() => setEditing(null)}
                />
            )}
        </Card>
    );
}

export default function Homepage({ text, exams, cards, options, badges }: Props) {
    const { auth } = usePage<SharedData>().props;
    const canNotices = auth.user.role === 'super_admin' || auth.user.permissions.includes('manage-notices');

    return (
        <AppLayout breadcrumbs={[{ title: 'Homepage', href: route('admin.homepage.index') }]}>
            <Head title="Homepage" />
            <AdminPage>
                <AdminHeader title="Homepage" description="Everything visitors see on the homepage before they sign in." />
                <Button variant="outline" size="sm" className="justify-self-start" asChild>
                    <a href={route('home')} target="_blank" rel="noopener" className="self-start">
                        <ExternalLink /> View homepage
                    </a>
                </Button>
                <div className="grid max-w-4xl gap-6">
                    <ExamsList exams={exams} />
                    <Card className="flex flex-wrap items-center gap-4 p-6">
                        <Bell className="text-primary size-5" />
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold">Notice Board</h2>
                            <p className="text-muted-foreground text-sm">Published notices show beside Exams We Cover, pinned ones first.</p>
                        </div>
                        {canNotices && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('admin.notices.index')}>Manage notices</Link>
                            </Button>
                        )}
                    </Card>
                    {(['tests', 'materials'] as Section[]).map((section) => (
                        <Carousel key={section} section={section} cards={cards[section]} options={options[section]} badges={badges} />
                    ))}
                    <HeadingsForm text={text} />
                </div>
            </AdminPage>
        </AppLayout>
    );
}
