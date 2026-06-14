import { useMemo } from 'react';

import { Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useCalendar } from '@/hooks/useMarketData';
import { useTerminal } from '@/stores/terminal';

/** CAL — upcoming earnings calendar for the active watchlist (yfinance). */
export function CalPanel() {
  const watchlists = useTerminal((s) => s.watchlists);
  const activeWatchlistId = useTerminal((s) => s.activeWatchlistId);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);

  const symbols = useMemo(() => {
    const list = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];
    return list?.items.map((i) => i.symbol) ?? [];
  }, [watchlists, activeWatchlistId]);

  const { data, isLoading, isError, refetch, isFetching } = useCalendar(symbols);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Earnings Calendar</span>
        <span className="text-[10px] text-faint">Your watchlist · {symbols.length} names</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <PanelSkeleton lines={8} />}
        {isError && <PanelError message="Couldn't load the calendar." onRetry={() => refetch()} />}
        {data && !isLoading && (
          data.rows.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted">No upcoming earnings dates found for your watchlist.</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Date</th><th className="px-2 py-1 text-left font-semibold">Ticker</th><th className="px-2 py-1 text-right font-semibold">In</th></tr></thead>
              <tbody>
                {data.rows.map((r) => {
                  const days = Math.round((new Date(r.date).getTime() - new Date(today).getTime()) / 86400000);
                  return (
                    <tr key={r.symbol} onClick={() => { setActiveTicker(r.symbol); openFunction('EE', r.symbol); }} className="cursor-pointer border-b border-bd2/40 hover:bg-panel2">
                      <td className="px-2 py-1.5 font-mono text-muted">{r.date}</td>
                      <td className="px-2 py-1.5 font-mono font-semibold">{r.symbol}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-faint">{days >= 0 ? `${days}d` : 'past'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
