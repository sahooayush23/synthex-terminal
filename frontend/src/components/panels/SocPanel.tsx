import { MessageSquareOff } from 'lucide-react';

import { LiveBadge, Refreshing } from '@/components/common/badges';
import { PanelSkeleton } from '@/components/common/states';
import { useSocial } from '@/hooks/useMarketData';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** SOC — StockTwits sentiment feed for the active ticker. StockTwits now blocks
 *  unauthenticated server access, so we degrade to an honest unavailable state
 *  rather than fabricating sentiment. */
export function SocPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data, isLoading, isFetching } = useSocial(ticker);

  if (isLoading) return <PanelSkeleton lines={8} />;

  if (!data?.available) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
        <MessageSquareOff size={20} className="text-faint" />
        <p className="max-w-[40ch] text-xs text-muted">
          Social sentiment for <span className="font-mono font-semibold text-fg">{ticker}</span> is
          unavailable — StockTwits now blocks unauthenticated access on the free tier.
        </p>
        <p className="text-[9px] text-faint">No fabricated sentiment is shown.</p>
      </div>
    );
  }

  const total = (data.bullish ?? 0) + (data.bearish ?? 0);
  const bullPct = total ? Math.round(((data.bullish ?? 0) / total) * 100) : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="text-[10px] text-faint">StockTwits</span>
        <div className="ml-auto flex items-center gap-2"><Refreshing active={isFetching} /><LiveBadge /></div>
      </div>
      {total > 0 && (
        <div className="border-b border-bd2 px-2 py-1.5">
          <div className="mb-1 flex justify-between text-[10px]"><span className="text-up">Bullish {data.bullish}</span><span className="text-down">Bearish {data.bearish}</span></div>
          <div className="flex h-2 overflow-hidden rounded-full bg-down/40"><div className="bg-up" style={{ width: `${bullPct}%` }} /></div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {data.messages?.map((m) => (
          <div key={m.id} className="border-b border-bd2/40 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-accent">@{m.user}</span>
              {m.sentiment && <span className={cn('rounded px-1 text-[8px] font-semibold uppercase', m.sentiment === 'Bullish' ? 'bg-up/15 text-up' : 'bg-down/15 text-down')}>{m.sentiment}</span>}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-fg/90 line-clamp-3">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
