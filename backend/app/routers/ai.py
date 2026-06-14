"""AI assistant route (AI). POST a question (+ optional active ticker)."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..services import ai as ai_svc

router = APIRouter(prefix="/api", tags=["ai"])


class AskRequest(BaseModel):
    question: str
    symbol: str | None = None


@router.get("/ai/status")
def ai_status():
    return {"available": ai_svc.available()}


@router.post("/ai")
def ai_ask(req: AskRequest):
    return ai_svc.ask(req.question.strip(), req.symbol)
