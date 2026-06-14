import { RefreshCw } from 'lucide-react';

import { fmtTimeMs } from '@/lib/format';
import { cn } from '@/lib/utils';

/** For genuinely near real-time sources (crypto/FX, or Finnhub real-time equities). */
export function LiveBadge({ className, label = 'Live' }: { className?: string; label?: string }) {
  return (
    <span
      title="Near real-time source"
      className={cn('inline-flex items-center gap-1 text-[9px] font-semibold uppercase text-up', className)}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" />
      {label}
    </span>
  );
}

/** Freshness badge: a "Real-time" live badge when the backend served a
 *  real-time quote (Finnhub); nothing otherwise (no delayed box). */
export function FreshnessBadge({ realtime, className }: { realtime?: boolean; className?: string }) {
  return realtime ? <LiveBadge label="Real-time" className={className} /> : null;
}

export function LastUpdated({ ts, className }: { ts: number | undefined; className?: string }) {
  return (
    <span className={cn('font-mono text-[10px] tabular-nums text-muted', className)}>
      Upd {fmtTimeMs(ts)}
    </span>
  );
}

/** Subtle spinner shown while a query refetches in the background. */
export function Refreshing({ active }: { active: boolean }) {
  if (!active) return null;
  return <RefreshCw size={10} className="animate-spin text-muted" aria-label="Refreshing" />;
}
