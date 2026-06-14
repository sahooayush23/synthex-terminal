import { LineChart, Plus, X } from 'lucide-react';

import { dialog } from '@/stores/dialog';
import { useTerminal } from '@/stores/terminal';

/** MYG — My Graphs: save the active security as a named graph and reopen it in
 *  the chart later. Persisted to localStorage. */
export function MygPanel() {
  const graphs = useTerminal((s) => s.savedGraphs);
  const addGraph = useTerminal((s) => s.addGraph);
  const removeGraph = useTerminal((s) => s.removeGraph);
  const ticker = useTerminal((s) => s.activeTicker);
  const setActiveTicker = useTerminal((s) => s.setActiveTicker);
  const openFunction = useTerminal((s) => s.openFunction);

  const save = async () => {
    const name = await dialog.prompt({ title: 'Save Graph', message: `Save a graph for ${ticker}.`, placeholder: `${ticker} chart`, defaultValue: `${ticker}`, confirmText: 'Save' });
    if (name) addGraph(name, ticker);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">My Graphs</span>
        <button onClick={save} className="ml-auto flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/30"><Plus size={11} /> Save {ticker}</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {graphs.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted">No saved graphs yet. Save the current security to revisit it quickly.</div>
        ) : (
          graphs.map((g) => (
            <div key={g.id} className="group flex items-center gap-2 border-b border-bd2/40 px-2 py-2 hover:bg-panel2">
              <LineChart size={13} className="text-accent" />
              <button onClick={() => { setActiveTicker(g.ticker); openFunction('GP', g.ticker); }} className="flex-1 text-left">
                <div className="text-xs font-medium">{g.name}</div>
                <div className="font-mono text-[10px] text-faint">{g.ticker}</div>
              </button>
              <button onClick={() => removeGraph(g.id)} title="Remove" className="text-faint opacity-0 hover:text-down group-hover:opacity-100"><X size={12} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
