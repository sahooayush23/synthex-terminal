import { useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  Globe,
  Star,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { FUNCTIONS, SIDEBAR, type SidebarSection } from '@/data/functions';
import { useProfile, useQuote } from '@/hooks/useMarketData';
import { changeCls, fmtPct, fmtPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

const ICONS: Record<SidebarSection['icon'], LucideIcon> = {
  star: Star,
  chart: TrendingUp,
  briefcase: Briefcase,
  globe: Globe,
  flask: FlaskConical,
  help: CircleHelp,
};

/** Koyfin-style left nav: grouped functions with their codes right-aligned. */
export function Sidebar() {
  const collapsed = useTerminal((s) => s.sidebarCollapsed);
  const toggleSidebar = useTerminal((s) => s.toggleSidebar);

  if (collapsed) {
    return (
      <nav className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-bd bg-panel py-2">
        {SIDEBAR.map((section) => {
          const Icon = ICONS[section.icon];
          return (
            <button
              key={section.title}
              title={`${section.title} — expand sidebar`}
              onClick={toggleSidebar}
              className="rounded p-2 text-muted hover:bg-panel2 hover:text-fg"
            >
              <Icon size={15} />
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex w-[230px] shrink-0 flex-col overflow-y-auto border-r border-bd bg-panel">
      {SIDEBAR.map((section) => (
        <Section key={section.title} section={section} />
      ))}
    </nav>
  );
}

function Section({ section }: { section: SidebarSection }) {
  const [open, setOpen] = useState(true);
  const Icon = ICONS[section.icon];

  return (
    <div className="border-b border-bd2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-panel2"
      >
        <Icon size={13} className="text-muted" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {section.title}
        </span>
        <ChevronDown
          size={12}
          className={cn('ml-auto text-faint transition-transform', !open && '-rotate-90')}
        />
      </button>

      {open && (
        <div className="pb-1.5">
          {section.securityContext && <ActiveTickerChip />}
          {section.items.map((item, idx) => (
            <Item key={`${item.code}-${idx}`} code={item.code} label={item.label} display={item.display} />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({ code, label, display }: { code: string; label?: string; display?: string }) {
  const openFunction = useTerminal((s) => s.openFunction);
  const tabs = useTerminal((s) => s.tabs);
  const activeTabId = useTerminal((s) => s.activeTabId);
  const fn = FUNCTIONS.find((f) => f.code === code);
  if (!fn) return null;

  const isOpen = tabs
    .find((t) => t.id === activeTabId)
    ?.panels.some((p) => p.code === fn.code);

  return (
    <button
      onClick={() => openFunction(fn.code)}
      title={fn.implemented ? fn.description : `${fn.description} (planned — Phase ${fn.phase})`}
      className={cn(
        'group flex w-full items-center gap-2 py-[5px] pl-8 pr-3 text-left text-xs hover:bg-panel2',
        isOpen ? 'text-fg' : 'text-muted',
      )}
    >
      <span className={cn('truncate', isOpen && 'font-medium')}>{label ?? fn.name}</span>
      {!fn.implemented && (
        <span className="rounded bg-panel2 px-1 text-[8px] font-semibold text-faint group-hover:text-muted">
          P{fn.phase}
        </span>
      )}
      <span
        className={cn(
          'ml-auto font-mono text-[10px] tracking-wide',
          isOpen ? 'text-accent' : 'text-faint group-hover:text-muted',
        )}
      >
        {display ?? fn.code}
      </span>
    </button>
  );
}

/** Current security context shown under "Security Analysis" (Koyfin-style). */
function ActiveTickerChip() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data: profile } = useProfile(ticker);
  const { data: quote } = useQuote(ticker);

  return (
    <div className="mx-3 mb-1.5 rounded border border-bd bg-panel2/70 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="font-mono text-[11px] tabular-nums">{fmtPrice(quote?.price)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[10px] text-muted">{profile?.name ?? ''}</span>
        <span className={cn('font-mono text-[10px]', changeCls(quote?.changePct))}>
          {fmtPct(quote?.changePct)}
        </span>
      </div>
    </div>
  );
}
