"""How predictable is "any team to score 3 goals in a row"?

Uses the goal sequences from research/statsbomb_goal_order.py (run that
first) and answers three questions:

1. How often does it happen, and what are the fair odds at that rate?
2. Given the final score, are all goal orders equally likely? The model
   relies on this; momentum ("one goal leads to another") would break it.
3. Can the Dixon-Coles model tell before kick-off which matches are more
   likely to produce a streak? Walk-forward within each season: every match
   is predicted using only earlier results, and compared with a no-skill
   forecast that uses the same rate for every match.
4. The same question with the exact setup the daily list uses: ratings from
   three seasons of openfootball results, predictions from matchday 1. Also
   tests whether shrinking the model's probabilities towards the average
   (it is overconfident) helps on leagues the correction was not fitted on.

Run from the betting-model folder (needs internet for openfootball):

    python -m research.three_in_a_row_study
"""

from __future__ import annotations

import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from betting_model import openfootball
from betting_model.backtest import BacktestConfig
from betting_model.backtest import walk_forward as backtest_walk_forward
from betting_model.model import DixonColes
from betting_model.streaks import longest_run, streak_given_score

DATA = Path(__file__).parent.parent / "data" / "goal_sequences.csv"
OPENFOOTBALL_DIR = Path(__file__).parent.parent / "data" / "openfootball"
MIN_GAMES = 8  # start predicting once every team has played this many games
LEAGUE_CODES = {
    "Premier League 2015/16": "en.1",
    "La Liga 2015/16": "es.1",
    "Serie A 2015/16": "it.1",
    "Ligue 1 2015/16": "fr.1",
}


def load() -> pd.DataFrame:
    df = pd.read_csv(DATA, keep_default_na=False, parse_dates=["date"])
    df["streak"] = df["sequence"].map(lambda s: longest_run(s) >= 3)
    df["home_streak"] = df["sequence"].map(lambda s: longest_run(s, "home") >= 3)
    df["away_streak"] = df["sequence"].map(lambda s: longest_run(s, "away") >= 3)
    df["p_given_score"] = [streak_given_score(h, a) for h, a in zip(df["hg"], df["ag"])]
    return df


def section(title: str) -> None:
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")


def base_rates(df: pd.DataFrame) -> None:
    section("1. How often does a team score 3 goals in a row?")
    table = df.groupby("competition")[["streak", "home_streak", "away_streak"]].mean()
    table.loc["ALL"] = df[["streak", "home_streak", "away_streak"]].mean()
    table["matches"] = df.groupby("competition").size().reindex(table.index).fillna(len(df)).astype(int)
    table["fair odds YES"] = 1 / table["streak"]
    table["fair odds NO"] = 1 / (1 - table["streak"])
    print(table.to_string(formatters={
        "streak": "{:.1%}".format, "home_streak": "{:.1%}".format, "away_streak": "{:.1%}".format,
        "fair odds YES": "{:.2f}".format, "fair odds NO": "{:.2f}".format,
    }))
    print("\n(streak = either team; home/away_streak = that team specifically)")


def goal_order_check(df: pd.DataFrame) -> None:
    section("2. Given the final score, is every goal order equally likely?")
    undecided = df[(df["p_given_score"] > 0) & (df["p_given_score"] < 1)].copy()
    undecided["score"] = undecided["hg"].astype(str) + "-" + undecided["ag"].astype(str)
    by_score = undecided.groupby("score").agg(
        matches=("streak", "size"), expected=("p_given_score", "mean"), actual=("streak", "mean")
    ).sort_values("matches", ascending=False)
    print("Scores where the order decides the bet (e.g. 3-1 can be HHHA or HAHH):\n")
    print(by_score.head(12).to_string(formatters={"expected": "{:.1%}".format, "actual": "{:.1%}".format}))

    expected = undecided["p_given_score"].sum()
    actual = undecided["streak"].sum()
    sd = np.sqrt((undecided["p_given_score"] * (1 - undecided["p_given_score"])).sum())
    print(f"\nAll {len(undecided)} such matches: {actual} streaks, {expected:.1f} expected "
          f"if orders were random (z = {(actual - expected) / sd:+.2f}).")
    decided = len(df) - len(undecided)
    print(f"The other {decided} matches were settled by the score alone "
          f"(e.g. 2-1 is always NO, 3-0 always YES).")
    print("|z| below 2 means real goal orders are consistent with the model's assumption.")


def walk_forward(df: pd.DataFrame) -> pd.DataFrame:
    """Predict each match from earlier matches in the same season (refit weekly)."""
    matches = df.rename(columns={"competition": "league"})
    model, last_fit, rows = None, None, []
    for date, day in matches.groupby("date", sort=True):
        train = matches[matches["date"] < date]
        if train.empty:
            continue
        if model is None or (date - last_fit).days >= 7:
            model = DixonColes(xi=0.0).fit(train, as_of=date, init=model)
            last_fit = date
        games = model.games_played
        ready = day[(day["home"].map(games).fillna(0) >= MIN_GAMES) & (day["away"].map(games).fillna(0) >= MIN_GAMES)]
        if ready.empty:
            continue
        preds = model.predict(ready)
        preds["p_base"] = base_rate_before(df, date)
        rows.append(ready.join(preds))
    return pd.concat(rows)


def base_rate_before(df: pd.DataFrame, date: pd.Timestamp) -> float:
    """No-skill forecast: streak rate in earlier matches, starting from 20% until data builds up."""
    earlier = df.loc[df["date"] < date, "streak"]
    return (earlier.sum() + 0.20 * 50) / (len(earlier) + 50)


def log_loss(p: np.ndarray, y: np.ndarray) -> float:
    return float(-np.mean(np.where(y, np.log(p), np.log(1 - p))))


def logit(p: np.ndarray) -> np.ndarray:
    return np.log(p / (1 - p))


def fit_calibration(p: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Fit P(streak) = sigmoid(a + b * logit(p)). b < 1 means the model is overconfident."""
    x = logit(p)

    def loss(params):
        q = 1 / (1 + np.exp(-(params[0] + params[1] * x)))
        return log_loss(np.clip(q, 1e-9, 1 - 1e-9), y)

    a, b = minimize(loss, x0=[0.0, 1.0], method="Nelder-Mead").x
    return float(a), float(b)


def apply_calibration(p: np.ndarray, a: float, b: float) -> np.ndarray:
    return 1 / (1 + np.exp(-(a + b * logit(p))))


def report(preds: pd.DataFrame) -> None:
    y = preds["streak"].to_numpy()
    p = preds["p_3row"].to_numpy()
    base = preds["p_base"].to_numpy()

    print(f"{len(preds)} matches predicted (a match is skipped until both teams have {MIN_GAMES}+ games of history).\n")
    print(f"  average predicted {p.mean():.1%}   actual {y.mean():.1%}")
    print(f"  log loss   model {log_loss(p, y):.4f}   same-rate-for-every-match {log_loss(base, y):.4f}  (lower is better)")
    print(f"  Brier      model {np.mean((p - y) ** 2):.4f}   same-rate-for-every-match {np.mean((base - y) ** 2):.4f}")

    print("\nPredicted probabilities ranged from "
          f"{np.percentile(p, 5):.0%} (5th percentile) to {np.percentile(p, 95):.0%} (95th).\n")
    bins = [0, 0.15, 0.20, 0.25, 0.30, 0.35, 1]
    labels = ["<15%", "15-20%", "20-25%", "25-30%", "30-35%", "35%+"]
    preds["bucket"] = pd.cut(preds["p_3row"], bins, labels=labels)
    calib = preds.groupby("bucket", observed=True).agg(
        matches=("streak", "size"), predicted=("p_3row", "mean"), actual=("streak", "mean")
    )
    calib["fair odds YES"] = 1 / calib["predicted"]
    print("Calibration (does 30% predicted mean ~30% actual?):\n")
    print(calib.to_string(formatters={
        "predicted": "{:.1%}".format, "actual": "{:.1%}".format, "fair odds YES": "{:.2f}".format,
    }))

    top = preds.nlargest(len(preds) // 5, "p_3row")
    bottom = preds.nsmallest(len(preds) // 5, "p_3row")
    print(f"\nMatches the model rated likeliest (top 20%): {top['streak'].mean():.1%} had a streak "
          f"(predicted {top['p_3row'].mean():.1%}).")
    print(f"Matches it rated least likely (bottom 20%): {bottom['streak'].mean():.1%} had a streak "
          f"(predicted {bottom['p_3row'].mean():.1%}).")


def model_check(df: pd.DataFrame) -> None:
    section("3. Can the model pick out the likelier matches before kick-off? (one season of data)")
    report(walk_forward(df))


def _name_key(name: str) -> str:
    return unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()


def link_to_openfootball(seqs: pd.DataFrame, preds: pd.DataFrame) -> pd.DataFrame:
    """Attach openfootball predictions to StatsBomb matches (same league, score, date +-1 day, closest names)."""
    seqs = seqs.assign(league=seqs["competition"].map(LEAGUE_CODES))
    pairs = seqs.merge(preds, on=["league", "hg", "ag"], suffixes=("", "_of"))
    pairs = pairs[(pairs["date"] - pairs["date_of"]).abs() <= pd.Timedelta(days=1)].copy()
    pairs["similarity"] = [
        SequenceMatcher(None, _name_key(h + " " + a), _name_key(ho + " " + ao)).ratio()
        for h, a, ho, ao in zip(pairs["home"], pairs["away"], pairs["home_of"], pairs["away_of"])
    ]
    pairs = pairs[pairs["similarity"] >= 0.5].sort_values("similarity", ascending=False)
    pairs = pairs.drop_duplicates("match_id").drop_duplicates(["league", "date_of", "home_of"])
    return pairs


def daily_setup_check(df: pd.DataFrame) -> None:
    section("4. Same setup as the daily list (3 seasons of ratings, from matchday 1)")
    leagues = ["en.1", "en.2", "es.1", "it.1", "fr.1"]
    results, _ = openfootball.load(leagues, 2012, 2015, OPENFOOTBALL_DIR)
    config = BacktestConfig(
        bet_leagues=list(LEAGUE_CODES.values()), first_season=2015, last_season=2015, min_games=MIN_GAMES
    )
    preds = backtest_walk_forward(results, config, verbose=False).dropna(subset=["p_3row"])
    linked = link_to_openfootball(df, preds)
    linked["p_base"] = linked["date"].map({d: base_rate_before(df, d) for d in linked["date"].unique()})
    print(f"Linked {len(linked)} of {len(df)} StatsBomb matches to openfootball predictions.")
    report(linked)

    print("\nDoes shrinking the probabilities towards the average help on unseen leagues?")
    print("(fit the correction on three leagues, test it on the fourth)\n")
    rows = []
    for league in LEAGUE_CODES.values():
        train, test = linked[linked["league"] != league], linked[linked["league"] == league]
        a, b = fit_calibration(train["p_3row"].to_numpy(), train["streak"].to_numpy())
        y = test["streak"].to_numpy()
        raw = test["p_3row"].to_numpy()
        cal = apply_calibration(raw, a, b)
        rows.append({"held-out league": league, "matches": len(test), "slope b": b,
                     "log loss raw": log_loss(raw, y), "log loss corrected": log_loss(cal, y)})
    print(pd.DataFrame(rows).to_string(index=False, float_format="{:.4f}".format))
    a, b = fit_calibration(linked["p_3row"].to_numpy(), linked["streak"].to_numpy())
    print(f"\nCorrection fitted on all four leagues: a = {a:+.3f}, b = {b:.3f}")
    print("Example: raw 10% -> {:.0%}, raw 22% -> {:.0%}, raw 40% -> {:.0%}".format(
        *apply_calibration(np.array([0.10, 0.22, 0.40]), a, b)))


def main() -> None:
    df = load()
    print(f"{len(df)} matches with full goal sequences (data: StatsBomb open data).")
    base_rates(df)
    goal_order_check(df)
    model_check(df)
    daily_setup_check(df)


if __name__ == "__main__":
    main()
