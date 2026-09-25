"""Results and upcoming fixtures from openfootball (free, public domain).

https://github.com/openfootball/football.json has one JSON file per league
and season, e.g. 2026-27/en.1.json, updated within a few days of each
match. There are no odds, but it lists upcoming fixtures, which the daily
3-in-a-row list needs.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

import pandas as pd

BASE_URL = "https://raw.githubusercontent.com/openfootball/football.json/master"

LEAGUES = {
    "en.1": "Premier League",
    "en.2": "Championship",
    "es.1": "La Liga",
    "de.1": "Bundesliga",
    "it.1": "Serie A",
    "fr.1": "Ligue 1",
    "nl.1": "Eredivisie",
    "pt.1": "Primeira Liga",
    "en.3": "League One",
    "es.2": "Segunda División",
    "de.2": "2. Bundesliga",
    "it.2": "Serie B",
    "fr.2": "Ligue 2",
    "br.1": "Brasileirão Série A",
    "br.2": "Brasileirão Série B",
}

# Leagues that run January to December; their files are named by year ("2026/br.1.json").
CALENDAR_YEAR = {"br.1", "br.2", "ar.1", "jp.1", "mls", "cn.1", "co.1"}

# Clubs that openfootball spells differently in different divisions. Mapped
# to the top-division spelling so a promoted team keeps its history.
ALIASES = {
    "Deportivo La Coruña": "RC Deportivo La Coruña",
    "Racing Santander": "Real Racing Club de Santander",
    "ESTAC Troyes": "ES Troyes AC",
}

MAX_AGE_SECONDS = 6 * 3600  # re-download the current season if the cached copy is older


def season_name(start_year: int, league: str = "") -> str:
    """2026 -> "2026-27" (or "2026" for calendar-year leagues)."""
    if league in CALENDAR_YEAR:
        return str(start_year)
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def season_of(date: pd.Timestamp) -> int:
    """Start year of the European season a date falls in (July onwards = new season)."""
    return date.year if date.month >= 7 else date.year - 1


def _fetch(league: str, start_year: int, data_dir: Path, current: bool) -> dict | None:
    folder = season_name(start_year, league)
    path = Path(data_dir) / folder / f"{league}.json"
    fresh = path.exists() and (not current or time.time() - path.stat().st_mtime < MAX_AGE_SECONDS)
    if not fresh:
        url = f"{BASE_URL}/{folder}/{league}.json"
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                content = response.read()
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None
            raise RuntimeError(f"Could not download {url}: {exc}") from exc
        except urllib.error.URLError as exc:
            if path.exists():
                print(f"warning: using cached {path} ({exc})")
                return json.loads(path.read_text())
            raise RuntimeError(f"Could not download {url}: {exc}") from exc
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    return json.loads(path.read_text())


def parse_season(data: dict, league: str, start_year: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split a season file into played results and unplayed fixtures."""
    results, fixtures = [], []
    for m in data["matches"]:
        row = {
            "date": pd.Timestamp(m["date"]),
            "time": m.get("time", ""),
            "season": start_year,
            "league": league,
            "home": ALIASES.get(m["team1"], m["team1"]),
            "away": ALIASES.get(m["team2"], m["team2"]),
        }
        score = m.get("score")
        # Full-time score is {"ft": [h, a], ...}; some goalless draws are stored as a bare [0, 0].
        if isinstance(score, dict) and score.get("ft"):
            row["hg"], row["ag"] = score["ft"]
            results.append(row)
        elif isinstance(score, list) and len(score) == 2:
            row["hg"], row["ag"] = score
            results.append(row)
        else:
            fixtures.append(row)
    columns = ["date", "time", "season", "league", "home", "away"]
    return pd.DataFrame(results, columns=columns + ["hg", "ag"]), pd.DataFrame(fixtures, columns=columns)


def load(leagues: list[str], first_season: int, last_season: int, data_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Results and fixtures for every league/season; missing files are skipped.

    Seasons are European start years. Calendar-year leagues also load the
    following year, because 2026/27 in Europe overlaps both 2026 and 2027.
    """
    all_results, all_fixtures, missing = [], [], []
    for league in leagues:
        last = last_season + 1 if league in CALENDAR_YEAR else last_season
        for year in range(first_season, last + 1):
            data = _fetch(league, year, data_dir, current=year >= last_season)
            if data is None:
                missing.append(f"{league} {season_name(year, league)}")
                continue
            results, fixtures = parse_season(data, league, year)
            all_results.append(results)
            all_fixtures.append(fixtures)
    if missing:
        print(f"note: not on openfootball (skipped): {', '.join(missing)}")
    results = pd.concat(all_results, ignore_index=True)
    results[["hg", "ag"]] = results[["hg", "ag"]].astype(int)
    fixtures = pd.concat(all_fixtures, ignore_index=True)
    # Empty frames (e.g. a finished season has no fixtures) make concat fall back to object dtype.
    results["date"] = pd.to_datetime(results["date"])
    fixtures["date"] = pd.to_datetime(fixtures["date"])
    return results.sort_values("date").reset_index(drop=True), fixtures.sort_values(["date", "time"]).reset_index(drop=True)
