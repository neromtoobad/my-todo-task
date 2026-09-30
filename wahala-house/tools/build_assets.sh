#!/bin/bash
# Build every Wahala House runtime asset into $1 (the game's public/assets).
# Needs: curl, python3 + Pillow, ffmpeg, node + @gltf-transform/cli (installed here).
set -e
OUT=$1; SHA=$2
W=/home/user/wh; mkdir -p $W/src && cd $W
[ -d node_modules/@gltf-transform/cli ] || npm i @gltf-transform/cli@4 three@0.169.0 >/dev/null 2>&1
[ -x /home/user/node22/bin/node ] || (cd /home/user && curl -sfL https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz | tar xJ && mv node-v22.11.0-linux-x64 node22)
GT="/home/user/node22/bin/node $W/node_modules/@gltf-transform/cli/bin/cli.js"
RAW=https://raw.githubusercontent.com/neromtoobad/my-todo-task/$SHA/wahala-house/tools
curl -sf -o assets.json $RAW/assets.json; curl -sf -o anims.py $RAW/anims.py; curl -sf -o crop.py $RAW/crop.py
mkdir -p $OUT/chars $OUT/props $OUT/anim $OUT/portraits $OUT/tex $OUT/img $OUT/audio
get() { [ -s "$2" ] || curl -sf --retry 3 -o "$2" "$1"; }
export -f get
python3 - <<'PY' > dl.txt
import json
m=json.load(open('assets.json'))
ext=lambda u:u.rsplit('.',1)[1]
for grp,items in m.items():
    for k,u in items.items(): print(u, f"src/{grp}_{k}.{ext(u)}")
PY
cat dl.txt | xargs -P 8 -n 2 bash -c 'get "$0" "$1"'
echo "downloaded $(ls src | wc -l)"
# Characters and props: 1024px webp textures, meshopt geometry.
for f in src/chars_*.glb; do k=$(basename $f .glb); k=${k#chars_}; $GT optimize $f $OUT/chars/$k.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --join false --instance false --palette false >/dev/null 2>&1 || echo "FAIL char $k"; done
for f in src/props_*.glb; do k=$(basename $f .glb); k=${k#props_}; $GT optimize $f $OUT/props/$k.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false >/dev/null 2>&1 || echo "FAIL prop $k"; done
# Animation library.
args=""; for f in src/clips_*.glb; do k=$(basename $f .glb); k=${k#clips_}; args="$args $k=$f"; done
python3 anims.py $OUT/anim/lib.json $args
# Portraits, textures, images.
python3 crop.py $OUT
# Audio.
for f in src/music_*.m4a; do k=$(basename $f .m4a); k=${k#music_}; ffmpeg -y -loglevel error -i $f -ac 2 -b:a 80k $OUT/audio/$k.mp3; done
for f in src/sfx_*.mp3; do k=$(basename $f .mp3); k=${k#sfx_}; ffmpeg -y -loglevel error -i $f -ac 1 -b:a 96k $OUT/audio/$k.mp3; done
for f in src/vo_*.wav; do k=$(basename $f .wav); k=${k#vo_}; ffmpeg -y -loglevel error -i $f -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse" -ac 1 -b:a 80k $OUT/audio/$k.mp3; done
# three.js, vendored.
V=$OUT/../vendor/three; mkdir -p $V/build $V/examples/jsm/loaders $V/examples/jsm/utils $V/examples/jsm/libs $V/examples/jsm/geometries
cp node_modules/three/build/three.module.min.js $V/build/
cp node_modules/three/build/three.core.min.js $V/build/ 2>/dev/null || true
cp node_modules/three/examples/jsm/loaders/GLTFLoader.js $V/examples/jsm/loaders/
cp node_modules/three/examples/jsm/utils/SkeletonUtils.js node_modules/three/examples/jsm/utils/BufferGeometryUtils.js $V/examples/jsm/utils/
cp node_modules/three/examples/jsm/libs/meshopt_decoder.module.js $V/examples/jsm/libs/
cp node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js $V/examples/jsm/geometries/
du -sh $OUT/* $V
