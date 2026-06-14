/** TanStack Query hooks — every interval here respects free-tier rate limits
 *  (the backend additionally TTL-caches upstream calls). Background refetch
 *  keeps panels feeling live; placeholderData keeps last-known values on
 *  screen during refetches so the UI never blanks out. */
import { useQuery } from '@tanstack/react-query';

import { api, type Quote } from '@/lib/api';

export function useQuotes(symbols: string[], refetchInterval = 15_000) {
  const key = symbols.join(',');
  return useQuery({
    queryKey: ['quotes', key],
    queryFn: () => api.quotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval,
    placeholderData: (prev) => prev,
    select: (rows: Quote[]) =>
      Object.fromEntries(rows.map((r) => [r.symbol, r])) as Record<string, Quote>,
  });
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => api.quote(symbol),
    enabled: !!symbol,
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

/** Candle refresh cadence matches the timeframe — intraday faster. */
const CANDLE_INTERVALS: Record<string, number> = {
  '1D': 30_000,
  '5D': 60_000,
  '1M': 120_000,
};

export function useCandles(symbol: string, range: string) {
  return useQuery({
    queryKey: ['candles', symbol, range],
    queryFn: () => api.candles(symbol, range),
    enabled: !!symbol,
    refetchInterval: CANDLE_INTERVALS[range] ?? 300_000,
    placeholderData: (prev) => prev,
  });
}

export function useProfile(symbol: string) {
  return useQuery({
    queryKey: ['profile', symbol],
    queryFn: () => api.profile(symbol),
    enabled: !!symbol,
    staleTime: 60 * 60_000, // profiles barely change intraday
    placeholderData: (prev) => prev,
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.trim().length >= 1,
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useFinancials(symbol: string, freq: string) {
  return useQuery({
    queryKey: ['financials', symbol, freq],
    queryFn: () => api.financials(symbol, freq),
    enabled: !!symbol,
    staleTime: 6 * 60 * 60_000, // statements update quarterly
    placeholderData: (prev) => prev,
  });
}

export function useEstimates(symbol: string) {
  return useQuery({
    queryKey: ['estimates', symbol],
    queryFn: () => api.estimates(symbol),
    enabled: !!symbol,
    staleTime: 60 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useNews(category: string, symbol: string | undefined, refetchInterval = 45_000) {
  return useQuery({
    queryKey: ['news', symbol ?? category],
    queryFn: () => api.news(symbol ? { symbol, limit: 30 } : { category, limit: 30 }),
    refetchInterval,
    placeholderData: (prev) => prev,
  });
}

export function useBoard(name: string, refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['board', name],
    queryFn: () => api.board(name),
    refetchInterval,
    placeholderData: (prev) => prev,
  });
}

export function useMovers(universe = 'large', refetchInterval = 60_000) {
  return useQuery({
    queryKey: ['movers', universe],
    queryFn: () => api.movers(universe),
    refetchInterval,
    placeholderData: (prev) => prev,
  });
}

export function useFx(base = 'USD') {
  return useQuery({
    queryKey: ['fx', base],
    queryFn: () => api.fx(base),
    refetchInterval: 5 * 60_000, // ECB daily reference rates
    placeholderData: (prev) => prev,
  });
}

export function useCrypto(limit = 30, refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['crypto', limit],
    queryFn: () => api.crypto(limit),
    refetchInterval, // CoinGecko near real-time
    placeholderData: (prev) => prev,
  });
}

export function useActions(symbol: string) {
  return useQuery({
    queryKey: ['actions', symbol],
    queryFn: () => api.actions(symbol),
    enabled: !!symbol,
    staleTime: 6 * 60 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useSocial(symbol: string) {
  return useQuery({
    queryKey: ['social', symbol],
    queryFn: () => api.social(symbol),
    enabled: !!symbol,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useCalendar(symbols: string[]) {
  return useQuery({
    queryKey: ['calendar', symbols.join(',')],
    queryFn: () => api.calendar(symbols),
    enabled: symbols.length > 0,
    staleTime: 60 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useUniverse() {
  return useQuery({
    queryKey: ['universe'],
    queryFn: api.universe,
    staleTime: 60 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useEcon(name: string) {
  return useQuery({
    queryKey: ['econ', name],
    queryFn: () => api.econ(name),
    staleTime: 6 * 60 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useIpos() {
  return useQuery({ queryKey: ['ipos'], queryFn: api.ipos, staleTime: 60 * 60_000, placeholderData: (p) => p });
}

export function useInsiders(symbol: string) {
  return useQuery({
    queryKey: ['insiders', symbol],
    queryFn: () => api.insiders(symbol),
    enabled: !!symbol,
    staleTime: 60 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useOptions(symbol: string, expiration?: string) {
  return useQuery({
    queryKey: ['options', symbol, expiration ?? 'front'],
    queryFn: () => api.options(symbol, expiration),
    enabled: !!symbol,
    refetchInterval: 120_000,
    placeholderData: (prev) => prev,
  });
}

export function useSparks(symbols: string[]) {
  return useQuery({
    queryKey: ['sparks', symbols.join(',')],
    queryFn: () => api.sparks(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useFlights() {
  return useQuery({
    queryKey: ['flights'],
    queryFn: () => api.flights(60),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAiStatus() {
  return useQuery({ queryKey: ['ai-status'], queryFn: api.aiStatus, staleTime: 5 * 60_000 });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: false,
  });
}
