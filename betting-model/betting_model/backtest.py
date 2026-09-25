"""Walk-forward backtest.

Replays past seasons in date order. Each match is predicted by a model
fitted only on matches played before that day, so the backtest never sees
the future. The model is refitted every ``refit_days`` days.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .model import DixonColes

PROB_COLUMNS = ["p_home", "p_draw", "p_away", "p_over", "p_under"]


@dataclass
class BacktestConfig:
    bet_leagues: list[str]  # leagues we predict and bet on
    first_season: int  # first test season, by starting year (2018 = 2018/19)
    last_season: int
    refit_days: int = 7
    window_days: int = 3 * 365  # how far back each fit looks
    min_games: int = 10  # skip matches where a team has fewer games in the window
    xi: float = 0.0019
    l2: float = 1.0


def walk_forward(matches: pd.DataFrame, config: BacktestConfig, verbose: bool = True) -> pd.DataFrame:
    """Predict every test match using only earlier matches.

    ``matches`` may include extra leagues (e.g. League One) that are used
    for fitting but not bet on. Returns the test matches with the model's
    probabilities and expected goals added.
    """
    is_test = matches["league"].isin(config.bet_leagues) & matches["season"].between(
        config.first_season, config.last_season
    )
    test = matches[is_test]
    if test.empty:
        raise ValueError("No matches found for the chosen leagues and seasons.")

    window = pd.Timedelta(days=config.window_days)
    model: DixonColes | None = None
    last_fit: pd.Timestamp | None = None
    trained_until: pd.Timestamp | None = None
    season_shown = None
    results = []

    for date, day in test.groupby("date", sort=True):
        if verbose and day["season"].iloc[0] != season_shown:
            season_shown = day["season"].iloc[0]
            print(f"  backtesting {season_shown}/{season_shown + 1}...")

        if model is None or (date - last_fit).days >= config.refit_days:
            train = matches[(matches["date"] < date) & (matches["date"] >= date - window)]
            if train.empty:
                raise ValueError(f"No matches before {date.date()} to fit on; load earlier seasons.")
            model = DixonColes(xi=config.xi, l2=config.l2).fit(train, as_of=date, init=model)
            last_fit = date
            trained_until = train["date"].max()

        preds = model.predict(day)
        games = model.games_played
        enough = (day["home"].map(games).fillna(0) >= config.min_games) & (
            day["away"].map(games).fillna(0) >= config.min_games
        )
        preds.loc[~enough, PROB_COLUMNS] = np.nan
        preds["trained_until"] = trained_until  # date of the latest result the model saw
        results.append(day.join(preds))

    return pd.concat(results).reset_index(drop=True)
