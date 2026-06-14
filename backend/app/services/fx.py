"""FX service (FX) — Frankfurter API (free, keyless, ECB reference rates).

Frankfurter publishes daily ECB reference rates with no key and no card.
We return latest rates for major quote currencies plus a ~30-day series per
pair for inline sparklines. Rates are near-daily (not intraday tick).
"""
from __future__ import annotations

from datetime import date, timedelta

import requests

from .. import cache

BASE_URL = "https://api.frankfurter.app"
# Pairs shown by default (base USD). Frankfurter has no USD-base limitation.
QUOTES = ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "MXN", "BRL", "KRW", "SGD"]
LABELS = {
    "EUR": "Euro", "GBP": "British Pound", "JPY": "Japanese Yen", "CHF": "Swiss Franc",
    "CAD": "Canadian Dollar", "AUD": "Australian Dollar", "CNY": "Chinese Yuan",
    "INR": "Indian Rupee", "MXN": "Mexican Peso", "BRL": "Brazilian Real",
    "KRW": "South Korean Won", "SGD": "Singapore Dollar",
}


def _get(path: str, params: dict) -> dict:
    r = requests.get(f"{BASE_URL}{path}", params=params, timeout=10)
    r.raise_for_status()
    return r.json()


def _fetch_fx(base: str) -> dict:
    base = base.upper()
    symbols = [c for c in QUOTES if c != base]
    latest = _get("/latest", {"from": base, "to": ",".join(symbols)})
    # 30-day history for sparklines + daily change.
    start = (date.today() - timedelta(days=32)).isoformat()
    hist = _get(f"/{start}..", {"from": base, "to": ",".join(symbols)})
    series: dict[str, list[float]] = {s: [] for s in symbols}
    for day in sorted(hist.get("rates", {})):
        for s in symbols:
            v = hist["rates"][day].get(s)
            if v is not None:
                series[s].append(v)

    rows = []
    for s in symbols:
        spark = series.get(s, [])
        last = latest.get("rates", {}).get(s)
        prev = spark[-2] if len(spark) >= 2 else None
        change_pct = ((last - prev) / prev * 100) if (last and prev) else None
        rows.append({
            "pair": f"{base}/{s}",
            "quote": s,
            "label": LABELS.get(s, s),
            "rate": last,
            "changePct": change_pct,
            "spark": spark[-30:],
        })
    return {"base": base, "rows": rows, "date": latest.get("date")}


def fx(base: str = "USD") -> dict:
    return cache.get_or_set(f"fx:{base.upper()}", ttl=300, fn=lambda: _fetch_fx(base))
