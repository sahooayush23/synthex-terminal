"""Options monitor (OMON) — yfinance option chains + Black-Scholes greeks.

yfinance provides the chain (strike, bid/ask, last, volume, open interest,
implied volatility) for free. Greeks aren't supplied, so we compute delta and
gamma with a small Black-Scholes routine using the live spot and each
contract's implied volatility. Equity options data is delayed (Yahoo).
"""
from __future__ import annotations

import math
from datetime import date, datetime

import yfinance as yf

from .. import cache
from . import market

RISK_FREE = 0.043  # ~current short-term rate; greeks are mildly sensitive to it


def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


def _norm_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def _norm_pdf(x: float) -> float:
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)


def _greeks(spot: float, strike: float, t: float, iv: float, is_call: bool) -> dict:
    if spot <= 0 or strike <= 0 or t <= 0 or iv <= 0:
        return {"delta": None, "gamma": None}
    d1 = (math.log(spot / strike) + (RISK_FREE + iv * iv / 2) * t) / (iv * math.sqrt(t))
    delta = _norm_cdf(d1) if is_call else _norm_cdf(d1) - 1
    gamma = _norm_pdf(d1) / (spot * iv * math.sqrt(t))
    return {"delta": round(delta, 4), "gamma": round(gamma, 6)}


def _rows(df, spot: float | None, t: float, is_call: bool) -> list[dict]:
    out = []
    for _, r in df.iterrows():
        strike = _num(r.get("strike"))
        iv = _num(r.get("impliedVolatility"))
        g = _greeks(spot, strike, t, iv, is_call) if (spot and strike and iv) else {"delta": None, "gamma": None}
        out.append({
            "strike": strike,
            "last": _num(r.get("lastPrice")),
            "bid": _num(r.get("bid")),
            "ask": _num(r.get("ask")),
            "volume": int(v) if (v := _num(r.get("volume"))) else 0,
            "openInterest": int(oi) if (oi := _num(r.get("openInterest"))) else 0,
            "iv": round(iv * 100, 1) if iv else None,
            "inTheMoney": bool(r.get("inTheMoney")),
            **g,
        })
    return out


def _fetch_chain(symbol: str, expiration: str | None) -> dict:
    t = yf.Ticker(symbol)
    exps = list(t.options or [])
    if not exps:
        return {"symbol": symbol.upper(), "expirations": [], "expiration": None, "spot": None, "calls": [], "puts": []}
    exp = expiration if expiration in exps else exps[0]

    try:
        spot = market.quote(symbol).get("price")
    except Exception:
        spot = None

    years = max((datetime.strptime(exp, "%Y-%m-%d").date() - date.today()).days, 0) / 365.0
    chain = t.option_chain(exp)
    return {
        "symbol": symbol.upper(),
        "expirations": exps,
        "expiration": exp,
        "spot": spot,
        "calls": _rows(chain.calls, spot, years, True),
        "puts": _rows(chain.puts, spot, years, False),
    }


def chain(symbol: str, expiration: str | None = None) -> dict:
    key = f"opt:{symbol.upper()}:{expiration or 'front'}"
    return cache.get_or_set(key, 120, lambda: _fetch_chain(symbol, expiration))
