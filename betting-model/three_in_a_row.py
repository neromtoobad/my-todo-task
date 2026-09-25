"""Daily list for SportyBet's "any team to score 3 goals in a row" market.

For each upcoming match it prints the model's chance of the side you bet
(NO by default: no team scores 3 in a row), the fair odds, and the lowest
odds worth taking. Look the match up on SportyBet: only a price at or above
the "take at" number is worth betting. A slip builder then stacks the
safest legs and shows the true chance the whole slip wins.
These are model probabilities, not tips.

    python three_in_a_row.py                          # today's matches
    python three_in_a_row.py --date 2026-10-10 --days 3
    python three_in_a_row.py --side yes
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from betting_model import openfootball
from betting_model.model import DixonColes

HERE = Path(__file__).parent
# Every league openfootball has current fixtures for.
DEFAULT_LEAGUES = ["en.1", "en.2", "es.1", "de.1", "it.1", "fr.1", "nl.1", "pt.1", "br.1"]
# Lower divisions, used only to rate newly promoted teams.
DEFAULT_EXTRA_LEAGUES = ["en.3", "es.2", "de.2", "it.2", "fr.2", "br.2"]
SLIP_MARKS = (3, 5, 10)
WINDOW = pd.Timedelta(days=3 * 365)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--date", default=None, help="first day to list, YYYY-MM-DD (default: today)")
    p.add_argument("--days", type=int, default=1, help="number of days to list (default 1)")
    p.add_argument("--leagues", nargs="+", default=DEFAULT_LEAGUES,
                   help=f"openfootball league codes (default: {' '.join(DEFAULT_LEAGUES)})")
    p.add_argument("--extra-leagues", nargs="*", default=DEFAULT_EXTRA_LEAGUES,
                   help="leagues used only to rate promoted teams (default: second divisions)")
    p.add_argument("--side", choices=["no", "yes"], default="no",
                   help="NO = no team scores 3 in a row (default); YES = a team does")
    p.add_argument("--slip-max", type=float, default=10.0,
                   help="build the slip up to this total fair odds (default 10)")
    p.add_argument("--min-edge", type=float, default=0.05,
                   help="edge required before a price is worth taking (default 0.05 = 5%%)")
    p.add_argument("--min-games", type=int, default=8,
                   help="skip matches where a team has fewer recent games than this (default 8)")
    p.add_argument("--data-dir", type=Path, default=HERE / "data" / "openfootball")
    p.add_argument("--output-dir", type=Path, default=HERE / "output")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    start = pd.Timestamp(args.date).normalize() if args.date else pd.Timestamp.today().normalize()
    end = start + pd.Timedelta(days=args.days)
    season = openfootball.season_of(start)

    leagues = list(dict.fromkeys(args.leagues + args.extra_leagues))
    results, fixtures = openfootball.load(leagues, season - 3, season, args.data_dir)
    train = results[(results["date"] < start) & (results["date"] >= start - WINDOW)]
    fixtures = fixtures[fixtures["league"].isin(args.leagues)]

    overdue = fixtures[(fixtures["date"] < start) & (fixtures["season"] == season)]
    if len(overdue):
        print(f"note: {len(overdue)} earlier matches have no result in openfootball yet "
              f"(postponed, or not updated); ratings leave them out.")

    upcoming = fixtures[(fixtures["date"] >= start) & (fixtures["date"] < end)]
    if upcoming.empty:
        later = fixtures[fixtures["date"] >= start]
        when = later["date"].min().date() if len(later) else "none listed"
        print(f"No matches in {', '.join(args.leagues)} from {start.date()} to {(end - pd.Timedelta(days=1)).date()}. "
              f"Next fixture: {when}.")
        return

    model = DixonColes().fit(train, as_of=start)
    preds = upcoming.join(model.predict(upcoming))
    games = model.games_played
    enough = (preds["home"].map(games).fillna(0) >= args.min_games) & (
        preds["away"].map(games).fillna(0) >= args.min_games
    )
    preds.loc[~enough, "p_3row"] = np.nan

    p = preds["p_3row"]
    preds["fair_yes"] = 1 / p
    preds["fair_no"] = 1 / (1 - p)
    preds["take_yes_at"] = (1 + args.min_edge) / p
    preds["take_no_at"] = (1 + args.min_edge) / (1 - p)
    side = args.side.upper()
    preds["p_side"] = 1 - p if args.side == "no" else p
    preds["fair_side"] = preds[f"fair_{args.side}"]
    preds["take_side_at"] = preds[f"take_{args.side}_at"]
    rated = preds.dropna(subset=["p_side"]).sort_values("p_side", ascending=False)

    days = f"{start.date()}" + (f" to {(end - pd.Timedelta(days=1)).date()}" if args.days > 1 else "")
    print(f"\n3 GOALS IN A ROW - {side}: {days}  ({len(rated)} matches, most likely {side} first)")
    print(f"Only bet a match if SportyBet's {side} price is at least its 'take at' number ({args.min_edge:.0%} edge).\n")
    table = pd.DataFrame(
        {
            "date": rated["date"].dt.strftime("%a %d %b"),
            "time": rated["time"],
            "league": rated["league"].map(openfootball.LEAGUES).fillna(rated["league"]),
            "match": rated["home"] + " v " + rated["away"],
            "xG": rated["xg_home"].map("{:.1f}".format) + "-" + rated["xg_away"].map("{:.1f}".format),
            f"P({side})": rated["p_side"].map("{:.0%}".format),
            f"fair {side}": rated["fair_side"].map("{:.2f}".format),
            "take at": rated["take_side_at"].map("{:.2f}".format),
        }
    )
    print(table.to_string(index=False))

    unrated = preds[preds["p_side"].isna()]
    if len(unrated):
        print(f"\nNot rated (a team has under {args.min_games} recent games): "
              + "; ".join(unrated["home"] + " v " + unrated["away"]))

    print_slip(rated, side, args.slip_max)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    out = args.output_dir / f"three_in_a_row_{start.date()}.csv"
    columns = ["date", "time", "league", "home", "away", "xg_home", "xg_away", "p_3row",
               "fair_no", "take_no_at", "fair_yes", "take_yes_at"]
    preds[columns].to_csv(out, index=False, float_format="%.4f")
    print(f"\nSaved {out}")


def print_slip(rated: pd.DataFrame, side: str, slip_max: float) -> None:
    """Stack the most likely legs and show the total odds and the chance every leg wins."""
    if rated.empty:
        return
    print(f"\nSLIP BUILDER ({side}, most likely legs first, fair odds)")
    rows, total, marks = [], 1.0, list(SLIP_MARKS)
    for leg, m in enumerate(rated.itertuples(), 1):
        total *= m.fair_side
        mark = ""
        while marks and total >= marks[0]:
            mark = f"<- {marks.pop(0)} odds"
        rows.append((leg, f"{m.home} v {m.away}", f"{m.p_side:.0%}", f"{total:.2f}", f"{1 / total:.0%}", mark))
        if total >= slip_max:
            break
    print(pd.DataFrame(rows, columns=["legs", "leg added", f"P({side})", "total odds", "all legs win", ""])
          .to_string(index=False))
    print("A slip at total odds X wins about 1 time in X, even when every leg is fairly priced.")
    print("SportyBet's margin on each leg lowers the real payout, so include a leg only if its")
    print("SportyBet price is at least its 'take at' number above. Singles avoid this compounding.")


if __name__ == "__main__":
    main()
