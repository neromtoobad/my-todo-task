#!/bin/sh
# Concatenate the Party Mode engine into the single-file logic.js the game template expects.
# (The original single-player engine lives on in engine/ but is no longer built.)
cd "$(dirname "$0")"
cat party/01_core.js party/02_grid.js party/03_map.js party/04_lobby.js party/05_play.js party/06_meet.js party/07_bots.js party/08_api.js > app/src/logic.js
echo "logic.js: $(wc -c < app/src/logic.js) bytes"
