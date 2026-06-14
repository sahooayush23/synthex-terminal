"""AI assistant (AI) — answers questions grounded in fresh terminal data.

Uses Google Gemini's free tier (``GEMINI_API_KEY``) and falls back to Groq
(``GROQ_API_KEY``) — both free, no credit card. Without a key the service
returns ``{available: False}`` and the UI shows an honest "add a free key"
panel. The model is given a live snapshot (quote, profile, recent headlines)
so it can answer things like "why is AAPL down today" with real numbers.
"""
from __future__ import annotations

import os

import requests

from .. import cache
from . import market
from . import news as news_svc

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_KEY = os.getenv("GROQ_API_KEY", "").strip()
GEMINI_MODEL = "gemini-2.0-flash"
GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM = (
    "You are Synthex AI, a concise financial-markets assistant inside an educational "
    "terminal. Answer in 3-6 sentences using the live DATA provided plus general "
    "knowledge. Cite specific numbers from the data when relevant. Be objective and "
    "never give personalised buy/sell advice. End with a short '(Not financial advice.)'."
)


def available() -> bool:
    return bool(GEMINI_KEY or GROQ_KEY)


def _fmt(v, suffix="") -> str:
    return f"{v}{suffix}" if v is not None else "n/a"


def _context(symbol: str) -> str:
    parts: list[str] = []
    try:
        q = market.quote(symbol)
        parts.append(
            f"{symbol}: price {_fmt(q.get('price'))}, change {_fmt(q.get('changePct'))}% (1D), "
            f"prev close {_fmt(q.get('prevClose'))}, day range {_fmt(q.get('dayLow'))}-{_fmt(q.get('dayHigh'))}."
        )
    except Exception:
        pass
    try:
        p = market.profile(symbol)
        parts.append(
            f"{p.get('name')} — {p.get('sector')} / {p.get('industry')}; market cap {_fmt(p.get('marketCap'))}, "
            f"P/E {_fmt(p.get('peTrailing'))}, 52w {_fmt(p.get('low52'))}-{_fmt(p.get('high52'))}, "
            f"next earnings {_fmt(p.get('nextEarnings'))}."
        )
    except Exception:
        pass
    try:
        items = news_svc.news(symbol=symbol, limit=6).get("items", [])
        if items:
            heads = "; ".join(f"{i['title']} ({i.get('publisher')})" for i in items[:5] if i.get("title"))
            parts.append(f"Recent headlines: {heads}")
    except Exception:
        pass
    return "\n".join(parts) or "(no live data available)"


def _call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_KEY}"
    r = requests.post(url, json={
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 700},
    }, timeout=30)
    r.raise_for_status()
    data = r.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_groq(prompt: str) -> str:
    r = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_KEY}"},
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
            "temperature": 0.4,
            "max_tokens": 700,
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()


def ask(question: str, symbol: str | None) -> dict:
    if not available():
        return {"available": False}

    symbol = (symbol or "").strip().upper()
    context = _context(symbol) if symbol else ""
    prompt = (
        (f"Active security: {symbol}\nLive DATA:\n{context}\n\n" if symbol else "")
        + f"User question: {question}"
    )

    # Cache identical (question, symbol) pairs briefly to save quota.
    key = f"ai:{symbol}:{hash(question)}"

    def run() -> dict:
        used = "gemini" if GEMINI_KEY else "groq"
        try:
            answer = _call_gemini(prompt) if GEMINI_KEY else _call_groq(prompt)
        except Exception:
            if GEMINI_KEY and GROQ_KEY:  # try the fallback provider
                try:
                    answer = _call_groq(prompt)
                    used = "groq"
                except Exception:
                    return {"available": True, "error": "The AI provider is unavailable right now."}
            else:
                return {"available": True, "error": "The AI provider is unavailable right now."}
        return {"available": True, "answer": answer, "model": used, "symbol": symbol or None}

    return cache.get_or_set(key, 120, run)
