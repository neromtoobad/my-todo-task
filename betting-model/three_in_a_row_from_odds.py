"""Price "3 goals in a row - NO" for any match, using the bookmaker's own odds.

Works for any league or national team, with no results history needed.
Put each match on one line of a CSV:

    match,home,draw,away,over,under,no
    Scotland v Greece,2.60,3.10,2.90,2.30,1.60,1.20

home/draw/away are the 1X2 odds, over/under are Over/Under 2.5 goals, and
no is SportyBet's "3 goals in a row - NO" price (leave it blank if you do
not have it). Then:

    python three_in_a_row_from_odds.py todays_odds.csv
    python three_in_a_row_from_odds.py --cheat-sheet     # quick lookup table
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from betting_model.implied import streak_from_odds

MIN_EDGE = 0.05


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("odds_csv", nargs="?", type=Path, help="CSV of matches and odds (see above)")
    p.add_argument("--min-edge", type=float, default=MIN_EDGE, help="edge required to call a price value (default 0.05)")
    p.add_argument("--cheat-sheet", action="store_true", help="print P(NO) for typical odds and exit")
    return p.parse_args()


def rate(df: pd.DataFrame, min_edge: float) -> pd.DataFrame:
    rows = []
    for m in df.itertuples():
        over = getattr(m, "over", np.nan)
        under = getattr(m, "under", np.nan)
        has_ou = pd.notna(over) and pd.notna(under)
        xg_h, xg_a, p_yes = streak_from_odds(m.home, m.draw, m.away, over if has_ou else None, under if has_ou else None)
        p_no = 1 - p_yes
        price = getattr(m, "no", np.nan)
        edge = p_no * price - 1 if pd.notna(price) else np.nan
        rows.append({
            "match": m.match,
            "xG": f"{xg_h:.1f}-{xg_a:.1f}",
            "P(NO)": p_no,
            "fair NO": 1 / p_no,
            "take NO at": (1 + min_edge) / p_no,
            "SportyBet NO": price,
            "edge": edge,
            "verdict": ("VALUE" if edge >= min_edge else "no value") if pd.notna(edge) else "check price",
            "note": "" if has_ou else "no over/under odds: less reliable",
        })
    return pd.DataFrame(rows).sort_values("P(NO)", ascending=False)


def cheat_sheet() -> None:
    """P(NO) for a grid of favourite prices and Over 2.5 prices."""
    favourite_odds = [1.20, 1.40, 1.70, 2.00, 2.50]
    over_odds = [1.50, 1.70, 1.90, 2.20, 2.60]
    rows = {}
    for fav in favourite_odds:
        # Split the rest of the market between draw and outsider in a typical proportion.
        p_fav = 0.95 / fav
        p_draw = min(0.30, (1 - p_fav) * 0.55)
        p_out = 1 - p_fav - p_draw
        home, draw, away = fav, 0.95 / p_draw, 0.95 / p_out
        row = {}
        for over in over_odds:
            p_over = 0.95 / over
            under = 0.95 / (1 - p_over)
            row[f"Over 2.5 @ {over:.2f}"] = f"{1 - streak_from_odds(home, draw, away, over, under)[2]:.0%}"
        rows[f"favourite @ {fav:.2f}"] = row
    print("Chance of NO (no team scores 3 in a row), from the 1X2 favourite's odds and the Over 2.5 odds:\n")
    print(pd.DataFrame.from_dict(rows, orient="index").to_string())
    print("\nSafest NO: no strong favourite and a high Over 2.5 price (few goals expected).")


def main() -> None:
    args = parse_args()
    if args.cheat_sheet:
        cheat_sheet()
        return
    if args.odds_csv is None:
        raise SystemExit("Give a CSV of odds, or use --cheat-sheet. See --help.")

    df = pd.read_csv(args.odds_csv)
    rated = rate(df, args.min_edge)
    formatted = rated.assign(**{
        "P(NO)": rated["P(NO)"].map("{:.0%}".format),
        "fair NO": rated["fair NO"].map("{:.2f}".format),
        "take NO at": rated["take NO at"].map("{:.2f}".format),
        "SportyBet NO": rated["SportyBet NO"].map(lambda v: f"{v:.2f}" if pd.notna(v) else "-"),
        "edge": rated["edge"].map(lambda v: f"{v:+.1%}" if pd.notna(v) else "-"),
    })
    print(formatted.to_string(index=False))


if __name__ == "__main__":
    main()
