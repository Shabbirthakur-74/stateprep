import { AdminHeader, AdminPage, CoverThumb, StatusPill } from '@/components/admin-kit';
import { GenerateQuizzes, type QuizExamOption, type QuizSubjectOption } from '@/components/generate-quizzes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import { BookOpenText, ClipboardList, ExternalLink, FileStack, Layers, ListChecks, Pencil, Plus, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface Item {
    id: number;
    title: string;
    cover_url: string | null;
    is_free: boolean;
    price: number | null;
    is_published: boolean;
    detail: string;
    questions_url: string | null;
    edit_url: string;
}

type TabKey = 'mocks' | 'pyqs' | 'series' | 'materials' | 'quizzes';

interface Props {
    exam: { id: number; name: string; slug: string; is_active: boolean; subjects: string[] };
    tabs: Record<TabKey, Item[]>;
    can: { tests: boolean; materials: boolean };
    quizExam: QuizExamOption;
    quizSubjects: QuizSubjectOption[];
}

const tabInfo: Record<TabKey, { label: string; icon: LucideIcon; add: string; perm: 'tests' | 'materials'; empty: string }> = {
    mocks: { label: 'Mocks', icon: ClipboardList, add: 'New mock test', perm: 'tests', empty: 'No mock tests yet.' },
    pyqs: { label: 'PYQs', icon: FileStack, add: 'New previous year paper', perm: 'tests', empty: 'No previous year papers yet.' },
    series: { label: 'Test Series', icon: Layers, add: 'New test series', perm: 'tests', empty: 'No test series yet.' },
    materials: { label: 'Study Material', icon: BookOpenText, add: 'New study material', perm: 'materials', empty: 'No study material yet.' },
    quizzes: { label: 'Quizzes', icon: Zap, add: 'New quiz', perm: 'tests', empty: 'No quizzes yet. Create one, or generate a whole set.' },
};

export default function ExamContent({ exam, tabs, can, quizExam, quizSubjects }: Props) {
    const [tab, setTab] = useState<TabKey>(
        () => (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('tab') as TabKey)) || 'mocks',
    );
    const info = tabInfo[tab];
    const items = tabs[tab];

    const addUrl: Record<TabKey, string> = {
        mocks: route('admin.mock-tests.create', { exam: exam.id, type: 'mock' }),
        pyqs: route('admin.mock-tests.create', { exam: exam.id, type: 'pyq' }),
        series: route('admin.test-series.create', { exam: exam.id }),
        materials: route('admin.materials.create', { exam: exam.id }),
        quizzes: route('admin.quizzes.create', { exam: exam.id }),
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Exams', href: route('admin.exams.index') },
                { title: exam.name, href: route('admin.exams.edit', exam.id) },
                { title: 'Content', href: '#' },
            ]}
        >
            <Head title={`${exam.name}: content`} />
            <AdminPage>
                <AdminHeader
                    title={`${exam.name}: content`}
                    description={`Everything in this exam's bundle. Subjects: ${exam.subjects.length ? exam.subjects.join(', ') : 'none linked yet — link them under Edit exam'}.`}
                />
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('admin.exams.edit', exam.id)}>
                            <Pencil /> Edit exam & page
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={route('exams.show', exam.slug)} target="_blank" rel="noopener">
                            <ExternalLink /> View exam page
                        </a>
                    </Button>
                </div>

                <div className="flex gap-1 overflow-x-auto rounded-lg border p-1" role="tablist">
                    {(Object.keys(tabInfo) as TabKey[]).map((key) => {
                        const Icon = tabInfo[key].icon;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                onClick={() => setTab(key)}
                                className={cn(
                                    'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm',
                                    tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Icon className="size-4" /> {tabInfo[key].label}
                                <span className={cn('rounded px-1.5 text-[11px]', tab === key ? 'bg-white/20' : 'bg-muted')}>{tabs[key].length}</span>
                            </button>
                        );
                    })}
                </div>

                {can[info.perm] && (
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link href={addUrl[tab]}>
                                <Plus /> {info.add}
                            </Link>
                        </Button>
                        {tab === 'quizzes' && <GenerateQuizzes exams={[quizExam]} subjects={quizSubjects} examId={exam.id} />}
                    </div>
                )}

                <Card className="divide-y p-0">
                    {items.length === 0 && <p className="text-muted-foreground p-6 text-sm">{info.empty}</p>}
                    {items.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                            <CoverThumb url={item.cover_url} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{item.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {item.detail} •{' '}
                                    {tab === 'quizzes'
                                        ? item.is_free
                                            ? 'Free sample'
                                            : 'Included with the exam'
                                        : item.is_free
                                          ? 'Free'
                                          : `₹${item.price}`}
                                </p>
                            </div>
                            <StatusPill published={item.is_published} />
                            {can[info.perm] && item.questions_url && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={item.questions_url}>
                                        <ListChecks /> Questions
                                    </Link>
                                </Button>
                            )}
                            {can[info.perm] && (
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={item.edit_url}>
                                        <Pencil /> Edit
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
