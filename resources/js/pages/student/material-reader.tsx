import { SaveButton, type Material } from '@/components/material-card';
import { Panel, Pill, shortName } from '@/components/student-kit';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/layouts/student-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Download, ExternalLink, FileText, Info, Maximize, Minimize } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ReaderMaterial extends Material {
    viewer: 'pdf' | 'image' | 'video' | 'link' | 'download';
    file_name: string | null;
    file_url: string | null;
    download_url: string | null;
    external_url: string | null;
    embed_url: string | null;
}

function Viewer({ material }: { material: ReaderMaterial }) {
    switch (material.viewer) {
        case 'pdf':
            return <iframe src={`${material.file_url}#view=FitH`} title={material.title} className="size-full bg-slate-100 dark:bg-slate-900" />;
        case 'image':
            return (
                <div className="flex size-full items-start justify-center overflow-auto bg-slate-100 p-4 dark:bg-slate-900">
                    <img src={material.file_url!} alt={material.title} className="max-w-full rounded-lg shadow" />
                </div>
            );
        case 'video':
            return (
                <iframe
                    src={material.embed_url!}
                    title={material.title}
                    className="size-full bg-black"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            );
        case 'link':
            return (
                <iframe
                    src={material.external_url!}
                    title={material.title}
                    className="size-full bg-white"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    referrerPolicy="no-referrer"
                />
            );
        default:
            return (
                <div className="flex size-full flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center dark:bg-slate-900">
                    <span className="flex size-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <FileText className="size-8" />
                    </span>
                    <div>
                        <p className="font-display text-lg font-semibold">{material.file_name}</p>
                        <p className="text-muted-foreground mt-1 max-w-md text-sm">
                            {material.format} files can't be shown inside the browser. Download it and open it with Word, PowerPoint, Excel or Google
                            Docs.
                        </p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                        <a href={material.download_url!}>
                            <Download /> Download {material.format}
                        </a>
                    </Button>
                </div>
            );
    }
}

export default function MaterialReader({ material }: { material: ReaderMaterial }) {
    const frame = useRef<HTMLDivElement>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const canExpand = material.viewer !== 'download';

    useEffect(() => {
        const sync = () => setFullscreen(document.fullscreenElement === frame.current);
        document.addEventListener('fullscreenchange', sync);
        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);

    const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen());

    return (
        <StudentLayout title={material.title}>
            <div className="mx-auto max-w-6xl space-y-4">
                <Link
                    href={route('student.study-material')}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
                >
                    <ArrowLeft className="size-4" /> Study Material
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Pill tone="violet">{material.format}</Pill>
                            {material.exam && <Pill tone="slate">{shortName(material.exam.name)}</Pill>}
                        </div>
                        <h1 className="font-display mt-2 text-2xl font-bold tracking-tight md:text-3xl">{material.title}</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <SaveButton material={material} />
                        {material.download_url && material.viewer !== 'download' && (
                            <Button variant="outline" asChild>
                                <a href={material.download_url}>
                                    <Download /> Download
                                </a>
                            </Button>
                        )}
                        {material.external_url && (
                            <Button variant="outline" asChild>
                                <a href={material.external_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink /> Open in new tab
                                </a>
                            </Button>
                        )}
                        {canExpand && (
                            <Button variant="outline" onClick={toggleFullscreen}>
                                {fullscreen ? <Minimize /> : <Maximize />} {fullscreen ? 'Exit full screen' : 'Full screen'}
                            </Button>
                        )}
                    </div>
                </div>

                {material.viewer === 'link' && (
                    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        This page comes from another website. If it stays blank, that site doesn't allow being shown here; use "Open in new tab".
                    </p>
                )}

                <div
                    ref={frame}
                    className="bg-card h-[calc(100svh-16rem)] min-h-[28rem] overflow-hidden rounded-2xl border shadow-sm [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
                >
                    <Viewer material={material} />
                </div>

                {material.viewer === 'pdf' && (
                    <p className="text-muted-foreground text-xs">PDF not showing on your phone? Use Download to open it in your PDF app.</p>
                )}

                {material.description && (
                    <Panel>
                        <h2 className="font-semibold">About this material</h2>
                        <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">{material.description}</p>
                    </Panel>
                )}
            </div>
        </StudentLayout>
    );
}
