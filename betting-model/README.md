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

## Tests

```bash
pytest
```
