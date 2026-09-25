# Football betting model

A Dixon-Coles goals model for the Premier League and Championship, and a
backtest that checks whether it beats bookmaker odds on past seasons.

This is the "prove it first" stage. It does not tell you what to bet this
weekend. It tells you whether the model would have made money over the
past few seasons, and whether that profit looks like skill or luck.

## Setup

Requires Python 3.10+ and internet access to `www.football-data.co.uk`.

```bash
cd betting-model
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run the backtest

```bash
python run_backtest.py
```

The defaults test the Premier League (`E0`) and Championship (`E1`) from
2018/19 to 2025/26, betting at Bet365's pre-match odds whenever the model
sees an edge of 5% or more. The first run downloads the CSVs into
`data/raw/`. Later runs reuse them and take under a minute.

Useful options:

| Option | Default | Meaning |
|---|---|---|
| `--leagues E0 E1` | `E0 E1` | Leagues to bet on. Others include `SC0`, `SP1`, `D1`, `I1`, `F1`. |
| `--extra-leagues E2` | `E2` | Leagues used only to rate promoted and relegated teams. |
| `--first-season` / `--last-season` | `2018` / `2025` | Seasons to test, by start year (`2018` = 2018/19). |
| `--bet-odds` | `b365` | Whose odds you bet at: `b365`, `ps` (Pinnacle), `avg` (market average), `max` (best price). |
| `--min-edge` | `0.05` | Bet only when the model's expected value is at least this. |
| `--refit-days` | `7` | Refit the model every N days. |
| `--xi` | `0.0019` | How fast old results fade. Higher values make recent form count more. |

Every prediction is saved to `output/predictions.csv` and every simulated
bet to `output/bets.csv`, so you can open them in a spreadsheet.

## How it works

1. **Data** (`betting_model/data.py`). Results and odds from
   [football-data.co.uk](https://www.football-data.co.uk/data.php). Each
   match includes pre-match odds from Bet365, Pinnacle, the market average
   and the best available price, plus the closing odds (the final price
   before kick-off).
2. **Model** (`betting_model/model.py`). Dixon-Coles gives every team an
   attack rating and a defence rating, plus a home advantage for each
   league. It turns those ratings into a probability for every scoreline,
   and from those into home/draw/away and over/under 2.5 goals. Recent
   matches count more than old ones. Leagues are fitted together, so a team
   promoted from League One arrives in the Championship with a rating.
3. **Backtest** (`betting_model/backtest.py`). The backtest replays each
   season in date order. Every match is predicted by a model that has only
   seen earlier results, and the model is refitted weekly. The tests check
   that no future result ever leaks into a prediction.

## Reading the report

For each market (1X2 and over/under 2.5) you get:

**Accuracy.** Log loss and Brier score measure how good the probabilities
are, and lower is better for both. "Market" means Pinnacle's closing odds
with the bookmaker's margin removed, which is the sharpest public price.
"No-skill baseline" always predicts the league's average rates. A useful
model sits between the two. If it beats the market, check for a bug first.

**Betting results.** These assume 1-unit flat stakes on the outcome with
the biggest edge in each match, and are shown for several edge thresholds.

- `roi`: profit per unit staked. `roi_low` to `roi_high` is a 95% range
  for the true ROI. If the range includes 0%, the result could easily be
  luck.
- `avg_clv`: closing line value, meaning how much better the odds you took
  were than the fair closing price, on average. **This is the number that
  matters most.** Closing odds are the market's best estimate, so beating
  them consistently is the most reliable sign of a real edge. Profit with
  negative CLV is usually luck. A small positive CLV sustained over
  hundreds of bets is how professionals decide a model is worth betting on.
- `beat_close`: the share of bets placed at better odds than the fair
  closing price.

In a trial run on made-up leagues where the odds equal the true
probabilities plus a 5% margin, no edge could exist. Even there,
individual seasons showed ROIs as high as +7.6% over about 500 bets. The
CLV column correctly showed -4.8% throughout. **Judge the model by CLV and
by the multi-season total, never by one good season.**

## Limitations

- The bookmaker's margin is removed by simple proportional scaling. This
  slightly overstates the chances of longshots.
- Pre-match odds on football-data.co.uk are collected on Friday afternoon
  for weekend games and Tuesday afternoon for midweek games. You may not
  get the same prices.
- There is no staking strategy yet: every bet is 1 unit.
- Bookmakers limit or close accounts that win consistently, especially
  Bet365.
- A good backtest is necessary but not sufficient: past edges shrink as
  markets get sharper.

## Next steps

- **Step 4: improve the model.** Try adding xG from Understat, tuning
  `--xi`, capping the odds you bet at, or combining the model with market
  odds. Keep a change only if the backtest's CLV improves.
- **Step 5: paper-trade.** Predict upcoming fixtures from
  football-data.co.uk's `fixtures.csv` and record the odds you could get
  against the closing odds for 4–6 weeks before staking real money.

## "3 goals in a row" (SportyBet)

SportyBet's "any team to score 3 goals in a row" market settles YES if
either team scores three straight goals without the other side scoring in
between (full time, including stoppage time; own goals count for the team
credited). NO wins otherwise.

### How the model prices it

The Dixon-Coles model gives the chance of every final score. For a given
final score, the model assumes every order of the goals is equally likely.
A 3-1 win, for example, is a streak in 2 of its 4 possible orders (HHHA and
AHHH yes; HAHH and HHAH no). Adding this up over all scores gives P(YES),
and P(NO) = 1 - P(YES). The code is in `betting_model/streaks.py`.

### Research findings

These come from `research/three_in_a_row_study.py`, run on 1,517 matches
with full goal order: the 2015/16 Premier League, La Liga, Serie A and
Ligue 1, using StatsBomb open data.

| Question | Finding |
|---|---|
| How often does it happen? | 21.7% of matches (between 19.5% in Serie A and 23.2% in the Premier League). Fair odds are about 4.60 for YES and 1.28 for NO. |
| For a given final score, is every goal order equally likely? | Yes, as far as this data can tell: 138 streaks against 130 expected in the matches where the order decided the bet (z = +1.1). |
| Can the model tell matches apart before kick-off? | Yes. The fifth of matches it rated least likely to have a streak had one 13.1% of the time, so NO won 87%. The fifth it rated most likely had one 34.7% of the time. |
| Are its probabilities accurate? | Mostly. Tested the way the daily list works (three seasons of ratings), matches rated 27% came in at 27% and matches rated 46% at 47%. At the safe end, matches rated 12% came in at 14%, so NO is about 2 points less certain than shown there. The default 5% edge in the "take at" price covers this. |

Limitations: the order-of-goals check and the accuracy test cover four top
European leagues from a single season. Other leagues use the same model but
have not been tested on real goal sequences.

### Daily list

```bash
python three_in_a_row.py                          # today's matches, NO side
python three_in_a_row.py --date 2026-10-10 --days 3
python three_in_a_row.py --side yes
```

This covers every league openfootball has current fixtures for: the
Premier League, Championship, La Liga, Bundesliga, Serie A, Ligue 1,
Eredivisie, Primeira Liga and Brazil's Série A. Second divisions are loaded
too, so promoted teams have ratings. Data comes from
[openfootball](https://github.com/openfootball/football.json) and is cached
in `data/openfootball/`.

For each match you get P(NO), the fair NO odds, and a **"take at"** price
(the fair odds plus a 5% edge). Find the match on SportyBet and only bet it
if SportyBet's NO price is at least the "take at" number.

The **slip builder** stacks the most likely legs and shows the total fair
odds and the chance that every leg wins, marking where the slip passes
3, 5 and 10 odds. At fair prices, a slip at total odds X wins about 1 time
in X: a 3-odds slip about a third of the time, a 10-odds slip about a
tenth. SportyBet's margin on every leg makes the real payout lower than the
fair total, which is why single bets are the better way to use any edge.

### Refreshing the research

```bash
python research/statsbomb_goal_order.py     # downloads about 500 MB, keeps a small CSV
python -m research.three_in_a_row_study
```

Goal-order data provided by StatsBomb (open data, free with attribution).

## Tests

```bash
pytest
```
