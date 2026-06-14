import { Plane } from 'lucide-react';

import { LiveBadge, Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useFlights } from '@/hooks/useMarketData';

/** FLT — experimental live flight tracking over the US (OpenSky, keyless). */
export function FltPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useFlights();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <Plane size={12} className="text-accent" />
        <span className="text-[11px] font-semibold">Flight Tracking</span>
        <span className="text-[10px] text-faint">{data ? `${data.total} aircraft over US` : 'OpenSky · experimental'}</span>
        <div className="ml-auto flex items-center gap-2"><Refreshing active={isFetching} /><LiveBadge /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && <PanelSkeleton lines={10} />}
        {isError && <PanelError message="OpenSky is rate-limited or unavailable right now." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-panel"><tr className="border-b border-bd text-[9px] uppercase text-faint"><th className="px-2 py-1 text-left font-semibold">Callsign</th><th className="px-2 py-1 text-left font-semibold">Origin</th><th className="px-2 py-1 text-right font-semibold">Alt (ft)</th><th className="px-2 py-1 text-right font-semibold">Speed (kt)</th><th className="px-2 py-1 text-right font-semibold">Hdg</th></tr></thead>
            <tbody>
              {data.flights.map((f) => (
                <tr key={f.icao24} className="border-b border-bd2/40 hover:bg-panel2">
                  <td className="px-2 py-1 font-mono font-semibold">{f.callsign ?? f.icao24}</td>
                  <td className="px-2 py-1 truncate text-muted">{f.country ?? '—'}</td>
                  <td className="px-2 py-1 text-right font-mono">{f.altitude != null ? Math.round(f.altitude * 3.281).toLocaleString() : '—'}</td>
                  <td className="px-2 py-1 text-right font-mono">{f.velocity != null ? Math.round(f.velocity * 1.944) : '—'}</td>
                  <td className="px-2 py-1 text-right font-mono text-muted">{f.heading != null ? `${Math.round(f.heading)}°` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
