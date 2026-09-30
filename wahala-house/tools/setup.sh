# Sandbox bootstrap for Wahala House asset tooling. Source with: . setup.sh <sha>
SHA=${1:-claude/peaceful-feynman-d19sbj}
W=/home/user/wh; mkdir -p $W/tools && cd $W
[ -d node_modules/three ] || { npm init -y >/dev/null; npm i three@0.169.0 >/dev/null 2>&1; }
for f in view.html shot.cjs; do curl -sf -o tools/$f "https://raw.githubusercontent.com/neromtoobad/my-todo-task/$SHA/wahala-house/tools/$f"; done
pgrep -f "http.server 8811" >/dev/null || (python3 -m http.server 8811 >/dev/null 2>&1 &)
export NODE_PATH=$(npm root -g)
