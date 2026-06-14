import { useState } from 'react';

import { LastUpdated, Refreshing } from '@/components/common/badges';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useFx } from '@/hooks/useMarketData';
import { changeCls, fmtPct } from '@/lib/format';
import { cn } from '@/lib/utils';

const BASES = ['USD', 'EUR', 'GBP', 'JPY'];

/** FX — currency rates from Frankfurter (ECB reference rates, keyless).
 *  Near-daily, not intraday — labelled live since it's the freshest free FX. */
export function FxPanel() {
  const [base, setBase] = useState('USD');
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useFx(base);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Currencies</span>
        <div className="flex items-center gap-0.5">
          {BASES.map((b) => (
            <button key={b} onClick={() => setBase(b)}
              className={cn('rounded px-1.5 py-0.5 font-mono text-[10px]',
                b === base ? 'bg-accent/15 font-bold text-accent' : 'text-muted hover:bg-panel2')}>
              {b}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Refreshing active={isFetching} />
          <span
            title="ECB reference rates via Frankfurter — published once per business day."
            className="rounded border border-bd px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted"
          >
            ECB · daily
          </span>
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <PanelSkeleton lines={10} />}
        {isError && <PanelError message="Couldn't load FX rates." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-bd text-[9px] uppercase text-faint">
                <th className="px-2 py-1 text-left font-semibold">Pair</th>
                <th className="px-1 py-1 text-center font-semibold">30D</th>
                <th className="px-2 py-1 text-right font-semibold">Rate</th>
                <th className="px-2 py-1 text-right font-semibold">1D%</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.pair} className="border-b border-bd2/40 hover:bg-panel2">
                  <td className="px-2 py-1.5">
                    <div className="font-mono font-semibold">{row.pair}</div>
                    <div className="text-[9px] text-faint">{row.label}</div>
                  </td>
                  <td className="px-1 py-1.5">
                    {row.spark.length > 1 && <Sparkline data={row.spark} width={56} height={20} className="h-5 w-14" />}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {row.rate != null ? row.rate.toFixed(row.rate > 50 ? 2 : 4) : '—'}
                  </td>
                  <td className={cn('px-2 py-1.5 text-right font-mono tabular-nums', changeCls(row.changePct))}>
                    {fmtPct(row.changePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="px-2 py-1.5 text-[9px] text-faint">ECB reference rates via Frankfurter — updated each business day.</p>
      </div>
    </div>
  );
}
