import { useMemo } from 'react';

import { Refreshing } from '@/components/common/badges';
import { Scatter } from '@/components/common/Scatter';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useUniverse } from '@/hooks/useMarketData';
import { useTerminal } from '@/stores/terminal';

// Distinct hues per sector for the scatter legend/points.
const SECTOR_COLORS: Record<string, string> = {
  Technology: '#5b9cff', 'Financial Services': '#26a69a', Healthcare: '#ef5350',
  'Consumer Cyclical': '#f2a33c', 'Consumer Defensive': '#9c6ade', 'Communication Services': '#26c6da',
  Energy: '#ffa726', Industrials: '#8d99ae', 'Basic Materials': '#66bb6a', Utilities: '#78909c',
  'Real Estate': '#ec407a',
};
const colorFor = (sector: string | null) => (sector && SECTOR_COLORS[sector]) || '#8b93a6';

/** SCAT — valuation scatter: trailing P/E (x) vs Beta / risk (y), colored by
 *  sector, over the large-cap universe. */
export function ScatPanel() {
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);
  const { data, isLoading, isError, refetch, isFetching } = useUniverse();

  const points = useMemo(
    () =>
      (data?.rows ?? [])
        .filter((r) => r.peTrailing != null && r.beta != null && r.peTrailing > 0 && r.peTrailing < 120)
        .map((r) => ({ symbol: r.symbol, x: r.peTrailing as number, y: r.beta as number, color: colorFor(r.sector) })),
    [data],
  );
  const sectors = useMemo(() => [...new Set((data?.rows ?? []).map((r) => r.sector).filter(Boolean))] as string[], [data]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Market Scatter</span>
        <span className="text-[10px] text-faint">Valuation (P/E) vs Risk (β)</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 p-2">
        {isLoading && <PanelSkeleton lines={8} />}
        {isError && <PanelError message="Couldn't load scatter universe." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <Scatter data={points} xLabel="Trailing P/E" yLabel="Beta (β)" xRef={undefined} onPick={(s) => { setActiveTicker(s); openFunction('DES', s); }} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
              {sectors.map((s) => (
                <span key={s} className="flex items-center gap-1 text-[9px] text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorFor(s) }} />{s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
