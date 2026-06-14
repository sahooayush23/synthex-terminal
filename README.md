# 📈 Synthex Terminal

> An open-source, web-based financial terminal inspired by **Bloomberg** and **Koyfin** — built to run for **$0/month** on free tiers, with no credit card required anywhere.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Cost](https://img.shields.io/badge/cost-%240%2Fmonth-success.svg)](#-cost-breakdown-0month)
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite%20%2B%20TS-61dafb.svg)](https://vitejs.dev/)
[![Author](https://img.shields.io/badge/by-Ayush%20Sahoo-5b9cff.svg)](#-author)

**Synthex Terminal** is a dense, dark-themed, multi-panel market dashboard: a tiling
workspace of "functions" (DES, GP, FA, MOV, …) addressed by Bloomberg-style codes, a live
clock and scrolling index tape, real candlestick charts, and color-coded watchlists that
auto-refresh and flash on every tick.

Designed and built by **[Ayush Sahoo](#-author)**.

> ⚠️ **Educational project — not financial advice.** This is a Bloomberg/Koyfin-**inspired**
> learning project, **not a replacement**. With a free Finnhub key, US-equity and crypto data
> is **real-time**; some sources (e.g. FX, options, foreign indices) have no free real-time
> feed and remain delayed. Do not make investment decisions with it.

---

## ✨ Features (Phases 1–6 — all shipped 🎉)

- **Three-pane Koyfin-style shell** — collapsible left sidebar of function codes, a tabbed
  center workspace, and a right watchlist rail.
- **Auto-tiling workspace** — opening a function docks it into available horizontal space, or
  re-tiles the panels into a clean fixed grid (no document-flow stacking, no overlap). The
  layout persists per tab.
- **In-app modal system** — no native browser pop-ups anywhere. Creating/renaming watchlists,
  confirmations, etc. use a themed, animated dialog that matches the terminal.
- **Global command line** — press <kbd>/</kbd> anywhere to focus. Type a ticker (`AAPL`), a
  function code (`HELP`), or both (`NVDA GP`). Autocomplete covers tickers **and** functions.
- **Live feel** — a real 1-second clock with US session status, a scrolling index ticker-tape
  (S&P, Nasdaq, Dow, VIX, BTC, ETH, FX, gold, oil), background auto-refresh via TanStack
  Query, and numbers that **flash green/red** on every up/down tick.
- **DES** — security description: logo, company profile, key stats (P/E, EPS, market cap,
  beta, 52-week range bar) and a 1-year trend sparkline.
- **GP** — interactive price chart with two modes: a **Native** chart (TradingView Lightweight
  Charts — candlesticks + volume, MA20/MA50, RSI, MACD, 1D→MAX, live-price overlay) and a
  **TradingView** mode that embeds the free **Advanced Real-Time Chart** widget — genuinely
  live, interactive charting with indicators & drawing tools, no API key (TV attribution shown).
- **FA** — Financial Analysis with sub-tabs (Highlights, Income, Balance, Cash Flow,
  Profitability, ROIC, Solvency, Multiples, Enterprise Value), an Annual⇄Quarterly toggle,
  collapsible sections, an **inline sparkline on every metric row**, and **color-coded YoY
  growth** rows. Multiples/EV show current-TTM snapshots.
- **EE** — Earnings & Estimates: analyst price-target range, recommendation distribution,
  forward EPS & revenue consensus, and an earnings-surprise history table.
- **N** — tabbed live **Market News** center. Each category tab (Top, Markets, Tech,
  Financials, Energy, Crypto) is backed by a real ticker basket, plus a per-ticker mode for
  the active security. Auto-refreshes ~45s; headlines link out to publishers.
- **MOV** — **Market Movers**: a 1-day-return vs relative-volume scatter over a large-cap
  universe, with split Gainers / Losers tables.
- **WEI / SECT / CMTY** — World Equity Indices, US Sector ETFs and Commodities boards —
  sortable rows with a 1-month sparkline each.
- **CETF / FX / CRYP** — Countries board, currency rates (Frankfurter/ECB), and top crypto with
  7-day sparklines (CoinGecko, near real-time, **live**).
- **HMAP / SCAT / EQS** — market heatmap (large-cap tiles by % change), valuation scatter
  (P/E vs beta, by sector), and a sortable/filterable equity screener.
- **CACT / CAL / SOC / INSDR** — corporate actions (dividends/splits), watchlist earnings
  calendar, StockTwits sentiment (honest "unavailable" — StockTwits now blocks free access),
  and insider transactions (Finnhub key).
- **ECO / GYLD / CORP** — FRED economic dashboards: GDP/CPI/unemployment/Fed-funds, the US
  Treasury yield curve, and credit spreads (free FRED key).
- **PORT / RISK / OMON** — portfolio tracker (live value, P/L, allocation; localStorage), risk
  modeling (vol, beta, drawdown, VaR, β-stress tests), and an options monitor (chain with IV,
  volume, OI and Black-Scholes delta/gamma).
- **PAPER / QNT / XLS** — paper trading (simulated market orders, positions, P/L, blotter — no
  real money), an in-browser **Quant Python** scratchpad (Pyodide/WASM with numpy & pandas,
  runs locally), and CSV **export** of watchlist / portfolio / paper orders.
- **LOT / MYG / DASH** — a small-multiples chart wall for your watchlist, saved **graphs**, and
  saved **dashboards** (named workspace layouts you can reload).
- **AI** — an assistant grounded in **fresh terminal data** (live quote, profile, recent
  headlines for the active ticker) so it can answer "why is NVDA moving?" with real numbers.
  Powered by **Google Gemini's free tier** (Groq fallback); shows an "add a free key" panel
  until `GEMINI_API_KEY` is set.
- **FLT** — experimental **live flight tracking** over the US (OpenSky Network, keyless).
- **Watchlists** — multiple named lists, color-coded 1-day change, sortable columns, add/remove
  with search, **persisted to `localStorage`** (no database needed).
- **Two themes** — a modern dark theme (TradingView/Koyfin palette) and a classic **Bloomberg
  amber-on-black** toggle.
- **Real-time data** — set a free `FINNHUB_API_KEY` (no credit card) and every equity quote
  (security header, DES, watchlist, GP live-price overlay) is **real-time**, shown with a green
  "Real-time" badge; crypto (CoinGecko) is live too. Without the key it falls back to delayed
  Yahoo silently. Plus "last updated" timestamps, loading skeletons, error/retry states and
  stale-data fallback. **No dead buttons, no fake data** — key-gated functions (FRED, Finnhub)
  show a clear "add a free key" panel rather than fabricating numbers.

### 🗺️ Roadmap

The sidebar shows every planned function with a phase badge. Each stub names the **free data
source** it will use. See [`frontend/src/data/functions.ts`](frontend/src/data/functions.ts)
for the full registry.

| Phase | Functions |
|------:|-----------|
| **1 ✅** | `DES` `GP` `HELP` `MYW` (watchlists) |
| **2 ✅** | `FA` (financials + inline sparklines) · `EE` (estimates) · `N` (news center) |
| **3 ✅** | `MOV` `WEI` `SECT` `CMTY` `CETF` `FX` `CRYP` `HMAP` `SCAT` `EQS` `CACT` `CAL` `SOC`* `LOT` `MYG` `DASH` · `ECO` `GYLD` `CORP` (FRED key) · `INSDR` `IPO` (Finnhub key) |
| **4 ✅** | `PORT` `RISK` `OMON` |
| **5 ✅** | `PAPER` (paper trading) · `QNT` (Pyodide Python) · `XLS` (CSV export) |
| **6 ✅** | `AI` (Gemini free tier, Groq fallback) · `FLT` (flight tracking, OpenSky) |

<sub>* `SOC` (StockTwits) shows an honest "unavailable" state — StockTwits now blocks free
server access. FRED/Finnhub functions show an "add a free key" panel until the (free, no-card)
key is set.</sub>

---

## 📸 Screenshots

Drop screenshots into `docs/` and they'll render here. (Run the app and grab the dark theme,
the amber theme, and a multi-pane chart with RSI/MACD.)

```
docs/
  dark-theme.png
  amber-theme.png
  chart-indicators.png
```

---

## 🧱 Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **React 19 + Vite + TypeScript** | Fast dev, type safety |
| Styling | **Tailwind CSS v4** | Dense, themeable design system via CSS variables |
| Charts | **TradingView Lightweight Charts** | Free, professional candlesticks (attribution below) |
| Data fetching | **TanStack Query** | Background refetch, caching, stale-while-revalidate |
| State | **Zustand** (persisted) | Tiny store; workspace & watchlists saved to `localStorage` |
| Grid | **react-grid-layout** | Draggable / resizable panels |
| Icons | **lucide-react** | |
| Backend | **Python FastAPI** | Proxies free sources, computes analytics, adds TTL caching |
| Market data | **yfinance** (Yahoo Finance) | Free, **keyless** quotes / candles / profiles / search |

---

## 🚀 Run it locally

**Prerequisites:** Node.js ≥ 18 and Python ≥ 3.10.

> Phase 1 needs **no API keys at all** — `yfinance` is keyless. You can run everything with
> the two commands below. (Keys for later phases are all free and listed in the `.env.example`
> files.)

### 1. Clone

```bash
git clone https://github.com/sahooayush23/synthex-terminal.git
cd synthex-terminal
```

### 2. Start the backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # optional in Phase 1 (no keys required)
uvicorn app.main:app --reload --port 8000
```

The API is now at **http://localhost:8000** — try http://localhost:8000/api/health or
http://localhost:8000/docs for the interactive Swagger UI.

### 3. Start the frontend (Vite) — in a second terminal

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` → `localhost:8000`, so
there's nothing else to configure. Press <kbd>/</kbd> and type `AAPL` to begin.

---

## ☁️ Deploy for free (no credit card)

Both halves deploy to free tiers. Deploy the **backend first**, then point the frontend at it.

### Backend → Render (free web service)

1. Push this repo to GitHub.
2. On [Render](https://render.com), **New → Web Service**, connect the repo, set **Root
   Directory** to `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env var `FRONTEND_ORIGIN` = your Vercel URL (e.g. `https://synthex.vercel.app`).

> A [`render.yaml`](backend/render.yaml) blueprint is included, so you can also just point
> Render at the repo and accept the defaults. Note: Render's free tier sleeps after inactivity,
> so the first request after idle takes a few seconds to wake.

### Frontend → Vercel (Hobby / free)

1. On [Vercel](https://vercel.com), **Import** the repo, set **Root Directory** to `frontend`.
2. Vercel auto-detects Vite (build `npm run build`, output `dist`).
3. Add env var `VITE_API_URL` = your Render backend URL (e.g. `https://synthex-api.onrender.com`).
4. Deploy. A [`vercel.json`](frontend/vercel.json) handles SPA routing.

---

## 💰 Cost breakdown ($0/month)

Every dependency is free with **no credit card** required.

| Service | Used for | Tier | Card needed? |
|---------|----------|------|--------------|
| **yfinance** (Yahoo Finance) | Quotes, candles, profiles, search | Free, keyless | ❌ |
| **Vercel** | Frontend hosting | Hobby | ❌ |
| **Render** | Backend hosting | Free web service | ❌ |
| **localStorage** | Watchlists + layout persistence | Browser-native | ❌ |
| **CoinGecko** *(Phase 3)* | Crypto (near real-time) | Free, keyless | ❌ |
| **Frankfurter** *(Phase 3)* | FX rates (ECB) | Free, keyless | ❌ |
| Finnhub *(optional)* | **Real-time** US equity quotes | Free tier | ❌ |
| FRED *(Phase 3, upcoming)* | Economic data | Free API key | ❌ |
| **OpenSky** *(Phase 6)* | Live flight tracking | Free, keyless | ❌ |
| Google Gemini *(Phase 6)* | AI assistant (Groq fallback) | Free tier | ❌ |

If a feature's only data source were paid, it's **left out and noted** rather than faked.

---

## 📁 Project structure

```
synthex-terminal/
├── backend/                      # FastAPI — free-data proxy + analytics
│   ├── app/
│   │   ├── main.py               # app, CORS, /api/health
│   │   ├── cache.py              # in-process TTL cache w/ stale fallback
│   │   ├── routers/             # market · fundamentals (FA/EE) · news · macro (MOV/board/fx/crypto)
│   │   └── services/            # market, fundamentals, estimates, news, markets, fx, crypto
│   ├── requirements.txt
│   ├── render.yaml               # one-click Render blueprint
│   └── .env.example              # all keys optional & free; none required to run
└── frontend/                     # React + Vite + TS
    ├── src/
    │   ├── components/
    │   │   ├── layout/            # TopBar, Clock, CommandLine, TickerTape, Sidebar,
    │   │   │                      #   Workspace (tiling grid), SecurityHeader, StatusBar
    │   │   ├── panels/            # Gp, Des, Fa, Ee, News, Mov, Board, Fx, Cryp, Help, …
    │   │   └── common/            # FlashNumber, Sparkline, Scatter, DialogHost, badges, states
    │   ├── data/functions.ts      # the function-code registry (single source of truth)
    │   ├── hooks/useMarketData.ts # TanStack Query hooks w/ live refetch intervals
    │   ├── lib/                    # api client, formatters, indicators (RSI/MACD/SMA/EMA)
    │   ├── stores/                 # terminal (tabs/layouts/watchlists) · dialog (modals)
    │   ├── App.tsx
    │   └── index.css              # design tokens + dark/amber themes + animations
    └── vercel.json
```

---

## 🔌 API reference (backend)

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Liveness check |
| `GET /api/quote/{symbol}` | Single quote |
| `GET /api/quotes?symbols=AAPL,MSFT,^GSPC` | Batch quotes (watchlist + tape) |
| `GET /api/candles/{symbol}?range=1Y` | OHLCV bars (`range`: `1D 5D 1M 6M 1Y 5Y MAX`) |
| `GET /api/profile/{symbol}` | Company profile + key stats |
| `GET /api/search?q=nvi` | Ticker / name autocomplete |
| `GET /api/financials/{symbol}?freq=annual` | Income/balance/cash-flow + margins, ROIC, solvency (`freq`: `annual` \| `quarterly`) |
| `GET /api/estimates/{symbol}` | Earnings surprise history, EPS/revenue consensus, recommendations, price targets |
| `GET /api/news?category=top` | Market news by category basket, or `?symbol=AAPL` for a single ticker |
| `GET /api/movers` | Market Movers: scatter (return vs rel-volume) + gainers/losers |
| `GET /api/board/{name}` | Quote board (`indices` / `sectors` / `commodities` / `countries`) with sparklines |
| `GET /api/fx?base=USD` | FX rates + 30-day series (Frankfurter / ECB) |
| `GET /api/crypto?limit=30` | Top crypto by market cap with 7-day sparklines (CoinGecko) |
| `GET /api/actions/{symbol}` | Dividend & split history (CACT) |
| `GET /api/social/{symbol}` | StockTwits sentiment (SOC; honest unavailable when blocked) |
| `GET /api/calendar?symbols=…` | Upcoming earnings dates (CAL) |
| `GET /api/universe` | Large-cap valuation universe powering SCAT/EQS |
| `GET /api/econ/{eco\|gyld\|corp}` | FRED economic dashboards (free key) |
| `GET /api/ipos` · `/api/insiders/{symbol}` | Finnhub IPO calendar & insider txns (free key) |
| `GET /api/options/{symbol}` | Options chain + IV + Black-Scholes greeks (OMON) |
| `GET /api/sparks?symbols=…` | Per-symbol 1-month sparkline + last/change (LOT) |
| `GET /api/flights` | Live aircraft over the US (FLT, OpenSky) |
| `GET /api/ai/status` · `POST /api/ai` | AI assistant status + ask (Gemini/Groq, free key) |

All upstream calls are TTL-cached server-side; on upstream failure the cache serves the last
known value (within a grace window) so panels degrade gracefully instead of erroring.
Single equity quotes use **Finnhub real-time** when `FINNHUB_API_KEY` is set, else delayed
Yahoo — the response carries a `realtime` flag the UI badge reflects.

---

## 📜 Attribution & legal

- **Charting** by [TradingView Lightweight Charts™](https://www.tradingview.com/lightweight-charts/).
  Charts are powered by TradingView — the financial platform that builds tools for traders and
  investors. We are grateful to TradingView for making these libraries free and open source.
- **Real-time** US-equity quotes via **Finnhub** (free tier) and crypto via **CoinGecko**;
  fundamentals, history and other series via the community
  [`yfinance`](https://github.com/ranaroussi/yfinance) library and the other free sources
  listed above. For personal/educational use.
- Company names, tickers, and logos belong to their respective owners. **Bloomberg** and
  **Koyfin** are trademarks of their respective companies; this project is independent and not
  affiliated with, endorsed by, or a replacement for either.
- **Not financial advice.** Provided "as is" for educational purposes only.

## 🤝 Contributing

Contributions welcome — the function registry is the single source of truth. To add or extend a
function, edit [`functions.ts`](frontend/src/data/functions.ts), back it with a free data
source, and add its panel. Golden rules: **free data only, no dead buttons, never label
delayed data as real-time.**

## 👤 Author

**Synthex Terminal** was designed and built by **Ayush Sahoo**.

- GitHub: [@sahooayush23](https://github.com/sahooayush23) · Email: sahoo.ayush23@gmail.com

If you build on it, a credit/link back is appreciated. 🙌

## 📄 License

[MIT](./LICENSE) © 2026 **Ayush Sahoo**
