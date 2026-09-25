"""Download and clean match results + odds from football-data.co.uk.

Each season/league is one CSV at
https://www.football-data.co.uk/mmz4281/{season_code}/{league}.csv
where season_code is e.g. "2425" for 2024/25. Column meanings are listed at
https://www.football-data.co.uk/notes.txt.

Files are cached under ``data_dir`` so each one is only downloaded once.
"""

from __future__ import annotations

import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

BASE_URL = "https://www.football-data.co.uk/mmz4281"

LEAGUE_NAMES = {
    "E0": "Premier League",
    "E1": "Championship",
    "E2": "League One",
    "E3": "League Two",
    "SC0": "Scottish Premiership",
    "D1": "Bundesliga",
    "I1": "Serie A",
    "SP1": "La Liga",
    "F1": "Ligue 1",
    "N1": "Eredivisie",
    "P1": "Primeira Liga",
}

# Bookmaker odds columns. Each entry lists candidate raw column names in
# priority order, because football-data.co.uk renamed some over the years
# (e.g. "BbAvH" before 2019/20 became "AvgH"). A "C" after the bookmaker
# prefix means closing odds (e.g. PSCH = Pinnacle closing home win).
# Our names: {source}_{h,d,a,o,u} for pre-match odds and
# {source}c_{h,d,a,o,u} for closing odds, where o/u = over/under 2.5 goals.
ODDS_COLUMNS: dict[str, list[str]] = {
    # Pinnacle
    "ps_h": ["PSH"], "ps_d": ["PSD"], "ps_a": ["PSA"],
    "ps_o": ["P>2.5"], "ps_u": ["P<2.5"],
    "psc_h": ["PSCH"], "psc_d": ["PSCD"], "psc_a": ["PSCA"],
    "psc_o": ["PC>2.5"], "psc_u": ["PC<2.5"],
    # Bet365
    "b365_h": ["B365H"], "b365_d": ["B365D"], "b365_a": ["B365A"],
    "b365_o": ["B365>2.5"], "b365_u": ["B365<2.5"],
    "b365c_h": ["B365CH"], "b365c_d": ["B365CD"], "b365c_a": ["B365CA"],
    "b365c_o": ["B365C>2.5"], "b365c_u": ["B365C<2.5"],
    # Market average
    "avg_h": ["AvgH", "BbAvH"], "avg_d": ["AvgD", "BbAvD"], "avg_a": ["AvgA", "BbAvA"],
    "avg_o": ["Avg>2.5", "BbAv>2.5"], "avg_u": ["Avg<2.5", "BbAv<2.5"],
    "avgc_h": ["AvgCH"], "avgc_d": ["AvgCD"], "avgc_a": ["AvgCA"],
    "avgc_o": ["AvgC>2.5"], "avgc_u": ["AvgC<2.5"],
    # Best price across bookmakers
    "max_h": ["MaxH", "BbMxH"], "max_d": ["MaxD", "BbMxD"], "max_a": ["MaxA", "BbMxA"],
    "max_o": ["Max>2.5", "BbMx>2.5"], "max_u": ["Max<2.5", "BbMx<2.5"],
    "maxc_h": ["MaxCH"], "maxc_d": ["MaxCD"], "maxc_a": ["MaxCA"],
    "maxc_o": ["MaxC>2.5"], "maxc_u": ["MaxC<2.5"],
}

MATCH_COLUMNS = ["date", "season", "league", "home", "away", "hg", "ag"]


def season_code(start_year: int) -> str:
    """2024 -> "2425" (the 2024/25 season)."""
    return f"{start_year % 100:02d}{(start_year + 1) % 100:02d}"


def download_season(league: str, start_year: int, data_dir: Path, refresh: bool = False) -> Path:
    """Download one league-season CSV into the cache and return its path."""
    code = season_code(start_year)
    path = Path(data_dir) / code / f"{league}.csv"
    if path.exists() and not refresh:
        return path

    url = f"{BASE_URL}/{code}/{league}.csv"
    request = urllib.request.Request(url, headers={"User-Agent": "betting-model/0.1"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read()
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Could not download {url} ({exc}). Check your internet connection, "
            f"or download the file yourself and save it as {path}."
        ) from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def _read_csv(path: Path) -> pd.DataFrame:
    try:
        return pd.read_csv(path, encoding="utf-8-sig")
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="latin-1")


def _parse_dates(raw: pd.Series) -> pd.Series:
    # Older files use dd/mm/yy, newer ones dd/mm/yyyy.
    dates = pd.to_datetime(raw, format="%d/%m/%Y", errors="coerce")
    short = pd.to_datetime(raw, format="%d/%m/%y", errors="coerce")
    return dates.fillna(short)


def clean_season(raw: pd.DataFrame, league: str, start_year: int) -> pd.DataFrame:
    """Turn one raw football-data.co.uk CSV into our standard columns."""
    raw = raw.dropna(subset=["HomeTeam", "AwayTeam", "FTHG", "FTAG"])
    df = pd.DataFrame(
        {
            "date": _parse_dates(raw["Date"]),
            "season": start_year,
            "league": league,
            "home": raw["HomeTeam"].str.strip(),
            "away": raw["AwayTeam"].str.strip(),
            "hg": raw["FTHG"].astype(int),
            "ag": raw["FTAG"].astype(int),
        }
    )
    for name, candidates in ODDS_COLUMNS.items():
        values = pd.Series(np.nan, index=raw.index)
        for column in candidates:
            if column in raw.columns:
                values = values.fillna(pd.to_numeric(raw[column], errors="coerce"))
        # Odds of 1.0 or less are data errors and would break the maths.
        df[name] = values.where(values > 1.0)

    if df["date"].isna().any():
        bad = raw.loc[df["date"].isna(), "Date"].head(3).tolist()
        raise ValueError(f"Unparseable dates in {league} {start_year}: {bad}")
    return df.reset_index(drop=True)


def load_matches(
    leagues: list[str],
    first_season: int,
    last_season: int,
    data_dir: Path,
    refresh: bool = False,
) -> pd.DataFrame:
    """Load every league for every season in [first_season, last_season].

    Seasons are given by their starting year, so 2024 means 2024/25.
    Missing seasons (e.g. one that has not started yet) are skipped with a
    warning rather than stopping the whole run.
    """
    frames = []
    for year in range(first_season, last_season + 1):
        for league in leagues:
            try:
                path = download_season(league, year, data_dir, refresh=refresh)
            except RuntimeError as exc:
                print(f"warning: skipping {league} {year}/{year + 1}: {exc}")
                continue
            frames.append(clean_season(_read_csv(path), league, year))
    if not frames:
        raise RuntimeError("No match data could be loaded.")
    matches = pd.concat(frames, ignore_index=True)
    return matches.sort_values(["date", "league", "home"]).reset_index(drop=True)
