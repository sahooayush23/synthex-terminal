import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { useDialog, type DialogConfig } from '@/stores/dialog';

/** Renders the active in-app dialog (prompt / confirm / alert). Mounted once
 *  at the app root. Handles enter/leave animations, focus, Enter/Escape, and
 *  backdrop-click-to-cancel. Styled to match the terminal (dark, mono inputs). */
export function DialogHost() {
  const current = useDialog((s) => s.current);
  const settle = useDialog((s) => s.settle);

  // Keep the last config mounted through the leave animation.
  const [view, setView] = useState<(DialogConfig & { id: number }) | null>(null);
  const [phase, setPhase] = useState<'enter' | 'leave'>('enter');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (current) {
      window.clearTimeout(leaveTimer.current);
      setView(current);
      setValue(current.defaultValue ?? '');
      setPhase('enter');
    } else if (view) {
      setPhase('leave');
      leaveTimer.current = window.setTimeout(() => setView(null), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (phase === 'enter' && view?.kind === 'prompt') {
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [phase, view]);

  if (!view) return null;

  const cancel = () => settle(view.kind === 'confirm' ? false : null);
  const accept = () => settle(view.kind === 'prompt' ? value.trim() || null : view.kind === 'confirm' ? true : null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      accept();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px]',
        phase === 'enter' ? 'dialog-backdrop-in' : 'dialog-backdrop-out',
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={view.title}
        className={cn(
          'w-[340px] overflow-hidden rounded-lg border border-bd bg-panel shadow-2xl shadow-black/60',
          phase === 'enter' ? 'dialog-panel-in' : 'dialog-panel-out',
        )}
      >
        {/* Title bar — mirrors a panel header */}
        <div className="flex items-center gap-2 border-b border-bd bg-panel2/60 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-wide">{view.title}</span>
        </div>

        <div className="px-3 py-3">
          {view.message && <p className="mb-2 text-[11px] leading-relaxed text-muted">{view.message}</p>}
          {view.kind === 'prompt' && (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={view.placeholder}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded border border-bd bg-bg px-2 py-1.5 font-mono text-xs text-fg placeholder:font-sans placeholder:text-faint focus:border-accent/60 focus:outline-none"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-bd2 px-3 py-2">
          {view.kind !== 'alert' && (
            <button
              onClick={cancel}
              className="rounded border border-bd bg-panel2 px-3 py-1 text-[11px] text-muted hover:border-faint hover:text-fg"
            >
              {view.cancelText ?? 'Cancel'}
            </button>
          )}
          <button
            onClick={accept}
            className={cn(
              'rounded px-3 py-1 text-[11px] font-semibold',
              view.danger
                ? 'bg-down/20 text-down hover:bg-down/30'
                : 'bg-accent/20 text-accent hover:bg-accent/30',
            )}
          >
            {view.confirmText ?? (view.kind === 'confirm' ? 'Confirm' : view.kind === 'alert' ? 'OK' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
