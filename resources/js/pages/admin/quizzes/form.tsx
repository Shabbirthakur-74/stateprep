import { AdminHeader, AdminPage, CoverField, Field } from '@/components/admin-kit';
import { type QuizExamOption, type QuizSubjectOption } from '@/components/generate-quizzes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { selectClass, textareaClass } from '@/lib/form-styles';
import { Head, Link, useForm } from '@inertiajs/react';
import { ListChecks } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Quiz {
    id: number;
    exam_id: number | null;
    subject_id: number | null;
    topic_id: number | null;
    title: string;
    description: string | null;
    is_free: boolean;
    is_published: boolean;
    cover_url: string | null;
    questions_count: number;
}

interface Props {
    exams: QuizExamOption[];
    subjects: QuizSubjectOption[];
    quiz?: Quiz;
    defaults?: { exam_id: number | null };
}

export default function QuizForm({ exams, subjects, quiz, defaults }: Props) {
    const { data, setData, post, transform, processing, errors } = useForm({
        exam_id: String(quiz?.exam_id ?? defaults?.exam_id ?? ''),
        subject_id: quiz?.subject_id ? String(quiz.subject_id) : '',
        topic_id: quiz?.topic_id ? String(quiz.topic_id) : '',
        title: quiz?.title ?? '',
        description: quiz?.description ?? '',
        is_free: quiz?.is_free ?? false,
        is_published: quiz?.is_published ?? false,
        cover: null as File | null,
        remove_cover: false as boolean,
    });

    const exam = exams.find((e) => String(e.id) === data.exam_id);
    const offered = subjects.filter((s) => !exam?.subject_ids.length || exam.subject_ids.includes(s.id));
    const subject = subjects.find((s) => String(s.id) === data.subject_id);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (quiz) transform((d) => ({ ...d, _method: 'put' }));
        post(quiz ? route('admin.quizzes.update', quiz.id) : route('admin.quizzes.store'), { forceFormData: true });
    };

    const title = quiz ? `Edit “${quiz.title}”` : 'New quiz';

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Quizzes', href: route('admin.quizzes.index') },
                { title: quiz ? 'Edit' : 'New', href: '#' },
            ]}
        >
            <Head title={title} />
            <AdminPage>
                <AdminHeader title={title} description="Name the quiz and say where it belongs. You choose its questions on the next screen." />
                <form onSubmit={submit} className="grid max-w-3xl gap-6">
                    <Card className="grid gap-5 p-6">
                        <Field
                            label="Where it appears"
                            htmlFor="exam_id"
                            error={errors.exam_id}
                            hint={
                                exam
                                    ? `Part of the ${exam.name} bundle, shown on its exam page. Questions come from its subjects.`
                                    : 'A general quiz, shown to every student on the Quizzes screen.'
                            }
                        >
                            <select
                                id="exam_id"
                                className={selectClass}
                                value={data.exam_id}
                                onChange={(e) => setData((d) => ({ ...d, exam_id: e.target.value, subject_id: '', topic_id: '' }))}
                            >
                                <option value="">General quiz (Quizzes screen)</option>
                                {exams.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name} bundle
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Title" htmlFor="title" error={errors.title}>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder="e.g. HP GK • Districts Quiz 1"
                                required
                            />
                        </Field>
                        <Field label="Description" htmlFor="description" error={errors.description}>
                            <textarea
                                id="description"
                                className={textareaClass}
                                rows={2}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Subject (optional)"
                                htmlFor="subject_id"
                                error={errors.subject_id}
                                hint="Used to group the quiz for students."
                            >
                                <select
                                    id="subject_id"
                                    className={selectClass}
                                    value={data.subject_id}
                                    onChange={(e) => setData((d) => ({ ...d, subject_id: e.target.value, topic_id: '' }))}
                                >
                                    <option value="">Mixed subjects</option>
                                    {offered.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Topic (optional)" htmlFor="topic_id" error={errors.topic_id}>
                                <select
                                    id="topic_id"
                                    className={selectClass}
                                    value={data.topic_id}
                                    disabled={!subject?.topics.length}
                                    onChange={(e) => setData('topic_id', e.target.value)}
                                >
                                    <option value="">All topics</option>
                                    {subject?.topics.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <div className="grid gap-3">
                            {exam && (
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={data.is_free} onCheckedChange={(checked) => setData('is_free', checked === true)} /> Free
                                    sample — anyone with an account can play it from the exam page
                                </label>
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={data.is_published} onCheckedChange={(checked) => setData('is_published', checked === true)} />{' '}
                                Published (students can see it)
                            </label>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <CoverField
                            currentUrl={quiz?.cover_url ?? null}
                            file={data.cover}
                            remove={data.remove_cover}
                            onFile={(file) => setData('cover', file)}
                            onRemove={(remove) => setData('remove_cover', remove)}
                            error={errors.cover}
                        />
                    </Card>

                    {quiz && (
                        <Button type="button" variant="outline" className="justify-self-start" asChild>
                            <Link href={route('admin.sets.show', ['quiz', quiz.id])}>
                                <ListChecks /> Manage questions ({quiz.questions_count})
                            </Link>
                        </Button>
                    )}

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {quiz ? 'Save changes' : 'Create quiz & add questions'}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('admin.quizzes.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </AppLayout>
    );
}
