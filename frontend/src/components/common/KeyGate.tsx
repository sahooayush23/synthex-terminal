import { KeyRound } from 'lucide-react';

/** Honest empty state for functions backed by a free-but-keyed source (FRED,
 *  Finnhub). Shown when the key isn't configured — no fake data. */
export function KeyGate({ provider, env, url, what }: { provider: string; env: string; url: string; what: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
      <KeyRound size={20} className="text-warn" />
      <div className="max-w-[44ch] text-xs text-muted">
        {what} is powered by <span className="font-semibold text-fg">{provider}</span> — free, no credit
        card. Add a key to enable it.
      </div>
      <div className="rounded border border-bd bg-panel2 px-3 py-2 text-left text-[10px] leading-relaxed text-muted">
        <div>
          1. Get a free key →{' '}
          <a href={url} target="_blank" rel="noreferrer noopener" className="text-accent hover:underline">
            {url.replace('https://', '')}
          </a>
        </div>
        <div className="mt-1">
          2. Add <span className="font-mono text-fg">{env}=your_key</span> to{' '}
          <span className="font-mono text-fg">backend/.env</span> and restart.
        </div>
      </div>
      <p className="text-[9px] text-faint">No data is shown until a real source is connected.</p>
    </div>
  );
}
