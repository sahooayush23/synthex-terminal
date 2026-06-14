"""Crypto service (CRYP) — CoinGecko public API (free, keyless).

CoinGecko's /coins/markets returns price, market cap, 24h/7d change and a 7-day
sparkline in one call — near real-time, no key, no card. The frontend labels
crypto as live (unlike delayed equities).
"""
from __future__ import annotations

import requests

from .. import cache

MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets"


# One CoinGecko call covers everything (CRYP panel + tape + watchlist quotes).
# We fetch the top N once, cache it, and slice — so crypto is fetched from a
# SINGLE source instead of being hit from multiple panels (which rate-limited
# CoinGecko's free tier and caused "couldn't load crypto data").
_TOP_N = 100


def _fetch_markets(vs: str) -> dict:
    params = {
        "vs_currency": vs,
        "order": "market_cap_desc",
        "per_page": _TOP_N,
        "page": 1,
        "sparkline": "true",
        "price_change_percentage": "24h,7d",
    }
    r = requests.get(MARKETS_URL, params=params, timeout=12)
    r.raise_for_status()
    rows = []
    for c in r.json():
        rows.append({
            "id": c.get("id"),
            "symbol": (c.get("symbol") or "").upper(),
            "name": c.get("name"),
            "image": c.get("image"),
            "price": c.get("current_price"),
            "change24hPct": c.get("price_change_percentage_24h_in_currency"),
            "change7dPct": c.get("price_change_percentage_7d_in_currency"),
            "marketCap": c.get("market_cap"),
            "volume": c.get("total_volume"),
            "rank": c.get("market_cap_rank"),
            "spark": (c.get("sparkline_in_7d") or {}).get("price", [])[::6],  # thin to ~28 pts
        })
    return {"vs": vs, "rows": rows}


def markets(vs: str = "usd") -> dict:
    """Cached top-100 CoinGecko snapshot (30s TTL, stale-served on failure)."""
    return cache.get_or_set(f"crypto:{vs.lower()}", ttl=30, fn=lambda: _fetch_markets(vs.lower()))


def crypto(vs: str = "usd", limit: int = 30) -> dict:
    data = markets(vs)
    return {"vs": data["vs"], "rows": data["rows"][:limit]}


def quote_for(symbol: str) -> dict | None:
    """Look up a single coin (by base symbol, e.g. 'BTC') from the shared
    cached snapshot — used by market.quote() for the tape/watchlist, so crypto
    quotes don't make their own CoinGecko calls."""
    base = symbol.upper().replace("-USD", "")
    for r in markets("usd")["rows"]:
        if r["symbol"] == base:
            return r
    return None
