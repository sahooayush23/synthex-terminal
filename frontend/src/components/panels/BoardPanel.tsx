import { useMemo, useState } from 'react';

import { LastUpdated, Refreshing } from '@/components/common/badges';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useBoard } from '@/hooks/useMarketData';
import type { BoardRow } from '@/lib/api';
import { changeCls, fmtPct, fmtPrice, fmtSigned } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

type SortKey = 'label' | 'last' | 'changePct';

/** Generic quote board — powers WEI (indices), SECT (sectors) and CMTY
 *  (commodities). Sortable rows with a 1-month sparkline and color-coded
 *  daily change. */
export function BoardPanel({ board, title }: { board: string; title: string }) {
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useBoard(board);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'changePct', dir: -1 });

  const rows = useMemo(() => {
    const r = [...(data?.rows ?? [])];
    r.sort((a, b) => {
      const av = sort.key === 'label' ? a.label : (a[sort.key] ?? -Infinity);
      const bv = sort.key === 'label' ? b.label : (b[sort.key] ?? -Infinity);
      if (av < bv) return -sort.dir;
      if (av > bv) return sort.dir;
      return 0;
    });
    return r;
  }, [data, sort]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : '');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          <Refreshing active={isFetching} />
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <PanelSkeleton lines={10} />}
        {isError && <PanelError message={`Couldn't load ${title.toLowerCase()}.`} onRetry={() => refetch()} />}
        {data && !isLoading && (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-panel">
              <tr className="border-b border-bd text-[9px] uppercase text-faint">
                <th className="cursor-pointer px-2 py-1 text-left font-semibold hover:text-muted" onClick={() => toggle('label')}>Name{arrow('label')}</th>
                <th className="px-1 py-1 text-center font-semibold">1M</th>
                <th className="cursor-pointer px-2 py-1 text-right font-semibold hover:text-muted" onClick={() => toggle('last')}>Last{arrow('last')}</th>
                <th className="px-2 py-1 text-right font-semibold">Chg</th>
                <th className="cursor-pointer px-2 py-1 text-right font-semibold hover:text-muted" onClick={() => toggle('changePct')}>Chg%{arrow('changePct')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.symbol} row={row} onPick={() => { setActiveTicker(row.symbol); openFunction('GP', row.symbol); }} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ row, onPick }: { row: BoardRow; onPick: () => void }) {
  const up = row.changePct != null && row.changePct >= 0;
  return (
    <tr
      onClick={onPick}
      className={cn('cursor-pointer border-b border-bd2/40 hover:bg-panel2',
        row.changePct != null && (up ? 'border-l-2 border-l-up/50' : 'border-l-2 border-l-down/50'))}
    >
      <td className="px-2 py-1.5">
        <div className="font-medium">{row.label}</div>
        <div className="font-mono text-[9px] text-faint">{row.symbol}</div>
      </td>
      <td className="px-1 py-1.5">
        {row.spark.length > 1 && <Sparkline data={row.spark} width={56} height={20} className="h-5 w-14" />}
      </td>
      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtPrice(row.last)}</td>
      <td className={cn('px-2 py-1.5 text-right font-mono tabular-nums', changeCls(row.change))}>{fmtSigned(row.change)}</td>
      <td className={cn('px-2 py-1.5 text-right font-mono tabular-nums', changeCls(row.changePct))}>{fmtPct(row.changePct)}</td>
    </tr>
  );
}
