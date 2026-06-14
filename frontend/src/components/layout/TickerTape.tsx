import { FlashNumber } from '@/components/common/FlashNumber';
import { useQuotes } from '@/hooks/useMarketData';
import type { Quote } from '@/lib/api';
import { changeCls, fmtPct, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

interface TapeEntry {
  symbol: string;
  label: string;
  /** Crypto/FX trade near real-time; indices/futures are delayed. */
  live?: boolean;
}

const TAPE: TapeEntry[] = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'NASDAQ' },
  { symbol: '^DJI', label: 'DOW' },
  { symbol: '^RUT', label: 'RUSSELL 2K' },
  { symbol: '^VIX', label: 'VIX' },
  { symbol: 'BTC-USD', label: 'BTC', live: true },
  { symbol: 'ETH-USD', label: 'ETH', live: true },
  { symbol: 'EURUSD=X', label: 'EUR/USD', live: true },
  { symbol: 'GC=F', label: 'GOLD' },
  { symbol: 'CL=F', label: 'WTI' },
];

/** Scrolling index tape under the top bar. Auto-refreshes every 20 s;
 *  pauses on hover; clicking an entry loads it as the active security. */
export function TickerTape() {
  const { data } = useQuotes(TAPE.map((t) => t.symbol), 20_000);

  return (
    <div className="group relative h-7 shrink-0 overflow-hidden border-b border-bd bg-panel">
      {!data ? (
        <div className="flex h-full items-center gap-6 px-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-3 w-28" />
          ))}
        </div>
      ) : (
        <div
          className="animate-marquee flex w-max items-center group-hover:[animation-play-state:paused]"
          style={{ '--marquee-duration': '75s' } as React.CSSProperties}
        >
          {/* two copies for a seamless loop */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
              {TAPE.map((entry) => (
                <TapeItem key={`${copy}-${entry.symbol}`} entry={entry} quote={data[entry.symbol]} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TapeItem({ entry, quote }: { entry: TapeEntry; quote: Quote | undefined }) {
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);
  const pct = quote?.changePct;

  return (
    <button
      onClick={() => {
        setActiveTicker(entry.symbol);
        openFunction('GP', entry.symbol);
      }}
      title={`${entry.symbol} — open chart`}
      className="flex h-7 items-center gap-1.5 border-r border-bd2 px-3 hover:bg-panel2"
    >
      {entry.live && <span className="h-1 w-1 animate-pulse rounded-full bg-up" title="Near real-time" />}
      <span className="text-[10px] font-medium tracking-wide text-muted">{entry.label}</span>
      <FlashNumber value={quote?.price} format={fmtPrice} className="font-mono text-[11px] font-semibold" />
      <span className={cn('font-mono text-[10px]', changeCls(pct))}>
        {pct == null ? '' : pct >= 0 ? '▲' : '▼'} {fmtPct(pct)}
      </span>
    </button>
  );
}
