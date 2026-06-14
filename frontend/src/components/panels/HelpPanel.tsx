import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { FUNCTIONS } from '@/data/functions';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** HELP — searchable directory of every function code and its build status. */
export function HelpPanel() {
  const openFunction = useTerminal((s) => s.openFunction);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const l = q.trim().toLowerCase();
    if (!l) return FUNCTIONS;
    return FUNCTIONS.filter(
      (f) =>
        f.code.toLowerCase().includes(l) ||
        f.name.toLowerCase().includes(l) ||
        f.description.toLowerCase().includes(l) ||
        f.aliases?.some((a) => a.toLowerCase().includes(l)),
    );
  }, [q]);

  const liveCount = FUNCTIONS.filter((f) => f.implemented).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1.5">
        <div className="flex h-6 flex-1 items-center gap-1.5 rounded border border-bd bg-bg px-2">
          <Search size={12} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter functions…"
            className="w-full bg-transparent text-xs placeholder:text-faint focus:outline-none"
          />
        </div>
        <span className="shrink-0 text-[10px] text-faint">
          {liveCount}/{FUNCTIONS.length} live
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-panel2/95 text-[9px] uppercase tracking-wider text-faint backdrop-blur">
            <tr>
              <th className="px-2 py-1 font-semibold">Code</th>
              <th className="px-2 py-1 font-semibold">Function</th>
              <th className="hidden px-2 py-1 font-semibold lg:table-cell">Source</th>
              <th className="px-2 py-1 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((fn) => (
              <tr
                key={fn.code}
                onClick={() => openFunction(fn.code)}
                className="cursor-pointer border-b border-bd2/50 hover:bg-panel2"
              >
                <td className="px-2 py-1.5 align-top">
                  <span className="rounded bg-accent/15 px-1 font-mono text-[10px] font-bold text-accent">
                    {fn.code}
                  </span>
                </td>
                <td className="px-2 py-1.5 align-top">
                  <div className="text-xs font-medium">{fn.name}</div>
                  <div className="text-[10px] leading-snug text-muted">{fn.description}</div>
                </td>
                <td className="hidden px-2 py-1.5 align-top text-[10px] text-muted lg:table-cell">
                  {fn.source}
                </td>
                <td className="px-2 py-1.5 text-right align-top">
                  <span
                    className={cn(
                      'rounded px-1 py-0.5 font-mono text-[9px] font-semibold uppercase',
                      fn.implemented ? 'bg-up/15 text-up' : 'bg-panel2 text-faint',
                    )}
                  >
                    {fn.implemented ? 'Live' : `Phase ${fn.phase}`}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted">
                  No functions match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
