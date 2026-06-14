/** Risk/return statistics computed client-side from daily closes.
 *  Used by the RISK panel. ~252 trading days per year for annualization. */

const TRADING_DAYS = 252;

export function dailyReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) r.push(closes[i] / closes[i - 1] - 1);
  }
  return r;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function stdev(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

/** Annualized volatility (%) from daily returns. */
export const annualizedVol = (returns: number[]) => stdev(returns) * Math.sqrt(TRADING_DAYS) * 100;

/** Annualized return (%) — geometric, from daily returns. */
export function annualizedReturn(returns: number[]): number {
  if (!returns.length) return 0;
  const cumulative = returns.reduce((p, r) => p * (1 + r), 1);
  return (cumulative ** (TRADING_DAYS / returns.length) - 1) * 100;
}

/** Beta of asset returns vs benchmark returns (aligned to shorter length). */
export function beta(asset: number[], bench: number[]): number {
  const n = Math.min(asset.length, bench.length);
  if (n < 2) return 0;
  const a = asset.slice(asset.length - n);
  const b = bench.slice(bench.length - n);
  const ma = mean(a);
  const mb = mean(b);
  let cov = 0;
  let varb = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    varb += (b[i] - mb) ** 2;
  }
  return varb === 0 ? 0 : cov / varb;
}

export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const x = a.slice(a.length - n);
  const y = b.slice(b.length - n);
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** Worst peak-to-trough decline (%) over the close series. */
export function maxDrawdown(closes: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    if (peak > 0) mdd = Math.min(mdd, c / peak - 1);
  }
  return mdd * 100;
}

/** Historical 1-day Value-at-Risk at the given confidence (e.g. 0.95),
 *  returned as a positive % loss. */
export function historicalVaR(returns: number[], confidence = 0.95): number {
  if (returns.length < 5) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return -sorted[idx] * 100;
}

/** Sharpe ratio (annualized) given a daily risk-free rate (default ~0). */
export function sharpe(returns: number[], rfDaily = 0): number {
  const sd = stdev(returns);
  if (!sd) return 0;
  return ((mean(returns) - rfDaily) / sd) * Math.sqrt(TRADING_DAYS);
}
