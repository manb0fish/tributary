import { useId, useMemo } from 'react';
import type { SpeedSample } from '../../store/ui';
import { formatSpeed } from '../../lib/format';

interface Props {
  samples: SpeedSample[];
  height: number;
  /** number of samples the x axis represents */
  span?: number;
  axis?: boolean;
  className?: string;
}

const W = 600;

/** Lightweight dual-series area chart (download/upload). Pure SVG. */
export function SpeedChart({ samples, height, span = 120, axis = false, className }: Props) {
  const gid = useId().replace(/:/g, '');
  const { down, up, max, ticks } = useMemo(() => {
    const peak = Math.max(1, ...samples.map((s) => Math.max(s.down, s.up)));
    const nice = niceCeil(peak);
    // Fill the full width while history is still short, then scroll.
    const effective = Math.max(2, Math.min(span, samples.length));
    const step = W / (effective - 1);
    const x0 = W - (samples.length - 1) * step;
    const h = height;
    const toPath = (key: 'down' | 'up') => {
      if (samples.length < 2) return { line: '', area: '' };
      const pts = samples.map((s, i) => [x0 + i * step, h - (s[key] / nice) * (h - 2) - 1] as const);
      const line = smooth(pts);
      const area = `${line} L${pts[pts.length - 1]![0]},${h} L${pts[0]![0]},${h} Z`;
      return { line, area };
    };
    return { down: toPath('down'), up: toPath('up'), max: nice, ticks: [nice, nice / 2] };
  }, [samples, height, span]);

  return (
    <div className={className} style={{ position: 'relative', height }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height} className="block overflow-visible">
        <defs>
          <linearGradient id={`d${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-down)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--chart-down)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`u${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-up)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--chart-up)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {axis &&
          ticks.map((t) => {
            const y = height - (t / max) * (height - 2) - 1;
            return <line key={t} x1="0" x2={W} y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />;
          })}
        <path d={down.area} fill={`url(#d${gid})`} />
        <path d={up.area} fill={`url(#u${gid})`} />
        <path d={down.line} fill="none" stroke="var(--chart-down)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d={up.line} fill="none" stroke="var(--chart-up)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      {axis &&
        ticks.map((t) => (
          <span key={t} className="num pointer-events-none absolute left-1 text-[10px] text-subtle" style={{ top: height - (t / max) * (height - 2) - 14 }}>
            {formatSpeed(t)}
          </span>
        ))}
    </div>
  );
}

function niceCeil(v: number): number {
  const exp = Math.pow(1024, Math.floor(Math.log(v) / Math.log(1024)));
  const n = v / exp;
  const steps = [1, 2, 4, 5, 8, 10, 16, 20, 32, 50, 64, 100, 128, 200, 256, 500, 512, 1000, 1024];
  return (steps.find((s) => s >= n) ?? 1024) * exp;
}

/** Monotone-ish smoothing via cardinal spline with low tension. */
function smooth(pts: ReadonlyArray<readonly [number, number]>): string {
  if (!pts.length) return '';
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 2] ?? pts[i - 1]!;
    const p1 = pts[i - 1]!;
    const p2 = pts[i]!;
    const p3 = pts[i + 1] ?? p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}
