"""Paper trading on an Alpaca demo account (https://alpaca.markets, free, no real money).

Run once per trading day after the close: it computes each symbol's target exposure
from the latest completed daily bar and rebalances the demo account toward it.
"""
from __future__ import annotations

import csv
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

from . import data
from .strategies import STRATEGIES

PAPER_URL = "https://paper-api.alpaca.markets"
LOG_PATH = Path(__file__).resolve().parent.parent / "paper_log.csv"


class Alpaca:
    def __init__(self) -> None:
        key, secret = os.environ.get("ALPACA_API_KEY"), os.environ.get("ALPACA_SECRET_KEY")
        if not key or not secret:
            raise SystemExit("Set ALPACA_API_KEY and ALPACA_SECRET_KEY (paper-account keys).")
        self.s = requests.Session()
        self.s.headers.update({"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret})

    def _req(self, method: str, path: str, **kw):
        resp = self.s.request(method, PAPER_URL + path, timeout=30, **kw)
        if resp.status_code == 404 and path.startswith("/v2/positions/"):
            return None
        resp.raise_for_status()
        return resp.json()

    def clock(self) -> dict:
        return self._req("GET", "/v2/clock")

    def equity(self) -> float:
        return float(self._req("GET", "/v2/account")["equity"])

    def position_qty(self, symbol: str) -> int:
        pos = self._req("GET", f"/v2/positions/{symbol}")
        return int(float(pos["qty"])) if pos else 0

    def order(self, symbol: str, qty: int, side: str) -> dict:
        return self._req("POST", "/v2/orders", json={
            "symbol": symbol, "qty": str(qty), "side": side,
            "type": "market", "time_in_force": "day",
        })


def completed_bars(df: pd.DataFrame, market_open: bool) -> pd.DataFrame:
    """Drop today's still-forming bar while the market is open."""
    today = pd.Timestamp(datetime.now(timezone.utc).date())
    if market_open and len(df) and df.index[-1] >= today:
        return df.iloc[:-1]
    return df


def rebalance(symbols: list[str], strategy: str, submit: bool) -> None:
    api = Alpaca()
    market_open = api.clock()["is_open"]
    equity = api.equity()
    budget = equity / len(symbols)
    print(f"Paper equity: ${equity:,.2f}  |  market open: {market_open}  |  submit orders: {submit}")

    for sym in symbols:
        df = completed_bars(data.load(sym, refresh=True), market_open)
        target = float(STRATEGIES[strategy](df).iloc[-1])
        price = float(df["close"].iloc[-1])
        want = int(budget * target // price)
        have = api.position_qty(sym)
        diff = want - have
        print(f"{sym}: bar {df.index[-1].date()} close {price:.2f} target {target:.0%} "
              f"-> want {want} sh, have {have} sh, order {diff:+d}")
        status = "no-op"
        if diff and submit:
            order = api.order(sym, abs(diff), "buy" if diff > 0 else "sell")
            status = order.get("status", "sent")
        elif diff:
            status = "dry-run"
        _log(sym, strategy, df.index[-1].date(), price, target, have, want, status)


def _log(*row) -> None:
    new = not LOG_PATH.exists()
    with LOG_PATH.open("a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["run_at", "symbol", "strategy", "bar_date", "close",
                        "target", "had_shares", "want_shares", "status"])
        w.writerow([datetime.now(timezone.utc).isoformat(timespec="seconds"), *row])
