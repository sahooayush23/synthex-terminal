/** App-wide dialog system — replaces native alert()/prompt()/confirm() with
 *  themed, animated in-app modals. Promise-based so callers can `await` a
 *  result from anywhere (components or plain handlers), e.g.
 *
 *    const name = await dialog.prompt({ title: 'New Watchlist' });
 *    if (await dialog.confirm({ title: 'Delete?', danger: true })) …
 */
import { create } from 'zustand';

export type DialogKind = 'prompt' | 'confirm' | 'alert';

export interface DialogConfig {
  kind: DialogKind;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type Opts = Omit<DialogConfig, 'kind'>;

interface DialogState {
  current: (DialogConfig & { id: number }) | null;
  _resolve: ((value: unknown) => void) | null;
  prompt: (opts: Opts) => Promise<string | null>;
  confirm: (opts: Opts) => Promise<boolean>;
  alert: (opts: Opts) => Promise<void>;
  /** Resolve the open dialog's promise and close it. */
  settle: (value: string | boolean | null) => void;
}

let counter = 0;

export const useDialog = create<DialogState>((set, get) => {
  const open = <T,>(cfg: DialogConfig) =>
    new Promise<T>((resolve) => {
      // If a dialog is already open, resolve it as cancelled first.
      get()._resolve?.(cfg.kind === 'confirm' ? false : null);
      set({ current: { ...cfg, id: ++counter }, _resolve: resolve as (v: unknown) => void });
    });

  return {
    current: null,
    _resolve: null,
    prompt: (opts) => open<string | null>({ ...opts, kind: 'prompt' }),
    confirm: (opts) => open<boolean>({ ...opts, kind: 'confirm' }),
    alert: (opts) => open<void>({ ...opts, kind: 'alert' }),
    settle: (value) => {
      const r = get()._resolve;
      set({ current: null, _resolve: null });
      r?.(value);
    },
  };
});

/** Imperative helper usable outside React components. */
export const dialog = {
  prompt: (opts: Opts) => useDialog.getState().prompt(opts),
  confirm: (opts: Opts) => useDialog.getState().confirm(opts),
  alert: (opts: Opts) => useDialog.getState().alert(opts),
};
