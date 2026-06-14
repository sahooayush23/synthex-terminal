/** The Bloomberg-style function-code registry.
 *
 *  Single source of truth for the sidebar, the command line, HELP, and the
 *  panel router. Codes that aren't implemented yet open an honest
 *  "planned for Phase N" panel — never a dead button, never fake data. */

export type Phase = 1 | 2 | 3 | 4 | 5 | 6;

export interface FnDef {
  code: string;
  aliases?: string[];
  name: string;
  description: string;
  /** Which free data source will back it (shown in HELP / placeholder). */
  source: string;
  phase: Phase;
  implemented: boolean;
  /** Operates on the active security (vs. market-wide). */
  needsTicker?: boolean;
}

export const FUNCTIONS: FnDef[] = [
  // ── Phase 1 (live now) ─────────────────────────────────────────────
  { code: 'DES', name: 'Security Description', needsTicker: true, phase: 1, implemented: true,
    description: 'Company profile, key stats, 52-week range and 1Y trend.',
    source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'GP', name: 'Price Chart', needsTicker: true, phase: 1, implemented: true,
    description: 'Candlesticks + volume with MA20/50, RSI and MACD. Timeframes 1D→MAX.',
    source: 'Yahoo Finance via yfinance + TradingView Lightweight Charts (free)' },
  { code: 'HELP', name: 'Function Directory', phase: 1, implemented: true,
    description: 'Searchable list of every function code and its status.',
    source: 'Built-in' },
  { code: 'MYW', name: 'My Watchlists', phase: 1, implemented: true,
    description: 'Opens the watchlist panel. Multiple named lists, persisted locally.',
    source: 'localStorage (free)' },

  // ── Phase 2 ────────────────────────────────────────────────────────
  { code: 'FA', name: 'Financial Analysis', needsTicker: true, phase: 2, implemented: true,
    description: 'Income statement, balance sheet, cash flow, multiples — with inline sparklines.',
    source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'EE', name: 'Earnings & Estimates', needsTicker: true, phase: 2, implemented: true,
    description: 'Earnings surprise history and analyst consensus (coverage varies on free tier).',
    source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'N', aliases: ['TOP'], name: 'Market News', phase: 2, implemented: true,
    description: 'Tabbed live news center: top, markets, sectors, crypto. Filter by ticker.',
    source: 'Yahoo Finance news via yfinance (free, keyless)' },

  // ── Phase 3 ────────────────────────────────────────────────────────
  { code: 'MOV', name: 'Market Movers', phase: 3, implemented: true,
    description: 'Gainers/losers with a 1-day-return vs relative-volume scatter.',
    source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'WEI', name: 'World Equity Indices', phase: 3, implemented: true,
    description: 'Global index monitor with 1-month sparklines.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'SECT', aliases: ['SETF'], name: 'US Sectors', phase: 3, implemented: true,
    description: 'Sector performance via SPDR sector ETFs.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'CETF', name: 'Countries', phase: 3, implemented: true,
    description: 'Country performance via country ETFs, with 1-month sparklines.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'IPO', name: 'Recent IPOs', phase: 3, implemented: true,
    description: 'Recent & upcoming IPO calendar.', source: 'Finnhub free IPO calendar (free key)' },
  { code: 'ECO', aliases: ['ECON'], name: 'World Economics', phase: 3, implemented: true,
    description: 'GDP, inflation, unemployment, Fed funds — latest + sparklines.',
    source: 'FRED (free key)' },
  { code: 'CAL', name: 'Calendars', phase: 3, implemented: true,
    description: 'Upcoming earnings dates for your watchlist.',
    source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'EQS', aliases: ['MYS'], name: 'Equity Screener', phase: 3, implemented: true,
    description: 'Sortable, filterable screener over a large-cap universe.',
    source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'HMAP', name: 'Market Heatmap', phase: 3, implemented: true,
    description: 'Large-cap tiles coloured by 1-day % change.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'SCAT', aliases: ['MS'], name: 'Market Scatter', phase: 3, implemented: true,
    description: 'Valuation (P/E) vs risk (beta) scatter, coloured by sector.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'GYLD', name: 'Global Yields', phase: 3, implemented: true,
    description: 'US Treasury yield curve (1M–30Y), latest + history.', source: 'FRED (free key)' },
  { code: 'FX', name: 'Currencies', phase: 3, implemented: true,
    description: 'Major FX rates with 30-day sparklines (ECB daily reference).', source: 'Frankfurter API (free, keyless)' },
  { code: 'CMTY', name: 'Commodities', phase: 3, implemented: true,
    description: 'Energy, metals and agriculture futures proxies.',
    source: 'Yahoo Finance futures via yfinance (free, keyless)' },
  { code: 'CORP', name: 'Corporate Credit', phase: 3, implemented: true,
    description: 'Credit spreads — HY/IG OAS and the 10Y–2Y spread.', source: 'FRED (free key)' },
  { code: 'CRYP', name: 'Crypto', phase: 3, implemented: true,
    description: 'Top coins by market cap with 24h/7d change and 7-day sparklines (near real-time).', source: 'CoinGecko (free, keyless)' },
  { code: 'SOC', name: 'Social Sentiment', needsTicker: true, phase: 3, implemented: true,
    description: 'StockTwits sentiment feed (StockTwits now blocks free server access — shown honestly).', source: 'StockTwits (free)' },
  { code: 'CACT', name: 'Corporate Actions', needsTicker: true, phase: 3, implemented: true,
    description: 'Dividend and split history.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'INSDR', name: 'Insider Filings', needsTicker: true, phase: 3, implemented: true,
    description: 'Insider buy/sell transactions (last 6 months).', source: 'Finnhub (free key)' },
  { code: 'LOT', name: 'Lots of Charts', phase: 3, implemented: true,
    description: 'Small-multiples 1-month chart wall for your watchlist.', source: 'Yahoo Finance via yfinance (free, keyless)' },
  { code: 'MYG', name: 'My Graphs', phase: 3, implemented: true,
    description: 'Save securities as named graphs to revisit quickly.', source: 'localStorage (free)' },
  { code: 'DASH', name: 'My Dashboards', phase: 3, implemented: true,
    description: 'Save & reload named workspace layouts.', source: 'localStorage (free)' },

  // ── Phase 4 ────────────────────────────────────────────────────────
  { code: 'PORT', aliases: ['MYP'], name: 'My Portfolio', phase: 4, implemented: true,
    description: 'Track holdings — live value, P/L and allocation (no real money).', source: 'localStorage + yfinance (free, keyless)' },
  { code: 'RISK', name: 'Risk Modeling', phase: 4, implemented: true,
    description: 'Volatility, beta, drawdown, VaR and β-adjusted stress tests.', source: 'Computed from yfinance prices (free, keyless)' },
  { code: 'OMON', name: 'Options Monitor', needsTicker: true, phase: 4, implemented: true,
    description: 'Options chain with IV, volume, OI and Black-Scholes delta/gamma (delayed).', source: 'Yahoo Finance via yfinance (free, keyless)' },

  // ── Phase 5 ────────────────────────────────────────────────────────
  { code: 'PAPER', name: 'Paper Trading', phase: 5, implemented: true,
    description: 'Simulated market orders, positions, P/L and blotter — no real money.', source: 'localStorage + yfinance (free, keyless)' },
  { code: 'QNT', name: 'Quant Python', phase: 5, implemented: true,
    description: 'In-browser Python (numpy/pandas) — runs locally via WebAssembly.', source: 'Pyodide (free, keyless)' },
  { code: 'XLS', name: 'Export', phase: 5, implemented: true,
    description: 'Export watchlist, portfolio and paper orders to CSV.', source: 'Built-in (free)' },

  // ── Phase 6 ────────────────────────────────────────────────────────
  { code: 'AI', name: 'AI Assistant', phase: 6, implemented: true,
    description: 'Ask questions grounded in fresh terminal data (quote, profile, news).',
    source: 'Google Gemini free tier (Groq fallback) — free key' },
  { code: 'FLT', name: 'Flight Tracking', phase: 6, implemented: true,
    description: 'Experimental live aircraft over the US.', source: 'OpenSky Network (free, keyless)' },
];

const BY_TOKEN = new Map<string, FnDef>();
for (const fn of FUNCTIONS) {
  BY_TOKEN.set(fn.code, fn);
  fn.aliases?.forEach((a) => BY_TOKEN.set(a, fn));
}

/** Exact code/alias lookup, case-insensitive. */
export function findFunction(token: string): FnDef | undefined {
  return BY_TOKEN.get(token.trim().toUpperCase());
}

/** Prefix/substring matching for command-line autocomplete. */
export function matchFunctions(q: string): FnDef[] {
  const u = q.trim().toUpperCase();
  if (!u) return [];
  const l = q.trim().toLowerCase();
  return FUNCTIONS.filter(
    (f) =>
      f.code.startsWith(u) ||
      f.aliases?.some((a) => a.startsWith(u)) ||
      f.name.toLowerCase().includes(l),
  );
}

/** Default panel grid sizes (12-column grid, rowHeight 30). */
export const DEFAULT_PANEL_SIZE: Record<string, { w: number; h: number; minW: number; minH: number }> = {
  GP: { w: 8, h: 14, minW: 4, minH: 8 },
  DES: { w: 4, h: 14, minW: 3, minH: 6 },
  HELP: { w: 6, h: 12, minW: 4, minH: 6 },
  FA: { w: 8, h: 16, minW: 5, minH: 8 },
  EE: { w: 5, h: 16, minW: 3, minH: 8 },
  N: { w: 5, h: 16, minW: 3, minH: 8 },
  MOV: { w: 8, h: 18, minW: 5, minH: 10 },
  WEI: { w: 5, h: 14, minW: 3, minH: 6 },
  SECT: { w: 5, h: 14, minW: 3, minH: 6 },
  CMTY: { w: 5, h: 14, minW: 3, minH: 6 },
  CETF: { w: 5, h: 14, minW: 3, minH: 6 },
  FX: { w: 5, h: 14, minW: 3, minH: 6 },
  CRYP: { w: 6, h: 16, minW: 4, minH: 8 },
  HMAP: { w: 7, h: 14, minW: 4, minH: 8 },
  SCAT: { w: 7, h: 16, minW: 4, minH: 8 },
  EQS: { w: 7, h: 16, minW: 4, minH: 8 },
  CACT: { w: 4, h: 14, minW: 3, minH: 6 },
  SOC: { w: 4, h: 16, minW: 3, minH: 6 },
  CAL: { w: 4, h: 14, minW: 3, minH: 6 },
  INSDR: { w: 6, h: 14, minW: 4, minH: 6 },
  IPO: { w: 6, h: 14, minW: 4, minH: 6 },
  ECO: { w: 5, h: 16, minW: 3, minH: 8 },
  GYLD: { w: 5, h: 16, minW: 3, minH: 8 },
  CORP: { w: 5, h: 14, minW: 3, minH: 6 },
  PORT: { w: 6, h: 16, minW: 4, minH: 8 },
  RISK: { w: 5, h: 16, minW: 3, minH: 8 },
  OMON: { w: 7, h: 16, minW: 4, minH: 8 },
  PAPER: { w: 6, h: 16, minW: 4, minH: 8 },
  QNT: { w: 7, h: 18, minW: 4, minH: 10 },
  XLS: { w: 4, h: 10, minW: 3, minH: 6 },
  LOT: { w: 7, h: 16, minW: 4, minH: 8 },
  MYG: { w: 4, h: 12, minW: 3, minH: 6 },
  DASH: { w: 4, h: 12, minW: 3, minH: 6 },
  AI: { w: 5, h: 16, minW: 3, minH: 8 },
  FLT: { w: 6, h: 16, minW: 4, minH: 8 },
};

export interface SidebarItem {
  code: string;
  /** Label shown on the left (defaults to the registry name). */
  label?: string;
  /** Code chip shown on the right (defaults to the canonical code). */
  display?: string;
}

export interface SidebarSection {
  title: string;
  icon: 'star' | 'chart' | 'briefcase' | 'globe' | 'flask' | 'help';
  /** Render the active-ticker chip at the top of this section. */
  securityContext?: boolean;
  items: SidebarItem[];
}

export const SIDEBAR: SidebarSection[] = [
  {
    title: 'Favorites', icon: 'star',
    items: [
      { code: 'N', label: 'Market News', display: 'TOP' },
      { code: 'MOV', label: 'Market Movers' },
    ],
  },
  {
    title: 'Security Analysis', icon: 'chart', securityContext: true,
    items: [
      { code: 'DES', label: 'Snapshot' },
      { code: 'GP', label: 'Graphs' },
      { code: 'FA', label: 'Financial Analysis' },
      { code: 'EE', label: 'Analyst Estimates' },
      { code: 'N', label: 'News & Filings' },
      { code: 'CACT', label: 'Corporate Actions' },
      { code: 'INSDR', label: 'Insider Filings' },
    ],
  },
  {
    title: 'My Workspace', icon: 'briefcase',
    items: [
      { code: 'MYW', label: 'My Watchlists' },
      { code: 'PORT', label: 'My Portfolio', display: 'MYP' },
      { code: 'PAPER', label: 'Paper Trading' },
      { code: 'RISK', label: 'Risk Modeling' },
      { code: 'EQS', label: 'My Screens', display: 'MYS' },
      { code: 'MYG', label: 'My Graphs' },
      { code: 'DASH', label: 'My Dashboards' },
    ],
  },
  {
    title: 'Market Overview', icon: 'globe',
    items: [
      { code: 'N', label: 'Market News', display: 'TOP' },
      { code: 'MOV', label: 'Market Movers' },
      { code: 'WEI', label: 'World Equity Indices' },
      { code: 'SECT', label: 'US Sectors', display: 'SETF' },
      { code: 'CETF', label: 'Countries' },
      { code: 'IPO', label: 'Recent IPOs' },
      { code: 'ECO', label: 'World Economics', display: 'ECON' },
      { code: 'GYLD', label: 'Global Yields' },
      { code: 'FX', label: 'Currencies' },
      { code: 'CMTY', label: 'Commodities' },
      { code: 'CORP', label: 'Corporate Credit' },
      { code: 'HMAP', label: 'Heatmap' },
      { code: 'CRYP', label: 'Crypto' },
    ],
  },
  {
    title: 'Research Tools', icon: 'flask',
    items: [
      { code: 'SCAT', label: 'Market Scatter', display: 'MS' },
      { code: 'OMON', label: 'Options Monitor' },
      { code: 'QNT', label: 'Quant Python' },
      { code: 'XLS', label: 'Export Data' },
      { code: 'LOT', label: 'Lots of Charts' },
      { code: 'FLT', label: 'Flight Tracking' },
    ],
  },
  {
    title: 'System', icon: 'help',
    items: [
      { code: 'HELP', label: 'Function Directory' },
      { code: 'AI', label: 'AI Assistant' },
    ],
  },
];
