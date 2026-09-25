import json
import subprocess
import sys
from pathlib import Path

import pandas as pd

from betting_model.openfootball import load, parse_season, season_name, season_of

from .synthetic import make_league

ROOT = Path(__file__).parent.parent


def test_season_helpers():
    assert season_name(2026) == "2026-27"
    assert season_name(2026, "br.1") == "2026"  # Brazil runs January to December
    assert season_of(pd.Timestamp("2026-09-25")) == 2026
    assert season_of(pd.Timestamp("2027-03-01")) == 2026


def test_parse_season_splits_results_and_fixtures():
    data = {
        "matches": [
            {"date": "2026-08-21", "time": "20:00", "team1": "Arsenal FC", "team2": "Coventry City FC",
             "score": {"ft": [3, 0], "ht": [2, 0]}},
            # Some goalless draws are stored as a bare list.
            {"date": "2026-08-22", "time": "15:00", "team1": "Fulham FC", "team2": "Everton FC", "score": [0, 0]},
            {"date": "2026-10-10", "time": "12:30", "team1": "Arsenal FC", "team2": "Leeds United FC"},
            # Spelled differently in the second division; mapped to the top-flight name.
            {"date": "2026-10-11", "time": "21:00", "team1": "Racing Santander", "team2": "Valencia CF"},
        ]
    }
    results, fixtures = parse_season(data, "en.1", 2026)

    assert results[["home", "hg", "ag"]].values.tolist() == [["Arsenal FC", 3, 0], ["Fulham FC", 0, 0]]
    assert fixtures["home"].tolist() == ["Arsenal FC", "Real Racing Club de Santander"]
    assert fixtures["date"].iloc[0] == pd.Timestamp("2026-10-10")


def _write_openfootball(matches: pd.DataFrame, folder: Path, unplayed_from: pd.Timestamp) -> None:
    for season, group in matches.groupby("season"):
        entries = []
        for m in group.itertuples():
            entry = {"date": m.date.strftime("%Y-%m-%d"), "time": "15:00", "team1": m.home, "team2": m.away}
            if m.date < unplayed_from:
                entry["score"] = {"ft": [int(m.hg), int(m.ag)]}
            entries.append(entry)
        path = folder / season_name(season) / "en.1.json"
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps({"name": "Test League", "matches": entries}))


def test_load_reads_cached_files(tmp_path):
    matches, _ = make_league("en.1", seasons=(2025, 2026), seed=21)
    _write_openfootball(matches, tmp_path, unplayed_from=pd.Timestamp("2026-10-01"))

    results, fixtures = load(["en.1"], 2025, 2026, tmp_path)

    assert len(results) + len(fixtures) == len(matches)
    assert results["date"].max() < pd.Timestamp("2026-10-01") <= fixtures["date"].min()


def test_daily_list_runs_end_to_end(tmp_path):
    matches, _ = make_league("en.1", seasons=(2023, 2024, 2025, 2026), seed=22)
    data = tmp_path / "data"
    _write_openfootball(matches, data, unplayed_from=pd.Timestamp("2026-10-01"))

    result = subprocess.run(
        [
            sys.executable, "three_in_a_row.py",
            "--date", "2026-10-01", "--days", "7",
            "--leagues", "en.1", "--extra-leagues",
            "--data-dir", str(data), "--output-dir", str(tmp_path / "out"),
        ],
        cwd=ROOT, capture_output=True, text=True, timeout=300,
    )

    assert result.returncode == 0, result.stderr
    assert "3 GOALS IN A ROW - NO" in result.stdout
    assert "SLIP BUILDER" in result.stdout
    out = pd.read_csv(tmp_path / "out" / "three_in_a_row_2026-10-01.csv")
    assert len(out) == 10  # one round of a 20-team league
    assert out["p_3row"].between(0.02, 0.8).all()
    assert (out["take_yes_at"] > out["fair_yes"]).all()


def test_slip_chance_of_winning_is_one_over_total_fair_odds(capsys):
    from three_in_a_row import print_slip

    rated = pd.DataFrame(
        {
            "home": ["A", "C", "E"], "away": ["B", "D", "F"],
            "p_side": [0.9, 0.8, 0.5], "fair_side": [1 / 0.9, 1 / 0.8, 2.0],
        }
    )
    print_slip(rated, "NO", slip_max=3.0)
    out = capsys.readouterr().out
    # 1/0.9 * 1/0.8 = 1.39 (72% all win); adding 2.0 gives 2.78 (36%), still under 3.
    assert "1.39" in out and "72%" in out
    assert "2.78" in out and "36%" in out
