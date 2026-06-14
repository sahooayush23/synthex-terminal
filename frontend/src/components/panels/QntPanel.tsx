import { useEffect, useRef, useState } from 'react';
import { Loader2, Play } from 'lucide-react';

import { cn } from '@/lib/utils';

const PYODIDE_VERSION = 'v0.26.2';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

const STARTER = `# In-browser Python (Pyodide) — numpy & pandas available.
import numpy as np

# Simple Monte Carlo: 1-year price paths via geometric Brownian motion
S0, mu, sigma, days, sims = 100, 0.08, 0.25, 252, 10000
dt = 1/252
rng = np.random.default_rng(42)
paths = S0 * np.exp(np.cumsum((mu - 0.5*sigma**2)*dt + sigma*np.sqrt(dt)*rng.standard_normal((days, sims)), axis=0))
ending = paths[-1]
print(f"Mean 1Y price:   {ending.mean():.2f}")
print(f"5th percentile:  {np.percentile(ending, 5):.2f}")
print(f"95th percentile: {np.percentile(ending, 95):.2f}")
print(f"P(loss):         {(ending < S0).mean():.1%}")
`;

// Pyodide attaches loadPyodide to window; it isn't typed.
type Pyodide = { runPythonAsync: (c: string) => Promise<unknown>; loadPackagesFromImports: (c: string) => Promise<void>; setStdout: (o: { batched: (s: string) => void }) => void; setStderr: (o: { batched: (s: string) => void }) => void };
declare global {
  interface Window { loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>; }
}

/** QNT — in-browser Python quant scratchpad powered by Pyodide (WASM, loaded
 *  from a free CDN on demand). numpy/pandas auto-load from imports. Nothing
 *  leaves the browser. */
export function QntPanel() {
  const [code, setCode] = useState(STARTER);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'error'>('loading');
  const pyRef = useRef<Pyodide | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = `${PYODIDE_URL}pyodide.js`;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load Pyodide'));
            document.head.appendChild(s);
          });
        }
        const py = await window.loadPyodide!({ indexURL: PYODIDE_URL });
        if (cancelled) return;
        pyRef.current = py;
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    const py = pyRef.current;
    if (!py || status === 'running') return;
    setStatus('running');
    setOutput('');
    const buf: string[] = [];
    py.setStdout({ batched: (s) => buf.push(s) });
    py.setStderr({ batched: (s) => buf.push(s) });
    try {
      await py.loadPackagesFromImports(code);
      await py.runPythonAsync(code);
      setOutput(buf.join('\n') || '(no output)');
    } catch (e) {
      setOutput(`${buf.join('\n')}\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setStatus('ready');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="text-[11px] font-semibold">Quant Python</span>
        <span className="text-[10px] text-faint">Pyodide · runs in your browser</span>
        <div className="ml-auto flex items-center gap-2">
          {status === 'loading' && <span className="flex items-center gap-1 text-[10px] text-muted"><Loader2 size={11} className="animate-spin" /> Loading runtime…</span>}
          <button
            onClick={run}
            disabled={status !== 'ready'}
            className={cn('flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold', status === 'ready' ? 'bg-up/20 text-up hover:bg-up/30' : 'cursor-not-allowed bg-panel2 text-faint')}
          >
            {status === 'running' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Run
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-bg p-2 font-mono text-[11px] leading-relaxed text-fg focus:outline-none"
        />
        <div className="h-2/5 min-h-0 overflow-auto border-t border-bd bg-panel2/40 p-2">
          <div className="mb-1 text-[9px] uppercase tracking-wider text-faint">Output</div>
          {status === 'error' ? (
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-down">Couldn't load the Python runtime (offline or CDN blocked).</pre>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-fg/90">{output}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
