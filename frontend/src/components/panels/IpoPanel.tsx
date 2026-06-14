import { Refreshing } from '@/components/common/badges';
import { KeyGate } from '@/components/common/KeyGate';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useIpos } from '@/hooks/useMarketData';

/** IPO — recent & upcoming IPO calendar (Finnhub free key). */
export function IpoPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useIpos();

  if (isLoading) return <PanelSkeleton lines={8} />;
  if (isError) return <PanelError message="Couldn't load the IPO calendar." onRetry={() => refetch()} />;
  if (data && !data.available)
    return <KeyGate provider="Finnhub" env="FINNHUB_API_KEY" url="https://finnhub.io/register" what="The IPO calendar" />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Recent & Upcoming IPOs</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {data?.rows?.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted">No IPOs in the current window.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Date</th><th className="px-2 py-1 text-left font-semibold">Symbol</th><th className="px-2 py-1 text-left font-semibold">Company</th><th className="px-2 py-1 text-right font-semibold">Price</th></tr></thead>
            <tbody>
              {data?.rows?.map((r, i) => (
                <tr key={`${r.symbol}-${i}`} className="border-b border-bd2/40">
                  <td className="px-2 py-1.5 font-mono text-muted">{r.date}</td>
                  <td className="px-2 py-1.5 font-mono font-semibold">{r.symbol ?? '—'}</td>
                  <td className="px-2 py-1.5 truncate">{r.name ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-muted">{r.priceRange ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
