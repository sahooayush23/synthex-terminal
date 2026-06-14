"""Smaller Phase 3 data sources — corporate actions (CACT), social sentiment
(SOC, StockTwits), an upcoming-earnings calendar (CAL) and a lightweight
valuation/screen universe (SCAT/EQS). All keyless and free.
"""
from __future__ import annotations

import math

import pandas as pd
import requests
import yfinance as yf

from .. import cache
from . import market

# Reuse the movers large-cap universe for screen/scatter.
from .markets import MOV_UNIVERSE


def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


# ── CACT — corporate actions (dividends & splits) ───────────────────

def _fetch_actions(symbol: str) -> dict:
    t = yf.Ticker(symbol)
    divs, splits = [], []
    try:
        d = t.dividends
        if d is not None and not d.empty:
            for date, amt in d.tail(24).items():
                divs.append({"date": pd.Timestamp(date).strftime("%Y-%m-%d"), "amount": _num(amt)})
            divs.reverse()
    except Exception:
        pass
    try:
        s = t.splits
        if s is not None and not s.empty:
            for date, ratio in s.tail(12).items():
                splits.append({"date": pd.Timestamp(date).strftime("%Y-%m-%d"), "ratio": _num(ratio)})
            splits.reverse()
    except Exception:
        pass
    return {"symbol": symbol.upper(), "dividends": divs, "splits": splits}


def actions(symbol: str) -> dict:
    return cache.get_or_set(f"cact:{symbol.upper()}", 6 * 3600, lambda: _fetch_actions(symbol))


# ── SOC — StockTwits sentiment feed ─────────────────────────────────

def _fetch_social(symbol: str) -> dict:
    # NOTE: StockTwits' public API now blocks unauthenticated server requests
    # (Cloudflare 403). We surface an honest "unavailable" state when that
    # happens rather than fabricating sentiment.
    url = f"https://api.stocktwits.com/api/2/streams/symbol/{symbol.upper()}.json"
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return {"symbol": symbol.upper(), "available": False}
        data = r.json()
    except Exception:
        return {"symbol": symbol.upper(), "available": False}

    msgs = []
    bull = bear = 0
    for m in data.get("messages", [])[:30]:
        sent = ((m.get("entities") or {}).get("sentiment") or {}).get("basic")
        if sent == "Bullish":
            bull += 1
        elif sent == "Bearish":
            bear += 1
        msgs.append({
            "id": m.get("id"),
            "user": (m.get("user") or {}).get("username"),
            "body": m.get("body"),
            "createdAt": m.get("created_at"),
            "sentiment": sent,
        })
    return {"symbol": symbol.upper(), "available": True, "bullish": bull, "bearish": bear, "messages": msgs}


def social(symbol: str) -> dict:
    return cache.get_or_set(f"soc:{symbol.upper()}", 60, lambda: _fetch_social(symbol))


# ── CAL — upcoming earnings calendar for a set of symbols ───────────

def _fetch_calendar(symbols: list[str]) -> dict:
    rows = []
    for sym in symbols[:25]:
        try:
            t = yf.Ticker(sym)
            ed = t.calendar or {}
            dates = ed.get("Earnings Date") or []
            if dates:
                rows.append({"symbol": sym.upper(), "date": str(dates[0])[:10]})
        except Exception:
            continue
    rows.sort(key=lambda r: r["date"])
    return {"rows": rows}


def calendar(symbols: list[str]) -> dict:
    key = "cal:" + ",".join(sorted(s.upper() for s in symbols))
    return cache.get_or_set(key, 3600, lambda: _fetch_calendar(symbols))


# ── SCAT / EQS — valuation & screen universe ────────────────────────

def _fetch_universe() -> dict:
    """Per-name fundamentals over the large-cap universe for the scatter and
    screener. Profiles are individually cached, so this warms gradually and
    stays cheap on repeat calls."""
    rows = []
    for sym in MOV_UNIVERSE:
        try:
            p = market.profile(sym)
        except Exception:
            continue
        rows.append({
            "symbol": sym,
            "name": p.get("name"),
            "sector": p.get("sector"),
            "marketCap": p.get("marketCap"),
            "peTrailing": p.get("peTrailing"),
            "peForward": p.get("peForward"),
            "beta": p.get("beta"),
            "divYieldPct": p.get("divYieldPct"),
            "high52": p.get("high52"),
            "low52": p.get("low52"),
        })
    return {"rows": rows}


def universe() -> dict:
    # 1-hour cache; profiles underneath cache for an hour too.
    return cache.get_or_set("universe:large", 3600, _fetch_universe)
