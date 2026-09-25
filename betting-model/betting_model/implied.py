"""Expected goals implied by bookmaker odds.

The home/draw/away and over/under 2.5 prices on any match pin down how many
goals the bookmaker expects each team to score. Solving for those two
numbers lets the goal-streak maths work on any match SportyBet lists,
including leagues and national teams we have no results history for.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import minimize

from .model import score_grid
from .streaks import streak_probability

RHO = -0.04  # Dixon-Coles low-score correction, as fitted on recent European and Brazilian results
MAX_GOALS = 10


def fair(*odds: float) -> np.ndarray:
    """Remove the bookmaker margin from one market's odds."""
    implied = 1.0 / np.asarray(odds, dtype=float)
    return implied / implied.sum()


def _market_probs(xg_home: float, xg_away: float) -> np.ndarray:
    grid = score_grid(np.array([xg_home]), np.array([xg_away]), RHO, MAX_GOALS)[0]
    goals = np.arange(MAX_GOALS + 1)
    h, a = np.meshgrid(goals, goals, indexing="ij")
    return np.array([grid[h > a].sum(), grid[h == a].sum(), grid[h < a].sum(), grid[h + a > 2.5].sum()])


def implied_xg(home: float, draw: float, away: float, over: float | None = None,
               under: float | None = None) -> tuple[float, float]:
    """Expected home and away goals that best reproduce the odds.

    Uses 1X2 odds, plus over/under 2.5 when given (strongly recommended:
    1X2 alone says little about how many goals to expect).
    """
    target = list(fair(home, draw, away))
    if over is not None and under is not None:
        target.append(fair(over, under)[0])
    target = np.array(target)

    def loss(log_xg: np.ndarray) -> float:
        return float(np.sum((_market_probs(*np.exp(log_xg))[: len(target)] - target) ** 2))

    result = minimize(loss, x0=np.log([1.4, 1.1]), method="Nelder-Mead",
                      options={"xatol": 1e-6, "fatol": 1e-12, "maxiter": 2000})
    xg_home, xg_away = np.exp(result.x)
    return float(xg_home), float(xg_away)


def streak_from_odds(home: float, draw: float, away: float, over: float | None = None,
                     under: float | None = None, length: int = 3) -> tuple[float, float, float]:
    """(expected home goals, expected away goals, P(either team scores ``length`` in a row))."""
    xg_home, xg_away = implied_xg(home, draw, away, over, under)
    grid = score_grid(np.array([xg_home]), np.array([xg_away]), RHO, MAX_GOALS)
    return xg_home, xg_away, float(streak_probability(grid, length=length)[0])
