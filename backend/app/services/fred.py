"""Economic data (ECO / GYLD / CORP) — FRED, the St. Louis Fed's free API.

Requires a free ``FRED_API_KEY`` (no credit card). Without a key the service
returns ``{available: False}`` and the frontend shows an honest "add a free
FRED key" state rather than faking numbers.
"""
from __future__ import annotations

import os

import requests

from .. import cache

FRED_KEY = os.getenv("FRED_API_KEY", "").strip()
BASE = "https://api.stlouisfed.org/fred/series/observations"

# Dashboards: (series_id, label, unit)
ECO_SERIES = [
    ("GDPC1", "Real GDP", "$B (SAAR)"),
    ("CPIAUCSL", "CPI", "index"),
    ("UNRATE", "Unemployment", "%"),
    ("FEDFUNDS", "Fed Funds Rate", "%"),
    ("PAYEMS", "Nonfarm Payrolls", "K"),
    ("UMCSENT", "Consumer Sentiment", "index"),
]
YIELD_SERIES = [
    ("DGS1MO", "1M", "%"), ("DGS3MO", "3M", "%"), ("DGS6MO", "6M", "%"),
    ("DGS1", "1Y", "%"), ("DGS2", "2Y", "%"), ("DGS5", "5Y", "%"),
    ("DGS7", "7Y", "%"), ("DGS10", "10Y", "%"), ("DGS20", "20Y", "%"), ("DGS30", "30Y", "%"),
]
CORP_SERIES = [
    ("BAMLH0A0HYM2", "US High Yield OAS", "%"),
    ("BAMLC0A0CM", "US Investment Grade OAS", "%"),
    ("BAMLH0A3HYC", "CCC & Lower OAS", "%"),
    ("T10Y2Y", "10Y–2Y Spread", "%"),
]


def _observations(series_id: str, limit: int = 60) -> list[dict]:
    r = requests.get(BASE, params={
        "series_id": series_id, "api_key": FRED_KEY, "file_type": "json",
        "sort_order": "desc", "limit": limit,
    }, timeout=10)
    r.raise_for_status()
    obs = r.json().get("observations", [])
    out = []
    for o in obs:
        try:
            v = float(o["value"])
        except (ValueError, KeyError):
            continue
        out.append({"date": o["date"], "value": v})
    out.reverse()  # ascending for sparklines
    return out


def _dashboard(name: str) -> dict:
    if not FRED_KEY:
        return {"available": False, "name": name}
    spec = {"eco": ECO_SERIES, "gyld": YIELD_SERIES, "corp": CORP_SERIES}[name]
    rows = []
    for series_id, label, unit in spec:
        try:
            obs = _observations(series_id, 60)
        except Exception:
            obs = []
        if not obs:
            continue
        last = obs[-1]["value"]
        prev = obs[-2]["value"] if len(obs) > 1 else None
        rows.append({
            "id": series_id, "label": label, "unit": unit,
            "value": last,
            "change": (last - prev) if prev is not None else None,
            "spark": [o["value"] for o in obs[-40:]],
            "asOf": obs[-1]["date"],
        })
    return {"available": True, "name": name, "rows": rows}


def dashboard(name: str) -> dict:
    if name not in ("eco", "gyld", "corp"):
        return {"available": False, "name": name}
    return cache.get_or_set(f"fred:{name}", 6 * 3600, lambda: _dashboard(name))
