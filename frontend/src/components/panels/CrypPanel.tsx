import { useState } from 'react';

import { LastUpdated, LiveBadge, Refreshing } from '@/components/common/badges';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useCrypto } from '@/hooks/useMarketData';
import type { CryptoRow } from '@/lib/api';
import { changeCls, fmtBig, fmtPct, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/** CRYP — crypto board from CoinGecko (keyless, near real-time → labelled live).
 *  Price, 24h/7d change, market cap, volume and a 7-day sparkline. */
export function CrypPanel() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useCrypto(30);
  const [hl, setHl] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Crypto</span>
        <span className="text-[10px] text-faint">Top by market cap · USD</span>
        <div className="ml-auto flex items-center gap-2">
          <Refreshing active={isFetching} />
          <LiveBadge />
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <PanelSkeleton lines={12} />}
        {isError && <PanelError message="Couldn't load crypto data." onRetry={() => refetch()} />}
        {data && !isLoading && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-bd text-[9px] uppercase text-faint">
                <th className="px-2 py-1 text-left font-semibold">#</th>
                <th className="px-2 py-1 text-left font-semibold">Coin</th>
                <th className="px-1 py-1 text-center font-semibold">7D</th>
                <th className="px-2 py-1 text-right font-semibold">Price</th>
                <th className="px-2 py-1 text-right font-semibold">24h</th>
                <th className="px-2 py-1 text-right font-semibold">7d</th>
                <th className="hidden px-2 py-1 text-right font-semibold sm:table-cell">Mkt Cap</th>
              </tr>
            </thead>
            <tbody onMouseLeave={() => setHl(null)}>
              {data.rows.map((row) => (
                <Row key={row.id} row={row} highlighted={hl === row.id} onHover={() => setHl(row.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ row, highlighted, onHover }: { row: CryptoRow; highlighted: boolean; onHover: () => void }) {
  return (
    <tr onMouseEnter={onHover} className={cn('border-b border-bd2/40', highlighted && 'bg-panel2')}>
      <td className="px-2 py-1.5 font-mono text-[10px] text-faint">{row.rank ?? '—'}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          {row.image && <img src={row.image} alt="" className="h-4 w-4 rounded-full" loading="lazy" />}
          <div>
            <span className="font-mono font-semibold">{row.symbol}</span>
            <span className="ml-1 text-[9px] text-faint">{row.name}</span>
          </div>
        </div>
      </td>
      <td className="px-1 py-1.5">
        {row.spark.length > 1 && <Sparkline data={row.spark} width={56} height={20} className="h-5 w-14" />}
      </td>
      <td className="px-2 py-1.5 text-right font-mono tabular-nums">
        {row.price != null ? `$${fmtPrice(row.price)}` : '—'}
      </td>
      <td className={cn('px-2 py-1.5 text-right font-mono tabular-nums', changeCls(row.change24hPct))}>{fmtPct(row.change24hPct)}</td>
      <td className={cn('px-2 py-1.5 text-right font-mono tabular-nums', changeCls(row.change7dPct))}>{fmtPct(row.change7dPct)}</td>
      <td className="hidden px-2 py-1.5 text-right font-mono tabular-nums text-muted sm:table-cell">${fmtBig(row.marketCap)}</td>
    </tr>
  );
}
