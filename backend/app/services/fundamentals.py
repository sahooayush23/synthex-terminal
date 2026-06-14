"""Financial-statement service (FA) — wraps yfinance financials (free, keyless).

Yahoo exposes income statement, balance sheet and cash-flow DataFrames (annual
and quarterly), indexed by line-item name and columned by fiscal-period end.
Row names vary by company and occasionally change, so every extraction goes
through ``_row()`` with a list of candidate names and tolerates misses.

We return a normalized payload: ascending ``periods`` labels plus a flat dict
of numeric ``series`` aligned to those periods (raw line items + derived
metrics like margins, ROIC and solvency ratios). The frontend maps series →
sub-tab rows declaratively, so presentation lives there and math lives here.
"""
from __future__ import annotations

import math

import pandas as pd
import yfinance as yf

from .. import cache
from . import market

# Canonical metric key -> ordered candidate yfinance row names (first hit wins).
INCOME_ROWS: dict[str, list[str]] = {
    "revenue": ["Total Revenue", "Operating Revenue"],
    "costOfRevenue": ["Cost Of Revenue", "Reconciled Cost Of Revenue"],
    "grossProfit": ["Gross Profit"],
    "rAndD": ["Research And Development"],
    "sgna": ["Selling General And Administration"],
    "operatingExpense": ["Operating Expense"],
    "operatingIncome": ["Operating Income", "Total Operating Income As Reported"],
    "ebitda": ["EBITDA", "Normalized EBITDA"],
    "ebit": ["EBIT"],
    "interestExpense": ["Interest Expense", "Interest Expense Non Operating"],
    "pretaxIncome": ["Pretax Income"],
    "taxProvision": ["Tax Provision"],
    "netIncome": ["Net Income", "Net Income Common Stockholders"],
    "dilutedEPS": ["Diluted EPS"],
    "basicEPS": ["Basic EPS"],
    "dilutedShares": ["Diluted Average Shares"],
}
BALANCE_ROWS: dict[str, list[str]] = {
    "totalAssets": ["Total Assets"],
    "currentAssets": ["Current Assets"],
    "cash": ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"],
    "cashAndSTInvest": ["Cash Cash Equivalents And Short Term Investments"],
    "receivables": ["Accounts Receivable", "Receivables"],
    "inventory": ["Inventory"],
    "netPPE": ["Net PPE"],
    "totalLiabilities": ["Total Liabilities Net Minority Interest"],
    "currentLiabilities": ["Current Liabilities"],
    "totalDebt": ["Total Debt"],
    "netDebt": ["Net Debt"],
    "equity": ["Stockholders Equity", "Common Stock Equity", "Total Equity Gross Minority Interest"],
    "retainedEarnings": ["Retained Earnings"],
    "investedCapital": ["Invested Capital"],
    "workingCapital": ["Working Capital"],
    "sharesOutstanding": ["Ordinary Shares Number", "Share Issued"],
}
CASHFLOW_ROWS: dict[str, list[str]] = {
    "operatingCashFlow": ["Operating Cash Flow", "Cash Flow From Continuing Operating Activities"],
    "investingCashFlow": ["Investing Cash Flow"],
    "financingCashFlow": ["Financing Cash Flow"],
    "capex": ["Capital Expenditure", "Purchase Of PPE"],
    "freeCashFlow": ["Free Cash Flow"],
    "dividendsPaid": ["Cash Dividends Paid", "Common Stock Dividend Paid"],
    "buybacks": ["Repurchase Of Capital Stock", "Common Stock Payments"],
}


def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


def _row(df: pd.DataFrame, candidates: list[str]) -> dict:
    """Return {period_timestamp: value} for the first candidate row present."""
    if df is None or df.empty:
        return {}
    for name in candidates:
        if name in df.index:
            return {col: _num(val) for col, val in df.loc[name].items()}
    return {}


def _safe_div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


def _label(ts, freq: str) -> str:
    """Fiscal-period column label. Annual → 'FY2025'; quarterly → 'Q3 25'."""
    try:
        d = pd.Timestamp(ts)
    except Exception:
        return str(ts)[:7]
    if freq == "annual":
        return f"FY{d.year}"
    return f"Q{(d.month - 1) // 3 + 1} {str(d.year)[2:]}"


def _fetch_financials(symbol: str, freq: str) -> dict:
    t = yf.Ticker(symbol)
    if freq == "quarterly":
        inc, bal, cf = t.quarterly_income_stmt, t.quarterly_balance_sheet, t.quarterly_cashflow
    else:
        inc, bal, cf = t.income_stmt, t.balance_sheet, t.cashflow

    if inc is None or inc.empty:
        return {"symbol": symbol.upper(), "freq": freq, "periods": [], "series": {}, "current": {}}

    # Column order is newest→oldest; reverse to oldest→newest for sparklines.
    cols = list(inc.columns)[::-1]
    periods = [_label(c, freq) for c in cols]

    def series_from(df: pd.DataFrame, mapping: dict[str, list[str]]) -> dict[str, list]:
        out: dict[str, list] = {}
        for key, cands in mapping.items():
            row = _row(df, cands)
            out[key] = [row.get(c) for c in cols]
        return out

    s: dict[str, list] = {}
    s.update(series_from(inc, INCOME_ROWS))
    s.update(series_from(bal, BALANCE_ROWS))
    s.update(series_from(cf, CASHFLOW_ROWS))

    n = len(cols)

    def derive(fn) -> list:
        return [fn(i) for i in range(n)]

    def g(key: str, i: int) -> float | None:
        v = s.get(key, [None] * n)[i]
        return v

    # Free cash flow: prefer reported, else OCF − |capex|.
    fcf = []
    for i in range(n):
        reported = g("freeCashFlow", i)
        if reported is not None:
            fcf.append(reported)
        else:
            ocf, capex = g("operatingCashFlow", i), g("capex", i)
            fcf.append(ocf + capex if (ocf is not None and capex is not None) else None)
    s["freeCashFlow"] = fcf

    # Margins (as %)
    s["grossMargin"] = derive(lambda i: _pct(_safe_div(g("grossProfit", i), g("revenue", i))))
    s["operatingMargin"] = derive(lambda i: _pct(_safe_div(g("operatingIncome", i), g("revenue", i))))
    s["ebitdaMargin"] = derive(lambda i: _pct(_safe_div(g("ebitda", i), g("revenue", i))))
    s["netMargin"] = derive(lambda i: _pct(_safe_div(g("netIncome", i), g("revenue", i))))
    s["fcfMargin"] = derive(lambda i: _pct(_safe_div(fcf[i], g("revenue", i))))

    # Returns
    s["roe"] = derive(lambda i: _pct(_safe_div(g("netIncome", i), g("equity", i))))
    s["roa"] = derive(lambda i: _pct(_safe_div(g("netIncome", i), g("totalAssets", i))))
    # NOPAT = operating income × (1 − effective tax rate); ROIC = NOPAT / invested capital
    nopat = []
    for i in range(n):
        oi, pre, tax = g("operatingIncome", i), g("pretaxIncome", i), g("taxProvision", i)
        rate = _safe_div(tax, pre)
        if rate is None or rate < 0:
            rate = 0.0
        nopat.append(oi * (1 - rate) if oi is not None else None)
    s["nopat"] = nopat
    s["roic"] = derive(lambda i: _pct(_safe_div(nopat[i], g("investedCapital", i))))

    # Solvency
    s["currentRatio"] = derive(lambda i: _safe_div(g("currentAssets", i), g("currentLiabilities", i)))
    s["quickRatio"] = derive(
        lambda i: _safe_div(
            (g("currentAssets", i) or 0) - (g("inventory", i) or 0) if g("currentAssets", i) is not None else None,
            g("currentLiabilities", i),
        )
    )
    s["debtToEquity"] = derive(lambda i: _safe_div(g("totalDebt", i), g("equity", i)))
    s["debtToEbitda"] = derive(lambda i: _safe_div(g("totalDebt", i), g("ebitda", i)))
    s["interestCoverage"] = derive(
        lambda i: _safe_div(g("operatingIncome", i), abs(ie) if (ie := g("interestExpense", i)) else None)
    )

    return {
        "symbol": symbol.upper(),
        "freq": freq,
        "periods": periods,
        "series": s,
        "current": _current_multiples(symbol, s, n),
    }


def _pct(frac: float | None) -> float | None:
    return None if frac is None else frac * 100


def _current_multiples(symbol: str, s: dict[str, list], n: int) -> dict:
    """Current/TTM valuation multiples, mixing live market cap with latest
    fundamentals. Labelled 'current/TTM' in the UI — not a historical series."""
    try:
        prof = market.profile(symbol)
    except Exception:
        prof = {}
    mcap = prof.get("marketCap")
    last = lambda key: s.get(key, [None] * n)[-1] if n else None  # noqa: E731

    revenue = last("revenue")
    ebitda = last("ebitda")
    equity = last("equity")
    debt = last("totalDebt")
    cash = last("cash")
    ev = None
    if mcap is not None:
        ev = mcap + (debt or 0) - (cash or 0)

    return {
        "price": prof.get("price") if "price" in prof else None,
        "marketCap": mcap,
        "enterpriseValue": ev,
        "totalDebt": debt,
        "cash": cash,
        "peTrailing": prof.get("peTrailing"),
        "peForward": prof.get("peForward"),
        "priceToSales": _safe_div(mcap, revenue),
        "priceToBook": _safe_div(mcap, equity),
        "evToEbitda": _safe_div(ev, ebitda),
        "evToSales": _safe_div(ev, revenue),
        "divYieldPct": prof.get("divYieldPct"),
        "beta": prof.get("beta"),
    }


def financials(symbol: str, freq: str) -> dict:
    freq = "quarterly" if freq.lower().startswith("q") else "annual"
    ttl = 6 * 3600  # statements update quarterly; cache hard
    return cache.get_or_set(f"fin:{symbol.upper()}:{freq}", ttl, lambda: _fetch_financials(symbol, freq))
