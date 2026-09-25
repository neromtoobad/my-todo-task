"""Fake leagues generated from a known Dixon-Coles model.

Bookmaker odds are set from the *true* probabilities plus a margin, so the
market is perfectly efficient: no model can beat it, and a backtest that
appears to beat it has a bug (usually leaking future results).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from betting_model.data import ODDS_COLUMNS
from betting_model.model import score_grid

TRUE_RHO = -0.1
TRUE_HOME_ADV = 0.25
TRUE_INTERCEPT = np.log(1.3)


def make_league(
    league: str = "E0",
    n_teams: int = 20,
    seasons: tuple[int, ...] = (2015, 2016, 2017, 2018),
    margin: float = 0.05,
    seed: int = 0,
) -> tuple[pd.DataFrame, dict[str, tuple[float, float]]]:
    """Double round-robin seasons with one round per week.

    Returns the matches (in our standard columns) and the true
    (attack, defence) of each team.
    """
    rng = np.random.default_rng(seed)
    teams = [f"{league} Team {i:02d}" for i in range(n_teams)]
    attack = rng.normal(0, 0.3, n_teams)
    defence = rng.normal(0, 0.3, n_teams)

    rows = []
    for season in seasons:
        start = pd.Timestamp(f"{season}-08-10")
        for rnd, pairs in enumerate(_round_robin(n_teams)):
            date = start + pd.Timedelta(weeks=rnd)
            for h, a in pairs:
                rows.append((date, season, league, h, a))
    df = pd.DataFrame(rows, columns=["date", "season", "league", "h", "a"])

    h, a = df["h"].to_numpy(), df["a"].to_numpy()
    home_xg = np.exp(TRUE_INTERCEPT + TRUE_HOME_ADV + attack[h] - defence[a])
    away_xg = np.exp(TRUE_INTERCEPT + attack[a] - defence[h])
    grid = score_grid(home_xg, away_xg, TRUE_RHO, max_goals=10)
    size = grid.shape[1]
    flat = grid.reshape(len(df), -1)
    picks = np.array([rng.choice(flat.shape[1], p=p) for p in flat])
    df["hg"], df["ag"] = picks // size, picks % size
    df["home"] = [teams[i] for i in h]
    df["away"] = [teams[i] for i in a]

    goals = np.arange(size)
    hh, aa = np.meshgrid(goals, goals, indexing="ij")
    true = {
        "h": grid[:, hh > aa].sum(axis=1),
        "d": grid[:, hh == aa].sum(axis=1),
        "a": grid[:, hh < aa].sum(axis=1),
        "o": grid[:, hh + aa > 2.5].sum(axis=1),
    }
    true["u"] = 1 - true["o"]
    for name in ODDS_COLUMNS:
        outcome = name.split("_")[1]
        df[name] = 1.0 / (true[outcome] * (1 + margin))

    df = df.drop(columns=["h", "a"])
    truth = {t: (attack[i], defence[i]) for i, t in enumerate(teams)}
    return df, truth


def _round_robin(n: int) -> list[list[tuple[int, int]]]:
    """Circle-method schedule: every pair meets once home and once away."""
    order = list(range(n))
    rounds = []
    for _ in range(n - 1):
        rounds.append([(order[i], order[n - 1 - i]) for i in range(n // 2)])
        order = [order[0]] + [order[-1]] + order[1:-1]
    return rounds + [[(a, h) for h, a in rnd] for rnd in rounds]


def to_football_data_csv(df: pd.DataFrame) -> pd.DataFrame:
    """Convert our standard columns back to football-data.co.uk's raw format."""
    raw = pd.DataFrame(
        {
            "Div": df["league"],
            "Date": df["date"].dt.strftime("%d/%m/%Y"),
            "HomeTeam": df["home"],
            "AwayTeam": df["away"],
            "FTHG": df["hg"],
            "FTAG": df["ag"],
            "FTR": np.select([df["hg"] > df["ag"], df["hg"] == df["ag"]], ["H", "D"], "A"),
        }
    )
    for name, candidates in ODDS_COLUMNS.items():
        raw[candidates[0]] = df[name].round(2)
    return raw
