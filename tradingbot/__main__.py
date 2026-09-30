"""CLI: `python -m tradingbot backtest ...` or `python -m tradingbot paper ...`."""
from __future__ import annotations

import argparse

import pandas as pd

from . import backtest, data
from .strategies import STRATEGIES

DEFAULT_SYMBOLS = ["SPY", "QQQ", "IWM", "EFA", "TLT", "GLD"]


def _fmt(m: dict) -> str:
    return (f"{m['CAGR']:>7.1%} {m['MaxDD']:>8.1%} {m['Sharpe']:>6.2f} "
            f"{m['Sortino']:>7.2f} {m['Exposure']:>6.0%} {m['Trades']:>6d}")


def cmd_backtest(args: argparse.Namespace) -> None:
    names = args.strategies or list(STRATEGIES)
    header = f"{'':<16}{'CAGR':>7} {'MaxDD':>8} {'Sharpe':>6} {'Sortino':>7} {'Expo':>6} {'Trades':>6}"
    portfolio: dict[str, dict[str, list[pd.Series]]] = {n: {"is": [], "oos": []} for n in names}

    for sym in args.symbols:
        df = data.load(sym, refresh=args.refresh)
        df = df[df.index >= args.start]
        split = df.index[int(len(df) * (1 - args.oos))]
        print(f"\n=== {sym}: {df.index[0].date()} .. {df.index[-1].date()}  "
              f"(out-of-sample from {split.date()}, cost {args.cost} bps/side) ===")
        print(f"{'':<16}{'--- in-sample ---':^45} | {'--- out-of-sample ---':^45}")
        print(f"{'strategy':<16}{header[16:]} | {header[16:]}")
        for name in names:
            # Signals are computed on the full history so indicators are warmed up;
            # each window is then scored only on its own days.
            res = backtest.run(df, STRATEGIES[name](df), args.cost)
            parts = []
            for key, mask in (("is", res.returns.index < split), ("oos", res.returns.index >= split)):
                sub = backtest.Result(
                    equity=(1 + res.returns[mask]).cumprod(), returns=res.returns[mask],
                    position=res.position[mask],
                    trades=int(((res.position[mask] > 0) & (res.position[mask].shift(1).fillna(0) == 0)).sum()),
                )
                portfolio[name][key].append(res.returns[mask].rename(sym))
                parts.append(_fmt(backtest.metrics(sub)))
            print(f"{name:<16}{parts[0]} | {parts[1]}")

    print(f"\n=== Equal-weight portfolio of {', '.join(args.symbols)} (daily rebalanced) ===")
    print(f"{'strategy':<16}{header[16:]} | {header[16:]}")
    for name in names:
        parts = []
        for key in ("is", "oos"):
            r = pd.concat(portfolio[name][key], axis=1).dropna().mean(axis=1)
            sub = backtest.Result(equity=(1 + r).cumprod(), returns=r, position=pd.Series(0.0, index=r.index), trades=0)
            m = backtest.metrics(sub)
            parts.append(f"{m['CAGR']:>7.1%} {m['MaxDD']:>8.1%} {m['Sharpe']:>6.2f} {m['Sortino']:>7.2f} {'':>6} {'':>6}")
        print(f"{name:<16}{parts[0]} | {parts[1]}")


def cmd_paper(args: argparse.Namespace) -> None:
    from . import paper
    paper.rebalance(args.symbols, args.strategy, args.submit)


def main() -> None:
    p = argparse.ArgumentParser(prog="tradingbot")
    sub = p.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("backtest", help="test strategies on historical data")
    b.add_argument("--symbols", nargs="+", default=DEFAULT_SYMBOLS)
    b.add_argument("--strategies", nargs="+", choices=list(STRATEGIES))
    b.add_argument("--start", default="2000-01-01")
    b.add_argument("--oos", type=float, default=0.3, help="fraction of history kept out-of-sample")
    b.add_argument("--cost", type=float, default=5.0, help="commission+slippage, bps per side")
    b.add_argument("--refresh", action="store_true", help="re-download data")
    b.set_defaults(func=cmd_backtest)

    t = sub.add_parser("paper", help="rebalance the Alpaca paper (demo) account")
    t.add_argument("--symbols", nargs="+", default=DEFAULT_SYMBOLS)
    t.add_argument("--strategy", default="combo", choices=list(STRATEGIES))
    t.add_argument("--submit", action="store_true", help="actually send orders (default: dry run)")
    t.set_defaults(func=cmd_paper)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
