import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
} from 'lightweight-charts';

import { FreshnessBadge, LastUpdated, Refreshing } from '@/components/common/badges';
import { PanelError, PanelSkeleton } from '@/components/common/states';
import { useCandles, useQuote } from '@/hooks/useMarketData';
import { fmtBig, fmtPrice } from '@/lib/format';
import { macd, rsi, sma } from '@/lib/indicators';
import { cn, cssVar } from '@/lib/utils';
import { useTerminal } from '@/stores/terminal';

const RANGES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;
type RangeKey = (typeof RANGES)[number];
const INTRADAY: RangeKey[] = ['1D', '5D', '1M'];

interface Toggles {
  volume: boolean;
  ma20: boolean;
  ma50: boolean;
  rsi: boolean;
  macd: boolean;
}

interface Legend {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** GP — interactive price chart for the active security.
 *  Candles + volume via TradingView Lightweight Charts, with client-side
 *  MA20/50, RSI(14) and MACD(12,26,9) in separate panes. Auto-refreshes on a
 *  timeframe-appropriate interval; user zoom survives refreshes. */
export function GpPanel() {
  const ticker = useTerminal((s) => s.activeTicker);
  const theme = useTerminal((s) => s.theme);
  const [range, setRange] = useState<RangeKey>('1Y');
  const [show, setShow] = useState<Toggles>({
    volume: true,
    ma20: true,
    ma50: true,
    rsi: false,
    macd: false,
  });
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useCandles(ticker, range);
  // Live quote drives the freshness badge and overlays the real-time last price.
  const { data: liveQuote } = useQuote(ticker);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType>[]>([]);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const fitKeyRef = useRef('');
  // The forming (most recent) bar, mutated live by the trade-stream WebSocket.
  const liveBarRef = useRef<{ time: Time; open: number; high: number; low: number; volume: number } | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [streamLive, setStreamLive] = useState(false);

  // Create the chart (and re-create on theme switch so colours re-read).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: cssVar('--t-muted'),
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        panes: { separatorColor: cssVar('--t-bd'), enableResize: false },
      },
      grid: {
        vertLines: { color: cssVar('--t-bd2') },
        horzLines: { color: cssVar('--t-bd2') },
      },
      crosshair: {
        vertLine: { color: cssVar('--t-faint'), style: LineStyle.Dashed, labelBackgroundColor: cssVar('--t-panel2') },
        horzLine: { color: cssVar('--t-faint'), style: LineStyle.Dashed, labelBackgroundColor: cssVar('--t-panel2') },
      },
      rightPriceScale: { borderColor: cssVar('--t-bd') },
      timeScale: { borderColor: cssVar('--t-bd'), rightOffset: 2 },
    });
    chartRef.current = chart;
    seriesRef.current = [];
    candleSeriesRef.current = null;
    fitKeyRef.current = ''; // force fitContent after recreation

    // Crosshair → OHLC legend (reads bar data straight off the series).
    chart.subscribeCrosshairMove((param) => {
      const cs = candleSeriesRef.current;
      if (!cs) return;
      const bar = param.seriesData.get(cs) as CandlestickData | undefined;
      if (bar) {
        setLegend({
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: (bar as CandlestickData & { customValues?: { volume?: number } }).customValues
            ?.volume ?? NaN,
        });
      }
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      seriesRef.current = [];
    };
  }, [theme]);

  // (Re)build all series whenever data or toggles change. Cheap at these
  // sizes, keeps pane indices coherent, and zoom lives on the time scale so
  // it survives the rebuild.
  useEffect(() => {
    const chart = chartRef.current;
    const candles = data?.candles;
    if (!chart || !candles || candles.length === 0) return;

    const up = cssVar('--t-up');
    const down = cssVar('--t-down');

    for (const s of seriesRef.current) {
      try {
        chart.removeSeries(s);
      } catch {
        /* series already gone with a recreated chart */
      }
    }
    seriesRef.current = [];

    const add = <T extends SeriesType>(
      def: Parameters<IChartApi['addSeries']>[0],
      opts: object,
      pane = 0,
    ): ISeriesApi<T> => {
      const s = chart.addSeries(def, opts, pane) as ISeriesApi<T>;
      seriesRef.current.push(s);
      return s;
    };

    // ── Main pane: candles (+ volume overlay) ───────────────────────
    const candleSeries = add<'Candlestick'>(CandlestickSeries, {
      upColor: up,
      downColor: down,
      wickUpColor: up,
      wickDownColor: down,
      borderVisible: false,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open ?? c.close,
        high: c.high ?? c.close,
        low: c.low ?? c.close,
        close: c.close,
        customValues: { volume: c.volume },
      })),
    );
    candleSeriesRef.current = candleSeries;

    if (show.volume) {
      const vol = add<'Histogram'>(
        HistogramSeries,
        {
          priceScaleId: 'vol',
          priceFormat: { type: 'volume' },
          lastValueVisible: false,
          priceLineVisible: false,
        },
      );
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vol.setData(
        candles.map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= (c.open ?? c.close) ? `${up}55` : `${down}55`,
        })),
      );
    }

    const closes = candles.map((c) => c.close);
    const times = candles.map((c) => c.time as Time);
    const lineData = (vals: (number | null)[]) =>
      vals.flatMap((v, i) => (v == null ? [] : [{ time: times[i], value: v }]));
    const lineOpts = {
      lineWidth: 1 as const,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    };

    if (show.ma20 && closes.length >= 20)
      add(LineSeries, { ...lineOpts, color: cssVar('--t-warn') }).setData(lineData(sma(closes, 20)));
    if (show.ma50 && closes.length >= 50)
      add(LineSeries, { ...lineOpts, color: cssVar('--t-accent') }).setData(lineData(sma(closes, 50)));

    // ── Indicator panes ─────────────────────────────────────────────
    let pane = 1;
    if (show.rsi && closes.length > 15) {
      const r = add<'Line'>(LineSeries, { ...lineOpts, lastValueVisible: true, color: cssVar('--t-accent') }, pane);
      r.setData(lineData(rsi(closes, 14)));
      for (const level of [70, 30]) {
        r.createPriceLine({
          price: level,
          color: cssVar('--t-faint'),
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: '',
        });
      }
      pane += 1;
    }
    if (show.macd && closes.length > 35) {
      const m = macd(closes);
      add<'Histogram'>(HistogramSeries, { lastValueVisible: false, priceLineVisible: false }, pane).setData(
        m.histogram.flatMap((v, i) =>
          v == null ? [] : [{ time: times[i], value: v, color: v >= 0 ? `${up}88` : `${down}88` }],
        ),
      );
      add(LineSeries, { ...lineOpts, color: cssVar('--t-accent') }, pane).setData(lineData(m.macdLine));
      add(LineSeries, { ...lineOpts, color: cssVar('--t-warn') }, pane).setData(lineData(m.signalLine));
      pane += 1;
    }

    // Distribute pane heights by stretch factor (v5's layout model). A fixed
    // setHeight() collapses indicator panes in a short panel; stretch factors
    // keep the main pane dominant while indicator panes stay readable.
    const allPanes = chart.panes();
    if (allPanes.length > 1) {
      allPanes.forEach((p, idx) => p.setStretchFactor(idx === 0 ? 5 : 2));
    }

    chart.timeScale().applyOptions({
      timeVisible: INTRADAY.includes(range),
      secondsVisible: false,
    });

    // Fit once per ticker+range (and after theme recreation) — never stomp
    // the user's zoom on a background refresh.
    const fitKey = `${ticker}:${range}`;
    if (fitKeyRef.current !== fitKey) {
      chart.timeScale().fitContent();
      fitKeyRef.current = fitKey;
    }

    const last = candles[candles.length - 1];
    setLegend({
      open: last.open ?? last.close,
      high: last.high ?? last.close,
      low: last.low ?? last.close,
      close: last.close,
      volume: last.volume,
    });
    // Seed the forming bar so the trade stream can mutate it tick-by-tick.
    liveBarRef.current = {
      time: last.time as Time,
      open: last.open ?? last.close,
      high: last.high ?? last.close,
      low: last.low ?? last.close,
      volume: last.volume,
    };
  }, [data, show, range, ticker, theme]);

  // Push the live quote onto the most recent candle so the chart tracks the
  // real-time price (genuinely live when a Finnhub key is set).
  useEffect(() => {
    const cs = candleSeriesRef.current;
    const candles = data?.candles;
    const price = liveQuote?.price;
    if (!cs || !candles || candles.length === 0 || price == null) return;
    const last = candles[candles.length - 1];
    cs.update({
      time: last.time as Time,
      open: last.open ?? price,
      high: Math.max(last.high ?? price, price),
      low: Math.min(last.low ?? price, price),
      close: price,
      customValues: { volume: last.volume },
    });
  }, [liveQuote?.price, data]);

  // Live intraday candles: stream Finnhub trades (free, US equities) through
  // our backend and mutate the forming bar on every tick. Only for plain US
  // tickers — indices/futures/crypto aren't on the free trade socket.
  useEffect(() => {
    const u = ticker.toUpperCase();
    if (u.includes('^') || u.includes('=') || u.endsWith('-USD')) return;
    const apiBase = import.meta.env.VITE_API_URL as string | undefined;
    const wsBase = apiBase
      ? apiBase.replace(/^http/, 'ws')
      : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

    let ws: WebSocket | null = null;
    let closed = false;
    try {
      ws = new WebSocket(`${wsBase}/ws/trades?symbols=${encodeURIComponent(u)}`);
    } catch {
      return;
    }
    ws.onmessage = (e) => {
      let msg: { type?: string; p?: number; v?: number };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === 'disabled' || msg.p == null) return;
      const bar = liveBarRef.current;
      const cs = candleSeriesRef.current;
      if (!bar || !cs) return;
      const price = msg.p;
      bar.high = Math.max(bar.high, price);
      bar.low = Math.min(bar.low, price);
      bar.volume += msg.v ?? 0;
      cs.update({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: price,
        customValues: { volume: bar.volume },
      });
      if (!closed) setStreamLive(true);
    };
    ws.onclose = () => setStreamLive(false);
    ws.onerror = () => setStreamLive(false);
    return () => {
      closed = true;
      setStreamLive(false);
      ws?.close();
    };
  }, [ticker]);

  const candlesEmpty = !isLoading && !isError && (data?.candles.length ?? 0) === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-bd2 px-2 py-1">
        <span className="font-mono text-xs font-bold text-accent">{ticker}</span>
        <div className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-[10px]',
                r === range ? 'bg-accent/15 font-bold text-accent' : 'text-muted hover:bg-panel2 hover:text-fg',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {(
            [
              ['volume', 'VOL'],
              ['ma20', 'MA20'],
              ['ma50', 'MA50'],
              ['rsi', 'RSI'],
              ['macd', 'MACD'],
            ] as [keyof Toggles, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-[10px]',
                show[key] ? 'bg-up/15 font-semibold text-up' : 'text-faint hover:bg-panel2 hover:text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {streamLive && (
            <span title="Live trade stream — candle updating tick-by-tick" className="flex items-center gap-1 text-[9px] font-semibold uppercase text-up">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-up" /> Streaming
            </span>
          )}
          <Refreshing active={isFetching} />
          <FreshnessBadge realtime={liveQuote?.realtime} />
          <LastUpdated ts={dataUpdatedAt} />
        </div>
      </div>

      {/* Chart area */}
      <div className="relative min-h-0 flex-1">
        {isLoading && <PanelSkeleton lines={7} className="absolute inset-0 z-10 bg-panel" />}
        {isError && (
          <div className="absolute inset-0 z-10 bg-panel">
            <PanelError message={`Couldn't load chart data for ${ticker}.`} onRetry={() => refetch()} />
          </div>
        )}
        {candlesEmpty && (
          <div className="absolute inset-0 z-10 bg-panel">
            <PanelError message={`No chart data available for ${ticker} on ${range}.`} />
          </div>
        )}
        {legend && !isLoading && (
          <div className="pointer-events-none absolute left-2 top-1 z-10 flex gap-2 font-mono text-[10px] tabular-nums">
            <L k="O" v={fmtPrice(legend.open)} />
            <L k="H" v={fmtPrice(legend.high)} />
            <L k="L" v={fmtPrice(legend.low)} />
            <L
              k="C"
              v={fmtPrice(legend.close)}
              cls={legend.close >= legend.open ? 'text-up' : 'text-down'}
            />
            {Number.isFinite(legend.volume) && <L k="V" v={fmtBig(legend.volume)} />}
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

function L({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return (
    <span>
      <span className="text-faint">{k} </span>
      <span className={cls ?? 'text-fg'}>{v}</span>
    </span>
  );
}
