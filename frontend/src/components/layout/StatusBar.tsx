import { useHealth } from '@/hooks/useMarketData';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { data, isError } = useHealth();
  const ok = !!data && !isError;

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-bd bg-panel px-3 text-[10px] text-muted">
      <span className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'animate-pulse bg-up' : 'bg-down')} />
        {ok ? 'API connected' : 'API offline — run uvicorn in backend/'}
      </span>
      <span className="ml-auto hidden sm:inline">SYNTHEX TERMINAL</span>
      {/* Subtle sign-off watermark */}
      <span className="select-none text-[9px] tracking-wide text-faint/60">by Ayush Sahoo</span>
    </footer>
  );
}
