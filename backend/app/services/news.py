"""News service (N) — yfinance/Yahoo news (free, keyless).

Each category tab is backed by a *real* basket of tickers whose Yahoo news we
fetch and merge — we never invent categorization. A ticker-filtered mode
returns news for a single active security. Results are de-duplicated by URL
and sorted newest-first.
"""
from __future__ import annotations

from datetime import datetime, timezone

import yfinance as yf

from .. import cache

# Category -> representative ticker basket. News is the union of these tickers'
# Yahoo feeds, so each tab reflects genuine coverage of that universe.
CATEGORIES: dict[str, list[str]] = {
    "top": ["^GSPC", "^IXIC", "^DJI", "AAPL", "MSFT", "NVDA", "AMZN"],
    "markets": ["SPY", "QQQ", "DIA", "IWM", "^VIX"],
    "tech": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMD", "TSLA"],
    "financials": ["JPM", "BAC", "GS", "MS", "WFC", "BRK-B"],
    "energy": ["XOM", "CVX", "CL=F", "BP", "SHEL"],
    "crypto": ["BTC-USD", "ETH-USD", "COIN", "MSTR"],
}


def _parse(item: dict) -> dict | None:
    c = item.get("content") or item
    title = c.get("title")
    if not title:
        return None
    url = (c.get("clickThroughUrl") or c.get("canonicalUrl") or {}).get("url") or c.get("previewUrl")
    pub = c.get("pubDate") or c.get("displayTime")
    ts = None
    if pub:
        try:
            ts = int(datetime.fromisoformat(pub.replace("Z", "+00:00")).timestamp() * 1000)
        except Exception:
            ts = None
    provider = (c.get("provider") or {}).get("displayName")
    thumb = ((c.get("thumbnail") or {}).get("originalUrl")) or None
    return {
        "id": c.get("id") or url,
        "title": title,
        "summary": (c.get("summary") or c.get("description") or "")[:280] or None,
        "publisher": provider,
        "url": url,
        "ts": ts,
        "thumbnail": thumb,
    }


def _merge(symbols: list[str], limit: int) -> list[dict]:
    seen: set[str] = set()
    items: list[dict] = []
    for sym in symbols:
        try:
            raw = yf.Ticker(sym).news or []
        except Exception:
            continue
        for it in raw:
            parsed = _parse(it)
            if not parsed or not parsed["url"] or parsed["url"] in seen:
                continue
            seen.add(parsed["url"])
            items.append(parsed)
    # newest first; items without a timestamp sink to the bottom
    items.sort(key=lambda x: x["ts"] or 0, reverse=True)
    return items[:limit]


def _fetch_news(category: str, symbol: str | None, limit: int) -> dict:
    if symbol:
        symbols = [symbol.upper()]
        label = symbol.upper()
    else:
        symbols = CATEGORIES.get(category, CATEGORIES["top"])
        label = category
    items = _merge(symbols, limit)
    return {
        "category": label,
        "items": items,
        "ts": int(datetime.now(timezone.utc).timestamp() * 1000),
    }


def news(category: str = "top", symbol: str | None = None, limit: int = 30) -> dict:
    key = f"news:{symbol.upper() if symbol else category}"
    # 45s TTL keeps the feed lively while staying gentle on Yahoo.
    return cache.get_or_set(key, 45, lambda: _fetch_news(category, symbol, limit))


def categories() -> list[str]:
    return list(CATEGORIES.keys())
