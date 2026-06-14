"""Market boards & movers (WEI / SECT / CMTY / MOV) — keyless yfinance.

A single batched ``yf.download`` per board gives, for each symbol: last/prev
close, 1-day change, today's volume, a 20-day average volume (→ relative
volume) and a 1-month close sparkline. The same stats power the Market Movers
scatter (1-day return vs relative volume) and gainers/losers tables.
"""
from __future__ import annotations

import math
import time

import pandas as pd
import yfinance as yf

from .. import cache
from . import market

# ── Curated symbol lists (symbol, display label) ────────────────────
INDICES: list[tuple[str, str]] = [
    ("^GSPC", "S&P 500"), ("^IXIC", "Nasdaq Comp"), ("^DJI", "Dow Jones"),
    ("^RUT", "Russell 2000"), ("^VIX", "VIX"), ("^FTSE", "FTSE 100"),
    ("^GDAXI", "DAX"), ("^FCHI", "CAC 40"), ("^STOXX50E", "Euro Stoxx 50"),
    ("^N225", "Nikkei 225"), ("^HSI", "Hang Seng"), ("000001.SS", "Shanghai"),
    ("^BSESN", "Sensex"), ("^GSPTSE", "TSX"), ("^BVSP", "Bovespa"), ("^AXJO", "ASX 200"),
]
SECTORS: list[tuple[str, str]] = [
    ("XLK", "Technology"), ("XLF", "Financials"), ("XLV", "Health Care"),
    ("XLY", "Consumer Discretionary"), ("XLP", "Consumer Staples"),
    ("XLE", "Energy"), ("XLI", "Industrials"), ("XLB", "Materials"),
    ("XLU", "Utilities"), ("XLRE", "Real Estate"), ("XLC", "Communication Svcs"),
]
# Commodity ETF proxies (US-listed) so prices stream real-time via Finnhub,
# instead of delayed futures (=F) symbols.
COMMODITIES: list[tuple[str, str]] = [
    ("GLD", "Gold"), ("SLV", "Silver"), ("PPLT", "Platinum"), ("CPER", "Copper"),
    ("USO", "WTI Crude"), ("BNO", "Brent Crude"), ("UNG", "Natural Gas"),
    ("CORN", "Corn"), ("WEAT", "Wheat"), ("SOYB", "Soybeans"),
    ("DBA", "Agriculture"), ("DBC", "Broad Commodities"),
]
COUNTRIES: list[tuple[str, str]] = [
    ("SPY", "United States"), ("EWJ", "Japan"), ("MCHI", "China"), ("EWG", "Germany"),
    ("EWU", "United Kingdom"), ("EWC", "Canada"), ("EWY", "South Korea"), ("INDA", "India"),
    ("EWZ", "Brazil"), ("EWA", "Australia"), ("EWT", "Taiwan"), ("EWW", "Mexico"),
    ("EWL", "Switzerland"), ("EWQ", "France"), ("EWP", "Spain"), ("EWS", "Singapore"),
]
BOARDS: dict[str, list[tuple[str, str]]] = {
    "indices": INDICES,
    "sectors": SECTORS,
    "commodities": COMMODITIES,
    "countries": COUNTRIES,
}

# Liquid large-cap universe for Market Movers (mix of sectors).
MOV_UNIVERSE: list[str] = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "JPM", "V",
    "WMT", "MA", "JNJ", "XOM", "ORCL", "HD", "PG", "COST", "BAC", "ABBV",
    "KO", "CVX", "AMD", "CRM", "NFLX", "PEP", "ADBE", "MCD", "INTC", "DIS",
    "WFC", "CSCO", "QCOM", "TXN", "IBM", "GE", "BA", "NKE", "PFE", "PYPL",
]


def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


def _stats_from_frame(df: pd.DataFrame) -> dict | None:
    """Compute per-symbol stats from a single ticker's OHLCV history."""
    if df is None or df.empty or "Close" not in df:
        return None
    closes = [c for c in df["Close"].tolist() if _num(c) is not None]
    if len(closes) < 2:
        return None
    last, prev = closes[-1], closes[-2]
    change = last - prev
    change_pct = (change / prev * 100) if prev else None
    vols = [v for v in df["Volume"].tolist() if _num(v) is not None] if "Volume" in df else []
    today_vol = vols[-1] if vols else None
    avg_vol = (sum(vols[:-1]) / len(vols[:-1])) if len(vols) > 1 else None
    rel_vol = (today_vol / avg_vol) if (today_vol and avg_vol) else None
    return {
        "last": round(last, 4),
        "prevClose": round(prev, 4),
        "change": change,
        "changePct": change_pct,
        "volume": int(today_vol) if today_vol else None,
        "relVol": rel_vol,
        "spark": [round(c, 4) for c in closes[-22:]],
    }


def _batch_stats(symbols: list[str]) -> dict[str, dict]:
    """One batched download for the whole list → {symbol: stats}."""
    try:
        data = yf.download(
            symbols, period="1mo", interval="1d", group_by="ticker",
            auto_adjust=True, threads=True, progress=False,
        )
    except Exception:
        return {}
    out: dict[str, dict] = {}
    for sym in symbols:
        try:
            frame = data[sym] if isinstance(data.columns, pd.MultiIndex) else data
        except Exception:
            continue
        stats = _stats_from_frame(frame)
        if stats:
            out[sym] = stats
    return out


def _overlay_realtime(rows: list[dict]) -> None:
    """Replace last/change/changePct with real-time quotes (Finnhub for US
    equities/ETFs, CoinGecko for crypto) where available — the Yahoo-derived
    sparkline/volume stays as the historical context. Degrades gracefully:
    keeps the delayed value if the real-time fetch isn't available."""
    targets = [r["symbol"] for r in rows
               if market._finnhub_eligible(r["symbol"]) or market._is_crypto(r["symbol"])]
    if not targets:
        return
    try:
        quotes = {q["symbol"]: q for q in market.quotes(targets)}
    except Exception:
        return
    for r in rows:
        q = quotes.get(r["symbol"])
        if q and q.get("realtime") and q.get("price") is not None:
            r["last"] = q["price"]
            if q.get("change") is not None:
                r["change"] = q["change"]
            if q.get("changePct") is not None:
                r["changePct"] = q["changePct"]


def board(name: str) -> dict:
    entries = BOARDS.get(name)
    if not entries:
        return {"board": name, "rows": [], "ts": int(time.time() * 1000)}

    def build() -> dict:
        stats = _batch_stats([s for s, _ in entries])
        rows = []
        for sym, label in entries:
            st = stats.get(sym)
            rows.append({"symbol": sym, "label": label, **(st or {
                "last": None, "prevClose": None, "change": None, "changePct": None,
                "volume": None, "relVol": None, "spark": [],
            })})
        _overlay_realtime(rows)
        return {"board": name, "rows": rows, "ts": int(time.time() * 1000)}

    return cache.get_or_set(f"board:{name}", ttl=30, fn=build)


def sparks(symbols: list[str]) -> dict:
    """Per-symbol 1-month spark + last/change for arbitrary tickers (LOT)."""
    key = "sparks:" + ",".join(sorted(s.upper() for s in symbols))

    def build() -> dict:
        stats = _batch_stats([s.upper() for s in symbols])
        rows = []
        for s in symbols:
            sym = s.upper()
            st = stats.get(sym)
            rows.append({"symbol": sym, **(st or {
                "last": None, "prevClose": None, "change": None, "changePct": None,
                "volume": None, "relVol": None, "spark": [],
            })})
        _overlay_realtime(rows)
        return {"rows": rows}

    return cache.get_or_set(key, 60, build)


def movers(universe: str = "large") -> dict:
    def build() -> dict:
        stats = _batch_stats(MOV_UNIVERSE)
        rows = []
        for sym, st in stats.items():
            if st["changePct"] is None:
                continue
            rows.append({
                "symbol": sym,
                "last": st["last"],
                "change": st["change"],
                "changePct": st["changePct"],
                "volume": st["volume"],
                "relVol": st["relVol"],
            })
        _overlay_realtime(rows)  # real-time last/change for the US-equity universe
        gainers = sorted(rows, key=lambda r: r["changePct"], reverse=True)
        losers = sorted(rows, key=lambda r: r["changePct"])
        # Scatter: 1-day return (y) vs relative volume (x); drop missing relVol.
        scatter = [
            {"symbol": r["symbol"], "ret": r["changePct"], "relVol": r["relVol"]}
            for r in rows if r["relVol"] is not None
        ]
        return {
            "universe": universe,
            "count": len(rows),
            "scatter": scatter,
            "gainers": gainers[:15],
            "losers": losers[:15],
        }

    return cache.get_or_set(f"movers:{universe}", ttl=60, fn=build)
