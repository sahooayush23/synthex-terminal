import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

import { FreshnessBadge, Refreshing } from '@/components/common/badges';
import { useQuotes } from '@/hooks/useMarketData';
import { changeCls, fmtBig, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

const SECTOR_HUES = ['#5b9cff', '#26a69a', '#f2a33c', '#ef5350', '#9c6ade', '#26c6da', '#66bb6a', '#ec407a'];

/** PORT — portfolio analytics. Enter holdings (persisted to localStorage),
 *  see live market value, P/L and allocation. No real money — tracking only. */
export function PortPanel() {
  const holdings = useTerminal((s) => s.holdings);
  const addHolding = useTerminal((s) => s.addHolding);
  const removeHolding = useTerminal((s) => s.removeHolding);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);

  const symbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);
  const { data: quotes, isFetching } = useQuotes(symbols, 20_000);

  const rows = useMemo(
    () =>
      holdings.map((h) => {
        const q = quotes?.[h.symbol];
        const price = q?.price ?? null;
        const value = price != null ? price * h.shares : null;
        const costBasis = h.cost * h.shares;
        const pl = value != null ? value - costBasis : null;
        const plPct = value != null && costBasis > 0 ? (pl! / costBasis) * 100 : null;
        return { ...h, price, value, costBasis, pl, plPct, dayPct: q?.changePct ?? null };
      }),
    [holdings, quotes],
  );

  const totals = useMemo(() => {
    let value = 0;
    let cost = 0;
    let known = true;
    for (const r of rows) {
      if (r.value == null) known = false;
      value += r.value ?? 0;
      cost += r.costBasis;
    }
    return { value, cost, pl: value - cost, plPct: cost > 0 ? ((value - cost) / cost) * 100 : 0, known };
  }, [rows]);

  const live = !!quotes && Object.values(quotes).some((q) => q.realtime);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Portfolio</span>
        <span className="text-[10px] text-faint">Tracking only · no real money</span>
        <div className="ml-auto flex items-center gap-2"><Refreshing active={isFetching} /><FreshnessBadge realtime={live} /></div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-1.5 border-b border-bd2 p-2">
        <Summary label="Market Value" value={totals.known ? `$${fmtBig(totals.value)}` : '—'} />
        <Summary label="Total P/L" value={totals.known ? `${totals.pl >= 0 ? '+' : ''}$${fmtBig(Math.abs(totals.pl))}` : '—'} tone={totals.pl >= 0 ? 'up' : 'down'} />
        <Summary label="Return" value={totals.known ? `${totals.plPct >= 0 ? '+' : ''}${totals.plPct.toFixed(2)}%` : '—'} tone={totals.plPct >= 0 ? 'up' : 'down'} />
      </div>

      {/* Allocation bar */}
      {totals.known && totals.value > 0 && (
        <div className="flex h-2 overflow-hidden border-b border-bd2">
          {rows.map((r, i) => (
            <div key={r.symbol} title={`${r.symbol} ${(((r.value ?? 0) / totals.value) * 100).toFixed(1)}%`}
              style={{ width: `${((r.value ?? 0) / totals.value) * 100}%`, backgroundColor: SECTOR_HUES[i % SECTOR_HUES.length] }} />
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted">No holdings yet. Add one below.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Position</th><th className="px-2 py-1 text-right font-semibold">Last</th><th className="px-2 py-1 text-right font-semibold">Value</th><th className="px-2 py-1 text-right font-semibold">P/L</th><th className="w-6" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="group border-b border-bd2/40 hover:bg-panel2">
                  <td className="cursor-pointer px-2 py-1.5" onClick={() => { setActiveTicker(r.symbol); openFunction('DES', r.symbol); }}>
                    <div className="font-mono font-semibold">{r.symbol}</div>
                    <div className="text-[9px] text-faint">{r.shares} sh @ ${r.cost.toFixed(2)}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono"><div>{fmtPrice(r.price)}</div><div className={cn('text-[9px]', changeCls(r.dayPct))}>{r.dayPct != null ? `${r.dayPct >= 0 ? '+' : ''}${r.dayPct.toFixed(2)}%` : ''}</div></td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.value != null ? `$${fmtBig(r.value)}` : '—'}</td>
                  <td className={cn('px-2 py-1.5 text-right font-mono', changeCls(r.pl))}>
                    {r.pl != null ? <><div>{r.pl >= 0 ? '+' : ''}${fmtBig(Math.abs(r.pl))}</div><div className="text-[9px]">{r.plPct! >= 0 ? '+' : ''}{r.plPct!.toFixed(1)}%</div></> : '—'}
                  </td>
                  <td className="px-1 text-center"><button onClick={() => removeHolding(r.symbol)} title="Remove" className="text-faint opacity-0 hover:text-down group-hover:opacity-100"><X size={11} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddHolding onAdd={addHolding} />
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded border border-bd bg-panel2/30 px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums', tone === 'up' && 'text-up', tone === 'down' && 'text-down')}>{value}</div>
    </div>
  );
}

function AddHolding({ onAdd }: { onAdd: (h: { symbol: string; shares: number; cost: number }) => void }) {
  const [sym, setSym] = useState('');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const submit = () => {
    const s = parseFloat(shares);
    const c = parseFloat(cost);
    if (sym.trim() && !isNaN(s) && s > 0 && !isNaN(c)) {
      onAdd({ symbol: sym, shares: s, cost: c });
      setSym('');
      setShares('');
      setCost('');
    }
  };
  return (
    <div className="flex items-center gap-1 border-t border-bd bg-panel2/40 p-1.5">
      <input value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} placeholder="Ticker" className="w-16 rounded border border-bd bg-bg px-1.5 py-1 font-mono text-[11px] uppercase placeholder:text-faint focus:border-accent/60 focus:outline-none" />
      <input value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Shares" inputMode="decimal" className="w-16 rounded border border-bd bg-bg px-1.5 py-1 text-[11px] placeholder:text-faint focus:border-accent/60 focus:outline-none" />
      <input value={cost} onChange={(e) => setCost(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Avg cost" inputMode="decimal" className="w-20 rounded border border-bd bg-bg px-1.5 py-1 text-[11px] placeholder:text-faint focus:border-accent/60 focus:outline-none" />
      <button onClick={submit} className="ml-auto flex items-center gap-1 rounded bg-accent/20 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/30"><Plus size={11} /> Add</button>
    </div>
  );
}
