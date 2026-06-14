"""News routes — N (tabbed market news center)."""
from __future__ import annotations

from fastapi import APIRouter, Query

from ..services import news as news_svc

router = APIRouter(prefix="/api", tags=["news"])


@router.get("/news")
def get_news(
    category: str = Query("top"),
    symbol: str | None = Query(None, description="If set, returns news for this ticker"),
    limit: int = Query(30, ge=1, le=60),
):
    return news_svc.news(category=category, symbol=symbol, limit=limit)


@router.get("/news/categories")
def get_categories():
    return news_svc.categories()
