import { Refreshing } from '@/components/common/badges';
import { KeyGate } from '@/components/common/KeyGate';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useInsiders } from '@/hooks/useMarketData';
import { fmtBig } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** INSDR — insider transactions for the active ticker (Finnhub free key). */
export function InsdrPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data, isLoading, isError, refetch, isFetching } = useInsiders(ticker);

  if (isLoading) return <PanelSkeleton lines={8} />;
  if (isError) return <PanelError message={`Couldn't load insider filings for ${ticker}.`} onRetry={() => refetch()} />;
  if (data && !data.available)
    return <KeyGate provider="Finnhub" env="FINNHUB_API_KEY" url="https://finnhub.io/register" what="Insider filings" />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="text-[10px] text-faint">Insider Transactions (6m)</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {data?.rows?.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted">No insider transactions in the last 6 months.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Date</th><th className="px-2 py-1 text-left font-semibold">Insider</th><th className="px-2 py-1 text-right font-semibold">Δ Shares</th><th className="px-2 py-1 text-right font-semibold">Price</th></tr></thead>
            <tbody>
              {data?.rows?.map((r, i) => (
                <tr key={i} className="border-b border-bd2/40">
                  <td className="px-2 py-1.5 font-mono text-muted">{r.date}</td>
                  <td className="px-2 py-1.5 truncate">{r.name ?? '—'}</td>
                  <td className={cn('px-2 py-1.5 text-right font-mono', (r.change ?? 0) >= 0 ? 'text-up' : 'text-down')}>
                    {r.change != null ? `${r.change >= 0 ? '+' : ''}${fmtBig(r.change)}` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-muted">{r.price != null ? `$${r.price.toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
