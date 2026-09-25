"""Turn bookmaker odds into probabilities.

Odds of 2.00 imply a 50% chance, but a bookmaker's implied chances for all
outcomes add up to more than 100% (e.g. 105%). The extra is their margin.
"Fair" probabilities remove it by scaling the implied chances down so they
sum to 100% (the simple proportional method).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

OUTCOMES_1X2 = ("h", "d", "a")
OUTCOMES_OU = ("o", "u")

# Which odds to trust as "the market" when judging the model, best first.
# Pinnacle's closing price is the sharpest widely available line; if a row
# lacks it we fall back to the average closing price, then pre-match prices.
BENCHMARK_SOURCES = ("psc", "avgc", "ps", "avg")


def odds_matrix(df: pd.DataFrame, source: str, outcomes: tuple[str, ...]) -> np.ndarray:
    """Odds for one bookmaker as an array of shape (rows, outcomes)."""
    return df[[f"{source}_{o}" for o in outcomes]].to_numpy(dtype=float)


def fair_probs(odds: np.ndarray) -> np.ndarray:
    """Remove the bookmaker margin. Rows with any missing odds stay NaN."""
    implied = 1.0 / odds
    return implied / implied.sum(axis=1, keepdims=True)


def margin(odds: np.ndarray) -> np.ndarray:
    """Bookmaker margin per row, e.g. 0.05 for a 5% overround."""
    return (1.0 / odds).sum(axis=1) - 1.0


def benchmark_probs(df: pd.DataFrame, outcomes: tuple[str, ...]) -> tuple[np.ndarray, np.ndarray]:
    """Best available fair market probabilities for each row.

    Returns the probabilities and, per row, which source they came from
    ("" where no odds were available).
    """
    probs = np.full((len(df), len(outcomes)), np.nan)
    source_used = np.full(len(df), "", dtype=object)
    for source in BENCHMARK_SOURCES:
        if not all(f"{source}_{o}" in df.columns for o in outcomes):
            continue
        candidate = fair_probs(odds_matrix(df, source, outcomes))
        fill = np.isnan(probs).any(axis=1) & ~np.isnan(candidate).any(axis=1)
        probs[fill] = candidate[fill]
        source_used[fill] = source
    return probs, source_used
