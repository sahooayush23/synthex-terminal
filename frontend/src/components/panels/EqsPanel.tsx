import { useMemo, useState } from 'react';

import { Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useUniverse } from '@/hooks/useMarketData';
import type { UniverseRow } from '@/lib/api';
import { fmtBig } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

type SortKey = 'symbol' | 'marketCap' | 'peTrailing' | 'beta' | 'divYieldPct';

/** EQS — equity screener over the large-cap universe with sortable columns and
 *  sector + max-P/E filters. */
export function EqsPanel() {
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);
  const { data, isLoading, isError, refetch, isFetching } = useUniverse();

  const [sector, setSector] = useState('All');
  const [maxPe, setMaxPe] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'marketCap', dir: -1 });

  const sectors = useMemo(() => ['All', ...new Set((data?.rows ?? []).map((r) => r.sector).filter(Boolean))] as string[], [data]);

  const rows = useMemo(() => {
    let r = [...(data?.rows ?? [])];
    if (sector !== 'All') r = r.filter((x) => x.sector === sector);
    const pe = parseFloat(maxPe);
    if (!isNaN(pe)) r = r.filter((x) => x.peTrailing != null && x.peTrailing <= pe);
    r.sort((a, b) => {
      const av = sort.key === 'symbol' ? a.symbol : (a[sort.key] ?? -Infinity);
      const bv = sort.key === 'symbol' ? b.symbol : (b[sort.key] ?? -Infinity);
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
    return r;
  }, [data, sector, maxPe, sort]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
  const arr = (k: SortKey) => (sort.key === k ? (sort.dir === 1 ? ' ↑' : ' ↓') : '');

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Screener</span>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="rounded border border-bd bg-bg px-1 py-0.5 text-[10px] text-fg focus:outline-none">
          {sectors.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={maxPe} onChange={(e) => setMaxPe(e.target.value)} placeholder="Max P/E" inputMode="decimal"
          className="w-16 rounded border border-bd bg-bg px-1 py-0.5 text-[10px] placeholder:text-faint focus:outline-none" />
        <span className="text-[10px] text-faint">{rows.length} results</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && <PanelSkeleton lines={10} />}
        {isError && <PanelError message="Couldn't load the screener." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-bd text-[9px] uppercase text-faint">
                {([['symbol', 'Ticker'], ['marketCap', 'Mkt Cap'], ['peTrailing', 'P/E'], ['beta', 'β'], ['divYieldPct', 'Yield']] as [SortKey, string][]).map(([k, l]) => (
                  <th key={k} onClick={() => toggle(k)} className={cn('cursor-pointer px-2 py-1 font-semibold hover:text-muted', k === 'symbol' ? 'text-left' : 'text-right')}>{l}{arr(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: UniverseRow) => (
                <tr key={r.symbol} onClick={() => { setActiveTicker(r.symbol); openFunction('DES', r.symbol); }} className="cursor-pointer border-b border-bd2/40 hover:bg-panel2">
                  <td className="px-2 py-1.5"><div className="font-mono font-semibold">{r.symbol}</div><div className="truncate text-[9px] text-faint">{r.sector ?? ''}</div></td>
                  <td className="px-2 py-1.5 text-right font-mono">${fmtBig(r.marketCap)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.peTrailing?.toFixed(1) ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.beta?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.divYieldPct != null ? `${r.divYieldPct.toFixed(2)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
