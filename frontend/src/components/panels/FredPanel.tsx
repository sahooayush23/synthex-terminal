import { Refreshing } from '@/components/common/badges';
import { KeyGate } from '@/components/common/KeyGate';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useEcon } from '@/hooks/useMarketData';
import { cn } from '@/lib/utils';

/** ECO / GYLD / CORP — FRED economic dashboards (free key). One reusable panel
 *  driven by the dashboard name; shows latest value, change and a sparkline per
 *  series. Honest KeyGate when no FRED key is configured. */
export function FredPanel({ name, title }: { name: 'eco' | 'gyld' | 'corp'; title: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useEcon(name);

  if (isLoading) return <PanelSkeleton lines={8} />;
  if (isError) return <PanelError message={`Couldn't load ${title}.`} onRetry={() => refetch()} />;
  if (data && !data.available)
    return <KeyGate provider="FRED (St. Louis Fed)" env="FRED_API_KEY" url="https://fred.stlouisfed.org/docs/api/api_key.html" what={title} />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">{title}</span>
        <span className="text-[10px] text-faint">FRED</span>
        <div className="ml-auto"><Refreshing active={isFetching} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Series</th><th className="px-1 py-1 text-center font-semibold">Trend</th><th className="px-2 py-1 text-right font-semibold">Latest</th><th className="px-2 py-1 text-right font-semibold">Δ</th></tr></thead>
          <tbody>
            {data?.rows?.map((r) => (
              <tr key={r.id} className="border-b border-bd2/40">
                <td className="px-2 py-1.5"><div className="font-medium">{r.label}</div><div className="text-[9px] text-faint">{r.unit} · {r.asOf}</div></td>
                <td className="px-1 py-1.5">{r.spark.length > 1 && <Sparkline data={r.spark} width={56} height={20} className="h-5 w-14" />}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold">{r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className={cn('px-2 py-1.5 text-right font-mono', r.change == null ? 'text-faint' : r.change >= 0 ? 'text-up' : 'text-down')}>
                  {r.change == null ? '—' : `${r.change >= 0 ? '+' : ''}${r.change.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
