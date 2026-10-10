import { AdminHeader, AdminPage, RowActions } from '@/components/admin-kit';
import { ResultBadge, type ResultBands } from '@/components/result-badge';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface Attempt {
    id: number;
    kind: 'quiz' | 'mock' | 'pyq';
    title: string;
    correct: number;
    total: number;
    percent: number | null;
    score: number | null;
    max_score: number | null;
    submitted_at: string;
}

interface Props {
    student: { id: number; name: string; email: string; joined: string };
    overview: { quizzes: number; tests: number; answered: number; accuracy: number | null; average_percent: number | null };
    attempts: Attempt[];
    bands: ResultBands;
}

const kindLabel = { quiz: 'Quiz', mock: 'Mock test', pyq: 'PYQ paper' };

export default function StudentShow({ student, overview, attempts, bands }: Props) {
    const figures = [
        ['Quizzes', overview.quizzes],
        ['Tests', overview.tests],
        ['Questions answered', overview.answered],
        ['Accuracy', overview.accuracy === null ? '—' : `${overview.accuracy}%`],
        ['Average score', overview.average_percent === null ? '—' : `${overview.average_percent}%`],
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Students', href: route('admin.students.index') },
                { title: student.name, href: '#' },
            ]}
        >
            <Head title={student.name} />
            <AdminPage>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <AdminHeader title={student.name} description={`${student.email} • joined ${student.joined}`} />
                    <RowActions
                        deleteHref={route('admin.students.destroy', student.id)}
                        name={student.name}
                        confirmText="Their account and all their results are deleted."
                    />
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {figures.map(([label, value]) => (
                        <Card key={label} className="gap-1 p-4">
                            <p className="text-muted-foreground text-xs">{label}</p>
                            <p className="text-2xl font-semibold">{value}</p>
                        </Card>
                    ))}
                </div>
                <Card className="divide-y p-0">
                    <h2 className="p-4 font-medium">Results</h2>
                    {attempts.length === 0 && <p className="text-muted-foreground p-4 text-sm">No finished quizzes or tests yet.</p>}
                    {attempts.map((a) => (
                        <div key={`${a.kind}-${a.id}`} className="flex flex-wrap items-center gap-4 p-4 text-sm">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{a.title}</p>
                                <p className="text-muted-foreground text-xs">
                                    {kindLabel[a.kind]} •{' '}
                                    {new Date(a.submitted_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                            <span className="text-muted-foreground">
                                {a.score !== null ? `${a.score} / ${a.max_score} marks` : `${a.correct} / ${a.total} correct`}
                            </span>
                            <span className="w-14 text-right font-semibold">{a.percent}%</span>
                            <ResultBadge percent={a.percent} bands={bands} />
                        </div>
                    ))}
                </Card>
            </AdminPage>
        </AppLayout>
    );
}
