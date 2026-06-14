import { LastUpdated, Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useEstimates } from '@/hooks/useMarketData';
import type { Estimates } from '@/lib/api';
import { fmtBig, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** EE — Earnings & Estimates. Surprise history, forward consensus (EPS &
 *  revenue), analyst recommendation distribution and price targets.
 *  Free Yahoo data — coverage is best for large/mid caps. */
export function EePanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useEstimates(ticker);

  if (isLoading) return <PanelSkeleton lines={9} />;
  if (isError || !data) return <PanelError message={`Couldn't load estimates for ${ticker}.`} onRetry={() => refetch()} />;

  const hasAny =
    data.history.length || data.earningsEstimate.length || data.recommendation || data.priceTargets;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="text-[10px] text-faint">Consensus · free coverage varies</span>
        <div className="ml-auto flex items-center gap-2">
          <Refreshing active={isFetching} />
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        {!hasAny && <PanelError message={`No analyst data available for ${ticker} on the free feed.`} />}

        {data.priceTargets && <PriceTargets t={data.priceTargets} />}
        {data.recommendation && <Recommendation r={data.recommendation} />}
        {data.earningsEstimate.length > 0 && (
          <EstimateTable title="EPS Estimates" rows={data.earningsEstimate} fmt={(v) => `$${v.toFixed(2)}`} />
        )}
        {data.revenueEstimate.length > 0 && (
          <EstimateTable title="Revenue Estimates" rows={data.revenueEstimate} fmt={(v) => `$${fmtBig(v)}`} />
        )}
        {data.history.length > 0 && <SurpriseHistory rows={data.history} />}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-bd bg-panel2/30">
      <h3 className="border-b border-bd2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <div className="p-2">{children}</div>
    </section>
  );
}

function PriceTargets({ t }: { t: NonNullable<Estimates['priceTargets']> }) {
  const { low, mean, high, current } = t;
  const pct =
    low != null && high != null && current != null && high > low
      ? Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100))
      : null;
  const upside = mean != null && current != null && current !== 0 ? ((mean - current) / current) * 100 : null;

  return (
    <Card title="Analyst Price Targets">
      <div className="mb-2 flex items-baseline gap-3">
        <div>
          <div className="text-[9px] uppercase text-faint">Mean target</div>
          <div className="font-mono text-lg font-bold">{fmtPrice(mean)}</div>
        </div>
        {upside != null && (
          <div className={cn('font-mono text-xs font-semibold', upside >= 0 ? 'text-up' : 'text-down')}>
            {upside >= 0 ? '+' : ''}
            {upside.toFixed(1)}% vs last
          </div>
        )}
      </div>
      {pct != null && (
        <div className="relative mt-3 h-1.5 rounded-full bg-panel2">
          <div className="absolute -top-0.5 h-2.5 w-0.5 bg-fg" style={{ left: `${pct}%` }} title={`Current ${fmtPrice(current)}`} />
        </div>
      )}
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>Low {fmtPrice(low)}</span>
        <span>High {fmtPrice(high)}</span>
      </div>
    </Card>
  );
}

function Recommendation({ r }: { r: Record<string, number> }) {
  const order: [string, string, string][] = [
    ['strongBuy', 'Strong Buy', 'bg-up'],
    ['buy', 'Buy', 'bg-up/60'],
    ['hold', 'Hold', 'bg-warn/70'],
    ['sell', 'Sell', 'bg-down/60'],
    ['strongSell', 'Strong Sell', 'bg-down'],
  ];
  const total = order.reduce((sum, [k]) => sum + (r[k] ?? 0), 0) || 1;

  return (
    <Card title="Analyst Recommendations">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {order.map(([k, , color]) => {
          const v = r[k] ?? 0;
          return v ? <div key={k} className={color} style={{ width: `${(v / total) * 100}%` }} title={`${k}: ${v}`} /> : null;
        })}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 text-center">
        {order.map(([k, label]) => (
          <div key={k}>
            <div className="font-mono text-xs font-semibold">{r[k] ?? 0}</div>
            <div className="text-[8px] uppercase text-faint">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const PERIOD_LABEL: Record<string, string> = {
  '0q': 'Current Qtr',
  '+1q': 'Next Qtr',
  '0y': 'Current Yr',
  '+1y': 'Next Yr',
};

function EstimateTable({ title, rows, fmt }: { title: string; rows: Estimates['earningsEstimate']; fmt: (v: number) => string }) {
  return (
    <Card title={title}>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase text-faint">
            <th className="py-0.5 text-left font-semibold">Period</th>
            <th className="py-0.5 text-right font-semibold">Avg</th>
            <th className="py-0.5 text-right font-semibold">Low</th>
            <th className="py-0.5 text-right font-semibold">High</th>
            <th className="py-0.5 text-right font-semibold"># Est</th>
            <th className="py-0.5 text-right font-semibold">YoY</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period} className="border-t border-bd2/40">
              <td className="py-1 text-muted">{PERIOD_LABEL[row.period] ?? row.period}</td>
              <td className="py-1 text-right font-mono font-semibold">{row.avg != null ? fmt(row.avg) : '—'}</td>
              <td className="py-1 text-right font-mono text-muted">{row.low != null ? fmt(row.low) : '—'}</td>
              <td className="py-1 text-right font-mono text-muted">{row.high != null ? fmt(row.high) : '—'}</td>
              <td className="py-1 text-right font-mono text-muted">{row.analysts ?? '—'}</td>
              <td className={cn('py-1 text-right font-mono', row.growth == null ? 'text-faint' : row.growth >= 0 ? 'text-up' : 'text-down')}>
                {row.growth == null ? '—' : `${row.growth >= 0 ? '+' : ''}${(row.growth * 100).toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SurpriseHistory({ rows }: { rows: Estimates['history'] }) {
  return (
    <Card title="Earnings Surprise History">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase text-faint">
            <th className="py-0.5 text-left font-semibold">Date</th>
            <th className="py-0.5 text-right font-semibold">EPS Est.</th>
            <th className="py-0.5 text-right font-semibold">Reported</th>
            <th className="py-0.5 text-right font-semibold">Surprise</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-t border-bd2/40">
              <td className="py-1 font-mono text-muted">{row.date}</td>
              <td className="py-1 text-right font-mono">{row.epsEstimate != null ? `$${row.epsEstimate.toFixed(2)}` : '—'}</td>
              <td className="py-1 text-right font-mono">
                {row.epsReported != null ? `$${row.epsReported.toFixed(2)}` : <span className="text-faint">pending</span>}
              </td>
              <td className={cn('py-1 text-right font-mono', row.surprisePct == null ? 'text-faint' : row.surprisePct >= 0 ? 'text-up' : 'text-down')}>
                {row.surprisePct == null ? '—' : `${row.surprisePct >= 0 ? '+' : ''}${row.surprisePct.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
