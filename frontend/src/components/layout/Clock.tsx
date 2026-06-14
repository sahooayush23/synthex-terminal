import { useEffect, useState } from 'react';

import { fmtClock } from '@/lib/format';
import { cn } from '@/lib/utils';

type Session = 'open' | 'pre' | 'post' | 'closed';

/** Approximate NYSE session from wall-clock ET (holidays not modelled). */
function usMarketSession(now: Date): Session {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
  const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'pre';
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'open';
  if (mins >= 16 * 60 && mins < 20 * 60) return 'post';
  return 'closed';
}

const SESSION_STYLE: Record<Session, { label: string; cls: string }> = {
  open: { label: 'US OPEN', cls: 'border-up/40 bg-up/10 text-up' },
  pre: { label: 'PRE-MKT', cls: 'border-warn/40 bg-warn/10 text-warn' },
  post: { label: 'POST-MKT', cls: 'border-warn/40 bg-warn/10 text-warn' },
  closed: { label: 'US CLOSED', cls: 'border-bd bg-panel2 text-muted' },
};

/** Truly real-time local clock (1 s tick) + ET time + US session chip. */
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const session = SESSION_STYLE[usMarketSession(now)];
  const et = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York' });

  return (
    <div className="flex items-center gap-2.5 select-none">
      <span
        title="Approximate US equity session (holidays not modelled)"
        className={cn(
          'rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider',
          session.cls,
        )}
      >
        {session.label}
      </span>
      <div className="text-right leading-tight">
        <div className="font-mono text-sm font-semibold tabular-nums">{fmtClock(now)}</div>
        <div className="font-mono text-[10px] tabular-nums text-muted">{et} ET</div>
      </div>
    </div>
  );
}
