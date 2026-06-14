import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { FreshnessBadge, Refreshing } from '@/components/common/badges';
import { useSearch } from '@/hooks/useMarketData';
import { useQuotes } from '@/hooks/useMarketData';
import type { Quote } from '@/lib/api';
import { changeCls, fmtPct, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dialog } from '@/stores/dialog';
import { useTerminal } from '@/stores/terminal';

type SortKey = 'symbol' | 'price' | 'changePct';

/** Right-rail watchlist — multiple named lists, color-coded 1D%, sortable,
 *  add/remove with autocomplete. Persisted to localStorage via the store. */
export function WatchlistPanel() {
  const setWatchlistOpen = useTerminal((s) => s.setWatchlistOpen);
  const watchlists = useTerminal((s) => s.watchlists);
  const activeWatchlistId = useTerminal((s) => s.activeWatchlistId);
  const setActiveWatchlist = useTerminal((s) => s.setActiveWatchlist);
  const createWatchlist = useTerminal((s) => s.createWatchlist);
  const deleteWatchlist = useTerminal((s) => s.deleteWatchlist);
  const removeFromWatchlist = useTerminal((s) => s.removeFromWatchlist);
  const activeTicker = useTerminal((s) => s.activeTicker);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);

  const list = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];
  const symbols = useMemo(() => list?.items.map((i) => i.symbol) ?? [], [list]);
  const { data: quotes, isFetching } = useQuotes(symbols, 20_000);

  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'symbol', dir: 1 });
  const [menuOpen, setMenuOpen] = useState(false);

  const rows = useMemo(() => {
    const items = [...(list?.items ?? [])];
    items.sort((a, b) => {
      const qa = quotes?.[a.symbol];
      const qb = quotes?.[b.symbol];
      let av: number | string;
      let bv: number | string;
      if (sort.key === 'symbol') {
        av = a.symbol;
        bv = b.symbol;
      } else {
        av = qa?.[sort.key] ?? -Infinity;
        bv = qb?.[sort.key] ?? -Infinity;
      }
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
    return items;
  }, [list, quotes, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-l border-bd bg-panel">
      {/* Header: list selector + collapse */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-bd px-2">
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-panel2"
          >
            {menuOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="truncate text-xs font-semibold">{list?.name ?? 'Watchlist'}</span>
            <span className="ml-1 text-[10px] text-faint">{symbols.length}</span>
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded border border-bd bg-panel2 shadow-xl">
              {watchlists.map((w) => (
                <div
                  key={w.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 hover:bg-bd/40',
                    w.id === activeWatchlistId && 'bg-accent/10',
                  )}
                >
                  <button
                    onClick={() => {
                      setActiveWatchlist(w.id);
                      setMenuOpen(false);
                    }}
                    className="flex-1 truncate text-left text-xs"
                  >
                    {w.name} <span className="text-[10px] text-faint">({w.items.length})</span>
                  </button>
                  {watchlists.length > 1 && (
                    <button
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Delete Watchlist',
                          message: `Delete “${w.name}” and its ${w.items.length} ticker(s)? This can't be undone.`,
                          confirmText: 'Delete',
                          danger: true,
                        });
                        if (ok) deleteWatchlist(w.id);
                      }}
                      title="Delete list"
                      className="text-faint hover:text-down"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  const name = await dialog.prompt({
                    title: 'New Watchlist',
                    placeholder: 'e.g. Tech Leaders',
                    confirmText: 'Create',
                  });
                  if (name) createWatchlist(name);
                }}
                className="flex w-full items-center gap-1.5 border-t border-bd px-2 py-1.5 text-left text-xs text-accent hover:bg-bd/40"
              >
                <Plus size={12} /> New watchlist
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          title="Add ticker"
          className="rounded p-1 text-muted hover:bg-panel2 hover:text-accent"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => setWatchlistOpen(false)}
          title="Collapse watchlist"
          className="rounded p-1 text-muted hover:bg-panel2 hover:text-fg"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {adding && <AddTicker onClose={() => setAdding(false)} />}

      {/* Column headers */}
      <div className="flex items-center border-b border-bd bg-panel2/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
        <button onClick={() => toggleSort('symbol')} className="flex-1 text-left hover:text-muted">
          Security {sort.key === 'symbol' && (sort.dir === 1 ? '↑' : '↓')}
        </button>
        <button onClick={() => toggleSort('price')} className="w-16 text-right hover:text-muted">
          Last {sort.key === 'price' && (sort.dir === 1 ? '↑' : '↓')}
        </button>
        <button onClick={() => toggleSort('changePct')} className="w-14 text-right hover:text-muted">
          1D% {sort.key === 'changePct' && (sort.dir === 1 ? '↑' : '↓')}
        </button>
      </div>

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-muted">
            Empty list. Click <Plus size={10} className="inline" /> to add a ticker.
          </div>
        )}
        {rows.map((item) => (
          <Row
            key={item.symbol}
            symbol={item.symbol}
            name={item.name}
            quote={quotes?.[item.symbol]}
            active={item.symbol === activeTicker}
            onSelect={() => {
              setActiveTicker(item.symbol);
              openFunction('DES', item.symbol);
            }}
            onRemove={() => removeFromWatchlist(item.symbol)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-bd px-2 py-1">
        <FreshnessBadge realtime={!!quotes && Object.values(quotes).some((q) => q.realtime)} />
        <Refreshing active={isFetching} />
      </div>
    </aside>
  );
}

function Row({
  symbol,
  name,
  quote,
  active,
  onSelect,
  onRemove,
}: {
  symbol: string;
  name?: string;
  quote: Quote | undefined;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const pct = quote?.changePct;
  const up = pct != null && pct >= 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex cursor-pointer items-center border-b border-bd2/50 px-2 py-1.5 hover:bg-panel2',
        active && 'bg-accent/10',
        // Koyfin-style subtle row tint by direction
        pct != null && (up ? 'border-l-2 border-l-up/60' : 'border-l-2 border-l-down/60'),
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs font-semibold">{symbol}</div>
        <div className="truncate text-[10px] text-muted">{name ?? quote?.symbol ?? ''}</div>
      </div>
      <div className="w-16 text-right font-mono text-[11px] tabular-nums">{fmtPrice(quote?.price)}</div>
      <div className={cn('w-14 text-right font-mono text-[11px] tabular-nums', changeCls(pct))}>
        {fmtPct(pct)}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title={`Remove ${symbol}`}
        className="absolute right-1 rounded bg-panel p-0.5 text-faint opacity-0 hover:text-down group-hover:opacity-100"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function AddTicker({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const { data } = useSearch(q);
  const addToWatchlist = useTerminal((s) => s.addToWatchlist);
  const results = (data ?? []).slice(0, 6);

  const add = (symbol: string, name?: string) => {
    addToWatchlist({ symbol, name });
    setQ('');
    onClose();
  };

  return (
    <div className="border-b border-bd bg-panel2/60 p-2">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) add(q.trim().toUpperCase());
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Add ticker — e.g. NVDA"
        className="w-full rounded border border-bd bg-bg px-2 py-1 font-mono text-xs uppercase placeholder:font-sans placeholder:normal-case placeholder:text-faint focus:border-accent/60 focus:outline-none"
      />
      {results.length > 0 && (
        <div className="mt-1 overflow-hidden rounded border border-bd">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => add(r.symbol, r.name)}
              className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-bd/40"
            >
              <span className="font-mono text-xs font-semibold">{r.symbol}</span>
              <span className="truncate text-[10px] text-muted">{r.name}</span>
              <span className="ml-auto text-[9px] uppercase text-faint">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
