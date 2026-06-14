"""Live trade stream (live intraday candles) — Finnhub free trade WebSocket.

FREE: Finnhub's free tier includes a real-time *trade* WebSocket for US stocks
(the REST candle endpoint is paid, the trade socket is not). We keep the key
server-side: the backend holds ONE upstream Finnhub connection, multiplexes
symbol subscriptions, and fans trade ticks out to browser clients over our own
``/ws/trades`` socket. The browser never sees the API key.

Trades only flow during US market hours, so the live candle moves when the
market is open; off-hours the socket simply stays quiet.
"""
from __future__ import annotations

import asyncio
import json
import os
import ssl

import certifi
from websockets.asyncio.client import connect

# Use certifi's CA bundle so the wss:// handshake verifies (Python's default
# SSL context has no system CAs on some platforms, e.g. macOS).
_SSL = ssl.create_default_context(cafile=certifi.where())


def _key() -> str:
    return os.getenv("FINNHUB_API_KEY", "").strip()


class TradeHub:
    """Single upstream Finnhub WS, fanned out to per-client asyncio queues."""

    def __init__(self) -> None:
        self._subs: dict[str, set[asyncio.Queue]] = {}
        self._ws = None
        self._task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    def enabled(self) -> bool:
        return bool(_key())

    async def _ensure_running(self) -> None:
        async with self._lock:
            if self._task is None or self._task.done():
                self._task = asyncio.create_task(self._run())

    async def _run(self) -> None:
        url = f"wss://ws.finnhub.io?token={_key()}"
        while True:
            try:
                async with connect(url, ssl=_SSL, ping_interval=15, ping_timeout=10, open_timeout=12) as ws:
                    self._ws = ws
                    # (Re)subscribe everything currently requested.
                    for sym in list(self._subs):
                        await ws.send(json.dumps({"type": "subscribe", "symbol": sym}))
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                        except Exception:
                            continue
                        if msg.get("type") != "trade":
                            continue
                        for t in msg.get("data", []):
                            sym = t.get("s")
                            queues = self._subs.get(sym)
                            if not queues:
                                continue
                            item = {"s": sym, "p": t.get("p"), "v": t.get("v"), "t": t.get("t")}
                            for q in list(queues):
                                try:
                                    q.put_nowait(item)
                                except asyncio.QueueFull:
                                    pass
            except Exception:
                pass
            finally:
                self._ws = None
            await asyncio.sleep(3)  # reconnect backoff

    async def subscribe(self, symbol: str, q: asyncio.Queue) -> None:
        await self._ensure_running()
        first = symbol not in self._subs
        self._subs.setdefault(symbol, set()).add(q)
        if first and self._ws is not None:
            try:
                await self._ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))
            except Exception:
                pass

    async def unsubscribe(self, symbol: str, q: asyncio.Queue) -> None:
        queues = self._subs.get(symbol)
        if not queues:
            return
        queues.discard(q)
        if not queues:
            self._subs.pop(symbol, None)
            if self._ws is not None:
                try:
                    await self._ws.send(json.dumps({"type": "unsubscribe", "symbol": symbol}))
                except Exception:
                    pass


hub = TradeHub()
