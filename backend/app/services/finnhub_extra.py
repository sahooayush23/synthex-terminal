"""Finnhub-backed Phase 3 extras — IPO calendar (IPO) and insider
transactions (INSDR). Both use the free Finnhub tier (no credit card).
Without a ``FINNHUB_API_KEY`` the service returns ``{available: False}`` so the
frontend shows an honest "add a free key" state instead of faking data.
"""
from __future__ import annotations

import os
from datetime import date, timedelta

import requests

from .. import cache

FINNHUB_KEY = os.getenv("FINNHUB_API_KEY", "").strip()
BASE = "https://finnhub.io/api/v1"


def _get(path: str, params: dict) -> dict:
    params = {**params, "token": FINNHUB_KEY}
    r = requests.get(f"{BASE}{path}", params=params, timeout=10)
    r.raise_for_status()
    return r.json()


def _fetch_ipos() -> dict:
    if not FINNHUB_KEY:
        return {"available": False}
    today = date.today()
    data = _get("/calendar/ipo", {
        "from": (today - timedelta(days=14)).isoformat(),
        "to": (today + timedelta(days=45)).isoformat(),
    })
    rows = [{
        "symbol": i.get("symbol"), "name": i.get("name"), "date": i.get("date"),
        "exchange": i.get("exchange"), "priceRange": i.get("price"),
        "shares": i.get("numberOfShares"), "status": i.get("status"),
    } for i in data.get("ipoCalendar", [])]
    rows.sort(key=lambda r: r.get("date") or "")
    return {"available": True, "rows": rows}


def ipos() -> dict:
    return cache.get_or_set("ipo:cal", 3600, _fetch_ipos)


def _fetch_insiders(symbol: str) -> dict:
    if not FINNHUB_KEY:
        return {"available": False, "symbol": symbol.upper()}
    today = date.today()
    data = _get("/stock/insider-transactions", {
        "symbol": symbol.upper(),
        "from": (today - timedelta(days=180)).isoformat(),
        "to": today.isoformat(),
    })
    rows = [{
        "name": d.get("name"), "shares": d.get("share"), "change": d.get("change"),
        "price": d.get("transactionPrice"), "date": d.get("transactionDate"),
        "code": d.get("transactionCode"),
    } for d in data.get("data", [])[:40]]
    return {"available": True, "symbol": symbol.upper(), "rows": rows}


def insiders(symbol: str) -> dict:
    return cache.get_or_set(f"insdr:{symbol.upper()}", 3600, lambda: _fetch_insiders(symbol))
