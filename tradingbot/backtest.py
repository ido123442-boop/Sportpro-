"""Vectorised daily backtester with next-open execution and trading costs."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class Result:
    equity: pd.Series      # growth of 1 unit of capital
    returns: pd.Series     # daily strategy returns
    position: pd.Series    # exposure actually held during each day's session
    trades: int


def run(df: pd.DataFrame, target: pd.Series, cost_bps: float = 5.0) -> Result:
    """Simulate trading `target` on `df`.

    The target decided at the close of day t-1 is executed at the open of day t.
    Overnight (close t-1 -> open t) earns the old position, the session
    (open t -> close t) earns the new one. `cost_bps` is charged on turnover
    (commission + slippage, per side).
    """
    target = target.reindex(df.index).fillna(0.0).clip(0.0, 1.0)
    new_pos = target.shift(1).fillna(0.0)          # held from today's open
    old_pos = new_pos.shift(1).fillna(0.0)          # held overnight into today's open
    overnight = df["open"] / df["close"].shift(1) - 1
    session = df["close"] / df["open"] - 1
    turnover = (new_pos - old_pos).abs()
    gross = (1 + old_pos * overnight.fillna(0.0)) * (1 + new_pos * session) - 1
    returns = gross - turnover * cost_bps / 10_000
    trades = int(((new_pos > 0) & (old_pos == 0)).sum())
    return Result(equity=(1 + returns).cumprod(), returns=returns, position=new_pos, trades=trades)


def metrics(res: Result) -> dict:
    r = res.returns
    years = len(r) / 252
    total = res.equity.iloc[-1]
    drawdown = res.equity / res.equity.cummax() - 1
    std = r.std()
    downside = r[r < 0].std()
    return {
        "CAGR": total ** (1 / years) - 1 if years > 0 and total > 0 else float("nan"),
        "Total": total - 1,
        "MaxDD": drawdown.min(),
        "Sharpe": r.mean() / std * np.sqrt(252) if std > 0 else float("nan"),
        "Sortino": r.mean() / downside * np.sqrt(252) if downside > 0 else float("nan"),
        "Exposure": res.position.mean(),
        "Trades": res.trades,
        "Years": years,
    }
