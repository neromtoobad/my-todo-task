import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from betting_model.backtest import BacktestConfig, walk_forward
from betting_model.data import season_code
from betting_model.evaluate import MARKETS, accuracy, simulate_bets, summarize_bets
from betting_model.market import benchmark_probs, fair_probs

from .synthetic import make_league, to_football_data_csv

ROOT = Path(__file__).parent.parent


def _backtest(**overrides):
    matches, _ = make_league(seasons=(2014, 2015, 2016, 2017, 2018), seed=11)
    config = BacktestConfig(bet_leagues=["E0"], first_season=2017, last_season=2018, **overrides)
    return walk_forward(matches, config, verbose=False)


def test_every_prediction_uses_only_earlier_matches():
    preds = _backtest()
    assert (preds["trained_until"] < preds["date"]).all()


def test_model_cannot_beat_an_efficient_market():
    # The synthetic market prices every match at its true probability, so a
    # model that beats it by a clear margin must be seeing future results.
    preds = _backtest()
    for market in MARKETS.values():
        result = accuracy(preds, market)
        assert result["matches"] > 600
        assert result["model_log_loss"] > result["market_log_loss"] - 0.01
        # ...but a correctly specified model should get close to it.
        assert result["model_log_loss"] < result["market_log_loss"] + 0.03


def test_bets_have_negative_expected_value_against_efficient_market():
    preds = _backtest()
    bets = simulate_bets(preds, MARKETS["1x2"], "b365", min_edge=0.02)
    assert len(bets) > 0
    # Every price carries a 5% margin over the true odds.
    np.testing.assert_allclose(bets["clv"], 1 / 1.05 - 1, atol=1e-9)


def test_fair_probs_remove_margin():
    odds = np.array([[2.0, 3.4, 3.8], [1.5, np.nan, 6.0]])
    probs = fair_probs(odds)
    np.testing.assert_allclose(probs[0].sum(), 1.0)
    assert np.isnan(probs[1]).all()


def test_benchmark_falls_back_to_average_closing_odds():
    df = pd.DataFrame(
        {
            "psc_h": [2.0, np.nan], "psc_d": [3.5, np.nan], "psc_a": [4.0, np.nan],
            "avgc_h": [2.1, 1.8], "avgc_d": [3.4, 3.6], "avgc_a": [3.9, 4.5],
            "ps_h": [np.nan] * 2, "ps_d": [np.nan] * 2, "ps_a": [np.nan] * 2,
            "avg_h": [np.nan] * 2, "avg_d": [np.nan] * 2, "avg_a": [np.nan] * 2,
        }
    )
    probs, source = benchmark_probs(df, ("h", "d", "a"))
    assert source.tolist() == ["psc", "avgc"]
    np.testing.assert_allclose(probs[1], fair_probs(np.array([[1.8, 3.6, 4.5]]))[0])


def test_simulate_bets_picks_best_edge_and_scores_it():
    preds = pd.DataFrame(
        {
            "date": pd.to_datetime(["2024-01-01", "2024-01-02"]),
            "season": 2023, "league": "E0", "home": ["A", "C"], "away": ["B", "D"],
            "hg": [2, 0], "ag": [1, 0],
            "p_home": [0.60, 0.40], "p_draw": [0.25, 0.30], "p_away": [0.15, 0.30],
            "b365_h": [2.0, 2.4], "b365_d": [3.5, 3.4], "b365_a": [5.0, 3.1],
            "psc_h": [1.9, 2.5], "psc_d": [3.6, 3.3], "psc_a": [5.2, 3.0],
        }
    )
    for col in ("avgc", "ps", "avg"):
        for o in "hda":
            preds[f"{col}_{o}"] = np.nan

    bets = simulate_bets(preds, MARKETS["1x2"], "b365", min_edge=0.05)

    # Match 1: home edge = 0.6*2.0-1 = +20% (best). Match 2: best edge is
    # draw at 0.30*3.4-1 = +2%, below the 5% threshold, so no bet.
    assert len(bets) == 1
    bet = bets.iloc[0]
    assert bet["pick"] == "home" and bet["won"]
    assert abs(bet["edge"] - 0.20) < 1e-9
    assert abs(bet["profit"] - 1.0) < 1e-9
    summary = summarize_bets(bets)
    assert summary["bets"] == 1 and summary["roi"] == 1.0


def test_command_line_runs_end_to_end(tmp_path):
    matches, _ = make_league(seasons=(2015, 2016, 2017, 2018), seed=12)
    for season, group in matches.groupby("season"):
        folder = tmp_path / "data" / season_code(season)
        folder.mkdir(parents=True)
        to_football_data_csv(group).to_csv(folder / "E0.csv", index=False)

    result = subprocess.run(
        [
            sys.executable, "run_backtest.py",
            "--leagues", "E0", "--extra-leagues",
            "--first-season", "2018", "--last-season", "2018",
            "--data-dir", str(tmp_path / "data"),
            "--output-dir", str(tmp_path / "out"),
        ],
        cwd=ROOT, capture_output=True, text=True, timeout=300,
    )

    assert result.returncode == 0, result.stderr
    assert "Verdict:" in result.stdout
    preds = pd.read_csv(tmp_path / "out" / "predictions.csv")
    assert len(preds) == 380
    assert (tmp_path / "out" / "bets.csv").exists()
