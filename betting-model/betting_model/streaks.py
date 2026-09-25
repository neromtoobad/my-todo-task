"""Probability that a team scores N goals in a row ("goal streak" markets).

SportyBet's "3 goals in a row" market asks whether either team scores 3
consecutive goals without the opponent scoring in between (settled at full
time; own goals count for the team credited).

The Dixon-Coles model gives the chance of every final score, but not the
order of the goals. If each team scores at a steady rate through the match,
then for a given final score every order of the goals is equally likely.
Under that assumption, for example, a 3-1 win produces three in a row in
2 of its 4 possible orders (HHHA, AHHH yes; HAHH, HHAH no).

So:  P(streak) = sum over scores of P(score) * P(streak | score).

research/three_in_a_row_study.py checks the equal-orders assumption
against real goal sequences.
"""

from __future__ import annotations

from functools import lru_cache
from math import comb

import numpy as np

SIDES = ("any", "home", "away")


def longest_run(sequence: str, side: str = "any") -> int:
    """Longest run of consecutive goals in a sequence like "HHAH"."""
    best = run = 0
    previous = ""
    for goal in sequence:
        run = run + 1 if goal == previous else 1
        previous = goal
        if side == "any" or goal == side[0].upper():
            best = max(best, run)
    return best


@lru_cache(maxsize=None)
def _orders_without_streak(home: int, away: int, max_home_run: int, max_away_run: int) -> int:
    """Number of goal orders whose home runs and away runs stay within the limits."""

    @lru_cache(maxsize=None)
    def count(h: int, a: int, last: str, run: int) -> int:
        if h == 0 and a == 0:
            return 1
        total = 0
        if h > 0:
            new_run = run + 1 if last == "H" else 1
            if new_run <= max_home_run:
                total += count(h - 1, a, "H", new_run)
        if a > 0:
            new_run = run + 1 if last == "A" else 1
            if new_run <= max_away_run:
                total += count(h, a - 1, "A", new_run)
        return total

    return count(home, away, "", 0)


def streak_given_score(home: int, away: int, length: int = 3, side: str = "any") -> float:
    """P(a run of ``length``+ goals | final score), all goal orders equally likely.

    ``side`` is "any" (either team), "home" or "away".
    """
    if side not in SIDES:
        raise ValueError(f"side must be one of {SIDES}")
    unlimited = home + away + 1
    max_home = length - 1 if side in ("any", "home") else unlimited
    max_away = length - 1 if side in ("any", "away") else unlimited
    without = _orders_without_streak(home, away, max_home, max_away)
    return 1.0 - without / comb(home + away, home)


@lru_cache(maxsize=None)
def _conditional_table(max_goals: int, length: int, side: str) -> np.ndarray:
    size = max_goals + 1
    table = np.array([[streak_given_score(h, a, length, side) for a in range(size)] for h in range(size)])
    table.setflags(write=False)
    return table


def streak_probability(grid: np.ndarray, length: int = 3, side: str = "any") -> np.ndarray:
    """P(streak) for each match, from score grids of shape (matches, G+1, G+1)."""
    table = _conditional_table(grid.shape[1] - 1, length, side)
    return (grid * table).sum(axis=(1, 2))
