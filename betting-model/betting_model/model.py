"""Dixon-Coles goals model (Dixon & Coles, 1997).

Each team gets an attack rating and a defence rating (higher = better).
Expected goals for a match are

    home_xg = exp(intercept + home_adv[league] + attack[home] - defence[away])
    away_xg = exp(intercept + attack[away] - defence[home])

and each side's goals are Poisson with those means. Plain Poisson gets the
0-0, 1-0, 0-1 and 1-1 scorelines slightly wrong, so Dixon-Coles adjusts
those four with one extra parameter, ``rho``.

Older matches count for less: each match is weighted by
``exp(-xi * days_ago)``, so form from last month matters more than form
from two seasons ago.

Several leagues can be fitted together. Teams that were promoted or
relegated link the leagues, which gives promoted sides a rating from day
one instead of waiting for them to play enough games in their new league.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import poisson


@dataclass
class DixonColes:
    xi: float = 0.0019  # time decay per day; 0.0019 ~= a match a year old counts half
    l2: float = 1.0  # small ridge penalty that keeps ratings finite for teams with few games
    max_goals: int = 10  # scorelines above this are treated as impossible

    teams: list[str] = field(default_factory=list, init=False)
    leagues: list[str] = field(default_factory=list, init=False)
    intercept: float = field(default=0.0, init=False)
    home_adv: np.ndarray = field(default_factory=lambda: np.zeros(0), init=False)
    rho: float = field(default=0.0, init=False)
    attack: np.ndarray = field(default_factory=lambda: np.zeros(0), init=False)
    defence: np.ndarray = field(default_factory=lambda: np.zeros(0), init=False)
    games_played: dict[str, int] = field(default_factory=dict, init=False)

    def fit(
        self,
        matches: pd.DataFrame,
        as_of: pd.Timestamp,
        init: DixonColes | None = None,
    ) -> DixonColes:
        """Fit on ``matches`` (columns date, league, home, away, hg, ag).

        ``as_of`` is the day we are predicting from; it sets the time decay.
        ``init`` is an earlier fit to start from, which makes refitting
        every week much faster.
        """
        self.teams = sorted(set(matches["home"]) | set(matches["away"]))
        self.leagues = sorted(set(matches["league"]))
        team_idx = {t: i for i, t in enumerate(self.teams)}
        league_idx = {lg: i for i, lg in enumerate(self.leagues)}

        h = matches["home"].map(team_idx).to_numpy()
        a = matches["away"].map(team_idx).to_numpy()
        lg = matches["league"].map(league_idx).to_numpy()
        hg = matches["hg"].to_numpy()
        ag = matches["ag"].to_numpy()
        days_ago = (as_of - matches["date"]).dt.days.to_numpy()
        w = np.exp(-self.xi * days_ago)

        n_teams, n_leagues = len(self.teams), len(self.leagues)
        x0 = self._initial_params(init, n_teams, n_leagues)
        bounds = [(None, None)] * (1 + n_leagues) + [(-0.2, 0.2)] + [(None, None)] * (2 * n_teams)
        result = minimize(
            _neg_log_likelihood,
            x0,
            args=(h, a, lg, hg, ag, w, n_teams, n_leagues, self.l2),
            jac=True,
            method="L-BFGS-B",
            bounds=bounds,
            options={"maxiter": 2000},
        )
        if not result.success:
            # Usually L-BFGS-B stopping at machine precision next to the optimum.
            warnings.warn(f"Dixon-Coles fit as of {as_of.date()} stopped early: {result.message}")

        self._set_params(result.x, n_teams, n_leagues)
        counts = pd.concat([matches["home"], matches["away"]]).value_counts()
        self.games_played = counts.to_dict()
        return self

    def ratings(self) -> pd.DataFrame:
        """Team ratings, best overall first."""
        df = pd.DataFrame({"team": self.teams, "attack": self.attack, "defence": self.defence})
        df["overall"] = df["attack"] + df["defence"]
        df["games"] = df["team"].map(self.games_played)
        return df.sort_values("overall", ascending=False).reset_index(drop=True)

    def expected_goals(self, fixtures: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Expected home and away goals (NaN where a team or league is unknown)."""
        team_idx = {t: i for i, t in enumerate(self.teams)}
        league_idx = {lg: i for i, lg in enumerate(self.leagues)}
        h = fixtures["home"].map(team_idx)
        a = fixtures["away"].map(team_idx)
        lg = fixtures["league"].map(league_idx)
        known = (h.notna() & a.notna() & lg.notna()).to_numpy()

        home_xg = np.full(len(fixtures), np.nan)
        away_xg = np.full(len(fixtures), np.nan)
        hi, ai, li = (s[known].astype(int).to_numpy() for s in (h, a, lg))
        home_xg[known] = np.exp(self.intercept + self.home_adv[li] + self.attack[hi] - self.defence[ai])
        away_xg[known] = np.exp(self.intercept + self.attack[ai] - self.defence[hi])
        return home_xg, away_xg

    def predict(self, fixtures: pd.DataFrame) -> pd.DataFrame:
        """Outcome probabilities for each fixture (columns league, home, away).

        Returns p_home/p_draw/p_away, p_over/p_under (2.5 goals) and the
        expected goals. Rows with an unknown team are all NaN.
        """
        home_xg, away_xg = self.expected_goals(fixtures)
        out = pd.DataFrame(index=fixtures.index)
        out["xg_home"] = home_xg
        out["xg_away"] = away_xg
        for col in ("p_home", "p_draw", "p_away", "p_over", "p_under"):
            out[col] = np.nan

        known = ~np.isnan(home_xg)
        if known.any():
            grid = score_grid(home_xg[known], away_xg[known], self.rho, self.max_goals)
            goals = np.arange(self.max_goals + 1)
            home_goals, away_goals = np.meshgrid(goals, goals, indexing="ij")
            out.loc[known, "p_home"] = grid[:, home_goals > away_goals].sum(axis=1)
            out.loc[known, "p_draw"] = grid[:, home_goals == away_goals].sum(axis=1)
            out.loc[known, "p_away"] = grid[:, home_goals < away_goals].sum(axis=1)
            out.loc[known, "p_over"] = grid[:, home_goals + away_goals > 2.5].sum(axis=1)
            out.loc[known, "p_under"] = 1.0 - out.loc[known, "p_over"]
        return out

    def _initial_params(self, init: DixonColes | None, n_teams: int, n_leagues: int) -> np.ndarray:
        x0 = np.zeros(2 + n_leagues + 2 * n_teams)
        x0[0] = np.log(1.3)  # roughly the average goals per team per game
        x0[1 : 1 + n_leagues] = 0.25
        x0[1 + n_leagues] = -0.05
        if init is None:
            return x0

        x0[0] = init.intercept
        x0[1 + n_leagues] = init.rho
        old_leagues = {lg: i for i, lg in enumerate(init.leagues)}
        for i, lg in enumerate(self.leagues):
            if lg in old_leagues:
                x0[1 + i] = init.home_adv[old_leagues[lg]]
        old_teams = {t: i for i, t in enumerate(init.teams)}
        start = 2 + n_leagues
        for i, team in enumerate(self.teams):
            if team in old_teams:
                x0[start + i] = init.attack[old_teams[team]]
                x0[start + n_teams + i] = init.defence[old_teams[team]]
        return x0

    def _set_params(self, x: np.ndarray, n_teams: int, n_leagues: int) -> None:
        self.intercept = float(x[0])
        self.home_adv = x[1 : 1 + n_leagues].copy()
        self.rho = float(x[1 + n_leagues])
        start = 2 + n_leagues
        self.attack = x[start : start + n_teams].copy()
        self.defence = x[start + n_teams :].copy()


def score_grid(home_xg: np.ndarray, away_xg: np.ndarray, rho: float, max_goals: int) -> np.ndarray:
    """Probability of every scoreline, shape (matches, max_goals+1, max_goals+1).

    ``grid[m, i, j]`` is the chance match m ends home i - away j.
    """
    goals = np.arange(max_goals + 1)
    home_pmf = poisson.pmf(goals[None, :], home_xg[:, None])
    away_pmf = poisson.pmf(goals[None, :], away_xg[:, None])
    grid = home_pmf[:, :, None] * away_pmf[:, None, :]
    grid[:, 0, 0] *= 1 - home_xg * away_xg * rho
    grid[:, 0, 1] *= 1 + home_xg * rho
    grid[:, 1, 0] *= 1 + away_xg * rho
    grid[:, 1, 1] *= 1 - rho
    grid = np.clip(grid, 0.0, None)
    return grid / grid.sum(axis=(1, 2), keepdims=True)


def _neg_log_likelihood(params, h, a, lg, hg, ag, w, n_teams, n_leagues, l2):
    """Weighted negative log-likelihood and its gradient."""
    intercept = params[0]
    home_adv = params[1 : 1 + n_leagues]
    rho = params[1 + n_leagues]
    start = 2 + n_leagues
    attack = params[start : start + n_teams]
    defence = params[start + n_teams :]

    eta_h = intercept + home_adv[lg] + attack[h] - defence[a]
    eta_a = intercept + attack[a] - defence[h]
    lam = np.exp(eta_h)
    mu = np.exp(eta_a)

    # Poisson log-likelihood, dropping the log(k!) terms that do not depend on params.
    ll = hg * eta_h - lam + ag * eta_a - mu
    d_eta_h = hg - lam
    d_eta_a = ag - mu
    d_rho = np.zeros_like(lam)

    # Dixon-Coles low-score correction.
    m = (hg == 0) & (ag == 0)
    t = np.maximum(1 - lam[m] * mu[m] * rho, 1e-10)
    ll[m] += np.log(t)
    d_eta_h[m] -= lam[m] * mu[m] * rho / t
    d_eta_a[m] -= lam[m] * mu[m] * rho / t
    d_rho[m] = -lam[m] * mu[m] / t

    m = (hg == 0) & (ag == 1)
    t = np.maximum(1 + lam[m] * rho, 1e-10)
    ll[m] += np.log(t)
    d_eta_h[m] += lam[m] * rho / t
    d_rho[m] = lam[m] / t

    m = (hg == 1) & (ag == 0)
    t = np.maximum(1 + mu[m] * rho, 1e-10)
    ll[m] += np.log(t)
    d_eta_a[m] += mu[m] * rho / t
    d_rho[m] = mu[m] / t

    m = (hg == 1) & (ag == 1)
    ll[m] += np.log(1 - rho)
    d_rho[m] = -1 / (1 - rho)

    nll = -np.sum(w * ll) + l2 * (attack @ attack + defence @ defence)

    wh = w * d_eta_h
    wa = w * d_eta_a
    grad = np.empty_like(params)
    grad[0] = -(wh.sum() + wa.sum())
    grad[1 : 1 + n_leagues] = -np.bincount(lg, weights=wh, minlength=n_leagues)
    grad[1 + n_leagues] = -np.sum(w * d_rho)
    grad[start : start + n_teams] = (
        -(np.bincount(h, weights=wh, minlength=n_teams) + np.bincount(a, weights=wa, minlength=n_teams))
        + 2 * l2 * attack
    )
    grad[start + n_teams :] = (
        np.bincount(a, weights=wh, minlength=n_teams)
        + np.bincount(h, weights=wa, minlength=n_teams)
        + 2 * l2 * defence
    )
    return nll, grad
