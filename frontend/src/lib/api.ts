/** Typed client for the Synthex backend.
 *  Dev: VITE_API_URL is empty and Vite proxies /api → localhost:8000.
 *  Prod: set VITE_API_URL to the deployed backend (Render free tier). */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export interface Quote {
  symbol: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  currency: string | null;
  realtime?: boolean;
  source?: string;
  ts: number;
  error?: boolean;
}

export interface Candle {
  time: string | number; // 'YYYY-MM-DD' for daily bars, epoch seconds intraday
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number;
}

export interface CandleResponse {
  symbol: string;
  range: string;
  interval: string;
  candles: Candle[];
  ts: number;
}

export interface Profile {
  symbol: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  summary: string | null;
  website: string | null;
  logoUrl: string | null;
  employees: number | null;
  country: string | null;
  currency: string | null;
  beta: number | null;
  peTrailing: number | null;
  peForward: number | null;
  epsTrailing: number | null;
  divYieldPct: number | null;
  high52: number | null;
  low52: number | null;
  avgVolume: number | null;
  sharesOut: number | null;
  nextEarnings: string | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string | null;
}

export interface Financials {
  symbol: string;
  freq: 'annual' | 'quarterly';
  periods: string[];
  series: Record<string, (number | null)[]>;
  current: {
    price: number | null;
    marketCap: number | null;
    enterpriseValue: number | null;
    totalDebt: number | null;
    cash: number | null;
    peTrailing: number | null;
    peForward: number | null;
    priceToSales: number | null;
    priceToBook: number | null;
    evToEbitda: number | null;
    evToSales: number | null;
    divYieldPct: number | null;
    beta: number | null;
  };
}

export interface EarningsHistoryRow {
  date: string;
  epsEstimate: number | null;
  epsReported: number | null;
  surprisePct: number | null;
}
export interface EstimateRow {
  period: string;
  avg: number | null;
  low: number | null;
  high: number | null;
  analysts: number | null;
  yearAgo: number | null;
  growth: number | null;
}
export interface Estimates {
  symbol: string;
  history: EarningsHistoryRow[];
  earningsEstimate: EstimateRow[];
  revenueEstimate: EstimateRow[];
  recommendation: Record<string, number> | null;
  priceTargets: { current: number | null; low: number | null; mean: number | null; median: number | null; high: number | null } | null;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  publisher: string | null;
  url: string | null;
  ts: number | null;
  thumbnail: string | null;
}
export interface NewsResponse {
  category: string;
  items: NewsItem[];
  ts: number;
}

export interface BoardRow {
  symbol: string;
  label: string;
  last: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  relVol: number | null;
  spark: number[];
}
export interface BoardResponse {
  board: string;
  rows: BoardRow[];
  ts: number;
}

export interface MoverRow {
  symbol: string;
  last: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  relVol: number | null;
}
export interface ScatterPoint {
  symbol: string;
  ret: number;
  relVol: number;
}
export interface MoversResponse {
  universe: string;
  count: number;
  scatter: ScatterPoint[];
  gainers: MoverRow[];
  losers: MoverRow[];
}

export interface FxRow {
  pair: string;
  quote: string;
  label: string;
  rate: number | null;
  changePct: number | null;
  spark: number[];
}
export interface FxResponse {
  base: string;
  rows: FxRow[];
  date: string | null;
}

export interface CryptoRow {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  price: number | null;
  change24hPct: number | null;
  change7dPct: number | null;
  marketCap: number | null;
  volume: number | null;
  rank: number | null;
  spark: number[];
}
export interface CryptoResponse {
  vs: string;
  rows: CryptoRow[];
}

export interface ActionsResponse {
  symbol: string;
  dividends: { date: string; amount: number | null }[];
  splits: { date: string; ratio: number | null }[];
}

export interface SocialResponse {
  symbol: string;
  available: boolean;
  bullish?: number;
  bearish?: number;
  messages?: { id: number; user: string | null; body: string | null; createdAt: string | null; sentiment: string | null }[];
}

export interface CalendarResponse {
  rows: { symbol: string; date: string }[];
}

export interface UniverseRow {
  symbol: string;
  name: string | null;
  sector: string | null;
  marketCap: number | null;
  peTrailing: number | null;
  peForward: number | null;
  beta: number | null;
  divYieldPct: number | null;
  high52: number | null;
  low52: number | null;
}
export interface UniverseResponse {
  rows: UniverseRow[];
}

export interface EconRow {
  id: string;
  label: string;
  unit: string;
  value: number;
  change: number | null;
  spark: number[];
  asOf: string;
}
export interface EconResponse {
  available: boolean;
  name: string;
  rows?: EconRow[];
}

export interface IpoResponse {
  available: boolean;
  rows?: { symbol: string | null; name: string | null; date: string | null; exchange: string | null; priceRange: string | null; shares: number | null; status: string | null }[];
}

export interface InsiderResponse {
  available: boolean;
  symbol: string;
  rows?: { name: string | null; shares: number | null; change: number | null; price: number | null; date: string | null; code: string | null }[];
}

export interface OptionRow {
  strike: number | null;
  last: number | null;
  bid: number | null;
  ask: number | null;
  volume: number;
  openInterest: number;
  iv: number | null;
  inTheMoney: boolean;
  delta: number | null;
  gamma: number | null;
}
export interface OptionsResponse {
  symbol: string;
  expirations: string[];
  expiration: string | null;
  spot: number | null;
  calls: OptionRow[];
  puts: OptionRow[];
}

export interface SparkRow {
  symbol: string;
  last: number | null;
  change: number | null;
  changePct: number | null;
  spark: number[];
}
export interface SparksResponse {
  rows: SparkRow[];
}

export interface FlightRow {
  icao24: string;
  callsign: string | null;
  country: string | null;
  lon: number | null;
  lat: number | null;
  altitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
}
export interface FlightsResponse {
  total: number;
  time: number | null;
  flights: FlightRow[];
}

export interface AiResponse {
  available: boolean;
  answer?: string;
  model?: string;
  symbol?: string | null;
  error?: string;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function postJSON<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  quotes: (symbols: string[]) =>
    getJSON<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`),
  quote: (symbol: string) => getJSON<Quote>(`/api/quote/${encodeURIComponent(symbol)}`),
  candles: (symbol: string, range: string) =>
    getJSON<CandleResponse>(`/api/candles/${encodeURIComponent(symbol)}?range=${range}`),
  profile: (symbol: string) => getJSON<Profile>(`/api/profile/${encodeURIComponent(symbol)}`),
  search: (q: string) => getJSON<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  financials: (symbol: string, freq: string) =>
    getJSON<Financials>(`/api/financials/${encodeURIComponent(symbol)}?freq=${freq}`),
  estimates: (symbol: string) => getJSON<Estimates>(`/api/estimates/${encodeURIComponent(symbol)}`),
  news: (params: { category?: string; symbol?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.symbol) q.set('symbol', params.symbol);
    if (params.limit) q.set('limit', String(params.limit));
    return getJSON<NewsResponse>(`/api/news?${q.toString()}`);
  },
  board: (name: string) => getJSON<BoardResponse>(`/api/board/${name}`),
  movers: (universe = 'large') => getJSON<MoversResponse>(`/api/movers?universe=${universe}`),
  fx: (base = 'USD') => getJSON<FxResponse>(`/api/fx?base=${base}`),
  crypto: (limit = 30) => getJSON<CryptoResponse>(`/api/crypto?limit=${limit}`),
  actions: (symbol: string) => getJSON<ActionsResponse>(`/api/actions/${encodeURIComponent(symbol)}`),
  social: (symbol: string) => getJSON<SocialResponse>(`/api/social/${encodeURIComponent(symbol)}`),
  calendar: (symbols: string[]) =>
    getJSON<CalendarResponse>(`/api/calendar?symbols=${encodeURIComponent(symbols.join(','))}`),
  universe: () => getJSON<UniverseResponse>(`/api/universe`),
  econ: (name: string) => getJSON<EconResponse>(`/api/econ/${name}`),
  ipos: () => getJSON<IpoResponse>(`/api/ipos`),
  insiders: (symbol: string) => getJSON<InsiderResponse>(`/api/insiders/${encodeURIComponent(symbol)}`),
  options: (symbol: string, expiration?: string) =>
    getJSON<OptionsResponse>(`/api/options/${encodeURIComponent(symbol)}${expiration ? `?expiration=${expiration}` : ''}`),
  sparks: (symbols: string[]) =>
    getJSON<SparksResponse>(`/api/sparks?symbols=${encodeURIComponent(symbols.join(','))}`),
  flights: (limit = 60) => getJSON<FlightsResponse>(`/api/flights?limit=${limit}`),
  aiStatus: () => getJSON<{ available: boolean }>(`/api/ai/status`),
  aiAsk: (question: string, symbol?: string | null) =>
    postJSON<AiResponse>(`/api/ai`, { question, symbol }),
  health: () => getJSON<{ status: string; ts: number }>(`/api/health`),
};
