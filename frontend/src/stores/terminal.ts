/** Global terminal state — tabs, panels, layouts, watchlists, theme.
 *  Persisted to localStorage so the workspace survives reloads ($0 database). */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';

import { DEFAULT_PANEL_SIZE, findFunction } from '@/data/functions';

export type Theme = 'dark' | 'amber';

export interface PanelInstance {
  i: string; // grid item id
  code: string; // canonical function code
}

export interface WorkspaceTab {
  id: string;
  name: string;
  panels: PanelInstance[];
  layouts: Layout[];
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}

export interface Holding {
  symbol: string;
  shares: number;
  cost: number; // average cost per share
}

export interface PaperPosition {
  symbol: string;
  shares: number;
  avgCost: number;
}
export interface PaperOrder {
  id: string;
  side: 'buy' | 'sell';
  symbol: string;
  shares: number;
  price: number;
  ts: number;
}
const PAPER_START_CASH = 100_000;

export interface SavedGraph {
  id: string;
  name: string;
  ticker: string;
}
export interface Dashboard {
  id: string;
  name: string;
  panels: PanelInstance[];
  layouts: Layout[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Tiling window-manager placement ─────────────────────────────────
// Bloomberg/VS Code-style docking instead of document-flow stacking:
// a new panel fills available horizontal space first (shrinking to fit a
// gap if needed); only when the workspace is packed do we re-tile every
// panel into a balanced grid so existing panels auto-resize.
const COLS = 12;
type Rect = { x: number; y: number; w: number; h: number };

const overlaps = (a: Rect, b: Rect) =>
  !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

/** Find an empty slot *beside* existing panels (horizontal gap). Tries the
 *  preferred width first, then narrower widths down to minW, so a panel will
 *  shrink to fill a gap rather than spill below. Returns null if the occupied
 *  rows leave no horizontal room. */
function findHorizontalSlot(
  layouts: Layout[],
  prefW: number,
  h: number,
  minW: number,
): { x: number; y: number; w: number } | null {
  if (layouts.length === 0) return { x: 0, y: 0, w: prefW };
  const maxY = layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  for (let w = prefW; w >= minW; w--) {
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x + w <= COLS; x++) {
        const rect: Rect = { x, y, w, h };
        if (layouts.some((l) => overlaps(rect, l as Rect))) continue;
        // Must sit beside existing content (share rows) — not float below it.
        const beside = layouts.some((l) => !(l.y >= y + h || l.y + l.h <= y));
        if (beside) return { x, y, w };
      }
    }
  }
  return null;
}

/** Re-tile all panels into a balanced grid that fills the 12-col width:
 *  1→full, 2→halves, 3→thirds, 4→2×2, else→rows of 3. Each row's height is
 *  the tallest default among its panels; the last cell absorbs any remainder. */
function tileLayouts(panels: PanelInstance[]): Layout[] {
  const n = panels.length;
  if (n === 0) return [];
  const perRow = n === 1 ? 1 : n === 2 ? 2 : n === 4 ? 2 : Math.min(n, 3);
  const out: Layout[] = [];
  let idx = 0;
  let y = 0;
  while (idx < n) {
    const items = Math.min(perRow, n - idx);
    const base = Math.floor(COLS / items);
    let rowH = 0;
    for (let c = 0; c < items; c++) rowH = Math.max(rowH, DEFAULT_PANEL_SIZE[panels[idx + c].code]?.h ?? 10);
    let x = 0;
    for (let c = 0; c < items; c++, idx++) {
      const def = DEFAULT_PANEL_SIZE[panels[idx].code];
      const w = c === items - 1 ? COLS - x : base;
      out.push({ i: panels[idx].i, x, y, w, h: rowH, minW: def?.minW ?? 3, minH: def?.minH ?? 5 });
      x += base;
    }
    y += rowH;
  }
  return out;
}

const DEFAULT_TABS: WorkspaceTab[] = [
  {
    id: 'main',
    name: 'Main',
    panels: [
      { i: 'gp-default', code: 'GP' },
      { i: 'des-default', code: 'DES' },
    ],
    layouts: [
      { i: 'gp-default', x: 0, y: 0, w: 8, h: 14, minW: 4, minH: 8 },
      { i: 'des-default', x: 8, y: 0, w: 4, h: 14, minW: 3, minH: 6 },
    ],
  },
];

const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: 'default',
    name: 'My Watchlist',
    items: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    ],
  },
];

interface TerminalState {
  theme: Theme;
  sidebarCollapsed: boolean;
  watchlistOpen: boolean;
  activeTicker: string;
  tabs: WorkspaceTab[];
  activeTabId: string;
  watchlists: Watchlist[];
  activeWatchlistId: string;
  holdings: Holding[];
  paperCash: number;
  paperPositions: PaperPosition[];
  paperOrders: PaperOrder[];
  savedGraphs: SavedGraph[];
  dashboards: Dashboard[];

  toggleTheme: () => void;
  toggleSidebar: () => void;
  setWatchlistOpen: (open: boolean) => void;
  setActiveTicker: (symbol: string) => void;
  /** Open a function panel; security functions follow the active ticker. */
  openFunction: (code: string, ticker?: string) => void;
  closePanel: (tabId: string, panelId: string) => void;
  setLayouts: (tabId: string, layouts: Layout[]) => void;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  createWatchlist: (name: string) => void;
  deleteWatchlist: (id: string) => void;
  setActiveWatchlist: (id: string) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  addHolding: (h: Holding) => void;
  removeHolding: (symbol: string) => void;
  /** Simulated market order at `price`. Returns an error string or null. */
  placePaperOrder: (side: 'buy' | 'sell', symbol: string, shares: number, price: number) => string | null;
  resetPaper: () => void;
  addGraph: (name: string, ticker: string) => void;
  removeGraph: (id: string) => void;
  saveDashboard: (name: string) => void;
  loadDashboard: (id: string) => void;
  deleteDashboard: (id: string) => void;
}

export const useTerminal = create<TerminalState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      watchlistOpen: true,
      activeTicker: 'AAPL',
      tabs: DEFAULT_TABS,
      activeTabId: 'main',
      watchlists: DEFAULT_WATCHLISTS,
      activeWatchlistId: 'default',
      holdings: [],
      paperCash: PAPER_START_CASH,
      paperPositions: [],
      paperOrders: [],
      savedGraphs: [],
      dashboards: [],

      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'amber' : 'dark' }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setWatchlistOpen: (open) => set({ watchlistOpen: open }),
      setActiveTicker: (symbol) => set({ activeTicker: symbol.trim().toUpperCase() }),

      openFunction: (code, ticker) => {
        const fn = findFunction(code);
        if (!fn) return;
        if (ticker) set({ activeTicker: ticker.trim().toUpperCase() });
        // MYW is a command, not a panel — it reveals the watchlist rail.
        if (fn.code === 'MYW') {
          set({ watchlistOpen: true });
          return;
        }
        const { tabs, activeTabId } = get();
        const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
        if (!tab) return;
        // Security panels track the active ticker, so one panel per code per tab.
        if (tab.panels.some((p) => p.code === fn.code)) return;

        const size = DEFAULT_PANEL_SIZE[fn.code] ?? { w: 5, h: 10, minW: 3, minH: 5 };
        const i = `${fn.code.toLowerCase()}-${uid()}`;
        const newPanel: PanelInstance = { i, code: fn.code };
        const panels = [...tab.panels, newPanel];

        // Prefer an open horizontal slot beside existing panels; otherwise
        // re-tile everything so the workspace stays packed (no document-flow
        // stacking, existing panels auto-resize to share the width).
        const slot = findHorizontalSlot(tab.layouts, size.w, size.h, size.minW);
        const layouts = slot
          ? [...tab.layouts, { i, x: slot.x, y: slot.y, w: slot.w, h: size.h, minW: size.minW, minH: size.minH }]
          : tileLayouts(panels);

        set({
          tabs: tabs.map((t) => (t.id === tab.id ? { ...t, panels, layouts } : t)),
        });
      },

      closePanel: (tabId, panelId) =>
        set({
          tabs: get().tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  panels: t.panels.filter((p) => p.i !== panelId),
                  layouts: t.layouts.filter((l) => l.i !== panelId),
                }
              : t,
          ),
        }),

      setLayouts: (tabId, layouts) =>
        set({ tabs: get().tabs.map((t) => (t.id === tabId ? { ...t, layouts } : t)) }),

      addTab: () => {
        const id = uid();
        set({
          tabs: [...get().tabs, { id, name: `Workspace ${get().tabs.length + 1}`, panels: [], layouts: [] }],
          activeTabId: id,
        });
      },

      closeTab: (tabId) => {
        let tabs = get().tabs.filter((t) => t.id !== tabId);
        if (tabs.length === 0) tabs = [{ id: uid(), name: 'Main', panels: [], layouts: [] }];
        const activeTabId = get().activeTabId === tabId ? tabs[0].id : get().activeTabId;
        set({ tabs, activeTabId });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      renameTab: (tabId, name) =>
        set({
          tabs: get().tabs.map((t) => (t.id === tabId ? { ...t, name: name.trim() || t.name } : t)),
        }),

      createWatchlist: (name) => {
        const id = uid();
        set({
          watchlists: [...get().watchlists, { id, name: name.trim() || 'Watchlist', items: [] }],
          activeWatchlistId: id,
        });
      },

      deleteWatchlist: (id) => {
        const lists = get().watchlists.filter((w) => w.id !== id);
        if (lists.length === 0) return; // always keep at least one list
        set({
          watchlists: lists,
          activeWatchlistId:
            get().activeWatchlistId === id ? lists[0].id : get().activeWatchlistId,
        });
      },

      setActiveWatchlist: (id) => set({ activeWatchlistId: id }),

      addToWatchlist: (item) => {
        const { watchlists, activeWatchlistId } = get();
        const symbol = item.symbol.trim().toUpperCase();
        set({
          watchlists: watchlists.map((w) =>
            w.id === activeWatchlistId && !w.items.some((x) => x.symbol === symbol)
              ? { ...w, items: [...w.items, { ...item, symbol }] }
              : w,
          ),
        });
      },

      removeFromWatchlist: (symbol) => {
        const { watchlists, activeWatchlistId } = get();
        set({
          watchlists: watchlists.map((w) =>
            w.id === activeWatchlistId
              ? { ...w, items: w.items.filter((x) => x.symbol !== symbol) }
              : w,
          ),
        });
      },

      addHolding: (h) => {
        const symbol = h.symbol.trim().toUpperCase();
        const rest = get().holdings.filter((x) => x.symbol !== symbol);
        set({ holdings: [...rest, { ...h, symbol }] });
      },
      removeHolding: (symbol) =>
        set({ holdings: get().holdings.filter((x) => x.symbol !== symbol.toUpperCase()) }),

      placePaperOrder: (side, symbolRaw, shares, price) => {
        const symbol = symbolRaw.trim().toUpperCase();
        if (!symbol || !(shares > 0) || !(price > 0)) return 'Enter a valid symbol, share count and price.';
        const { paperCash, paperPositions } = get();
        const pos = paperPositions.find((p) => p.symbol === symbol);

        if (side === 'buy') {
          const cost = shares * price;
          if (cost > paperCash) return 'Insufficient cash for this order.';
          const next = pos
            ? paperPositions.map((p) =>
                p.symbol === symbol
                  ? { ...p, avgCost: (p.avgCost * p.shares + cost) / (p.shares + shares), shares: p.shares + shares }
                  : p,
              )
            : [...paperPositions, { symbol, shares, avgCost: price }];
          set({ paperCash: paperCash - cost, paperPositions: next });
        } else {
          if (!pos || shares > pos.shares) return 'You don’t hold enough shares to sell.';
          const remaining = pos.shares - shares;
          const next = remaining > 0
            ? paperPositions.map((p) => (p.symbol === symbol ? { ...p, shares: remaining } : p))
            : paperPositions.filter((p) => p.symbol !== symbol);
          set({ paperCash: paperCash + shares * price, paperPositions: next });
        }

        const order: PaperOrder = { id: uid(), side, symbol, shares, price, ts: Date.now() };
        set({ paperOrders: [order, ...get().paperOrders].slice(0, 100) });
        return null;
      },

      resetPaper: () => set({ paperCash: PAPER_START_CASH, paperPositions: [], paperOrders: [] }),

      addGraph: (name, ticker) =>
        set({ savedGraphs: [...get().savedGraphs, { id: uid(), name: name.trim() || ticker, ticker: ticker.trim().toUpperCase() }] }),
      removeGraph: (id) => set({ savedGraphs: get().savedGraphs.filter((g) => g.id !== id) }),

      saveDashboard: (name) => {
        const { tabs, activeTabId } = get();
        const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
        if (!tab) return;
        set({
          dashboards: [
            ...get().dashboards,
            { id: uid(), name: name.trim() || tab.name, panels: tab.panels, layouts: tab.layouts },
          ],
        });
      },
      loadDashboard: (id) => {
        const dash = get().dashboards.find((d) => d.id === id);
        if (!dash) return;
        // Load into a fresh tab so the current workspace isn't clobbered.
        const tabId = uid();
        const clone = dash.panels.map((p) => ({ ...p }));
        set({
          tabs: [...get().tabs, { id: tabId, name: dash.name, panels: clone, layouts: dash.layouts.map((l) => ({ ...l })) }],
          activeTabId: tabId,
        });
      },
      deleteDashboard: (id) => set({ dashboards: get().dashboards.filter((d) => d.id !== id) }),
    }),
    { name: 'synthex-terminal-v1' },
  ),
);
