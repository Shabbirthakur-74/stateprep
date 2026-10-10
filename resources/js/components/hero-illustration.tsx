import { SVGAttributes } from 'react';

// Pine trees along the foreground: [x, baseline y, height].
const trees: [number, number, number][] = [
    [18, 372, 120],
    [52, 380, 92],
    [92, 384, 70],
    [138, 378, 54],
    [372, 372, 64],
    [410, 380, 86],
    [452, 386, 110],
    [586, 390, 150],
    [622, 392, 118],
];

// Village on the hillside: [x, y].
const houses: [number, number][] = [
    [300, 268],
    [322, 262],
    [344, 270],
    [312, 284],
    [338, 290],
    [362, 282],
];

const signs = ['HP TET', 'CTET', 'HPPSC', '& More'];

function Pine({ x, y, h }: { x: number; y: number; h: number }) {
    const w = h * 0.42;
    return (
        <g>
            <rect x={x - 2} y={y - h * 0.18} width="4" height={h * 0.18} fill="#5b3a21" />
            {[0, 1, 2].map((tier) => {
                const top = y - h + tier * h * 0.22;
                const base = top + h * 0.42;
                const half = (w / 2) * (0.62 + tier * 0.19);
                return <path key={tier} d={`M${x} ${top} L${x - half} ${base} L${x + half} ${base} Z`} fill={tier === 0 ? '#2f6b45' : '#285c3b'} />;
            })}
        </g>
    );
}

/**
 * Himalayan landscape for the home page hero: snow peaks, pine forest, a hillside village and a signpost naming the exams.
 */
export function HeroIllustration(props: SVGAttributes<SVGElement>) {
    return (
        <svg viewBox="0 0 660 400" role="img" aria-labelledby="hero-art-title" preserveAspectRatio="xMidYMax slice" {...props}>
            <title id="hero-art-title">Snow-capped Himalayan peaks above a pine forest, with a signpost to HP TET, CTET, HPPSC and more</title>
            <defs>
                <linearGradient id="hero-peak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6f8fb5" />
                    <stop offset="1" stopColor="#3e5f86" />
                </linearGradient>
                <linearGradient id="hero-far" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#b9cde4" />
                    <stop offset="1" stopColor="#9fb9d6" />
                </linearGradient>
                <linearGradient id="hero-hill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6fa36b" />
                    <stop offset="1" stopColor="#3d7a4c" />
                </linearGradient>
                <linearGradient id="hero-lake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#8ec5e8" />
                    <stop offset="1" stopColor="#5fa6d6" />
                </linearGradient>
            </defs>

            {/* Distant range */}
            <path
                d="M0 250 L70 170 L120 205 L190 130 L250 190 L300 150 L360 210 L430 160 L500 215 L560 165 L660 235 L660 300 L0 300 Z"
                fill="url(#hero-far)"
                opacity="0.8"
            />

            {/* Main peak with snow cap */}
            <path d="M120 300 L330 40 L420 150 L470 110 L620 300 Z" fill="url(#hero-peak)" />
            <path
                d="M330 40 L278 104 L300 96 L312 118 L332 98 L350 122 L366 100 L384 110 Z M470 110 L448 138 L462 132 L474 146 L488 134 L500 142 Z"
                fill="#ffffff"
            />
            <path d="M330 40 L384 110 L420 150 L400 160 L370 128 L352 140 Z" fill="#ffffff" opacity="0.18" />

            {/* Hills, lake and village */}
            <path d="M0 300 C90 262 170 272 250 292 C320 250 420 248 520 280 C580 262 630 266 660 276 L660 400 L0 400 Z" fill="url(#hero-hill)" />
            <ellipse cx="200" cy="330" rx="120" ry="16" fill="url(#hero-lake)" opacity="0.9" />
            {houses.map(([x, y]) => (
                <g key={`${x}-${y}`}>
                    <rect x={x} y={y} width="16" height="11" fill="#f4efe6" />
                    <path d={`M${x - 2} ${y} L${x + 8} ${y - 8} L${x + 18} ${y} Z`} fill="#c2410c" />
                    <rect x={x + 6} y={y + 4} width="4" height="7" fill="#8a5a3c" />
                </g>
            ))}

            {/* Foreground ground */}
            <path d="M0 380 C120 360 260 372 360 384 C460 372 560 366 660 376 L660 400 L0 400 Z" fill="#2c5d3d" />

            {trees.map(([x, y, h]) => (
                <Pine key={x} x={x} y={y} h={h} />
            ))}

            {/* Signpost */}
            <g transform="translate(500 120)">
                <rect x="-6" y="-8" width="12" height="282" rx="3" fill="#7a4a26" />
                {signs.map((label, i) => {
                    const pointsLeft = i % 2 === 0;
                    const y = i * 42;
                    const d = pointsLeft ? 'M-62 0 H54 V30 H-62 L-74 15 Z' : 'M-54 0 H62 L74 15 L62 30 H-54 Z';
                    return (
                        <g key={label} transform={`translate(0 ${y})`}>
                            <path d={d} fill="#9a5f30" stroke="#6b3f1e" strokeWidth="2" />
                            <text x="0" y="21" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="15" fill="#fff8ee">
                                {label}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* Birds */}
            <path d="M520 46 q8 -8 16 0 q8 -8 16 0" fill="none" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M560 70 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
