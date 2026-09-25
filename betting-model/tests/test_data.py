from pathlib import Path

import numpy as np
import pandas as pd

from betting_model.data import _read_csv, clean_season, load_matches, season_code

FIXTURES = Path(__file__).parent / "fixtures"


def test_season_code():
    assert season_code(2024) == "2425"
    assert season_code(1999) == "9900"
    assert season_code(2009) == "0910"


def test_clean_current_format():
    df = clean_season(_read_csv(FIXTURES / "E0_2425_sample.csv"), "E0", 2024)

    assert len(df) == 3  # the trailing blank row is dropped
    first = df.iloc[0]
    assert first["date"] == pd.Timestamp("2024-08-16")
    assert (first["home"], first["away"], first["hg"], first["ag"]) == ("Man United", "Fulham", 1, 0)
    assert first["b365_h"] == 1.6
    assert first["psc_h"] == 1.62
    assert first["avgc_o"] == 1.62
    assert first["ps_u"] == 2.26


def test_clean_old_format_uses_legacy_columns():
    df = clean_season(_read_csv(FIXTURES / "E0_1718_sample.csv"), "E0", 2017)

    assert df["date"].tolist() == [pd.Timestamp("2017-08-11"), pd.Timestamp("2017-08-12")]
    # Pre-2019 files call the market average "BbAv" instead of "Avg".
    assert df.loc[0, "avg_h"] == 1.51
    assert df.loc[0, "avg_o"] == 1.61
    assert df.loc[0, "max_u"] == 2.47
    # Columns that did not exist yet are missing, not zero.
    assert np.isnan(df.loc[0, "avgc_h"])
    assert np.isnan(df.loc[0, "psc_o"])


def test_odds_of_one_or_less_are_treated_as_missing():
    df = clean_season(_read_csv(FIXTURES / "E0_2425_sample.csv"), "E0", 2024)
    arsenal = df[df["home"] == "Arsenal"].iloc[0]
    assert np.isnan(arsenal["b365c_d"])


def test_load_matches_reads_cache_without_downloading(tmp_path):
    (tmp_path / "2425").mkdir()
    (tmp_path / "2425" / "E0.csv").write_bytes((FIXTURES / "E0_2425_sample.csv").read_bytes())

    matches = load_matches(["E0"], 2024, 2024, tmp_path)

    assert len(matches) == 3
    assert matches["date"].is_monotonic_increasing
