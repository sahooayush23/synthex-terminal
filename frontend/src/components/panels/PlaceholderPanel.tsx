import { Construction } from 'lucide-react';

import { findFunction } from '@/data/functions';

/** Honest placeholder for function codes that aren't built yet.
 *  Never fake data — state the phase and the free source it will use. */
export function PlaceholderPanel({ code }: { code: string }) {
  const fn = findFunction(code);
  if (!fn) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
        Unknown function code “{code}”.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
      <Construction size={22} className="text-warn" />
      <div>
        <div className="flex items-center justify-center gap-2">
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-xs font-bold text-accent">
            {fn.code}
          </span>
          <span className="text-sm font-semibold">{fn.name}</span>
        </div>
        <p className="mx-auto mt-2 max-w-[44ch] text-[11px] leading-relaxed text-muted">
          {fn.description}
        </p>
      </div>
      <div className="rounded border border-bd bg-panel2 px-3 py-2 text-[10px] leading-relaxed text-muted">
        <div>
          Planned for <span className="font-semibold text-warn">Phase {fn.phase}</span>
        </div>
        <div className="mt-0.5">
          Data source: <span className="text-fg">{fn.source}</span>
        </div>
      </div>
      <p className="max-w-[40ch] text-[9px] text-faint">
        This panel is intentionally a stub — no fake data is shown. See the README build order.
      </p>
    </div>
  );
}
