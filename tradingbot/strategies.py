"""Strategies.

Each strategy takes a daily OHLCV frame and returns the *target* exposure (0..1)
decided at that day's close, using only data available up to that close.
The backtester executes it at the next day's open.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def rsi(close: pd.Series, n: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + gain / loss.replace(0, np.nan))


def vol_scale(close: pd.Series, target_vol: float = 0.15, lookback: int = 20) -> pd.Series:
    """Position size that aims for `target_vol` annualised volatility, capped at 1x."""
    realised = close.pct_change().rolling(lookback).std() * np.sqrt(252)
    return (target_vol / realised).clip(upper=1.0).fillna(0.0)


def buy_hold(df: pd.DataFrame) -> pd.Series:
    return pd.Series(1.0, index=df.index)


def trend(df: pd.DataFrame, fast: int = 50, slow: int = 200) -> pd.Series:
    """Long while price is above the slow average and the fast average is above the slow one."""
    c = df["close"]
    sma_fast, sma_slow = c.rolling(fast).mean(), c.rolling(slow).mean()
    return ((c > sma_slow) & (sma_fast > sma_slow)).astype(float)


def momentum(df: pd.DataFrame, lookback: int = 252) -> pd.Series:
    """Long while the trailing 12-month return is positive (time-series momentum)."""
    return (df["close"].pct_change(lookback) > 0).astype(float)


def rsi2(df: pd.DataFrame, entry: float = 10, exit_sma: int = 5, filter_sma: int = 200) -> pd.Series:
    """Buy short-term dips in a long-term uptrend; exit on the bounce."""
    c = df["close"]
    r = rsi(c, 2)
    uptrend = c > c.rolling(filter_sma).mean()
    exit_level = c.rolling(exit_sma).mean()
    pos = np.zeros(len(c))
    holding = False
    for i in range(len(c)):
        if holding and (c.iloc[i] > exit_level.iloc[i] or not uptrend.iloc[i]):
            holding = False
        elif not holding and uptrend.iloc[i] and r.iloc[i] < entry:
            holding = True
        pos[i] = 1.0 if holding else 0.0
    return pd.Series(pos, index=c.index)


def trend_voltarget(df: pd.DataFrame, target_vol: float = 0.15) -> pd.Series:
    """Trend filter with volatility-targeted sizing: smaller positions in turbulent markets."""
    return trend(df) * vol_scale(df["close"], target_vol)


def combo(df: pd.DataFrame) -> pd.Series:
    """Average of the trend, momentum and RSI(2) signals, sized by volatility target."""
    raw = (trend(df) + momentum(df) + rsi2(df)) / 3
    return raw * vol_scale(df["close"], 0.15)


STRATEGIES = {
    "buy_hold": buy_hold,
    "trend": trend,
    "momentum": momentum,
    "rsi2": rsi2,
    "trend_voltarget": trend_voltarget,
    "combo": combo,
}
