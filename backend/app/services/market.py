"""Market data service — quotes/candles/profiles/search.

DATA FRESHNESS: by default quotes come from yfinance (Yahoo), which is delayed
up to ~15 minutes — the frontend shows a "Delayed ~15m" badge and never calls
it real-time. If a free ``FINNHUB_API_KEY`` is configured, single-symbol US
equity quotes are served from Finnhub's *real-time* REST quote endpoint instead
(free tier, no card) and flagged ``realtime: true`` so the UI shows a live
badge. Crypto (CoinGecko) and FX (Frankfurter) are near real-time in their own
services. Every quote carries ``realtime``/``source`` so the badge is honest.

Every public function here is cached (see cache.py) so panel auto-refresh
across many clients stays well inside upstream rate limits.
"""
from __future__ import annotations

import math
import os
import time
from concurrent.futures import ThreadPoolExecutor

import requests
import yfinance as yf

from .. import cache

# Shared pool for fan-out batch quotes (watchlist + ticker tape).
_pool = ThreadPoolExecutor(max_workers=8)

FINNHUB_KEY = os.getenv("FINNHUB_API_KEY", "").strip()


def _finnhub_eligible(symbol: str) -> bool:
    """Finnhub's free real-time quote covers US equities — plain tickers only
    (not Yahoo indices '^GSPC', futures 'CL=F' or crypto 'BTC-USD')."""
    s = symbol.upper()
    return bool(FINNHUB_KEY) and "^" not in s and "=" not in s and not s.endswith("-USD")

# Frontend range key -> (yfinance period, yfinance interval)
RANGES: dict[str, tuple[str, str]] = {
    "1D": ("1d", "5m"),
    "5D": ("5d", "15m"),
    "1M": ("1mo", "60m"),
    "6M": ("6mo", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
    "MAX": ("max", "1mo"),
}
_DAILY_INTERVALS = {"1d", "5d", "1wk", "1mo", "3mo"}


def _now_ms() -> int:
    return int(time.time() * 1000)


def _num(v) -> float | None:
    """Coerce to a finite float or None — NaN/inf must never reach JSON."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


def _fast(fi, key: str) -> float | None:
    """fast_info attributes raise on missing data; treat any failure as None."""
    try:
        return _num(getattr(fi, key))
    except Exception:
        return None


# CoinGecko ids for crypto symbols (BTC-USD → bitcoin) — real-time quotes.
_CG_IDS = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "XRP": "ripple",
    "ADA": "cardano", "DOGE": "dogecoin", "BNB": "binancecoin", "AVAX": "avalanche-2",
    "DOT": "polkadot", "MATIC": "matic-network", "LINK": "chainlink", "LTC": "litecoin",
    "TRX": "tron", "SHIB": "shiba-inu", "USDT": "tether", "USDC": "usd-coin",
}


def _is_crypto(symbol: str) -> bool:
    return symbol.upper().replace("-USD", "") in _CG_IDS


# ── Quotes ──────────────────────────────────────────────────────────

def _coingecko_quote(symbol: str) -> dict:
    """Real-time crypto quote — reads the shared cached CoinGecko snapshot
    (crypto service) so the tape/watchlist don't make their own CoinGecko calls."""
    from . import crypto as crypto_svc  # local import avoids any import cycle

    row = crypto_svc.quote_for(symbol)
    price = _num(row.get("price")) if row else None
    if price is None:
        raise ValueError("coin not in CoinGecko snapshot")
    chg = _num(row.get("change24hPct"))
    prev = price / (1 + chg / 100) if chg is not None else None
    return {
        "symbol": symbol.upper(),
        "price": price,
        "prevClose": prev,
        "change": (price - prev) if prev is not None else None,
        "changePct": chg,
        "open": None, "dayHigh": None, "dayLow": None, "volume": _num(row.get("volume")),
        "currency": "USD",
        "realtime": True,
        "source": "coingecko",
        "ts": _now_ms(),
    }


def _finnhub_quote(symbol: str) -> dict:
    """Real-time US equity quote from Finnhub's free REST endpoint."""
    r = requests.get(
        "https://finnhub.io/api/v1/quote",
        params={"symbol": symbol.upper(), "token": FINNHUB_KEY},
        timeout=8,
    )
    r.raise_for_status()
    d = r.json()
    last, prev = _num(d.get("c")), _num(d.get("pc"))
    if not last:  # Finnhub returns 0s for unknown symbols → fall back to Yahoo
        raise ValueError("no Finnhub data")
    return {
        "symbol": symbol.upper(),
        "price": last,
        "prevClose": prev,
        "change": _num(d.get("d")),
        "changePct": _num(d.get("dp")),
        "open": _num(d.get("o")),
        "dayHigh": _num(d.get("h")),
        "dayLow": _num(d.get("l")),
        "volume": None,  # not in the free /quote endpoint
        "currency": "USD",
        "realtime": True,
        "source": "finnhub",
        "ts": _now_ms(),
    }


def _fetch_quote(symbol: str) -> dict:
    # Crypto → CoinGecko real-time (near real-time, keyless).
    if _is_crypto(symbol):
        try:
            return _coingecko_quote(symbol)
        except Exception:
            pass  # fall through to delayed Yahoo
    # Prefer Finnhub real-time for eligible US equities when a key is set.
    if _finnhub_eligible(symbol):
        try:
            return _finnhub_quote(symbol)
        except Exception:
            pass  # fall through to delayed Yahoo

    fi = yf.Ticker(symbol).fast_info
    last = _fast(fi, "last_price")
    prev = _fast(fi, "previous_close")
    change = pct = None
    if last is not None and prev not in (None, 0):
        change = last - prev
        pct = change / prev * 100
    try:
        currency = fi.currency
    except Exception:
        currency = None
    return {
        "symbol": symbol.upper(),
        "price": last,
        "prevClose": prev,
        "change": change,
        "changePct": pct,
        "open": _fast(fi, "open"),
        "dayHigh": _fast(fi, "day_high"),
        "dayLow": _fast(fi, "day_low"),
        "volume": _fast(fi, "last_volume"),
        "currency": currency,
        "realtime": False,
        "source": "yahoo",
        "ts": _now_ms(),
    }


def quote(symbol: str) -> dict:
    # Real-time sources (Finnhub equities, CoinGecko crypto) get a shorter TTL.
    ttl = 8 if (_finnhub_eligible(symbol) or _is_crypto(symbol)) else 15
    return cache.get_or_set(f"quote:{symbol.upper()}", ttl=ttl, fn=lambda: _fetch_quote(symbol))


def quotes(symbols: list[str]) -> list[dict]:
    """Batch quotes, in input order. One bad symbol must not sink the batch."""

    def safe(sym: str) -> dict:
        try:
            return quote(sym)
        except Exception:
            return {"symbol": sym.upper(), "price": None, "prevClose": None,
                    "change": None, "changePct": None, "open": None, "dayHigh": None,
                    "dayLow": None, "volume": None, "currency": None,
                    "realtime": False, "source": "yahoo", "ts": _now_ms(), "error": True}

    return list(_pool.map(safe, symbols))


# ── Candles ─────────────────────────────────────────────────────────

def _fetch_candles(symbol: str, rng: str) -> dict:
    period, interval = RANGES[rng]
    df = yf.Ticker(symbol).history(period=period, interval=interval, auto_adjust=True)
    daily = interval in _DAILY_INTERVALS
    out = []
    for idx, row in df.iterrows():
        close = _num(row.get("Close"))
        if close is None:
            continue
        out.append({
            # Lightweight Charts wants 'YYYY-MM-DD' for daily bars (avoids
            # timezone date-shift) and epoch seconds for intraday bars.
            "time": idx.strftime("%Y-%m-%d") if daily else int(idx.timestamp()),
            "open": _num(row.get("Open")),
            "high": _num(row.get("High")),
            "low": _num(row.get("Low")),
            "close": round(close, 4),
            "volume": int(v) if (v := _num(row.get("Volume"))) is not None else 0,
        })
    return {"symbol": symbol.upper(), "range": rng, "interval": interval,
            "candles": out, "ts": _now_ms()}


def candles(symbol: str, rng: str) -> dict:
    ttl = 30 if rng in ("1D", "5D", "1M") else 300  # intraday refreshes faster
    return cache.get_or_set(f"candles:{symbol.upper()}:{rng}", ttl,
                            lambda: _fetch_candles(symbol, rng))


# ── Profile (DES) ───────────────────────────────────────────────────

def _fetch_profile(symbol: str) -> dict:
    t = yf.Ticker(symbol)
    try:
        info = t.get_info() or {}
    except Exception:
        info = {}

    next_earnings = None
    try:
        cal = t.calendar or {}
        dates = cal.get("Earnings Date") or []
        if dates:
            next_earnings = str(dates[0])[:10]
    except Exception:
        pass

    website = info.get("website") or None
    domain = website.split("//")[-1].split("/")[0] if website else None

    # Yahoo has flip-flopped between fraction (0.0044) and percent (0.44)
    # for dividendYield; values under 0.25 are essentially always fractions.
    div_yield = _num(info.get("dividendYield"))
    if div_yield is not None and div_yield < 0.25:
        div_yield *= 100

    return {
        "symbol": symbol.upper(),
        "name": info.get("longName") or info.get("shortName") or symbol.upper(),
        "exchange": info.get("fullExchangeName") or info.get("exchange"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "marketCap": _num(info.get("marketCap")),
        "summary": info.get("longBusinessSummary"),
        "website": website,
        # Free logo trick: Google's favicon service against the company domain.
        "logoUrl": f"https://www.google.com/s2/favicons?domain={domain}&sz=64" if domain else None,
        "employees": info.get("fullTimeEmployees"),
        "country": info.get("country"),
        "currency": info.get("currency"),
        "beta": _num(info.get("beta")),
        "peTrailing": _num(info.get("trailingPE")),
        "peForward": _num(info.get("forwardPE")),
        "epsTrailing": _num(info.get("trailingEps")),
        "divYieldPct": div_yield,
        "high52": _num(info.get("fiftyTwoWeekHigh")),
        "low52": _num(info.get("fiftyTwoWeekLow")),
        "avgVolume": _num(info.get("averageVolume")),
        "sharesOut": _num(info.get("sharesOutstanding")),
        "nextEarnings": next_earnings,
    }


def profile(symbol: str) -> dict:
    return cache.get_or_set(f"profile:{symbol.upper()}", ttl=3600,
                            fn=lambda: _fetch_profile(symbol))


# ── Search (command-line autocomplete) ──────────────────────────────

def _fetch_search(q: str) -> list[dict]:
    try:
        results = yf.Search(q, max_results=10).quotes or []
    except Exception:
        return []
    out = []
    for r in results:
        sym = r.get("symbol")
        if not sym:
            continue
        out.append({
            "symbol": sym,
            "name": r.get("shortname") or r.get("longname") or sym,
            "exchange": r.get("exchDisp") or r.get("exchange"),
            "type": r.get("typeDisp") or r.get("quoteType"),
        })
    return out[:8]


def search(q: str) -> list[dict]:
    return cache.get_or_set(f"search:{q.lower()}", ttl=3600, fn=lambda: _fetch_search(q))
