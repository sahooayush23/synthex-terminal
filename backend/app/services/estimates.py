"""Earnings & estimates service (EE) — yfinance analyst data (free, keyless).

Coverage on the free Yahoo feed is decent for large/mid caps and thin for
small caps / non-US names; the frontend shows an honest "limited coverage"
note and empty states where data is missing.
"""
from __future__ import annotations

import math

import pandas as pd
import yfinance as yf

from .. import cache


def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


def _estimate_block(df: pd.DataFrame | None) -> list[dict]:
    """Normalize an earnings/revenue estimate DataFrame (indexed by period
    keys 0q/+1q/0y/+1y) into a list of row dicts."""
    if df is None or getattr(df, "empty", True):
        return []
    out = []
    for period, row in df.iterrows():
        out.append({
            "period": str(period),
            "avg": _num(row.get("avg")),
            "low": _num(row.get("low")),
            "high": _num(row.get("high")),
            "analysts": int(row["numberOfAnalysts"]) if _num(row.get("numberOfAnalysts")) is not None else None,
            "yearAgo": _num(row.get("yearAgoEps")) if "yearAgoEps" in row else _num(row.get("yearAgoRevenue")),
            "growth": _num(row.get("growth")),
        })
    return out


def _fetch_estimates(symbol: str) -> dict:
    t = yf.Ticker(symbol)

    # Earnings history: estimate vs reported EPS + surprise %
    history: list[dict] = []
    try:
        ed = t.earnings_dates
        if ed is not None and not ed.empty:
            for date, row in ed.iterrows():
                history.append({
                    "date": pd.Timestamp(date).strftime("%Y-%m-%d"),
                    "epsEstimate": _num(row.get("EPS Estimate")),
                    "epsReported": _num(row.get("Reported EPS")),
                    "surprisePct": _num(row.get("Surprise(%)")),
                })
    except Exception:
        pass

    earnings_est = revenue_est = None
    try:
        earnings_est = _estimate_block(t.earnings_estimate)
    except Exception:
        earnings_est = []
    try:
        revenue_est = _estimate_block(t.revenue_estimate)
    except Exception:
        revenue_est = []

    # Analyst recommendation distribution (strongBuy..strongSell), most recent
    reco = None
    try:
        rec = t.recommendations
        if rec is not None and not rec.empty:
            r = rec.iloc[0]
            reco = {k: int(r[k]) for k in ["strongBuy", "buy", "hold", "sell", "strongSell"] if k in r}
    except Exception:
        pass

    targets = None
    try:
        pt = t.analyst_price_targets
        if pt:
            targets = {k: _num(pt.get(k)) for k in ["current", "low", "mean", "median", "high"]}
    except Exception:
        pass

    return {
        "symbol": symbol.upper(),
        "history": history[:12],
        "earningsEstimate": earnings_est,
        "revenueEstimate": revenue_est,
        "recommendation": reco,
        "priceTargets": targets,
    }


def estimates(symbol: str) -> dict:
    return cache.get_or_set(f"est:{symbol.upper()}", 3600, lambda: _fetch_estimates(symbol))
