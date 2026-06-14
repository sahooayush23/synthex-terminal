import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

import { matchFunctions, type FnDef } from '@/data/functions';
import { useSearch } from '@/hooks/useMarketData';
import type { SearchResult } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

type Item = { kind: 'fn'; fn: FnDef } | { kind: 'sec'; sec: SearchResult };

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

/** Bloomberg-style global command line.
 *  "/" focuses it from anywhere. Accepts a ticker ("AAPL"), a function code
 *  ("HELP"), or both ("AAPL GP") with autocomplete for each. */
export function CommandLine() {
  const openFunction = useTerminal((s) => s.openFunction);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [hi, setHi] = useState(0);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), 220);
    return () => window.clearTimeout(id);
  }, [value]);

  // Global "/" hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isEditable(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const twoToken = tokens.length > 1;
  // "AAPL GP" → match functions on the last token, ticker already chosen.
  const fnQuery = twoToken ? tokens[tokens.length - 1] : value.trim();
  const fnMatches = useMemo(() => matchFunctions(fnQuery).slice(0, 5), [fnQuery]);

  const { data: secResults } = useSearch(twoToken ? '' : debounced.trim());
  const securities = twoToken ? [] : (secResults ?? []).slice(0, 6);

  const items: Item[] = [
    ...fnMatches.map((fn): Item => ({ kind: 'fn', fn })),
    ...securities.map((sec): Item => ({ kind: 'sec', sec })),
  ];
  const open = focused && value.trim().length > 0;

  useEffect(() => setHi(0), [value]);

  const reset = () => {
    setValue('');
    setFocused(false);
    inputRef.current?.blur();
  };

  /** Fallback parser when the user hits Enter on raw text. */
  const executeRaw = () => {
    if (tokens.length === 0) return;
    const upper = tokens.map((t) => t.toUpperCase());
    const fnTok = upper.find((t) => matchFunctions(t).some((f) => f.code === t || f.aliases?.includes(t)));
    if (fnTok) {
      const ticker = upper.find((t) => t !== fnTok);
      openFunction(fnTok, ticker);
    } else {
      setActiveTicker(upper[0]);
      openFunction('DES', upper[0]);
    }
  };

  const run = (item?: Item) => {
    if (item?.kind === 'fn') {
      openFunction(item.fn.code, twoToken ? tokens[0] : undefined);
    } else if (item?.kind === 'sec') {
      setActiveTicker(item.sec.symbol);
      openFunction('DES', item.sec.symbol);
    } else {
      executeRaw();
    }
    reset();
  };

  return (
    <div className="relative w-full max-w-xl">
      <div
        className={cn(
          'flex h-7 items-center gap-2 rounded border bg-bg px-2 transition-colors',
          focused ? 'border-accent/60' : 'border-bd hover:border-faint',
        )}
      >
        <Search size={13} className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          id="command-line-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)} // let click-on-item land first
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              run(open ? items[hi] : undefined);
            } else if (e.key === 'Escape') {
              reset();
            }
          }}
          placeholder="Search name, ticker, or function — e.g. AAPL GP"
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent font-mono text-xs uppercase placeholder:normal-case placeholder:font-sans placeholder:text-faint focus:outline-none"
        />
        {!focused && (
          <kbd className="shrink-0 rounded border border-bd bg-panel2 px-1.5 font-mono text-[10px] text-muted">
            /
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded border border-bd bg-panel2 shadow-xl shadow-black/50">
          {items.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted">No matches — press Enter to try as a ticker</div>
          )}
          {fnMatches.length > 0 && (
            <SectionLabel>Functions</SectionLabel>
          )}
          {fnMatches.map((fn, idx) => (
            <button
              key={fn.code}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run({ kind: 'fn', fn })}
              onMouseEnter={() => setHi(idx)}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-1.5 text-left',
                hi === idx && 'bg-accent/15',
              )}
            >
              <span className="w-12 shrink-0 rounded bg-accent/15 px-1 text-center font-mono text-[10px] font-bold text-accent">
                {fn.code}
              </span>
              <span className="truncate text-xs">{fn.name}</span>
              <span className={cn('ml-auto font-mono text-[9px] uppercase', fn.implemented ? 'text-up' : 'text-faint')}>
                {fn.implemented ? 'live' : `phase ${fn.phase}`}
              </span>
            </button>
          ))}
          {securities.length > 0 && <SectionLabel>Securities</SectionLabel>}
          {securities.map((sec, j) => {
            const idx = fnMatches.length + j;
            return (
              <button
                key={`${sec.symbol}-${j}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run({ kind: 'sec', sec })}
                onMouseEnter={() => setHi(idx)}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1.5 text-left',
                  hi === idx && 'bg-accent/15',
                )}
              >
                <span className="w-16 shrink-0 truncate font-mono text-xs font-semibold">{sec.symbol}</span>
                <span className="truncate text-xs text-muted">{sec.name}</span>
                <span className="ml-auto shrink-0 text-[9px] uppercase text-faint">{sec.exchange}</span>
              </button>
            );
          })}
          <div className="flex items-center gap-1.5 border-t border-bd px-2 py-1 text-[10px] text-faint">
            <CornerDownLeft size={10} /> open · ↑↓ navigate · try <span className="font-mono">NVDA GP</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-bd2 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-faint">
      {children}
    </div>
  );
}
