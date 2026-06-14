import { Flame, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useTerminal } from '@/stores/terminal';

import { Clock } from './Clock';
import { CommandLine } from './CommandLine';

export function TopBar() {
  const theme = useTerminal((s) => s.theme);
  const toggleTheme = useTerminal((s) => s.toggleTheme);
  const sidebarCollapsed = useTerminal((s) => s.sidebarCollapsed);
  const toggleSidebar = useTerminal((s) => s.toggleSidebar);

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-bd bg-panel px-3">
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="rounded p-1 text-muted hover:bg-panel2 hover:text-fg"
      >
        {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
      </button>

      <div className="flex items-center gap-2 select-none">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-warn font-mono text-sm font-black text-black">
          S
        </div>
        <div className="leading-none">
          <div className="font-mono text-[13px] font-bold tracking-[0.18em]">SYNTHEX</div>
          <div className="mt-0.5 text-[8px] tracking-[0.32em] text-muted">TERMINAL</div>
        </div>
      </div>

      <div className="mx-2 flex flex-1 justify-center">
        <CommandLine />
      </div>

      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to classic amber-on-black' : 'Switch to modern dark'}
        className="rounded p-1 text-muted hover:bg-panel2 hover:text-warn"
      >
        {theme === 'dark' ? <Flame size={15} /> : <Moon size={15} />}
      </button>

      <Clock />
    </header>
  );
}
