import { AlertTriangle, RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Shimmering placeholder rows while a panel loads. */
export function PanelSkeleton({ lines = 6, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 p-3', className)} aria-busy>
      <div className="skeleton h-6 w-2/5" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${88 - ((i * 13) % 40)}%` }} />
      ))}
    </div>
  );
}

/** Graceful error state with retry — panels must never silently die. */
export function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <AlertTriangle size={18} className="text-warn" />
      <p className="max-w-[36ch] text-xs text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded border border-bd bg-panel2 px-2 py-1 text-[11px] text-fg hover:border-accent/50 hover:text-accent"
        >
          <RefreshCw size={11} /> Retry
        </button>
      )}
    </div>
  );
}
