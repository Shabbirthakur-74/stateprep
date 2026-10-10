import { KeyboardEvent, PointerEvent, useEffect, useRef, useState } from 'react';

export interface TrendPoint {
    id: number;
    title: string;
    percent: number | null;
    submitted_at: string;
}

const HEIGHT = 220;
const PAD = { top: 16, right: 44, bottom: 28, left: 36 };
const TICKS = [0, 25, 50, 75, 100];

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

/**
 * Score (0–100%) per finished quiz, oldest to newest. One series, so no legend: the panel title names it.
 * Hover, touch or arrow keys move a crosshair that snaps to the nearest attempt.
 */
export function ScoreTrendChart({ points }: { points: TrendPoint[] }) {
    const box = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(600);
    const [active, setActive] = useState<number | null>(null);

    useEffect(() => {
        const el = box.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i * plotW) / (points.length - 1));
    const y = (v: number) => PAD.top + plotH - (v / 100) * plotH;
    const coords = points.map((p, i) => [x(i), y(p.percent ?? 0)] as const);
    const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx},${cy}`).join(' ');
    const area = `${line} L${coords[coords.length - 1][0]},${y(0)} L${coords[0][0]},${y(0)} Z`;
    const last = coords.length - 1;

    const nearest = (event: PointerEvent<SVGRectElement>) => {
        const rect = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
        const px = event.clientX - rect.left;
        let best = 0;
        coords.forEach(([cx], i) => Math.abs(cx - px) < Math.abs(coords[best][0] - px) && (best = i));
        setActive(best);
    };

    const onKey = (event: KeyboardEvent) => {
        if (event.key === 'ArrowRight') setActive((i) => Math.min(last, (i ?? -1) + 1));
        else if (event.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? points.length) - 1));
        else if (event.key === 'Escape') setActive(null);
        else return;
        event.preventDefault();
    };

    const point = active !== null ? points[active] : null;
    const tooltipLeft = active !== null ? Math.min(Math.max(coords[active][0], 90), width - 90) : 0;

    return (
        <div>
            <div ref={box} className="relative">
                <svg
                    width={width}
                    height={HEIGHT}
                    role="img"
                    aria-label={`Score trend over the last ${points.length} quizzes. Latest ${points[last].percent}%.`}
                    tabIndex={0}
                    onKeyDown={onKey}
                    onBlur={() => setActive(null)}
                    className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    {TICKS.map((t) => (
                        <g key={t}>
                            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px]">
                                {t}%
                            </text>
                        </g>
                    ))}

                    <path d={area} className="fill-[#4f46e5]/10 dark:fill-[#7c7ff5]/10" />
                    <path
                        d={line}
                        fill="none"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="stroke-[#4f46e5] dark:stroke-[#7c7ff5]"
                    />

                    {active !== null && (
                        <line
                            x1={coords[active][0]}
                            x2={coords[active][0]}
                            y1={PAD.top}
                            y2={y(0)}
                            className="stroke-muted-foreground/50"
                            strokeWidth={1}
                        />
                    )}

                    {coords.map(([cx, cy], i) => (
                        <circle
                            key={points[i].id}
                            cx={cx}
                            cy={cy}
                            r={active === i ? 6 : 4}
                            strokeWidth={2}
                            className="stroke-card fill-[#4f46e5] dark:fill-[#7c7ff5]"
                        />
                    ))}

                    <text x={coords[last][0] + 10} y={coords[last][1]} dy="0.32em" className="fill-foreground text-xs font-semibold">
                        {points[last].percent}%
                    </text>

                    {[0, last]
                        .filter((i, n, list) => list.indexOf(i) === n)
                        .map((i) => (
                            <text
                                key={i}
                                x={coords[i][0]}
                                y={HEIGHT - 8}
                                textAnchor={i === 0 && points.length > 1 ? 'start' : 'end'}
                                className="fill-muted-foreground text-[10px]"
                            >
                                {shortDate(points[i].submitted_at)}
                            </text>
                        ))}

                    <rect
                        x={PAD.left}
                        y={PAD.top}
                        width={plotW}
                        height={plotH}
                        fill="transparent"
                        onPointerMove={nearest}
                        onPointerDown={nearest}
                        onPointerLeave={() => setActive(null)}
                    />
                </svg>

                {point && (
                    <div
                        className="bg-popover text-popover-foreground pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-lg border px-3 py-2 text-xs shadow-md"
                        style={{ left: tooltipLeft }}
                    >
                        <p className="truncate font-medium">{point.title}</p>
                        <p className="text-muted-foreground">{shortDate(point.submitted_at)}</p>
                        <p className="mt-1 flex items-center gap-2">
                            <span className="h-0.5 w-3 rounded bg-[#4f46e5] dark:bg-[#7c7ff5]" />
                            Score <span className="ml-auto font-semibold">{point.percent}%</span>
                        </p>
                    </div>
                )}
            </div>

            <details className="mt-3 text-sm">
                <summary className="text-muted-foreground cursor-pointer text-xs hover:text-indigo-600">View as table</summary>
                <table className="mt-2 w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 font-medium">Date</th>
                            <th className="py-1 font-medium">Quiz</th>
                            <th className="py-1 text-right font-medium">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {points.map((p) => (
                            <tr key={p.id}>
                                <td className="py-1.5">{shortDate(p.submitted_at)}</td>
                                <td className="py-1.5">{p.title}</td>
                                <td className="py-1.5 text-right font-medium">{p.percent}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
}
