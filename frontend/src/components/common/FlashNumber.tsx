import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface FlashNumberProps {
  value: number | null | undefined;
  format?: (n: number) => string;
  className?: string;
}

/** Renders a number that flashes green on an up-tick and red on a down-tick.
 *  The key bump forces a remount so the CSS animation restarts even when two
 *  consecutive ticks move in the same direction. */
export function FlashNumber({ value, format, className }: FlashNumberProps) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; n: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (value == null) return;
    if (prev.current != null && value !== prev.current) {
      setFlash((f) => ({ dir: value > (prev.current as number) ? 'up' : 'down', n: (f?.n ?? 0) + 1 }));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(null), 850);
    }
    prev.current = value;
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      key={flash?.n ?? 0}
      className={cn(
        '-mx-0.5 rounded-sm px-0.5 tabular-nums',
        flash?.dir === 'up' && 'flash-up',
        flash?.dir === 'down' && 'flash-down',
        className,
      )}
    >
      {value == null ? '—' : format ? format(value) : String(value)}
    </span>
  );
}
