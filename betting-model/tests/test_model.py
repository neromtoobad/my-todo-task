import numpy as np
import pandas as pd
from scipy.optimize import check_grad
from scipy.stats import poisson

from betting_model.model import DixonColes, _neg_log_likelihood, score_grid

from .synthetic import TRUE_HOME_ADV, TRUE_RHO, make_league


def test_gradient_matches_numerical_gradient():
    rng = np.random.default_rng(1)
    n, n_teams, n_leagues = 300, 8, 2
    h = rng.integers(0, n_teams, n)
    a = (h + rng.integers(1, n_teams, n)) % n_teams
    lg = rng.integers(0, n_leagues, n)
    hg = rng.poisson(1.5, n)
    ag = rng.poisson(1.1, n)
    w = rng.uniform(0.2, 1.0, n)
    params = rng.normal(0, 0.2, 2 + n_leagues + 2 * n_teams)
    params[1 + n_leagues] = -0.08  # rho

    args = (h, a, lg, hg, ag, w, n_teams, n_leagues, 0.5)
    error = check_grad(
        lambda p: _neg_log_likelihood(p, *args)[0],
        lambda p: _neg_log_likelihood(p, *args)[1],
        params,
    )
    assert error < 1e-4


def test_score_grid_sums_to_one_and_reduces_to_poisson_when_rho_is_zero():
    home_xg, away_xg = np.array([1.4, 0.6]), np.array([1.1, 2.3])
    grid = score_grid(home_xg, away_xg, rho=0.0, max_goals=10)
    np.testing.assert_allclose(grid.sum(axis=(1, 2)), 1.0)
    expected = poisson.pmf(2, 1.4) * poisson.pmf(1, 1.1)
    assert abs(grid[0, 2, 1] - expected) < 1e-6


def test_negative_rho_makes_draws_more_likely():
    xg = np.array([1.3])
    plain = score_grid(xg, xg, rho=0.0, max_goals=10)
    dc = score_grid(xg, xg, rho=-0.1, max_goals=10)
    assert dc[0, 0, 0] > plain[0, 0, 0]
    assert dc[0, 1, 1] > plain[0, 1, 1]


def test_fit_recovers_true_parameters():
    matches, truth = make_league(seasons=(2015, 2016, 2017, 2018, 2019), seed=3)
    model = DixonColes(xi=0.0).fit(matches, as_of=matches["date"].max() + pd.Timedelta(days=1))

    assert abs(model.rho - TRUE_RHO) < 0.06
    assert abs(model.home_adv[0] - TRUE_HOME_ADV) < 0.06
    ratings = model.ratings().set_index("team")
    true_attack = [truth[t][0] for t in ratings.index]
    true_defence = [truth[t][1] for t in ratings.index]
    assert np.corrcoef(ratings["attack"], true_attack)[0, 1] > 0.95
    assert np.corrcoef(ratings["defence"], true_defence)[0, 1] > 0.95


def test_predict_probabilities_are_consistent():
    matches, _ = make_league(seasons=(2015, 2016), seed=4)
    model = DixonColes().fit(matches, as_of=matches["date"].max() + pd.Timedelta(days=1))
    fixtures = pd.DataFrame(
        {
            "league": ["E0", "E0"],
            "home": ["E0 Team 00", "E0 Team 01"],
            "away": ["E0 Team 05", "Unknown FC"],
        }
    )
    preds = model.predict(fixtures)

    first = preds.iloc[0]
    assert abs(first["p_home"] + first["p_draw"] + first["p_away"] - 1) < 1e-9
    assert abs(first["p_over"] + first["p_under"] - 1) < 1e-9
    assert preds.iloc[1].isna().all()  # unknown team -> no prediction


def test_warm_start_gives_same_answer():
    matches, _ = make_league(seasons=(2015, 2016), seed=5)
    as_of = matches["date"].max() + pd.Timedelta(days=1)
    cold = DixonColes().fit(matches, as_of)
    warm = DixonColes().fit(matches, as_of, init=cold)
    np.testing.assert_allclose(warm.attack, cold.attack, atol=1e-4)
    np.testing.assert_allclose(warm.defence, cold.defence, atol=1e-4)
