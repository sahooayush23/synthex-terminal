"""Synthex Terminal API — a $0/month proxy over free market-data sources.

Run locally:
    cd backend && uvicorn app.main:app --reload --port 8000

Educational project. Not financial advice. Equity data via Yahoo Finance is
delayed up to ~15 minutes and is labelled as such by the frontend.
"""
from __future__ import annotations

import os
import time

from dotenv import load_dotenv

# Load .env BEFORE importing routers/services, since those read API keys
# (FINNHUB_API_KEY, FRED_API_KEY, …) at module-import time.
load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .routers import ai, fundamentals, macro, market, news, stream  # noqa: E402

app = FastAPI(
    title="Synthex Terminal API",
    version="0.1.0",
    description="Free-data backend for the Synthex Terminal (educational, MIT).",
)

# Local dev origins always allowed; production frontend comes from .env.
_origins = {o.strip() for o in os.getenv("FRONTEND_ORIGIN", "").split(",") if o.strip()}
_origins |= {"http://localhost:5173", "http://127.0.0.1:5173"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(fundamentals.router)
app.include_router(news.router)
app.include_router(macro.router)
app.include_router(ai.router)
app.include_router(stream.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "ts": int(time.time() * 1000)}
