import { Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useActions } from '@/hooks/useMarketData';
import { useTerminal } from '@/stores/terminal';

/** CACT — corporate actions: dividend and split history (yfinance, keyless). */
export function CactPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data, isLoading, isError, refetch, isFetching } = useActions(ticker);

  if (isLoading) return <PanelSkeleton lines={8} />;
  if (isError || !data) return <PanelError message={`Couldn't load corporate actions for ${ticker}.`} onRetry={() => refetch()} />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="text-[10px] text-faint">Dividends & Splits</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {data.splits.length > 0 && (
          <section className="mb-3">
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Stock Splits</h3>
            <div className="overflow-hidden rounded border border-bd">
              {data.splits.map((s) => (
                <div key={s.date} className="flex justify-between border-b border-bd2/40 px-2 py-1 text-[11px] last:border-0">
                  <span className="font-mono text-muted">{s.date}</span>
                  <span className="font-mono font-semibold">{s.ratio}:1</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Dividend History</h3>
        {data.dividends.length === 0 ? (
          <div className="px-2 py-4 text-center text-[11px] text-muted">No dividend history.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead><tr className="text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Ex-Date</th><th className="px-2 py-1 text-right font-semibold">Amount / Share</th></tr></thead>
            <tbody>
              {data.dividends.map((d) => (
                <tr key={d.date} className="border-t border-bd2/40">
                  <td className="px-2 py-1 font-mono text-muted">{d.date}</td>
                  <td className="px-2 py-1 text-right font-mono">${d.amount?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
