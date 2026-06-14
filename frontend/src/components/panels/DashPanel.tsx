import { LayoutGrid, Plus, X } from 'lucide-react';

import { findFunction } from '@/data/functions';
import { dialog } from '@/stores/dialog';
import { useTerminal } from '@/stores/terminal';

/** DASH — My Dashboards: save the current workspace tab (its panels + layout)
 *  as a named dashboard and reload it into a new tab later. */
export function DashPanel() {
  const dashboards = useTerminal((s) => s.dashboards);
  const saveDashboard = useTerminal((s) => s.saveDashboard);
  const loadDashboard = useTerminal((s) => s.loadDashboard);
  const deleteDashboard = useTerminal((s) => s.deleteDashboard);
  const tabs = useTerminal((s) => s.tabs);
  const activeTabId = useTerminal((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const save = async () => {
    const name = await dialog.prompt({ title: 'Save Dashboard', message: 'Save the current workspace layout as a named dashboard.', placeholder: 'e.g. Macro Desk', confirmText: 'Save' });
    if (name) saveDashboard(name);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">My Dashboards</span>
        <button onClick={save} disabled={!activeTab?.panels.length} className="ml-auto flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/30 disabled:opacity-40"><Plus size={11} /> Save current</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {dashboards.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted">No saved dashboards yet. Arrange a workspace, then "Save current" to reuse it.</div>
        ) : (
          dashboards.map((d) => (
            <div key={d.id} className="group flex items-center gap-2 border-b border-bd2/40 px-2 py-2 hover:bg-panel2">
              <LayoutGrid size={13} className="text-accent" />
              <button onClick={() => loadDashboard(d.id)} className="flex-1 text-left">
                <div className="text-xs font-medium">{d.name}</div>
                <div className="font-mono text-[9px] text-faint">{d.panels.map((p) => findFunction(p.code)?.code ?? p.code).join(' · ')}</div>
              </button>
              <button onClick={() => deleteDashboard(d.id)} title="Delete" className="text-faint opacity-0 hover:text-down group-hover:opacity-100"><X size={12} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
