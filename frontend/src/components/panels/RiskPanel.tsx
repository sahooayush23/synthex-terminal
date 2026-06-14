import { useMemo } from 'react';

import { FreshnessBadge, Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useCandles, useQuote } from '@/hooks/useMarketData';
import {
  annualizedReturn,
  annualizedVol,
  beta,
  correlation,
  dailyReturns,
  historicalVaR,
  maxDrawdown,
  sharpe,
} from '@/lib/risk';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

const BENCH = 'SPY';

/** RISK — volatility, beta, drawdown, VaR and stress tests for the active
 *  security, computed from 1Y daily returns vs the S&P 500 (SPY). */
export function RiskPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data, isLoading, isError, refetch, isFetching } = useCandles(ticker, '1Y');
  const { data: bench } = useCandles(BENCH, '1Y');
  const { data: quote } = useQuote(ticker);

  const m = useMemo(() => {
    const closes = (data?.candles ?? []).map((c) => c.close);
    const benchCloses = (bench?.candles ?? []).map((c) => c.close);
    if (closes.length < 30) return null;
    const r = dailyReturns(closes);
    const br = dailyReturns(benchCloses);
    return {
      vol: annualizedVol(r),
      ret: annualizedReturn(r),
      beta: beta(r, br),
      corr: correlation(r, br),
      mdd: maxDrawdown(closes),
      var95: historicalVaR(r, 0.95),
      var99: historicalVaR(r, 0.99),
      sharpe: sharpe(r),
    };
  }, [data, bench]);

  if (isLoading) return <PanelSkeleton lines={9} />;
  if (isError) return <PanelError message={`Couldn't load risk data for ${ticker}.`} onRetry={() => refetch()} />;
  if (!m) return <PanelError message={`Not enough price history for ${ticker} to compute risk.`} />;

  const price = quote?.price ?? null;
  // Stress scenarios: market move × beta → estimated position impact.
  const scenarios = [-20, -10, -5, 5, 10].map((mkt) => ({ mkt, est: mkt * m.beta }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="text-[10px] text-faint">Risk · 1Y daily vs {BENCH}</span>
        <div className="ml-auto flex items-center gap-2"><Refreshing active={isFetching} /><FreshnessBadge realtime={quote?.realtime} /></div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <Metric label="Annualized Volatility" value={`${m.vol.toFixed(1)}%`} />
          <Metric label="Annualized Return" value={`${m.ret >= 0 ? '+' : ''}${m.ret.toFixed(1)}%`} tone={m.ret >= 0 ? 'up' : 'down'} />
          <Metric label="Beta (vs SPY)" value={m.beta.toFixed(2)} />
          <Metric label="Correlation (SPY)" value={m.corr.toFixed(2)} />
          <Metric label="Max Drawdown" value={`${m.mdd.toFixed(1)}%`} tone="down" />
          <Metric label="Sharpe (1Y)" value={m.sharpe.toFixed(2)} tone={m.sharpe >= 1 ? 'up' : undefined} />
          <Metric label="1-Day VaR 95%" value={`-${m.var95.toFixed(2)}%`} tone="down" />
          <Metric label="1-Day VaR 99%" value={`-${m.var99.toFixed(2)}%`} tone="down" />
        </div>

        <h3 className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Stress Test (β-adjusted)</h3>
        <div className="overflow-hidden rounded border border-bd">
          <div className="flex items-center justify-between border-b border-bd2 bg-panel2/40 px-2 py-1 text-[9px] uppercase text-faint">
            <span>Market move</span><span>Est. impact</span><span>Est. price</span>
          </div>
          {scenarios.map((s) => (
            <div key={s.mkt} className="flex items-center justify-between border-b border-bd2/40 px-2 py-1 text-[11px] last:border-0">
              <span className={cn('font-mono', s.mkt >= 0 ? 'text-up' : 'text-down')}>{s.mkt >= 0 ? '+' : ''}{s.mkt}%</span>
              <span className={cn('font-mono', s.est >= 0 ? 'text-up' : 'text-down')}>{s.est >= 0 ? '+' : ''}{s.est.toFixed(1)}%</span>
              <span className="font-mono text-muted">{price != null ? `$${(price * (1 + s.est / 100)).toFixed(2)}` : '—'}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] text-faint">Estimates assume the position moves at its historical beta to the S&P 500. Educational only — not a forecast.</p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded border border-bd bg-panel2/30 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn('font-mono text-sm font-semibold tabular-nums', tone === 'up' && 'text-up', tone === 'down' && 'text-down')}>{value}</div>
    </div>
  );
}
