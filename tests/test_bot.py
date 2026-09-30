import numpy as np
import pandas as pd
import pytest

from tradingbot import backtest
from tradingbot.strategies import STRATEGIES


def make_prices(n=600, seed=0):
    rng = np.random.default_rng(seed)
    close = 100 * np.exp(np.cumsum(rng.normal(0.0003, 0.01, n)))
    open_ = close * np.exp(rng.normal(0, 0.003, n))
    idx = pd.bdate_range("2015-01-01", periods=n)
    return pd.DataFrame({"open": open_, "high": np.maximum(open_, close) * 1.002,
                         "low": np.minimum(open_, close) * 0.998, "close": close,
                         "volume": 1_000_000}, index=idx)


@pytest.mark.parametrize("name", list(STRATEGIES))
def test_no_lookahead(name):
    """Changing future prices must not change any past signal."""
    df = make_prices()
    cut = 450
    altered = df.copy()
    altered.iloc[cut:, :4] *= 1.5
    a = STRATEGIES[name](df).iloc[:cut]
    b = STRATEGIES[name](altered).iloc[:cut]
    pd.testing.assert_series_equal(a, b)


@pytest.mark.parametrize("name", list(STRATEGIES))
def test_exposure_bounds(name):
    s = STRATEGIES[name](make_prices())
    assert s.between(0, 1).all()


def test_buy_hold_matches_price_from_first_open():
    df = make_prices()
    res = backtest.run(df, STRATEGIES["buy_hold"](df), cost_bps=0)
    expected = df["close"].iloc[-1] / df["open"].iloc[1]
    assert res.equity.iloc[-1] == pytest.approx(expected)


def test_signal_executes_next_open():
    df = make_prices(10)
    target = pd.Series(0.0, index=df.index)
    target.iloc[3] = 1.0  # decided at close of day 3
    res = backtest.run(df, target, cost_bps=0)
    assert res.position.iloc[3] == 0 and res.position.iloc[4] == 1
    assert res.returns.iloc[4] == pytest.approx(df["close"].iloc[4] / df["open"].iloc[4] - 1)
    # Exit at day 5 open: day 5 earns only the overnight gap.
    assert res.returns.iloc[5] == pytest.approx(df["open"].iloc[5] / df["close"].iloc[4] - 1)


def test_costs_reduce_returns():
    df = make_prices()
    target = STRATEGIES["rsi2"](df)
    free = backtest.run(df, target, cost_bps=0).equity.iloc[-1]
    costly = backtest.run(df, target, cost_bps=20).equity.iloc[-1]
    assert costly < free
