import { useState } from 'react';
import { CornerDownLeft, Loader2, Sparkles } from 'lucide-react';

import { KeyGate } from '@/components/common/KeyGate';
import { PanelSkeleton } from '@/components/common/states';
import { useAiStatus } from '@/hooks/useMarketData';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

interface Turn {
  q: string;
  a: string;
  model?: string;
  error?: boolean;
}

/** AI — assistant grounded in fresh terminal data (Gemini free tier, Groq
 *  fallback). Answers questions about the active security using a live
 *  snapshot of its quote, profile and recent headlines. */
export function AiPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const { data: status, isLoading } = useAiStatus();
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <PanelSkeleton lines={6} />;
  if (status && !status.available)
    return <KeyGate provider="Google Gemini (free tier)" env="GEMINI_API_KEY" url="https://aistudio.google.com/apikey" what="The AI assistant" />;

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    setTurns((t) => [...t, { q, a: '' }]);
    try {
      const res = await api.aiAsk(q, ticker);
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = res.answer
          ? { q, a: res.answer, model: res.model }
          : { q, a: res.error ?? 'No response.', error: true };
        return next;
      });
    } catch {
      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = { q, a: 'Request failed — is the backend running?', error: true };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [
    `Why is ${ticker} moving today?`,
    `Summarize ${ticker} in 3 bullet points`,
    `What are the key risks for ${ticker}?`,
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <Sparkles size={12} className="text-accent" />
        <span className="text-[11px] font-semibold">AI Assistant</span>
        <span className="font-mono text-[10px] text-faint">grounded in {ticker} data</span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {turns.length === 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted">Ask anything about the active security:</p>
            {suggestions.map((s) => (
              <button key={s} onClick={() => ask(s)} className="block w-full rounded border border-bd bg-panel2/30 px-2 py-1.5 text-left text-[11px] text-fg hover:border-accent/50">
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-1">
            <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-accent/15 px-2.5 py-1.5 text-[11px] text-fg">{t.q}</div>
            <div className={cn('w-fit max-w-[92%] rounded-lg rounded-bl-sm border border-bd bg-panel2/40 px-2.5 py-1.5 text-[11px] leading-relaxed', t.error ? 'text-down' : 'text-fg/90')}>
              {t.a ? (
                <>
                  {t.a}
                  {t.model && <span className="mt-1 block text-[8px] uppercase text-faint">via {t.model}</span>}
                </>
              ) : (
                <Loader2 size={12} className="animate-spin text-muted" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-t border-bd bg-panel2/40 p-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder={`Ask about ${ticker}…`}
          disabled={busy}
          className="flex-1 rounded border border-bd bg-bg px-2 py-1.5 text-[11px] placeholder:text-faint focus:border-accent/60 focus:outline-none"
        />
        <button onClick={() => ask(input)} disabled={busy || !input.trim()} className="rounded bg-accent/20 p-1.5 text-accent hover:bg-accent/30 disabled:opacity-40">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <CornerDownLeft size={13} />}
        </button>
      </div>
    </div>
  );
}
