import { LastUpdated, Refreshing } from '@/components/common/badges';
import { Scatter } from '@/components/common/Scatter';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useMovers } from '@/hooks/useMarketData';
import type { MoverRow } from '@/lib/api';
import { changeCls, fmtPct, fmtPrice, fmtSigned } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** MOV — Market Movers. A 1-day-return vs relative-volume scatter over a
 *  large-cap universe, with split Gainers / Losers tables below. */
export function MovPanel() {
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useMovers();

  const pick = (sym: string) => {
    setActiveTicker(sym);
    openFunction('DES', sym);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Market Movers</span>
        <span className="text-[10px] text-faint">Large-cap universe · {data?.count ?? '—'} names</span>
        <div className="ml-auto flex items-center gap-2">
          <Refreshing active={isFetching} />
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <PanelSkeleton lines={10} />}
        {isError && <PanelError message="Couldn't load market movers." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <>
            {/* Scatter */}
            <div className="border-b border-bd2 p-2">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-faint">
                1-Day Return vs Relative Volume
              </div>
              <div className="h-56">
                <Scatter
                  data={data.scatter.map((p) => ({ symbol: p.symbol, x: p.relVol, y: p.ret }))}
                  xLabel="Relative Volume (×)"
                  yLabel="1-Day Return (%)"
                  yZero={0}
                  xRef={1}
                  onPick={pick}
                />
              </div>
            </div>

            {/* Gainers / Losers */}
            <div className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-2">
              <MoverTable title="Gainers" rows={data.gainers} accent="up" onPick={pick} />
              <MoverTable title="Losers" rows={data.losers} accent="down" onPick={pick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MoverTable({
  title,
  rows,
  accent,
  onPick,
}: {
  title: string;
  rows: MoverRow[];
  accent: 'up' | 'down';
  onPick: (s: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded border border-bd">
      <div className={cn('flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider',
        accent === 'up' ? 'bg-up/10 text-up' : 'bg-down/10 text-down')}>
        <span>{title}</span>
        <span className="text-faint">{rows.length}</span>
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase text-faint">
            <th className="px-2 py-1 text-left font-semibold">Ticker</th>
            <th className="px-2 py-1 text-right font-semibold">Last</th>
            <th className="px-2 py-1 text-right font-semibold">Chg</th>
            <th className="px-2 py-1 text-right font-semibold">Chg%</th>
            <th className="px-2 py-1 text-right font-semibold">RVol</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} onClick={() => onPick(r.symbol)} className="cursor-pointer border-t border-bd2/40 hover:bg-panel2">
              <td className="px-2 py-1 font-mono font-semibold">{r.symbol}</td>
              <td className="px-2 py-1 text-right font-mono tabular-nums">{fmtPrice(r.last)}</td>
              <td className={cn('px-2 py-1 text-right font-mono tabular-nums', changeCls(r.change))}>{fmtSigned(r.change)}</td>
              <td className={cn('px-2 py-1 text-right font-mono tabular-nums', changeCls(r.changePct))}>{fmtPct(r.changePct)}</td>
              <td className="px-2 py-1 text-right font-mono tabular-nums text-muted">{r.relVol != null ? `${r.relVol.toFixed(2)}x` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
