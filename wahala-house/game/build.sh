#!/bin/sh
# Concatenate the engine parts into the single-file logic.js the game template expects.
cd "$(dirname "$0")"
cat engine/01_data.js engine/02_lines.js engine/03_core.js engine/04_world.js engine/05_player.js engine/06_events.js engine/07_api.js > app/src/logic.js
echo "logic.js: $(wc -c < app/src/logic.js) bytes"
