import { Download } from 'lucide-react';

import { api } from '@/lib/api';
import { downloadCSV, toCSV } from '@/lib/csv';
import { useTerminal } from '@/stores/terminal';

/** XLS — export terminal data to CSV (opens in Excel / Sheets / Numbers).
 *  Pulls fresh quotes where needed so exports reflect current values. */
export function XlsPanel() {
  const watchlists = useTerminal((s) => s.watchlists);
  const activeWatchlistId = useTerminal((s) => s.activeWatchlistId);
  const holdings = useTerminal((s) => s.holdings);
  const paperPositions = useTerminal((s) => s.paperPositions);
  const paperOrders = useTerminal((s) => s.paperOrders);

  const list = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];

  const exportWatchlist = async () => {
    const syms = list?.items.map((i) => i.symbol) ?? [];
    const quotes = syms.length ? await api.quotes(syms) : [];
    const byId = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
    const rows = (list?.items ?? []).map((i) => {
      const q = byId[i.symbol];
      return [i.symbol, i.name ?? '', q?.price ?? '', q?.change ?? '', q?.changePct ?? '', q?.volume ?? ''];
    });
    downloadCSV(`watchlist-${list?.name ?? 'list'}`, toCSV(['Symbol', 'Name', 'Last', 'Change', 'Change%', 'Volume'], rows));
  };

  const exportPortfolio = async () => {
    const syms = holdings.map((h) => h.symbol);
    const quotes = syms.length ? await api.quotes(syms) : [];
    const byId = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
    const rows = holdings.map((h) => {
      const price = byId[h.symbol]?.price ?? null;
      const value = price != null ? price * h.shares : '';
      const pl = price != null ? (price - h.cost) * h.shares : '';
      return [h.symbol, h.shares, h.cost, price ?? '', value, pl];
    });
    downloadCSV('portfolio', toCSV(['Symbol', 'Shares', 'AvgCost', 'Last', 'MarketValue', 'UnrealizedPL'], rows));
  };

  const exportPaper = () => {
    const rows = paperOrders.map((o) => [new Date(o.ts).toISOString(), o.side, o.symbol, o.shares, o.price]);
    downloadCSV('paper-orders', toCSV(['Time', 'Side', 'Symbol', 'Shares', 'Price'], rows));
  };

  const items: { label: string; sub: string; onClick: () => void; count: number }[] = [
    { label: 'Watchlist', sub: list?.name ?? '—', onClick: exportWatchlist, count: list?.items.length ?? 0 },
    { label: 'Portfolio holdings', sub: 'PORT positions', onClick: exportPortfolio, count: holdings.length },
    { label: 'Paper order blotter', sub: 'PAPER orders', onClick: exportPaper, count: paperOrders.length },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Export</span>
        <span className="text-[10px] text-faint">Download as CSV</span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            disabled={it.count === 0}
            className="flex items-center gap-3 rounded border border-bd bg-panel2/30 px-3 py-2 text-left hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} className="text-accent" />
            <div className="flex-1">
              <div className="text-xs font-medium">{it.label}</div>
              <div className="text-[10px] text-muted">{it.sub} · {it.count} row{it.count === 1 ? '' : 's'}</div>
            </div>
            <span className="font-mono text-[10px] text-faint">.csv</span>
          </button>
        ))}
        <p className="mt-1 text-[9px] text-faint">{paperPositions.length} open paper position(s). CSV opens directly in Excel, Google Sheets and Numbers.</p>
      </div>
    </div>
  );
}
