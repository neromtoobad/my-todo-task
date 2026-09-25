"""Backtest the Dixon-Coles model against bookmaker odds.

Example:
    python run_backtest.py --leagues E0 E1 --first-season 2018 --last-season 2025

See README.md for how to read the output.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from betting_model.backtest import BacktestConfig, walk_forward
from betting_model.data import LEAGUE_NAMES, load_matches
from betting_model.evaluate import MARKETS, accuracy, accuracy_by, edge_sweep, simulate_bets, summarize_by

HERE = Path(__file__).parent
EDGE_THRESHOLDS = [0.0, 0.02, 0.05, 0.10, 0.15]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--leagues", nargs="+", default=["E0", "E1"], help="leagues to bet on (default: E0 E1)")
    p.add_argument(
        "--extra-leagues",
        nargs="*",
        default=["E2"],
        help="leagues used only to rate promoted/relegated teams (default: E2)",
    )
    p.add_argument("--first-season", type=int, default=2018, help="first season to test, by start year")
    p.add_argument("--last-season", type=int, default=2025, help="last season to test, by start year")
    p.add_argument("--bet-odds", default="b365", choices=["b365", "ps", "avg", "max"],
                   help="bookmaker whose pre-match odds we bet at (default: b365)")
    p.add_argument("--min-edge", type=float, default=0.05, help="only bet when expected value >= this (default 0.05)")
    p.add_argument("--refit-days", type=int, default=7, help="refit the model every N days (default 7)")
    p.add_argument("--xi", type=float, default=0.0019, help="time decay per day (default 0.0019)")
    p.add_argument("--data-dir", type=Path, default=HERE / "data" / "raw")
    p.add_argument("--output-dir", type=Path, default=HERE / "output")
    p.add_argument("--refresh", action="store_true", help="re-download cached CSVs")
    return p.parse_args()


SIGNED_PERCENT = {"roi", "roi_low", "roi_high", "avg_clv"}
PERCENT = {"hit_rate", "beat_close"}


def fmt(df: pd.DataFrame) -> str:
    if df.index.dtype.kind == "i":  # season start years -> "2018/19"
        df = df.set_axis([f"{y}/{(y + 1) % 100:02d}" for y in df.index])
    formatters = {}
    for c in df.columns:
        if c in SIGNED_PERCENT:
            formatters[c] = "{:+.1%}".format
        elif c in PERCENT:
            formatters[c] = "{:.1%}".format
        elif c in {"bets", "matches"}:
            formatters[c] = "{:.0f}".format
        elif c == "profit":
            formatters[c] = "{:+.1f}".format
        elif df[c].dtype.kind == "f":
            formatters[c] = "{:.4f}".format
    return df.to_string(formatters=formatters, na_rep="-")


def main() -> None:
    args = parse_args()
    config = BacktestConfig(
        bet_leagues=args.leagues,
        first_season=args.first_season,
        last_season=args.last_season,
        refit_days=args.refit_days,
        xi=args.xi,
    )
    # Load enough earlier seasons to fill the first fitting window.
    warmup = int(np.ceil(config.window_days / 365))
    leagues = list(dict.fromkeys(args.leagues + args.extra_leagues))
    print(f"Loading {', '.join(leagues)} from {args.first_season - warmup}/{args.first_season - warmup + 1}...")
    matches = load_matches(leagues, args.first_season - warmup, args.last_season, args.data_dir, args.refresh)
    print(f"  {len(matches)} matches loaded")

    print("Running walk-forward backtest (each match predicted using only earlier results)...")
    preds = walk_forward(matches, config)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    preds.to_csv(args.output_dir / "predictions.csv", index=False)

    pre_test = matches[matches["league"].isin(args.leagues) & (matches["season"] < args.first_season)]
    names = ", ".join(f"{lg} ({LEAGUE_NAMES.get(lg, lg)})" for lg in args.leagues)
    print(f"\n{'=' * 78}\nBACKTEST: {names}, "
          f"{args.first_season}/{args.first_season + 1} to {args.last_season}/{args.last_season + 1}")
    print(f"Betting at {args.bet_odds} pre-match odds when the model sees an edge of {args.min_edge:.0%}+\n{'=' * 78}")

    all_bets = []
    for market in MARKETS.values():
        base_rates = None
        if len(pre_test):
            base_rates = np.bincount(market.result_index(pre_test), minlength=len(market.outcomes)) / len(pre_test)
        overall = accuracy(preds, market, base_rates)
        print(f"\n## {market.name.upper()} ({' / '.join(market.labels)})")
        print(f"\nAccuracy on {overall['matches']} matches (lower is better):")
        print(f"  log loss   model {overall['model_log_loss']:.4f}   market {overall['market_log_loss']:.4f}"
              f"   no-skill baseline {overall.get('naive_log_loss', np.nan):.4f}")
        print(f"  Brier      model {overall['model_brier']:.4f}   market {overall['market_brier']:.4f}")

        print("\nBy season:")
        print(fmt(accuracy_by(preds, market, "season")))

        bets = simulate_bets(preds, market, args.bet_odds, args.min_edge)
        all_bets.append(bets)
        print("\nBetting results by edge threshold (flat 1-unit stakes):")
        print(fmt(edge_sweep(preds, market, args.bet_odds, EDGE_THRESHOLDS)))
        if len(bets):
            print(f"\nBy season at {args.min_edge:.0%} edge:")
            print(fmt(summarize_by(bets, "season")))
            print(f"\nBy league at {args.min_edge:.0%} edge:")
            print(fmt(summarize_by(bets, "league")))

        print("\nVerdict:")
        for line in verdict(overall, bets):
            print(f"  - {line}")

    pd.concat(all_bets).to_csv(args.output_dir / "bets.csv", index=False)
    print(f"\nSaved {args.output_dir / 'predictions.csv'} and {args.output_dir / 'bets.csv'}")


def verdict(overall: dict, bets: pd.DataFrame) -> list[str]:
    if overall["matches"] == 0:
        return ["No matches had both a model prediction and market odds to compare."]
    lines = []
    gap = overall["model_log_loss"] - overall["market_log_loss"]
    if gap > 0:
        lines.append(f"The closing market is more accurate than the model (log loss {gap:+.4f} worse).")
    else:
        lines.append(f"The model is more accurate than the closing market (log loss {gap:+.4f}). "
                     "That is rare; double-check before trusting it.")
    if len(bets) == 0:
        lines.append("No bets met the edge threshold.")
        return lines
    roi = bets["profit"].mean()
    clv = bets["clv"].mean()
    lines.append(f"{len(bets)} bets, ROI {roi:+.1%}, average closing line value {clv:+.1%}.")
    if clv > 0:
        lines.append("Bets beat the closing line on average: a sign of a genuine edge worth paper-trading.")
    else:
        lines.append("Bets were worse than the closing line on average, so any profit is most likely luck. "
                     "Do not bet real money on this version.")
    return lines


if __name__ == "__main__":
    main()
