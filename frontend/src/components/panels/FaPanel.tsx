import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { LastUpdated, Refreshing } from '@/components/common/badges';
import { Sparkline } from '@/components/common/Sparkline';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useFinancials } from '@/hooks/useMarketData';
import type { Financials } from '@/lib/api';
import { fmtBig } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

/** FA — Financial Analysis. Sub-tabs for Highlights / statements / Multiples /
 *  Enterprise Value / Profitability / ROIC / Solvency, an Annual⇄Quarterly
 *  toggle, collapsible sections, an inline sparkline per metric, and
 *  color-coded YoY growth rows. All data is keyless yfinance (delayed). */

type Fmt = 'cur' | 'pct' | 'eps' | 'ratio' | 'x' | 'num';

interface RowDef {
  key: string;
  label: string;
  fmt: Fmt;
  yoy?: boolean; // render an indented, color-coded YoY-growth sub-row
  indent?: boolean;
  strong?: boolean;
}
interface SectionDef {
  title: string;
  rows: RowDef[];
}
interface TabDef {
  id: string;
  label: string;
  code: string;
  kind: 'series' | 'current';
  sections?: SectionDef[];
}

const TABS: TabDef[] = [
  {
    id: 'highlights', label: 'Highlights', code: 'FA', kind: 'series',
    sections: [
      {
        title: 'Key Financials',
        rows: [
          { key: 'revenue', label: 'Total Revenue', fmt: 'cur', yoy: true, strong: true },
          { key: 'grossProfit', label: 'Gross Profit', fmt: 'cur' },
          { key: 'grossMargin', label: 'Gross Margin', fmt: 'pct', indent: true },
          { key: 'ebitda', label: 'EBITDA', fmt: 'cur' },
          { key: 'ebitdaMargin', label: 'EBITDA Margin', fmt: 'pct', indent: true },
          { key: 'netIncome', label: 'Net Income', fmt: 'cur', yoy: true },
          { key: 'netMargin', label: 'Net Margin', fmt: 'pct', indent: true },
          { key: 'dilutedEPS', label: 'Diluted EPS', fmt: 'eps', yoy: true },
          { key: 'freeCashFlow', label: 'Free Cash Flow', fmt: 'cur' },
        ],
      },
      {
        title: 'Balance Sheet & Returns',
        rows: [
          { key: 'cash', label: 'Cash & Equivalents', fmt: 'cur' },
          { key: 'totalDebt', label: 'Total Debt', fmt: 'cur' },
          { key: 'equity', label: 'Shareholder Equity', fmt: 'cur' },
          { key: 'roe', label: 'Return on Equity', fmt: 'pct' },
          { key: 'roic', label: 'ROIC', fmt: 'pct' },
        ],
      },
    ],
  },
  {
    id: 'income', label: 'Income', code: 'FA.IS', kind: 'series',
    sections: [
      {
        title: 'Income Statement',
        rows: [
          { key: 'revenue', label: 'Total Revenue', fmt: 'cur', yoy: true, strong: true },
          { key: 'costOfRevenue', label: 'Cost of Revenue', fmt: 'cur' },
          { key: 'grossProfit', label: 'Gross Profit', fmt: 'cur', strong: true },
          { key: 'rAndD', label: 'R&D', fmt: 'cur' },
          { key: 'sgna', label: 'SG&A', fmt: 'cur' },
          { key: 'operatingExpense', label: 'Operating Expense', fmt: 'cur' },
          { key: 'operatingIncome', label: 'Operating Income', fmt: 'cur', strong: true },
          { key: 'ebitda', label: 'EBITDA', fmt: 'cur' },
          { key: 'interestExpense', label: 'Interest Expense', fmt: 'cur' },
          { key: 'pretaxIncome', label: 'Pretax Income', fmt: 'cur' },
          { key: 'taxProvision', label: 'Tax Provision', fmt: 'cur' },
          { key: 'netIncome', label: 'Net Income', fmt: 'cur', yoy: true, strong: true },
          { key: 'dilutedEPS', label: 'Diluted EPS', fmt: 'eps' },
          { key: 'dilutedShares', label: 'Diluted Shares', fmt: 'num' },
        ],
      },
    ],
  },
  {
    id: 'balance', label: 'Balance', code: 'FA.BS', kind: 'series',
    sections: [
      {
        title: 'Assets',
        rows: [
          { key: 'cash', label: 'Cash & Equivalents', fmt: 'cur' },
          { key: 'receivables', label: 'Receivables', fmt: 'cur' },
          { key: 'inventory', label: 'Inventory', fmt: 'cur' },
          { key: 'currentAssets', label: 'Current Assets', fmt: 'cur', strong: true },
          { key: 'netPPE', label: 'Net PP&E', fmt: 'cur' },
          { key: 'totalAssets', label: 'Total Assets', fmt: 'cur', strong: true },
        ],
      },
      {
        title: 'Liabilities & Equity',
        rows: [
          { key: 'currentLiabilities', label: 'Current Liabilities', fmt: 'cur', strong: true },
          { key: 'totalDebt', label: 'Total Debt', fmt: 'cur' },
          { key: 'totalLiabilities', label: 'Total Liabilities', fmt: 'cur', strong: true },
          { key: 'retainedEarnings', label: 'Retained Earnings', fmt: 'cur' },
          { key: 'equity', label: 'Shareholder Equity', fmt: 'cur', strong: true },
          { key: 'investedCapital', label: 'Invested Capital', fmt: 'cur' },
        ],
      },
    ],
  },
  {
    id: 'cashflow', label: 'Cash Flow', code: 'FA.CF', kind: 'series',
    sections: [
      {
        title: 'Cash Flow',
        rows: [
          { key: 'operatingCashFlow', label: 'Operating Cash Flow', fmt: 'cur', strong: true },
          { key: 'capex', label: 'Capital Expenditure', fmt: 'cur' },
          { key: 'freeCashFlow', label: 'Free Cash Flow', fmt: 'cur', yoy: true, strong: true },
          { key: 'fcfMargin', label: 'FCF Margin', fmt: 'pct', indent: true },
          { key: 'investingCashFlow', label: 'Investing Cash Flow', fmt: 'cur' },
          { key: 'financingCashFlow', label: 'Financing Cash Flow', fmt: 'cur' },
          { key: 'dividendsPaid', label: 'Dividends Paid', fmt: 'cur' },
          { key: 'buybacks', label: 'Share Buybacks', fmt: 'cur' },
        ],
      },
    ],
  },
  {
    id: 'profitability', label: 'Profitability', code: 'FA.PL', kind: 'series',
    sections: [
      {
        title: 'Margins',
        rows: [
          { key: 'grossMargin', label: 'Gross Margin', fmt: 'pct' },
          { key: 'operatingMargin', label: 'Operating Margin', fmt: 'pct' },
          { key: 'ebitdaMargin', label: 'EBITDA Margin', fmt: 'pct' },
          { key: 'netMargin', label: 'Net Margin', fmt: 'pct' },
          { key: 'fcfMargin', label: 'FCF Margin', fmt: 'pct' },
        ],
      },
      {
        title: 'Returns',
        rows: [
          { key: 'roe', label: 'Return on Equity', fmt: 'pct' },
          { key: 'roa', label: 'Return on Assets', fmt: 'pct' },
          { key: 'roic', label: 'Return on Invested Capital', fmt: 'pct' },
        ],
      },
    ],
  },
  {
    id: 'roic', label: 'ROIC', code: 'FA.ROIC', kind: 'series',
    sections: [
      {
        title: 'Return on Invested Capital',
        rows: [
          { key: 'roic', label: 'ROIC', fmt: 'pct', strong: true },
          { key: 'nopat', label: 'NOPAT', fmt: 'cur' },
          { key: 'investedCapital', label: 'Invested Capital', fmt: 'cur' },
          { key: 'operatingIncome', label: 'Operating Income', fmt: 'cur' },
        ],
      },
    ],
  },
  {
    id: 'solvency', label: 'Solvency', code: 'FA.SOLV', kind: 'series',
    sections: [
      {
        title: 'Liquidity & Leverage',
        rows: [
          { key: 'currentRatio', label: 'Current Ratio', fmt: 'ratio' },
          { key: 'quickRatio', label: 'Quick Ratio', fmt: 'ratio' },
          { key: 'debtToEquity', label: 'Debt / Equity', fmt: 'ratio' },
          { key: 'debtToEbitda', label: 'Debt / EBITDA', fmt: 'ratio' },
          { key: 'interestCoverage', label: 'Interest Coverage', fmt: 'ratio' },
        ],
      },
    ],
  },
  { id: 'multiples', label: 'Multiples', code: 'FA.X', kind: 'current' },
  { id: 'ev', label: 'Enterprise Value', code: 'FA.EV', kind: 'current' },
];

function fmtVal(v: number | null | undefined, fmt: Fmt): string {
  if (v == null) return '—';
  switch (fmt) {
    case 'cur':
      return `${v < 0 ? '-' : ''}$${fmtBig(Math.abs(v))}`;
    case 'pct':
      return `${v.toFixed(1)}%`;
    case 'eps':
      return `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;
    case 'ratio':
    case 'x':
      return `${v.toFixed(2)}x`;
    case 'num':
      return fmtBig(v);
  }
}

export function FaPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const [tabId, setTabId] = useState('highlights');
  const [freq, setFreq] = useState<'annual' | 'quarterly'>('annual');
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useFinancials(ticker, freq);

  const tab = TABS.find((t) => t.id === tabId)!;

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-bd2 px-1.5 py-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTabId(t.id)}
            title={t.code}
            className={cn(
              'shrink-0 rounded px-2 py-0.5 text-[11px] font-medium',
              t.id === tabId ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel2 hover:text-fg',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <span className="rounded border border-bd px-1 font-mono text-[9px] text-faint">{tab.code}</span>
        {tab.kind === 'series' && (
          <div className="flex items-center gap-0.5">
            {(['annual', 'quarterly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px]',
                  freq === f ? 'bg-up/15 font-semibold text-up' : 'text-muted hover:bg-panel2',
                )}
              >
                {f === 'annual' ? 'Annual' : 'Quarterly'}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Refreshing active={isFetching} />
          {/* Financial statements are periodic filings, not a live feed —
              label by the latest reported period rather than "delayed". */}
          {data && data.periods.length > 0 && (
            <span
              title="Most recent reported fiscal period (financial statements are filed quarterly)."
              className="rounded border border-bd px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted"
            >
              Last reported · {data.periods[data.periods.length - 1]}
            </span>
          )}
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading && <PanelSkeleton lines={10} />}
        {isError && <PanelError message={`Couldn't load financials for ${ticker}.`} onRetry={() => refetch()} />}
        {data && !isLoading && (
          tab.kind === 'current' ? (
            <SnapshotView tab={tab} current={data.current} />
          ) : (data.periods.length === 0 ? (
            <PanelError message={`No financial statements available for ${ticker} on the free feed.`} />
          ) : (
            <SeriesView tab={tab} data={data} freq={freq} />
          ))
        )}
      </div>
    </div>
  );
}

function SeriesView({ tab, data, freq }: { tab: TabDef; data: Financials; freq: 'annual' | 'quarterly' }) {
  const { periods, series } = data;
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="sticky top-0 z-10 bg-panel">
        <tr className="border-b border-bd">
          <th className="bg-panel px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-faint">
            Metric
          </th>
          <th className="px-1 text-center text-[9px] font-semibold uppercase text-faint">Trend</th>
          {periods.map((p) => (
            <th key={p} className="px-2 py-1.5 text-right font-mono text-[10px] font-semibold text-muted">
              {p}<span className="text-faint">A</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tab.sections!.map((section) => (
          <Section key={section.title} section={section} periods={periods} series={series} freq={freq} />
        ))}
      </tbody>
    </table>
  );
}

function Section({
  section,
  periods,
  series,
  freq,
}: {
  section: SectionDef;
  periods: string[];
  series: Record<string, (number | null)[]>;
  freq: 'annual' | 'quarterly';
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <tr className="border-b border-bd2 bg-panel2/40">
        <td colSpan={periods.length + 2} className="px-2 py-1">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted hover:text-fg">
            <ChevronDown size={11} className={cn('transition-transform', !open && '-rotate-90')} />
            {section.title}
          </button>
        </td>
      </tr>
      {open && section.rows.map((row) => <MetricRow key={row.key} row={row} periods={periods} values={series[row.key] ?? []} freq={freq} />)}
    </>
  );
}

function MetricRow({
  row,
  periods,
  values,
  freq,
}: {
  row: RowDef;
  periods: string[];
  values: (number | null)[];
  freq: 'annual' | 'quarterly';
}) {
  const spark = useMemo(() => values.filter((v): v is number => v != null), [values]);
  // YoY: annual vs prior period (i-1), quarterly vs same quarter last year (i-4).
  const lag = freq === 'quarterly' ? 4 : 1;
  const yoy = values.map((v, i) => {
    const prev = values[i - lag];
    if (v == null || prev == null || prev === 0) return null;
    return ((v - prev) / Math.abs(prev)) * 100;
  });

  return (
    <>
      <tr className="border-b border-bd2/40 hover:bg-panel2/40">
        <td className={cn('px-2 py-1', row.indent && 'pl-5', row.strong ? 'font-semibold text-fg' : 'text-muted')}>
          {row.label}
        </td>
        <td className="px-1 py-1">
          {spark.length > 1 && <Sparkline data={spark} width={56} height={18} className="h-[18px] w-14" />}
        </td>
        {values.map((v, i) => (
          <td
            key={periods[i]}
            className={cn('px-2 py-1 text-right font-mono tabular-nums', row.strong ? 'font-semibold text-fg' : 'text-fg/90')}
          >
            {fmtVal(v, row.fmt)}
          </td>
        ))}
      </tr>
      {row.yoy && (
        <tr className="border-b border-bd2/40">
          <td className="px-2 py-0.5 pl-5 text-[10px] italic text-faint">YoY Growth</td>
          <td />
          {yoy.map((g, i) => (
            <td
              key={periods[i]}
              className={cn(
                'px-2 py-0.5 text-right font-mono text-[10px] tabular-nums',
                g == null ? 'text-faint' : g >= 0 ? 'text-up' : 'text-down',
              )}
            >
              {g == null ? '—' : `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`}
            </td>
          ))}
        </tr>
      )}
    </>
  );
}

/** Multiples & Enterprise Value: current/TTM snapshots, not historical series. */
function SnapshotView({ tab, current }: { tab: TabDef; current: Financials['current'] }) {
  const rows: { label: string; v: number | null; fmt: Fmt }[] =
    tab.id === 'multiples'
      ? [
          { label: 'P/E (TTM)', v: current.peTrailing, fmt: 'x' },
          { label: 'P/E (Forward)', v: current.peForward, fmt: 'x' },
          { label: 'Price / Sales', v: current.priceToSales, fmt: 'x' },
          { label: 'Price / Book', v: current.priceToBook, fmt: 'x' },
          { label: 'EV / EBITDA', v: current.evToEbitda, fmt: 'x' },
          { label: 'EV / Sales', v: current.evToSales, fmt: 'x' },
          { label: 'Dividend Yield', v: current.divYieldPct, fmt: 'pct' },
          { label: 'Beta', v: current.beta, fmt: 'ratio' },
        ]
      : [
          { label: 'Market Cap', v: current.marketCap, fmt: 'cur' },
          { label: '(+) Total Debt', v: current.totalDebt, fmt: 'cur' },
          { label: '(−) Cash & Equivalents', v: current.cash, fmt: 'cur' },
          { label: '= Enterprise Value', v: current.enterpriseValue, fmt: 'cur' },
          { label: 'EV / EBITDA', v: current.evToEbitda, fmt: 'x' },
          { label: 'EV / Sales', v: current.evToSales, fmt: 'x' },
        ];

  return (
    <div className="p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-faint">
        {tab.id === 'multiples' ? 'Current / TTM valuation multiples' : 'Enterprise value bridge (current)'}
      </div>
      <div className="overflow-hidden rounded border border-bd">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={cn(
              'flex items-center justify-between px-3 py-2 text-xs',
              i % 2 ? 'bg-panel2/30' : '',
              r.label.startsWith('=') && 'border-t border-bd font-semibold text-fg',
            )}
          >
            <span className={cn(r.label.startsWith('=') ? 'text-fg' : 'text-muted')}>{r.label}</span>
            <span className="font-mono tabular-nums">{fmtVal(r.v, r.fmt)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[9px] text-faint">
        Multiples mix the latest market cap with the most recently reported fundamentals.
      </p>
    </div>
  );
}
