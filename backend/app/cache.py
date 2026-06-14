"""Tiny in-process TTL cache.

Free data sources (Yahoo via yfinance, etc.) rate-limit aggressively, so every
upstream call goes through here. Two behaviours matter:

1. Fresh hits are served from memory — many browser tabs / panels asking for
   AAPL within 15 s cost exactly one upstream request.
2. If the upstream call FAILS but we have a stale value, we serve the stale
   value (within ``stale_grace`` seconds) instead of erroring. The UI shows
   the last-known number plus a "last updated" timestamp, which is exactly
   the honest behaviour the frontend promises.
"""
from __future__ import annotations

import threading
import time
from typing import Any, Callable

_lock = threading.Lock()
# key -> (expires_at_epoch, value)
_store: dict[str, tuple[float, Any]] = {}


def get_or_set(key: str, ttl: float, fn: Callable[[], Any], stale_grace: float = 900) -> Any:
    """Return cached value for ``key`` or compute it with ``fn``.

    On upstream failure, falls back to a stale value up to ``stale_grace``
    seconds past its normal expiry before finally raising.
    """
    now = time.time()
    with _lock:
        hit = _store.get(key)
    if hit and hit[0] > now:
        return hit[1]

    try:
        value = fn()
    except Exception:
        if hit and hit[0] + stale_grace > now:
            return hit[1]  # stale-but-recent beats an error page
        raise

    with _lock:
        _store[key] = (now + ttl, value)
    return value
