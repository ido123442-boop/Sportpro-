"""Daily OHLCV download from Yahoo Finance, split/dividend adjusted, cached as CSV."""
from __future__ import annotations

import time
from pathlib import Path

import pandas as pd
import requests

CACHE_DIR = Path(__file__).resolve().parent.parent / "data_cache"
_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def _download(symbol: str) -> pd.DataFrame:
    params = {"period1": 0, "period2": int(time.time()), "interval": "1d", "events": "div,split"}
    resp = requests.get(_URL.format(symbol=symbol), params=params,
                        headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    resp.raise_for_status()
    result = resp.json()["chart"]["result"][0]
    quote = result["indicators"]["quote"][0]
    adjclose = result["indicators"]["adjclose"][0]["adjclose"]
    df = pd.DataFrame(
        {
            "open": quote["open"], "high": quote["high"], "low": quote["low"],
            "close": quote["close"], "adjclose": adjclose, "volume": quote["volume"],
        },
        index=pd.to_datetime(result["timestamp"], unit="s").normalize(),
    ).dropna()
    # Scale OHLC by the adjustment factor so gaps from splits/dividends are removed.
    factor = df["adjclose"] / df["close"]
    for col in ("open", "high", "low"):
        df[col] = df[col] * factor
    df["close"] = df["adjclose"]
    df = df.drop(columns="adjclose")
    df = df[~df.index.duplicated(keep="last")]
    df.index.name = "date"
    return df


def load(symbol: str, refresh: bool = False) -> pd.DataFrame:
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / f"{symbol.upper()}.csv"
    if path.exists() and not refresh:
        return pd.read_csv(path, index_col="date", parse_dates=True)
    df = _download(symbol)
    df.to_csv(path)
    return df
