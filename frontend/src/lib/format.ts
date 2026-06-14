/** Number/date formatting helpers. All return '—' for missing data. */

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1000)
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(Math.abs(n) < 1 ? 4 : 2);
}

export function fmtSigned(n: number | null | undefined, dp = 2): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(dp)}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/** 3_210_000_000_000 → "3.21T" */
export function fmtBig(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

export const fmtCap = (n: number | null | undefined) => (n == null ? '—' : `$${fmtBig(n)}`);

export function fmtClock(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour12: false });
}

/** react-query dataUpdatedAt (ms) → "14:32:05" */
export function fmtTimeMs(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('en-US', { hour12: false });
}

/** Tailwind text colour class for a signed change value. */
export function changeCls(n: number | null | undefined): string {
  if (n == null) return 'text-muted';
  return n >= 0 ? 'text-up' : 'text-down';
}
