import { AdminHeader, AdminPage, Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Letter = 'A' | 'B' | 'C' | 'D';

interface Question {
    id: number;
    subject_id: number;
    topic_id: number | null;
    text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: Letter;
    explanation: string | null;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface Props {
    subjects: { id: number; name: string; topics: { id: number; name: string }[] }[];
    question?: Question;
    defaults?: { subject_id: number | null; topic_id: number | null };
}

const letters: Letter[] = ['A', 'B', 'C', 'D'];

export default function QuestionForm({ subjects, question, defaults }: Props) {
    const { data, setData, post, put, processing, errors, reset, transform } = useForm({
        subject_id: String(question?.subject_id ?? defaults?.subject_id ?? subjects[0]?.id ?? ''),
        topic_id: String(question?.topic_id ?? defaults?.topic_id ?? ''),
        text: question?.text ?? '',
        option_a: question?.option_a ?? '',
        option_b: question?.option_b ?? '',
        option_c: question?.option_c ?? '',
        option_d: question?.option_d ?? '',
        correct_option: question?.correct_option ?? ('A' as Letter),
        explanation: question?.explanation ?? '',
        difficulty: question?.difficulty ?? ('medium' as Question['difficulty']),
        // Set after the server warns that a similar question is already in the bank.
        allow_duplicate: false as boolean,
    });

    const topics = subjects.find((s) => String(s.id) === data.subject_id)?.topics ?? [];

    const save = (addAnother: boolean) => {
        if (question) {
            put(route('admin.questions.update', question.id));
            return;
        }
        transform((d) => ({ ...d, add_another: addAnother }));
        post(route('admin.questions.store'), {
            preserveScroll: true,
            onSuccess: () => addAnother && reset('text', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'),
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        save(false);
    };

    const title = question ? 'Edit question' : 'New question';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Question Bank', href: route('admin.questions.index') },
                { title: question ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader title={title} description="A multiple-choice question with four options, one correct answer and an explanation." />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Subject" htmlFor="subject_id" error={errors.subject_id}>
                                <select
                                    id="subject_id"
                                    className={selectClass}
                                    value={data.subject_id}
                                    onChange={(e) => setData((d) => ({ ...d, subject_id: e.target.value, topic_id: '' }))}
                                >
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Topic" htmlFor="topic_id" error={errors.topic_id}>
                                <select
                                    id="topic_id"
                                    className={selectClass}
                                    value={data.topic_id}
                                    onChange={(e) => setData('topic_id', e.target.value)}
                                >
                                    <option value="">No topic</option>
                                    {topics.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Difficulty" htmlFor="difficulty" error={errors.difficulty}>
                                <select
                                    id="difficulty"
                                    className={selectClass}
                                    value={data.difficulty}
                                    onChange={(e) => setData('difficulty', e.target.value as Question['difficulty'])}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </Field>
                        </div>
                        <Field label="Question" htmlFor="text" error={errors.text}>
                            <textarea
                                id="text"
                                className={textareaClass}
                                rows={3}
                                value={data.text}
                                onChange={(e) => setData('text', e.target.value)}
                                required
                            />
                        </Field>
                        {(errors.text?.includes('already in the bank') || data.allow_duplicate) && (
                            <label className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                                <Checkbox
                                    checked={data.allow_duplicate}
                                    onCheckedChange={(checked) => setData('allow_duplicate', checked === true)}
                                />{' '}
                                Save anyway — it is a different question
                            </label>
                        )}
                        <div className="grid gap-3">
                            <p className="text-sm font-medium">Options — click the letter of the correct answer</p>
                            {letters.map((letter) => {
                                const key = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
                                const isCorrect = data.correct_option === letter;
                                return (
                                    <div key={letter} className="grid gap-1">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                aria-label={`Mark ${letter} as correct`}
                                                aria-pressed={isCorrect}
                                                onClick={() => setData('correct_option', letter)}
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold',
                                                    isCorrect && 'border-emerald-600 bg-emerald-600 text-white',
                                                )}
                                            >
                                                {letter}
                                            </button>
                                            <Input value={data[key]} onChange={(e) => setData(key, e.target.value)} required />
                                        </div>
                                        {errors[key] && <p className="text-sm text-red-600">{errors[key]}</p>}
                                    </div>
                                );
                            })}
                        </div>
                        <Field label="Explanation" htmlFor="explanation" error={errors.explanation} hint="Shown to students after they answer.">
                            <textarea
                                id="explanation"
                                className={textareaClass}
                                rows={2}
                                value={data.explanation}
                                onChange={(e) => setData('explanation', e.target.value)}
                            />
                        </Field>
                    </Card>
                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" disabled={processing}>
                            {question ? 'Save changes' : 'Save question'}
                        </Button>
                        {!question && (
                            <Button type="button" variant="secondary" disabled={processing} onClick={() => save(true)}>
                                Save and add another
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={route('admin.questions.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
