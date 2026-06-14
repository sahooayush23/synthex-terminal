import { ExternalLink } from 'lucide-react';

import { FreshnessBadge, LastUpdated, Refreshing } from '@/components/common/badges';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useCandles, useProfile, useQuote } from '@/hooks/useMarketData';
import { changeCls, fmtBig, fmtCap, fmtPct, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** DES — security description + key statistics + a 1Y trend sparkline. */
export function DesPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data: profile, isLoading, isError, refetch } = useProfile(ticker);
  const { data: quote, isFetching, dataUpdatedAt } = useQuote(ticker);
  const { data: candleData } = useCandles(ticker, '1Y');

  if (isLoading) return <PanelSkeleton lines={8} />;
  if (isError || !profile)
    return <PanelError message={`Couldn't load profile for ${ticker}.`} onRetry={() => refetch()} />;

  const closes = (candleData?.candles ?? []).map((c) => c.close);

  // 52-week range position (0–100%) for the little range bar.
  const lo = profile.low52;
  const hi = profile.high52;
  const px = quote?.price ?? profile.epsTrailing; // px just for the marker
  const rangePct =
    lo != null && hi != null && px != null && hi > lo
      ? Math.min(100, Math.max(0, ((px - lo) / (hi - lo)) * 100))
      : null;

  const stats: [string, string][] = [
    ['Mkt Cap', fmtCap(profile.marketCap)],
    ['P/E (TTM)', profile.peTrailing != null ? profile.peTrailing.toFixed(2) : '—'],
    ['Fwd P/E', profile.peForward != null ? profile.peForward.toFixed(2) : '—'],
    ['EPS (TTM)', profile.epsTrailing != null ? profile.epsTrailing.toFixed(2) : '—'],
    ['Div Yield', profile.divYieldPct != null ? `${profile.divYieldPct.toFixed(2)}%` : '—'],
    ['Beta', profile.beta != null ? profile.beta.toFixed(2) : '—'],
    ['Avg Vol', fmtBig(profile.avgVolume)],
    ['Shares Out', fmtBig(profile.sharesOut)],
    ['52W High', fmtPrice(profile.high52)],
    ['52W Low', fmtPrice(profile.low52)],
    ['Employees', profile.employees != null ? fmtBig(profile.employees) : '—'],
    ['Country', profile.country ?? '—'],
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between gap-2 border-b border-bd2 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <FreshnessBadge realtime={quote?.realtime} />
          <Refreshing active={isFetching} />
        </div>
        <LastUpdated ts={dataUpdatedAt} />
      </div>

      {/* Price + 1Y sparkline */}
      <div className="flex items-center justify-between gap-3 px-3 pt-3">
        <div>
          <div className="font-mono text-2xl font-bold tabular-nums">{fmtPrice(quote?.price)}</div>
          <div className={cn('font-mono text-xs', changeCls(quote?.change))}>
            {quote?.change != null && quote.change >= 0 ? '+' : ''}
            {fmtPrice(quote?.change)} ({fmtPct(quote?.changePct)}) 1D
          </div>
        </div>
        {closes.length > 1 && (
          <div className="w-32">
            <Sparkline data={closes} height={40} />
            <div className="mt-0.5 text-right text-[9px] text-faint">1Y trend</div>
          </div>
        )}
      </div>

      {/* 52-week range bar */}
      {rangePct != null && (
        <div className="px-3 pt-3">
          <div className="mb-1 flex justify-between text-[9px] text-faint">
            <span>52W Range</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-panel2">
            <div
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-fg"
              style={{ left: `${rangePct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted">
            <span>{fmtPrice(profile.low52)}</span>
            <span>{fmtPrice(profile.high52)}</span>
          </div>
        </div>
      )}

      {/* Key stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0 px-3 pt-3">
        {stats.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-bd2/60 py-[5px]">
            <span className="text-[11px] text-muted">{label}</span>
            <span className="font-mono text-[11px] tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* Business summary */}
      {profile.summary && (
        <div className="px-3 py-3">
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-faint">
            Description
          </div>
          <p className="text-[11px] leading-relaxed text-muted line-clamp-6">{profile.summary}</p>
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-bd2 px-3 py-1.5 text-[10px]">
        <span className="text-muted">{profile.sector ?? '—'}</span>
        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto flex items-center gap-1 text-accent hover:underline"
          >
            Website <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  );
}
