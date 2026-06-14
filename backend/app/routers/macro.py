"""Phase 3 routes — boards (WEI/SECT/CMTY/CETF), movers (MOV), FX, crypto
(CRYP), corporate actions (CACT), social (SOC), calendar (CAL), screen/scatter
(EQS/SCAT), economic data (ECO/GYLD/CORP), IPOs and insiders (IPO/INSDR)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services import crypto as crypto_svc
from ..services import extras as extras_svc
from ..services import finnhub_extra as finnhub_svc
from ..services import flights as flights_svc
from ..services import fred as fred_svc
from ..services import fx as fx_svc
from ..services import markets as markets_svc
from ..services import options as options_svc

router = APIRouter(prefix="/api", tags=["markets"])


@router.get("/board/{name}")
def get_board(name: str):
    if name not in markets_svc.BOARDS:
        raise HTTPException(status_code=404, detail=f"Unknown board '{name}'")
    try:
        return markets_svc.board(name)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Board '{name}' unavailable") from exc


@router.get("/movers")
def get_movers(universe: str = Query("large")):
    try:
        return markets_svc.movers(universe)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Movers unavailable") from exc


@router.get("/fx")
def get_fx(base: str = Query("USD", min_length=3, max_length=3)):
    try:
        return fx_svc.fx(base)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="FX rates unavailable") from exc


@router.get("/crypto")
def get_crypto(vs: str = Query("usd"), limit: int = Query(30, ge=1, le=100)):
    try:
        return crypto_svc.crypto(vs, limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Crypto data unavailable") from exc


@router.get("/actions/{symbol}")
def get_actions(symbol: str):
    try:
        return extras_svc.actions(symbol)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Corporate actions unavailable for {symbol}") from exc


@router.get("/social/{symbol}")
def get_social(symbol: str):
    try:
        return extras_svc.social(symbol)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Social feed unavailable for {symbol}") from exc


@router.get("/calendar")
def get_calendar(symbols: str = Query(..., description="Comma-separated tickers")):
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    try:
        return extras_svc.calendar(syms)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Calendar unavailable") from exc


@router.get("/universe")
def get_universe():
    """Valuation/screen universe powering EQS and SCAT."""
    try:
        return extras_svc.universe()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Universe unavailable") from exc


@router.get("/econ/{name}")
def get_econ(name: str):
    """Economic dashboards: eco | gyld | corp (FRED, requires free key)."""
    return fred_svc.dashboard(name)


@router.get("/ipos")
def get_ipos():
    return finnhub_svc.ipos()


@router.get("/insiders/{symbol}")
def get_insiders(symbol: str):
    return finnhub_svc.insiders(symbol)


@router.get("/options/{symbol}")
def get_options(symbol: str, expiration: str | None = Query(None)):
    try:
        return options_svc.chain(symbol, expiration)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Options unavailable for {symbol}") from exc


@router.get("/sparks")
def get_sparks(symbols: str = Query(..., description="Comma-separated tickers")):
    syms = [s.strip() for s in symbols.split(",") if s.strip()][:30]
    try:
        return markets_svc.sparks(syms)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Sparks unavailable") from exc


@router.get("/flights")
def get_flights(limit: int = Query(60, ge=1, le=120)):
    try:
        return flights_svc.flights(limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Flight data unavailable (OpenSky rate limit?)") from exc
