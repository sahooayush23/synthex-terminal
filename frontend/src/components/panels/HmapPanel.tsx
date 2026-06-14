import { useMemo } from 'react';

import { Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useMovers } from '@/hooks/useMarketData';
import { fmtPct } from '@/lib/format';
import { useTerminal } from '@/stores/terminal';

/** HMAP — market heatmap: a tile per large-cap name, colored by 1-day return
 *  (green up / red down, intensity by magnitude). */
export function HmapPanel() {
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useMovers();

  const tiles = useMemo(() => {
    const all = [...(data?.gainers ?? []), ...(data?.losers ?? [])];
    const seen = new Set<string>();
    return all
      .filter((r) => (seen.has(r.symbol) ? false : (seen.add(r.symbol), true)))
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Market Heatmap</span>
        <span className="text-[10px] text-faint">Large caps · 1-day return</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading && <PanelSkeleton lines={8} />}
        {isError && <PanelError message="Couldn't load heatmap." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
            {tiles.map((t) => {
              const pct = t.changePct ?? 0;
              const intensity = Math.min(0.85, 0.18 + Math.abs(pct) / 8);
              const color = pct >= 0 ? `color-mix(in srgb, var(--t-up) ${intensity * 100}%, var(--t-panel))`
                : `color-mix(in srgb, var(--t-down) ${intensity * 100}%, var(--t-panel))`;
              return (
                <button
                  key={t.symbol}
                  onClick={() => { setActiveTicker(t.symbol); openFunction('DES', t.symbol); }}
                  style={{ backgroundColor: color }}
                  className="flex aspect-square flex-col items-center justify-center rounded border border-bd2/40 p-1 hover:border-fg/30"
                >
                  <span className="font-mono text-[11px] font-bold text-fg">{t.symbol}</span>
                  <span className="font-mono text-[10px] text-fg/90">{fmtPct(pct)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
