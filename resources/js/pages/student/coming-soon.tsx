import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function ComingSoon({ title, description }: { title: string; description: string }) {
    return (
        <StudentLayout title={title}>
            <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center md:py-24">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <Sparkles className="size-8" />
                </span>
                <p className="mt-6 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-700 uppercase dark:bg-indigo-500/10 dark:text-indigo-300">
                    Coming soon
                </p>
                <h1 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
                <p className="text-muted-foreground mt-3">{description}</p>
                <p className="text-muted-foreground mt-1 text-sm">We're building this right now. Check back soon.</p>
                <Button className="mt-8 bg-indigo-600 hover:bg-indigo-700" asChild>
                    <Link href={route('student.dashboard')}>
                        <ArrowLeft /> Back to Home
                    </Link>
                </Button>
            </div>
        </StudentLayout>
    );
}
