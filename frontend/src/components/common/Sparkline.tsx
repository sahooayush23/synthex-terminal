import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  className?: string;
  /** Internal coordinate space; the SVG stretches to its container. */
  width?: number;
  height?: number;
}

/** Dependency-free inline SVG sparkline. Green if the series ends above its
 *  start, red otherwise — matching the terminal-wide up/down convention. */
export function Sparkline({ data, className, width = 160, height = 36 }: SparklineProps) {
  if (data.length < 2) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const v of data) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 2 - ((v - min) / range) * (height - 4),
  ]);
  const line = `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}`;
  const area = `${line}L${width},${height}L0,${height}Z`;
  const color = data[data.length - 1] >= data[0] ? 'var(--t-up)' : 'var(--t-down)';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('block', className)}
      aria-hidden
    >
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
