"""Market data routes. Thin layer over services.market — validation only."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services import market

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/quotes")
def get_quotes(symbols: str = Query(..., description="Comma-separated, e.g. AAPL,MSFT,^GSPC")):
    syms = [s.strip() for s in symbols.split(",") if s.strip()][:40]
    if not syms:
        raise HTTPException(status_code=400, detail="No symbols supplied")
    return market.quotes(syms)


@router.get("/quote/{symbol}")
def get_quote(symbol: str):
    try:
        return market.quote(symbol)
    except Exception as exc:  # upstream (Yahoo) failure with no stale fallback
        raise HTTPException(status_code=502, detail=f"Quote unavailable for {symbol}") from exc


@router.get("/candles/{symbol}")
def get_candles(symbol: str, range_: str = Query("1Y", alias="range")):
    rng = range_.upper()
    if rng not in market.RANGES:
        raise HTTPException(status_code=400,
                            detail=f"range must be one of {', '.join(market.RANGES)}")
    try:
        return market.candles(symbol, rng)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Candles unavailable for {symbol}") from exc


@router.get("/profile/{symbol}")
def get_profile(symbol: str):
    try:
        return market.profile(symbol)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Profile unavailable for {symbol}") from exc


@router.get("/search")
def get_search(q: str = Query(..., min_length=1, max_length=40)):
    return market.search(q)
