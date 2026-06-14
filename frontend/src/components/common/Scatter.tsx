import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

export interface ScatterDatum {
  symbol: string;
  x: number;
  y: number;
  /** Optional explicit point color; overrides the up/down-by-y default. */
  color?: string;
}

interface ScatterProps {
  data: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  /** Draw a reference line at this y value (e.g. 0% return). */
  yZero?: number;
  /** Reference line at this x value (e.g. relative volume = 1). */
  xRef?: number;
  onPick?: (symbol: string) => void;
}

/** Dependency-free SVG scatter with axes, a zero/reference grid, point labels
 *  and hover highlight. Points are colored by sign of y (up/down). */
export function Scatter({ data, xLabel, yLabel, yZero, xRef, onPick }: ScatterProps) {
  const [hover, setHover] = useState<string | null>(null);

  const { pts, vb, xToPx, yToPx } = useMemo(() => {
    const W = 600;
    const H = 360;
    const pad = { l: 44, r: 16, t: 14, b: 34 };
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    let xMin = Math.min(...xs, xRef ?? Infinity);
    let xMax = Math.max(...xs, xRef ?? -Infinity);
    let yMin = Math.min(...ys, yZero ?? Infinity);
    let yMax = Math.max(...ys, yZero ?? -Infinity);
    if (!isFinite(xMin) || !isFinite(xMax) || xMin === xMax) { xMin = 0; xMax = 2; }
    if (!isFinite(yMin) || !isFinite(yMax) || yMin === yMax) { yMin = -1; yMax = 1; }
    const xPad = (xMax - xMin) * 0.08 || 0.1;
    const yPad = (yMax - yMin) * 0.12 || 0.1;
    xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;
    const xToPx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
    const yToPx = (y: number) => H - pad.b - ((y - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
    const pts = data.map((d) => ({ ...d, px: xToPx(d.x), py: yToPx(d.y) }));
    return { pts, vb: { W, H, pad, xMin, xMax, yMin, yMax }, xToPx, yToPx };
  }, [data, yZero, xRef]);

  if (data.length === 0) return null;

  return (
    <svg viewBox={`0 0 ${vb.W} ${vb.H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {/* Axes box */}
      <rect x={vb.pad.l} y={vb.pad.t} width={vb.W - vb.pad.l - vb.pad.r} height={vb.H - vb.pad.t - vb.pad.b}
        fill="none" stroke="var(--t-bd2)" />
      {/* Reference lines */}
      {yZero !== undefined && (
        <line x1={vb.pad.l} x2={vb.W - vb.pad.r} y1={yToPx(yZero)} y2={yToPx(yZero)}
          stroke="var(--t-faint)" strokeDasharray="3 3" />
      )}
      {xRef !== undefined && (
        <line y1={vb.pad.t} y2={vb.H - vb.pad.b} x1={xToPx(xRef)} x2={xToPx(xRef)}
          stroke="var(--t-faint)" strokeDasharray="3 3" />
      )}
      {/* Axis labels */}
      <text x={(vb.W) / 2} y={vb.H - 6} textAnchor="middle" fill="var(--t-muted)" fontSize="10">{xLabel}</text>
      <text x={12} y={vb.H / 2} textAnchor="middle" fill="var(--t-muted)" fontSize="10"
        transform={`rotate(-90 12 ${vb.H / 2})`}>{yLabel}</text>
      {/* Points */}
      {pts.map((p) => {
        const up = p.y >= (yZero ?? 0);
        const active = hover === p.symbol;
        const fill = p.color ?? (up ? 'var(--t-up)' : 'var(--t-down)');
        return (
          <g key={p.symbol} onMouseEnter={() => setHover(p.symbol)} onMouseLeave={() => setHover(null)}
            onClick={() => onPick?.(p.symbol)} className={onPick ? 'cursor-pointer' : ''}>
            <circle cx={p.px} cy={p.py} r={active ? 4.5 : 3}
              fill={fill} opacity={active ? 1 : 0.8} />
            <text x={p.px + 5} y={p.py - 4} fontSize={active ? 10 : 8}
              fill={active ? 'var(--t-fg)' : 'var(--t-muted)'}
              className={cn(active && 'font-semibold')}>{p.symbol}</text>
          </g>
        );
      })}
    </svg>
  );
}
