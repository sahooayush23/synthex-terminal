"""Flight tracking (FLT) — OpenSky Network live aircraft states (keyless).

OpenSky's anonymous API is free (rate-limited). We query a bounding box and
return a sample of live aircraft so the payload stays small. Experimental.
"""
from __future__ import annotations

import requests

from .. import cache

# Continental-US bounding box keeps the response manageable.
BBOX = {"lamin": 24.5, "lomin": -125.0, "lamax": 49.5, "lomax": -66.0}


def _fetch(limit: int) -> dict:
    r = requests.get("https://opensky-network.org/api/states/all", params=BBOX, timeout=15)
    r.raise_for_status()
    data = r.json()
    rows = []
    for s in data.get("states") or []:
        # OpenSky state-vector indices (see API docs).
        callsign = (s[1] or "").strip()
        rows.append({
            "icao24": s[0],
            "callsign": callsign or None,
            "country": s[2],
            "lon": s[5],
            "lat": s[6],
            "altitude": s[7],          # baro altitude (m)
            "onGround": s[8],
            "velocity": s[9],          # m/s
            "heading": s[10],
        })
    airborne = [r for r in rows if not r["onGround"] and r["velocity"]]
    airborne.sort(key=lambda r: r["velocity"] or 0, reverse=True)
    return {"total": len(rows), "time": data.get("time"), "flights": airborne[:limit]}


def flights(limit: int = 60) -> dict:
    return cache.get_or_set(f"flights:{limit}", 30, lambda: _fetch(limit))
