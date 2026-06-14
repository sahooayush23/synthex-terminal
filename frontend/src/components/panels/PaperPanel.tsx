import { useMemo, useState } from 'react';

import { FreshnessBadge, Refreshing } from '@/components/common/badges';
import { useQuotes } from '@/hooks/useMarketData';
import { changeCls, fmtBig, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dialog } from '@/stores/dialog';
import { useTerminal } from '@/stores/terminal';

/** PAPER — simulated trading only (no real money, ever). Market orders fill at
 *  the live quote; cash, positions and the order blotter persist locally. */
export function PaperPanel() {
  const cash = useTerminal((s) => s.paperCash);
  const positions = useTerminal((s) => s.paperPositions);
  const orders = useTerminal((s) => s.paperOrders);
  const place = useTerminal((s) => s.placePaperOrder);
  const reset = useTerminal((s) => s.resetPaper);
  const activeTicker = useTerminal((s) => s.activeTicker);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);

  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const { data: quotes, isFetching } = useQuotes(symbols, 20_000);
  const { data: activeQuote } = useQuotes([activeTicker], 15_000);

  const [sym, setSym] = useState(activeTicker);
  const [qty, setQty] = useState('');

  const livePrice = (quotes?.[sym.toUpperCase()] ?? activeQuote?.[sym.toUpperCase()])?.price ?? null;

  const rows = positions.map((p) => {
    const price = quotes?.[p.symbol]?.price ?? null;
    const value = price != null ? price * p.shares : null;
    const pl = value != null ? value - p.avgCost * p.shares : null;
    const plPct = pl != null && p.avgCost > 0 ? (pl / (p.avgCost * p.shares)) * 100 : null;
    return { ...p, price, value, pl, plPct };
  });
  const posValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const equity = cash + posValue;
  const totalPL = equity - 100_000;
  const live = !!quotes && Object.values(quotes).some((q) => q.realtime);

  const order = async (side: 'buy' | 'sell') => {
    const symbol = sym.trim().toUpperCase();
    const shares = parseFloat(qty);
    // Use the freshest price we have for this symbol.
    const px = (quotes?.[symbol] ?? activeQuote?.[symbol])?.price ?? livePrice;
    if (px == null) {
      await dialog.alert({ title: 'No price', message: `Couldn't get a live price for ${symbol}.` });
      return;
    }
    const err = place(side, symbol, shares, px);
    if (err) await dialog.alert({ title: 'Order rejected', message: err });
    else setQty('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Paper Trading</span>
        <span className="text-[10px] text-faint">Simulated · no real money</span>
        <div className="ml-auto flex items-center gap-2"><Refreshing active={isFetching} /><FreshnessBadge realtime={live} /></div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 border-b border-bd2 p-2">
        <Stat label="Equity" value={`$${fmtBig(equity)}`} />
        <Stat label="Cash" value={`$${fmtBig(cash)}`} />
        <Stat label="Total P/L" value={`${totalPL >= 0 ? '+' : ''}$${fmtBig(Math.abs(totalPL))}`} tone={totalPL >= 0 ? 'up' : 'down'} />
      </div>

      {/* Order ticket */}
      <div className="flex flex-wrap items-center gap-1 border-b border-bd2 bg-panel2/40 p-1.5">
        <input value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} placeholder="Ticker" className="w-16 rounded border border-bd bg-bg px-1.5 py-1 font-mono text-[11px] uppercase focus:border-accent/60 focus:outline-none" />
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" inputMode="decimal" className="w-14 rounded border border-bd bg-bg px-1.5 py-1 text-[11px] focus:border-accent/60 focus:outline-none" />
        <span className="font-mono text-[10px] text-muted">@ {fmtPrice(livePrice)}</span>
        <button onClick={() => order('buy')} className="rounded bg-up/20 px-2.5 py-1 text-[11px] font-semibold text-up hover:bg-up/30">Buy</button>
        <button onClick={() => order('sell')} className="rounded bg-down/20 px-2.5 py-1 text-[11px] font-semibold text-down hover:bg-down/30">Sell</button>
        <button onClick={async () => { if (await dialog.confirm({ title: 'Reset account', message: 'Reset paper account to $100,000 and clear all positions & orders?', confirmText: 'Reset', danger: true })) reset(); }} className="ml-auto rounded border border-bd px-2 py-1 text-[10px] text-muted hover:text-fg">Reset</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length > 0 && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Position</th><th className="px-2 py-1 text-right font-semibold">Last</th><th className="px-2 py-1 text-right font-semibold">Value</th><th className="px-2 py-1 text-right font-semibold">P/L</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} onClick={() => { setActiveTicker(r.symbol); setSym(r.symbol); }} className="cursor-pointer border-b border-bd2/40 hover:bg-panel2">
                  <td className="px-2 py-1.5"><div className="font-mono font-semibold">{r.symbol}</div><div className="text-[9px] text-faint">{r.shares} @ ${r.avgCost.toFixed(2)}</div></td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmtPrice(r.price)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.value != null ? `$${fmtBig(r.value)}` : '—'}</td>
                  <td className={cn('px-2 py-1.5 text-right font-mono', changeCls(r.pl))}>{r.pl != null ? `${r.pl >= 0 ? '+' : ''}$${fmtBig(Math.abs(r.pl))} (${r.plPct!.toFixed(1)}%)` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {orders.length > 0 && (
          <div className="p-2">
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Order Blotter</h3>
            {orders.slice(0, 20).map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-bd2/40 py-1 text-[10px]">
                <span className={cn('font-semibold uppercase', o.side === 'buy' ? 'text-up' : 'text-down')}>{o.side}</span>
                <span className="font-mono">{o.shares} {o.symbol}</span>
                <span className="font-mono text-muted">@ {fmtPrice(o.price)}</span>
                <span className="font-mono text-faint">{new Date(o.ts).toLocaleTimeString('en-US', { hour12: false })}</span>
              </div>
            ))}
          </div>
        )}
        {rows.length === 0 && orders.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-muted">No positions yet. Place a simulated order above.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded border border-bd bg-panel2/30 px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums', tone === 'up' && 'text-up', tone === 'down' && 'text-down')}>{value}</div>
    </div>
  );
}
