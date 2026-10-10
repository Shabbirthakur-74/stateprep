import { Field } from '@/components/admin-kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { selectClass } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { Wand2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export interface QuizExamOption {
    id: number;
    name: string;
    subject_ids: number[];
}

export interface QuizSubjectOption {
    id: number;
    name: string;
    questions_count: number;
    topics: { id: number; name: string }[];
}

const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;

/**
 * "Generate quizzes": many draft quizzes at once, one per topic or a numbered set, each with unused questions.
 * With `examId` the exam is fixed (the exam's Content screen).
 */
export function GenerateQuizzes({ exams, subjects, examId }: { exams: QuizExamOption[]; subjects: QuizSubjectOption[]; examId?: number }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, transform } = useForm({
        exam_id: examId ? String(examId) : '',
        mode: 'per_topic' as 'per_topic' | 'numbered',
        subject_ids: [] as number[],
        per_quiz: '15',
        quizzes: '10',
        prefix: '',
        difficulty: '',
        top_up: false as boolean,
    });

    const exam = exams.find((e) => String(e.id) === data.exam_id);
    // An exam's quizzes only use its own subjects (all subjects when none are linked yet).
    const offered = subjects.filter((s) => s.questions_count > 0 && (!exam?.subject_ids.length || exam.subject_ids.includes(s.id)));
    const chosen = data.subject_ids.length ? offered.filter((s) => data.subject_ids.includes(s.id)) : offered;
    const topicCount = chosen.reduce((sum, s) => sum + s.topics.length, 0);
    const defaultPrefix = exam ? `${shortName(exam.name)} Quiz` : 'Practice Quiz';

    const toggle = (id: number, on: boolean) => setData('subject_ids', on ? [...data.subject_ids, id] : data.subject_ids.filter((s) => s !== id));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((d) => ({
            ...d,
            exam_id: d.exam_id || null,
            subject_ids: d.subject_ids.length ? d.subject_ids : offered.map((s) => s.id),
            prefix: d.prefix || defaultPrefix,
            difficulty: d.difficulty || null,
        }));
        post(route('admin.quizzes.generate'), { preserveScroll: true, onSuccess: () => setOpen(false) });
    };

    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <Wand2 /> Generate quizzes
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <form onSubmit={submit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>Generate quizzes</DialogTitle>
                            <DialogDescription>
                                Creates many draft quizzes at once. Each gets questions not used yet
                                {exam ? ` in ${shortName(exam.name)}'s bundle` : ' in other general quizzes'}, so they never overlap. Review them,
                                then publish.
                            </DialogDescription>
                        </DialogHeader>

                        {!examId && (
                            <Field label="For" htmlFor="gen-exam" error={errors.exam_id}>
                                <select
                                    id="gen-exam"
                                    className={selectClass}
                                    value={data.exam_id}
                                    onChange={(e) => setData((d) => ({ ...d, exam_id: e.target.value, subject_ids: [] }))}
                                >
                                    <option value="">General quizzes (Quizzes screen)</option>
                                    {exams.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.name} bundle
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                            {(
                                [
                                    ['per_topic', 'One quiz per topic', 'e.g. “Pedagogy • Learning Theories”'],
                                    ['numbered', 'A numbered set', `e.g. “${defaultPrefix} 1” to “${defaultPrefix} 10”`],
                                ] as const
                            ).map(([mode, title, hint]) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setData('mode', mode)}
                                    className={cn(
                                        'rounded-lg border p-3 text-left',
                                        data.mode === mode ? 'border-primary ring-primary ring-1' : 'hover:border-primary/50',
                                    )}
                                >
                                    <span className="block text-sm font-semibold">{title}</span>
                                    <span className="text-muted-foreground block text-xs">{hint}</span>
                                </button>
                            ))}
                        </div>

                        <Field label="Subjects" error={errors.subject_ids} hint="Leave all unticked to use every subject listed.">
                            <div className="grid max-h-44 gap-1.5 overflow-y-auto sm:grid-cols-2">
                                {offered.map((s) => (
                                    <label key={s.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                                        <Checkbox
                                            checked={data.subject_ids.includes(s.id)}
                                            onCheckedChange={(checked) => toggle(s.id, checked === true)}
                                        />
                                        <span className="flex-1 truncate">{s.name}</span>
                                        <span className="text-muted-foreground text-xs">{s.questions_count} Qs</span>
                                    </label>
                                ))}
                                {offered.length === 0 && <p className="text-muted-foreground text-sm">No subjects with questions yet.</p>}
                            </div>
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Questions per quiz" htmlFor="gen-per" error={errors.per_quiz}>
                                <Input
                                    id="gen-per"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={data.per_quiz}
                                    onChange={(e) => setData('per_quiz', e.target.value)}
                                />
                            </Field>
                            {data.mode === 'numbered' && (
                                <Field label="Number of quizzes" htmlFor="gen-count" error={errors.quizzes}>
                                    <Input
                                        id="gen-count"
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={data.quizzes}
                                        onChange={(e) => setData('quizzes', e.target.value)}
                                    />
                                </Field>
                            )}
                            <Field label="Difficulty" htmlFor="gen-difficulty" error={errors.difficulty}>
                                <select
                                    id="gen-difficulty"
                                    className={selectClass}
                                    value={data.difficulty}
                                    onChange={(e) => setData('difficulty', e.target.value)}
                                >
                                    <option value="">Any</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </Field>
                        </div>
                        {data.mode === 'numbered' && (
                            <Field label="Title" htmlFor="gen-prefix" error={errors.prefix} hint="Each quiz gets this title plus its number.">
                                <Input
                                    id="gen-prefix"
                                    value={data.prefix}
                                    placeholder={defaultPrefix}
                                    onChange={(e) => setData('prefix', e.target.value)}
                                />
                            </Field>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={data.top_up} onCheckedChange={(checked) => setData('top_up', checked === true)} /> Top up with
                            already-used questions if unused ones run out
                        </label>

                        <p className="bg-muted rounded-md px-3 py-2 text-sm">
                            {data.mode === 'per_topic'
                                ? `About ${topicCount} quizzes (one per topic), up to ${data.per_quiz || 0} questions each.`
                                : `${data.quizzes || 0} quizzes of ${data.per_quiz || 0} questions, split evenly across ${chosen.length} ${chosen.length === 1 ? 'subject' : 'subjects'}.`}
                        </p>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing || offered.length === 0}>
                                <Wand2 /> Generate drafts
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
