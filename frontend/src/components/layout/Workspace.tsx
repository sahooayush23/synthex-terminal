import { useEffect, useRef, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { Plus, X } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { PanelShell } from '@/components/panels/PanelShell';
import { cn } from '@/lib/utils';
import { useTerminal, type WorkspaceTab } from '@/stores/terminal';

import { SecurityHeader } from './SecurityHeader';

/** Track a container's width with a ResizeObserver.
 *  react-grid-layout's bundled WidthProvider only re-measures on window
 *  resize, so it reports a stale width when the flex layout settles without
 *  one — collapsing every panel into a tiny overlapping column. Observing the
 *  element directly fixes that. */
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Center workspace: tab strip + security header + draggable/resizable
 *  panel grid. Layouts persist per tab via the store (localStorage). */
export function Workspace() {
  const tabs = useTerminal((s) => s.tabs);
  const activeTabId = useTerminal((s) => s.activeTabId);
  const setLayouts = useTerminal((s) => s.setLayouts);
  const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const { ref, width } = useContainerWidth();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
      <TabStrip />
      <SecurityHeader />
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto">
        {tab.panels.length === 0 ? (
          <EmptyState />
        ) : (
          width > 0 && (
            <GridLayout
              width={width}
              layout={tab.layouts}
              cols={12}
              rowHeight={30}
              margin={[8, 8]}
              containerPadding={[8, 8]}
              // Manual drag/resize removed by request — panels auto-tile into a
              // clean, fixed grid on open (no manual window management, no
              // bottom-right resize handle).
              isDraggable={false}
              isResizable={false}
              compactType="vertical"
              onLayoutChange={(layouts: Layout[]) => setLayouts(tab.id, layouts)}
            >
              {tab.panels.map((p) => (
                <div key={p.i}>
                  <PanelShell panel={p} tabId={tab.id} />
                </div>
              ))}
            </GridLayout>
          )
        )}
      </div>
    </div>
  );
}

function TabStrip() {
  const tabs = useTerminal((s) => s.tabs);
  const activeTabId = useTerminal((s) => s.activeTabId);
  const setActiveTab = useTerminal((s) => s.setActiveTab);
  const addTab = useTerminal((s) => s.addTab);

  return (
    <div className="flex h-8 shrink-0 items-end gap-1 border-b border-bd bg-bg px-2">
      {tabs.map((t) => (
        <Tab key={t.id} tab={t} active={t.id === activeTabId} onActivate={() => setActiveTab(t.id)} />
      ))}
      <button
        onClick={addTab}
        title="New workspace tab"
        className="mb-1 rounded p-1 text-muted hover:bg-panel2 hover:text-fg"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

function Tab({
  tab,
  active,
  onActivate,
}: {
  tab: WorkspaceTab;
  active: boolean;
  onActivate: () => void;
}) {
  const closeTab = useTerminal((s) => s.closeTab);
  const renameTab = useTerminal((s) => s.renameTab);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tab.name);

  return (
    <div
      onClick={onActivate}
      onDoubleClick={() => {
        setDraft(tab.name);
        setEditing(true);
      }}
      className={cn(
        'group flex h-7 cursor-pointer items-center gap-1.5 rounded-t border border-b-0 px-2.5 text-xs',
        active
          ? 'border-bd bg-panel font-medium text-fg'
          : 'border-transparent text-muted hover:bg-panel2 hover:text-fg',
      )}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            renameTab(tab.id, draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-24 bg-transparent text-xs focus:outline-none"
        />
      ) : (
        <span title="Double-click to rename">{tab.name}</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        title="Close tab"
        className="rounded p-0.5 text-faint opacity-0 hover:bg-bd hover:text-fg group-hover:opacity-100"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function EmptyState() {
  const openFunction = useTerminal((s) => s.openFunction);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);

  const examples: { label: string; run: () => void }[] = [
    { label: 'AAPL DES', run: () => openFunction('DES', 'AAPL') },
    { label: 'NVDA GP', run: () => { setActiveTicker('NVDA'); openFunction('GP', 'NVDA'); } },
    { label: 'HELP', run: () => openFunction('HELP') },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 select-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-warn font-mono text-2xl font-black text-warn">
        S
      </div>
      <div className="text-center">
        <div className="font-mono text-sm font-bold tracking-[0.3em] text-fg">SYNTHEX TERMINAL</div>
        <div className="mt-1 text-xs text-muted">
          Press <kbd className="rounded border border-bd bg-panel2 px-1 font-mono text-[10px]">/</kbd> and
          type a ticker or function code
        </div>
      </div>
      <div className="flex gap-2">
        {examples.map((ex) => (
          <button
            key={ex.label}
            onClick={ex.run}
            className="rounded border border-bd bg-panel px-2.5 py-1 font-mono text-[11px] text-muted hover:border-accent/50 hover:text-accent"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
