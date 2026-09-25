"""Judge backtest predictions against the betting market.

Two questions:

1. Are the model's probabilities more accurate than the market's?
   Measured with log loss and Brier score (lower is better for both).
2. Would betting when the model disagrees with a bookmaker have made money?
   Flat 1-unit stakes. Profit alone is noisy, so we also report closing
   line value (CLV): the bet's expected value if the closing market price
   is the truth. Consistently positive CLV is the best evidence of a real
   edge; profit with negative CLV is usually luck.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .market import OUTCOMES_1X2, OUTCOMES_OU, benchmark_probs, odds_matrix


@dataclass(frozen=True)
class Market:
    name: str
    prob_columns: tuple[str, ...]
    outcomes: tuple[str, ...]
    labels: tuple[str, ...]

    def result_index(self, df: pd.DataFrame) -> np.ndarray:
        """Index of the outcome that actually happened in each match."""
        hg, ag = df["hg"].to_numpy(), df["ag"].to_numpy()
        if self.name == "1x2":
            return np.select([hg > ag, hg == ag], [0, 1], 2)
        return np.where(hg + ag > 2.5, 0, 1)


MARKETS = {
    "1x2": Market("1x2", ("p_home", "p_draw", "p_away"), OUTCOMES_1X2, ("home", "draw", "away")),
    "ou25": Market("ou25", ("p_over", "p_under"), OUTCOMES_OU, ("over 2.5", "under 2.5")),
}


def log_loss(probs: np.ndarray, result: np.ndarray) -> float:
    return float(-np.mean(np.log(probs[np.arange(len(result)), result])))


def brier(probs: np.ndarray, result: np.ndarray) -> float:
    actual = np.zeros_like(probs)
    actual[np.arange(len(result)), result] = 1.0
    return float(np.mean(np.sum((probs - actual) ** 2, axis=1)))


def accuracy(preds: pd.DataFrame, market: Market, base_rates: np.ndarray | None = None) -> dict:
    """Log loss and Brier score for the model and the market on the same matches."""
    model = preds[list(market.prob_columns)].to_numpy(dtype=float)
    bench, _ = benchmark_probs(preds, market.outcomes)
    usable = ~np.isnan(model).any(axis=1) & ~np.isnan(bench).any(axis=1)
    result = market.result_index(preds)[usable]
    model, bench = model[usable], bench[usable]

    row = {
        "matches": int(usable.sum()),
        "model_log_loss": log_loss(model, result) if usable.any() else np.nan,
        "market_log_loss": log_loss(bench, result) if usable.any() else np.nan,
        "model_brier": brier(model, result) if usable.any() else np.nan,
        "market_brier": brier(bench, result) if usable.any() else np.nan,
    }
    if base_rates is not None and usable.any():
        naive = np.tile(base_rates, (len(result), 1))
        row["naive_log_loss"] = log_loss(naive, result)
    return row


def accuracy_by(preds: pd.DataFrame, market: Market, by: str) -> pd.DataFrame:
    rows = {key: accuracy(group, market) for key, group in preds.groupby(by)}
    return pd.DataFrame.from_dict(rows, orient="index")


def simulate_bets(preds: pd.DataFrame, market: Market, bet_source: str, min_edge: float) -> pd.DataFrame:
    """Bet 1 unit whenever the model's expected value at ``bet_source``'s
    pre-match odds is at least ``min_edge`` (0.05 = +5%).

    At most one bet per match per market: the outcome with the biggest edge.
    """
    model = preds[list(market.prob_columns)].to_numpy(dtype=float)
    odds = odds_matrix(preds, bet_source, market.outcomes)
    closing, closing_source = benchmark_probs(preds, market.outcomes)
    edge = model * odds - 1.0

    has_edge = ~np.isnan(edge).all(axis=1)
    pick = np.zeros(len(preds), dtype=int)
    pick[has_edge] = np.nanargmax(edge[has_edge], axis=1)
    rows = np.arange(len(preds))
    best_edge = np.where(has_edge, edge[rows, pick], np.nan)
    placed = has_edge & (best_edge >= min_edge)

    result = market.result_index(preds)
    picked_odds = odds[rows, pick]
    won = pick == result
    bets = preds.loc[placed, ["date", "season", "league", "home", "away", "hg", "ag"]].copy()
    bets["market"] = market.name
    bets["pick"] = np.array(market.labels)[pick[placed]]
    bets["odds"] = picked_odds[placed]
    bets["p_model"] = model[rows, pick][placed]
    bets["p_market"] = closing[rows, pick][placed]
    bets["edge"] = best_edge[placed]
    bets["won"] = won[placed]
    bets["profit"] = np.where(won[placed], picked_odds[placed] - 1.0, -1.0)
    # Expected value of this bet if the (closing) market price is right.
    bets["clv"] = picked_odds[placed] * closing[rows, pick][placed] - 1.0
    bets["clv_source"] = closing_source[placed]
    return bets.reset_index(drop=True)


def summarize_bets(bets: pd.DataFrame) -> dict:
    n = len(bets)
    if n == 0:
        return {"bets": 0}
    profit = bets["profit"].to_numpy()
    roi = profit.mean()
    # 95% interval for the true ROI, assuming bets are independent.
    roi_ci = 1.96 * profit.std(ddof=1) / np.sqrt(n) if n > 1 else np.nan
    clv = bets["clv"].dropna()
    return {
        "bets": n,
        "profit": profit.sum(),
        "roi": roi,
        "roi_low": roi - roi_ci,
        "roi_high": roi + roi_ci,
        "hit_rate": bets["won"].mean(),
        "avg_odds": bets["odds"].mean(),
        "avg_clv": clv.mean() if len(clv) else np.nan,
        "beat_close": (clv > 0).mean() if len(clv) else np.nan,
    }


def summarize_by(bets: pd.DataFrame, by: str) -> pd.DataFrame:
    rows = {key: summarize_bets(group) for key, group in bets.groupby(by)}
    return pd.DataFrame.from_dict(rows, orient="index")


def edge_sweep(preds: pd.DataFrame, market: Market, bet_source: str, thresholds) -> pd.DataFrame:
    rows = {f"{t:.0%}": summarize_bets(simulate_bets(preds, market, bet_source, t)) for t in thresholds}
    return pd.DataFrame.from_dict(rows, orient="index")
