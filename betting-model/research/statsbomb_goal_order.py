"""Build a table of goal sequences from StatsBomb's free event data.

For every match in the chosen competitions, records the order in which the
goals went in (e.g. "HHAH" = home, home, away, home), counting own goals for
the team credited with them and ignoring penalty shootouts. Each sequence is
checked against the official final score.

Data: https://github.com/statsbomb/open-data (free, attribution required:
"Data provided by StatsBomb"). Needs internet access to
raw.githubusercontent.com. Output goes to data/goal_sequences.csv.

    python research/statsbomb_goal_order.py
"""

from __future__ import annotations

import csv
import gzip
import http.client
import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAW = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
OUT = Path(__file__).parent.parent / "data" / "goal_sequences.csv"

# (competition_id, season_id): complete 2015/16 seasons in the open data.
COMPETITIONS = {
    (2, 27): "Premier League 2015/16",
    (11, 27): "La Liga 2015/16",
    (12, 27): "Serie A 2015/16",
    (7, 27): "Ligue 1 2015/16",
}


def fetch_json(url: str, attempts: int = 4):
    request = urllib.request.Request(url, headers={"Accept-Encoding": "gzip"})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = response.read()
                if response.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
            return json.loads(body)
        except (OSError, http.client.HTTPException, ValueError):
            if attempt == attempts - 1:
                raise
            time.sleep(2 ** (attempt + 1))


def goal_sequence(events: list[dict], home_team: str) -> tuple[str, list[str]]:
    """Goals in match order as a string of H/A, plus their match clocks."""
    goals = []
    for e in events:
        if e["period"] > 4:  # penalty shootout
            continue
        kind = e["type"]["name"]
        is_goal = (kind == "Shot" and e["shot"]["outcome"]["name"] == "Goal") or kind == "Own Goal For"
        if is_goal:
            side = "H" if e["team"]["name"] == home_team else "A"
            goals.append((e["period"], e["minute"], e["second"], e["index"], side))
    goals.sort()
    return "".join(g[4] for g in goals), [f"{g[1]}:{g[2]:02d}" for g in goals]


def process(match: dict, label: str) -> dict:
    events = fetch_json(f"{RAW}/events/{match['match_id']}.json")
    home = match["home_team"]["home_team_name"]
    sequence, clocks = goal_sequence(events, home)
    return {
        "match_id": match["match_id"],
        "competition": label,
        "date": match["match_date"],
        "home": home,
        "away": match["away_team"]["away_team_name"],
        "hg": match["home_score"],
        "ag": match["away_score"],
        "sequence": sequence,
        "goal_times": " ".join(clocks),
        "matches_score": sequence.count("H") == match["home_score"] and sequence.count("A") == match["away_score"],
    }


def main() -> None:
    jobs = []
    for (comp, season), label in COMPETITIONS.items():
        matches = fetch_json(f"{RAW}/matches/{comp}/{season}.json")
        jobs += [(m, label) for m in matches]
    print(f"Fetching events for {len(jobs)} matches...")

    rows = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, row in enumerate(pool.map(lambda job: process(*job), jobs), 1):
            rows.append(row)
            if i % 100 == 0:
                print(f"  {i}/{len(jobs)}", flush=True)

    rows.sort(key=lambda r: (r["competition"], r["date"], r["home"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    mismatched = [r for r in rows if not r["matches_score"]]
    print(f"Saved {len(rows)} matches to {OUT}; {len(mismatched)} disagree with the official score")
    for r in mismatched[:10]:
        print(f"  {r['home']} {r['hg']}-{r['ag']} {r['away']}: events say {r['sequence']!r}")
    if mismatched:
        sys.exit(1)


if __name__ == "__main__":
    main()
