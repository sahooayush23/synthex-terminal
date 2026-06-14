import { useState } from 'react';

import { Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useOptions } from '@/hooks/useMarketData';
import type { OptionRow } from '@/lib/api';
import { fmtBig, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** OMON — options monitor. Chain (calls/puts) for an expiration with implied
 *  volatility, volume, open interest and Black-Scholes delta/gamma. Delayed. */
export function OmonPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const [exp, setExp] = useState<string | undefined>(undefined);
  const [side, setSide] = useState<'calls' | 'puts'>('calls');
  const { data, isLoading, isError, refetch, isFetching } = useOptions(ticker, exp);

  if (isLoading) return <PanelSkeleton lines={10} />;
  if (isError || !data) return <PanelError message={`Couldn't load options for ${ticker}.`} onRetry={() => refetch()} />;
  if (data.expirations.length === 0) return <PanelError message={`No listed options for ${ticker}.`} />;

  const rows = side === 'calls' ? data.calls : data.puts;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="text-[10px] text-faint">Spot {fmtPrice(data.spot)}</span>
        <select value={data.expiration ?? ''} onChange={(e) => setExp(e.target.value)} className="rounded border border-bd bg-bg px-1 py-0.5 font-mono text-[10px] text-fg focus:outline-none">
          {data.expirations.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex items-center gap-0.5 rounded border border-bd p-0.5">
          {(['calls', 'puts'] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)} className={cn('rounded px-2 py-0.5 text-[10px] font-semibold uppercase', side === s ? (s === 'calls' ? 'bg-up/20 text-up' : 'bg-down/20 text-down') : 'text-muted hover:text-fg')}>{s}</button>
          ))}
        </div>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-bd text-[9px] uppercase text-faint">
              <th className="px-2 py-1 text-right font-semibold">Strike</th>
              <th className="px-2 py-1 text-right font-semibold">Last</th>
              <th className="px-2 py-1 text-right font-semibold">IV</th>
              <th className="px-2 py-1 text-right font-semibold">Δ</th>
              <th className="px-2 py-1 text-right font-semibold">Γ</th>
              <th className="px-2 py-1 text-right font-semibold">Vol</th>
              <th className="px-2 py-1 text-right font-semibold">OI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: OptionRow, i) => (
              <tr key={i} className={cn('border-b border-bd2/40', r.inTheMoney && 'bg-accent/5')}>
                <td className={cn('px-2 py-1 text-right font-mono font-semibold', r.inTheMoney && 'text-accent')}>{fmtPrice(r.strike)}</td>
                <td className="px-2 py-1 text-right font-mono">{fmtPrice(r.last)}</td>
                <td className="px-2 py-1 text-right font-mono text-muted">{r.iv != null ? `${r.iv}%` : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-muted">{r.delta != null ? r.delta.toFixed(2) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-muted">{r.gamma != null ? r.gamma.toFixed(3) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-muted">{fmtBig(r.volume)}</td>
                <td className="px-2 py-1 text-right font-mono text-muted">{fmtBig(r.openInterest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
