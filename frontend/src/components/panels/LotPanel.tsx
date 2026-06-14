import { useMemo } from 'react';

import { Refreshing } from '@/components/common/badges';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useSparks } from '@/hooks/useMarketData';
import { changeCls, fmtPct, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** LOT — Lots of Charts: a small-multiples wall of 1-month mini-charts for the
 *  active watchlist. Click a tile to load it into the main chart. */
export function LotPanel() {
  const watchlists = useTerminal((s) => s.watchlists);
  const activeWatchlistId = useTerminal((s) => s.activeWatchlistId);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);

  const symbols = useMemo(() => {
    const list = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];
    return list?.items.map((i) => i.symbol) ?? [];
  }, [watchlists, activeWatchlistId]);

  const { data, isLoading, isError, refetch, isFetching } = useSparks(symbols);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Lots of Charts</span>
        <span className="text-[10px] text-faint">Watchlist · 1-month</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading && <PanelSkeleton lines={8} />}
        {isError && <PanelError message="Couldn't load charts." onRetry={() => refetch()} />}
        {data && !isLoading && (
          data.rows.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11px] text-muted">Add tickers to your watchlist to populate this wall.</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1.5">
              {data.rows.map((r) => (
                <button key={r.symbol} onClick={() => { setActiveTicker(r.symbol); openFunction('GP', r.symbol); }}
                  className="flex flex-col rounded border border-bd bg-panel2/30 p-1.5 text-left hover:border-accent/50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-bold">{r.symbol}</span>
                    <span className={cn('font-mono text-[10px]', changeCls(r.changePct))}>{fmtPct(r.changePct)}</span>
                  </div>
                  <div className="my-1 h-10">{r.spark.length > 1 && <Sparkline data={r.spark} height={40} className="h-10 w-full" />}</div>
                  <span className="font-mono text-[10px] tabular-nums text-muted">{fmtPrice(r.last)}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
