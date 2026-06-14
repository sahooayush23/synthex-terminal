import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { LastUpdated, LiveBadge, Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useNews } from '@/hooks/useMarketData';
import type { NewsItem } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** N — Market News center. Category tabs (each backed by a real ticker basket)
 *  plus a per-ticker mode for the active security. Auto-refreshes every ~45s.
 *  Headlines link out to the publisher; we never reproduce article text. */

const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'top', label: 'Top News' },
  { id: 'markets', label: 'Markets' },
  { id: 'tech', label: 'Technology' },
  { id: 'financials', label: 'Financials' },
  { id: 'energy', label: 'Energy' },
  { id: 'crypto', label: 'Crypto' },
];

function timeAgo(ts: number | null): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NewsPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  // 'ticker' pseudo-tab shows news for the active security.
  const [tab, setTab] = useState<string>('top');
  const symbol = tab === 'ticker' ? ticker : undefined;
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useNews(tab, symbol);

  return (
    <div className="flex h-full flex-col">
      {/* Category tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-bd2 px-1.5 py-1">
        <button
          onClick={() => setTab('ticker')}
          className={cn(
            'shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-semibold',
            tab === 'ticker' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel2 hover:text-fg',
          )}
        >
          {ticker}
        </button>
        <span className="mx-1 h-3 w-px bg-bd" />
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded px-2 py-0.5 text-[11px] font-medium',
              tab === t.id ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel2 hover:text-fg',
            )}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <Refreshing active={isFetching} />
          <LiveBadge />
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      {/* Feed */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <PanelSkeleton lines={8} />}
        {isError && <PanelError message="Couldn't load news right now." onRetry={() => refetch()} />}
        {data && data.items.length === 0 && !isLoading && (
          <PanelError message={`No recent news for ${tab === 'ticker' ? ticker : tab}.`} onRetry={() => refetch()} />
        )}
        {data?.items.map((item, i) => <NewsRow key={item.id ?? i} item={item} />)}
      </div>
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const body = (
    <>
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded object-cover"
          onError={(e) => ((e.currentTarget.style.display = 'none'))}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[10px] font-semibold text-accent">{item.publisher ?? 'Source'}</span>
          <span className="text-[10px] text-faint">· {timeAgo(item.ts)}</span>
          {item.url && <ExternalLink size={9} className="ml-auto shrink-0 text-faint" />}
        </div>
        <div className="mt-0.5 text-xs font-medium leading-snug text-fg line-clamp-2">{item.title}</div>
        {item.summary && <div className="mt-0.5 text-[10px] leading-snug text-muted line-clamp-2">{item.summary}</div>}
      </div>
    </>
  );

  const cls = 'flex gap-2 border-b border-bd2/50 px-2.5 py-2 hover:bg-panel2';
  return item.url ? (
    <a href={item.url} target="_blank" rel="noreferrer noopener" className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
