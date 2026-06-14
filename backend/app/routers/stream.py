"""WebSocket route — fans live trade ticks out to the browser for live candles.

Clients connect to ``/ws/trades?symbols=AAPL`` and receive ``{s, p, v, t}``
trade messages (symbol, price, volume, epoch-ms). The Finnhub key stays
server-side in the TradeHub.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from ..services.stream import hub

router = APIRouter()


@router.websocket("/ws/trades")
async def ws_trades(ws: WebSocket, symbols: str = Query("")):
    await ws.accept()
    if not hub.enabled():
        await ws.send_json({"type": "disabled"})
        await ws.close()
        return

    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()][:5]
    q: asyncio.Queue = asyncio.Queue(maxsize=500)
    for s in syms:
        await hub.subscribe(s, q)

    async def sender() -> None:
        while True:
            await ws.send_json(await q.get())

    async def receiver() -> None:
        # Reading detects client disconnect (and ignores any client messages).
        while True:
            await ws.receive_text()

    send_task = asyncio.create_task(sender())
    recv_task = asyncio.create_task(receiver())
    try:
        await asyncio.wait({send_task, recv_task}, return_when=asyncio.FIRST_COMPLETED)
    except WebSocketDisconnect:
        pass
    finally:
        send_task.cancel()
        recv_task.cancel()
        for s in syms:
            await hub.unsubscribe(s, q)
