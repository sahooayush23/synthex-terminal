import { useState } from 'react';
import { Star } from 'lucide-react';

import { FreshnessBadge, LastUpdated, Refreshing } from '@/components/common/badges';
import { FlashNumber } from '@/components/common/FlashNumber';
import { useProfile, useQuote } from '@/hooks/useMarketData';
import { changeCls, fmtCap, fmtPct, fmtPrice, fmtSigned } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** Koyfin-style security header strip shown above the workspace grid:
 *  logo · name · ticker · exchange · live-ish price · key context. */
export function SecurityHeader() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data: profile } = useProfile(ticker);
  const { data: quote, dataUpdatedAt, isFetching } = useQuote(ticker);

  const watchlists = useTerminal((s) => s.watchlists);
  const activeWatchlistId = useTerminal((s) => s.activeWatchlistId);
  const addToWatchlist = useTerminal((s) => s.addToWatchlist);
  const removeFromWatchlist = useTerminal((s) => s.removeFromWatchlist);
  const inWatchlist = watchlists
    .find((w) => w.id === activeWatchlistId)
    ?.items.some((i) => i.symbol === ticker);

  if (!ticker) return null;

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-bd bg-panel px-3">
      <Logo ticker={ticker} url={profile?.logoUrl} />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{profile?.name ?? ticker}</span>
          <span className="font-mono text-[11px] font-bold text-accent">{ticker}</span>
          {profile?.exchange && (
            <span className="hidden text-[10px] uppercase text-muted sm:inline">{profile.exchange}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <FreshnessBadge realtime={quote?.realtime} />
          <LastUpdated ts={dataUpdatedAt} />
          <Refreshing active={isFetching} />
        </div>
      </div>

      <div className="flex items-baseline gap-2 border-l border-bd pl-4">
        <FlashNumber value={quote?.price} format={fmtPrice} className="font-mono text-xl font-bold" />
        <span className={cn('font-mono text-xs font-semibold tabular-nums', changeCls(quote?.change))}>
          {fmtSigned(quote?.change)} ({fmtPct(quote?.changePct)})
        </span>
      </div>

      <div className="ml-auto hidden items-center gap-5 xl:flex">
        <Stat label="Next earnings" value={profile?.nextEarnings ?? '—'} mono />
        <Stat label="Sector" value={profile?.sector ?? '—'} />
        <Stat label="Industry" value={profile?.industry ?? '—'} className="max-w-44" />
        <Stat label="Mkt cap" value={fmtCap(profile?.marketCap)} mono />
      </div>

      <button
        onClick={() =>
          inWatchlist
            ? removeFromWatchlist(ticker)
            : addToWatchlist({ symbol: ticker, name: profile?.name })
        }
        title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        className={cn(
          'flex items-center gap-1.5 rounded border px-2 py-1 text-[11px]',
          inWatchlist
            ? 'border-warn/50 bg-warn/10 text-warn'
            : 'border-bd bg-panel2 text-muted hover:border-accent/50 hover:text-accent',
        )}
      >
        <Star size={12} fill={inWatchlist ? 'currentColor' : 'none'} />
        <span className="hidden lg:inline">{inWatchlist ? 'Watching' : 'Watch'}</span>
      </button>
    </div>
  );
}

function Logo({ ticker, url }: { ticker: string; url: string | null | undefined }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent/15 font-mono text-sm font-bold text-accent">
        {ticker.replace(/[^A-Z]/g, '').charAt(0) || '#'}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setBroken(true)}
      className="h-8 w-8 shrink-0 rounded bg-panel2 object-contain p-1"
    />
  );
}

function Stat({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 leading-tight', className)}>
      <div className="text-[9px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn('truncate text-xs', mono && 'font-mono tabular-nums')}>{value}</div>
    </div>
  );
}
