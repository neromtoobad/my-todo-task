import numpy as np
import pandas as pd
import pytest

from betting_model.implied import RHO, _market_probs, implied_xg, streak_from_odds
from betting_model.model import score_grid
from betting_model.streaks import streak_probability


@pytest.mark.parametrize("xg_home, xg_away", [(1.5, 1.1), (2.4, 0.6), (0.9, 1.3), (3.0, 0.4)])
def test_recovers_expected_goals_from_fair_odds(xg_home, xg_away):
    p_home, p_draw, p_away, p_over = _market_probs(xg_home, xg_away)
    # Odds with a 6% margin spread evenly.
    odds = [1 / (p * 1.06) for p in (p_home, p_draw, p_away)]
    ou = [1 / (p_over * 1.05), 1 / ((1 - p_over) * 1.05)]

    got_home, got_away = implied_xg(*odds, *ou)

    assert got_home == pytest.approx(xg_home, abs=0.02)
    assert got_away == pytest.approx(xg_away, abs=0.02)


def test_streak_from_odds_matches_direct_calculation():
    p = _market_probs(1.8, 0.9)
    odds = [1 / x for x in p[:3]]
    xg_home, xg_away, p_streak = streak_from_odds(*odds, 1 / p[3], 1 / (1 - p[3]))
    grid = score_grid(np.array([1.8]), np.array([0.9]), RHO, 10)
    assert p_streak == pytest.approx(streak_probability(grid)[0], abs=0.005)


def test_tight_low_scoring_match_is_safer_for_no_than_a_mismatch():
    _, _, tight = streak_from_odds(2.7, 3.0, 2.9, 2.40, 1.55)
    _, _, mismatch = streak_from_odds(1.20, 7.0, 13.0, 1.45, 2.70)
    assert tight < 0.15 < 0.35 < mismatch


def test_command_line_flags_value(tmp_path):
    from three_in_a_row_from_odds import rate

    df = pd.DataFrame(
        {"match": ["A v B", "C v D"], "home": [2.7, 1.2], "draw": [3.0, 7.0], "away": [2.9, 13.0],
         "over": [2.4, 1.45], "under": [1.55, 2.7], "no": [1.30, np.nan]}
    )
    rated = rate(df, min_edge=0.05).set_index("match")
    assert rated.loc["A v B", "verdict"] == "VALUE"  # P(NO) near 88%, so 1.30 is generous
    assert rated.loc["C v D", "verdict"] == "check price"
    assert rated.index[0] == "A v B"  # safest NO first
