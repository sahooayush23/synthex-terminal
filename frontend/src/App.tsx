import { useEffect } from 'react';
import { PanelLeft } from 'lucide-react';

import { DialogHost } from '@/components/common/DialogHost';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TickerTape } from '@/components/layout/TickerTape';
import { TopBar } from '@/components/layout/TopBar';
import { Workspace } from '@/components/layout/Workspace';
import { WatchlistPanel } from '@/components/panels/WatchlistPanel';
import { useTerminal } from '@/stores/terminal';

export default function App() {
  const theme = useTerminal((s) => s.theme);
  const watchlistOpen = useTerminal((s) => s.watchlistOpen);
  const setWatchlistOpen = useTerminal((s) => s.setWatchlistOpen);

  // Apply the theme to <html data-theme> so CSS variables swap globally.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="flex h-screen flex-col overflow-hidden text-fg">
      <TopBar />
      <TickerTape />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <Workspace />
        {watchlistOpen ? (
          <WatchlistPanel />
        ) : (
          <button
            onClick={() => setWatchlistOpen(true)}
            title="Open watchlist"
            className="flex w-7 shrink-0 items-center justify-center border-l border-bd bg-panel text-muted hover:bg-panel2 hover:text-fg"
          >
            <PanelLeft size={15} />
          </button>
        )}
      </div>
      <StatusBar />
      <DialogHost />
    </div>
  );
}
