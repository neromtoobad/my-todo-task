from itertools import permutations

import numpy as np
import pytest

from betting_model.model import score_grid
from betting_model.streaks import longest_run, streak_given_score, streak_probability


def brute_force(home: int, away: int, length: int, side: str) -> float:
    orders = set(permutations("H" * home + "A" * away))
    hits = sum(longest_run("".join(o), side) >= length for o in orders)
    return hits / len(orders)


@pytest.mark.parametrize(
    "home, away, expected",
    [
        (0, 0, 0.0),
        (2, 2, 0.0),  # nobody reaches three goals
        (3, 0, 1.0),
        (3, 1, 0.5),  # HHHA and AHHH yes; HAHH and HHAH no
        (4, 1, 0.8),  # only HHAHH avoids a run of three
        (5, 1, 1.0),  # five goals split by one away goal always leaves a run of 3+
        (1, 3, 0.5),
    ],
)
def test_known_scores(home, away, expected):
    assert streak_given_score(home, away) == pytest.approx(expected)


@pytest.mark.parametrize("side", ["any", "home", "away"])
@pytest.mark.parametrize("length", [2, 3, 4])
def test_matches_brute_force_enumeration(side, length):
    for home in range(6):
        for away in range(6):
            assert streak_given_score(home, away, length, side) == pytest.approx(
                brute_force(home, away, length, side)
            ), (home, away)


def test_longest_run():
    assert longest_run("") == 0
    assert longest_run("HHAAAH") == 3
    assert longest_run("HHAAAH", "home") == 2
    assert longest_run("HHAAAH", "away") == 3


def test_streak_probability_weights_scores_by_grid():
    grid = np.zeros((1, 11, 11))
    grid[0, 3, 1] = 0.5  # half the time 3-1 (50% streak)
    grid[0, 3, 0] = 0.5  # half the time 3-0 (always a streak)
    assert streak_probability(grid)[0] == pytest.approx(0.75)


def test_more_goals_means_more_streaks():
    low = score_grid(np.array([0.8]), np.array([0.7]), rho=-0.1, max_goals=10)
    high = score_grid(np.array([2.2]), np.array([1.2]), rho=-0.1, max_goals=10)
    assert streak_probability(high)[0] > streak_probability(low)[0]
