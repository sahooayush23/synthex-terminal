"""Fundamentals routes — FA (financials) and EE (earnings & estimates)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services import estimates as estimates_svc
from ..services import fundamentals as fundamentals_svc

router = APIRouter(prefix="/api", tags=["fundamentals"])


@router.get("/financials/{symbol}")
def get_financials(symbol: str, freq: str = Query("annual", description="annual | quarterly")):
    try:
        return fundamentals_svc.financials(symbol, freq)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Financials unavailable for {symbol}") from exc


@router.get("/estimates/{symbol}")
def get_estimates(symbol: str):
    try:
        return estimates_svc.estimates(symbol)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Estimates unavailable for {symbol}") from exc
