// ---------------------------------------------------------------------------
// The house: walking, rooms, chore stations, spawn marks and meeting seats.
// ---------------------------------------------------------------------------

const W_HOUSE = GW * CELL, D_HOUSE = GD * CELL;

function blockedCell(i, j) { return i < 0 || j < 0 || i >= GW || j >= GD || GRID.charCodeAt(j * GW + i) === 35; }
function walkable(x, z) { return blockedCell(Math.floor(x / CELL), Math.floor(z / CELL)) === false; }
function inBounds(x, z) { return x >= 0 && z >= 0 && x <= W_HOUSE && z <= D_HOUSE; }

function nearestFree(x, z) {
  if (walkable(x, z)) return [x, z];
  for (let r = 0.5; r < 4; r += 0.25) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos((a * Math.PI) / 8) * r, pz = z + Math.sin((a * Math.PI) / 8) * r;
    if (walkable(px, pz)) return [px, pz];
  }
  return [x, z];
}

function clearLine(a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.ceil(d / (CELL * 0.5));
  for (let i = 1; i < n; i++) { const t = i / n; if (!walkable(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
  return true;
}

/** A* over the grid with string pulling. Returns [[x, z], ...] ending at `to`. */
function findPath(from, to) {
  const [fx, fz] = nearestFree(from[0], from[1]);
  const [tx, tz] = nearestFree(to[0], to[1]);
  const s0 = Math.floor(fz / CELL) * GW + Math.floor(fx / CELL), g = Math.floor(tz / CELL) * GW + Math.floor(tx / CELL);
  if (s0 === g) return [[tx, tz]];
  const gi = g % GW, gj = (g / GW) | 0;
  const h = (k) => Math.hypot((k % GW) - gi, ((k / GW) | 0) - gj);
  const open = [s0], came = {}, gs = { [s0]: 0 }, fs = { [s0]: h(s0) }, inOpen = { [s0]: 1 };
  let guard = 0, found = false;
  while (open.length && guard++ < 5000) {
    let bi = 0;
    for (let q = 1; q < open.length; q++) if (fs[open[q]] < fs[open[bi]]) bi = q;
    const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop(); delete inOpen[cur];
    if (cur === g) { found = true; break; }
    const ci = cur % GW, cj = (cur / GW) | 0;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (blockedCell(ni, nj)) continue;
      if (di && dj && (blockedCell(ci + di, cj) || blockedCell(ci, cj + dj))) continue;
      const nk = nj * GW + ni;
      const t = gs[cur] + (di && dj ? 1.414 : 1);
      if (gs[nk] === undefined || t < gs[nk]) {
        came[nk] = cur; gs[nk] = t; fs[nk] = t + h(nk);
        if (!inOpen[nk]) { open.push(nk); inOpen[nk] = 1; }
      }
    }
  }
  if (!found) return [[tx, tz]];
  const cells = [];
  for (let k = g; k !== s0; k = came[k]) cells.push(k);
  cells.reverse();
  const pts = cells.map((k) => [(k % GW) * CELL + CELL / 2, ((k / GW) | 0) * CELL + CELL / 2]);
  pts[pts.length - 1] = [tx, tz];
  const out = [];
  let anchor = [fx, fz];
  for (let i = 0; i < pts.length; i++) {
    const next = pts[i + 1];
    if (next && clearLine(anchor, next)) continue;
    out.push([Math.round(pts[i][0] * 100) / 100, Math.round(pts[i][1] * 100) / 100]);
    anchor = pts[i];
  }
  return out;
}

const ROOM_RECTS = [
  ["hoh", 23, 0, 30, 8],
  ["gym", 11, 10, 16, 15],
  ["kitchen", 0, 0, 11, 10],
  ["lounge", 11, 0, 23, 10],
  ["bedroom", 0, 10, 11, 22],
  ["garden", 0, 8, 36, 26],
];
const ROOM_NAME = { lounge: "lounge", kitchen: "kitchen", garden: "garden", bedroom: "bedroom", gym: "gym", hoh: "HoH lounge" };
function roomAt(x, z) {
  for (const [id, x0, z0, x1, z1] of ROOM_RECTS) if (x >= x0 && x < x1 && z >= z0 && z < z1) return id;
  return "garden";
}

/**
 * Stations: where you stand to do something. game is the client mini-game,
 * dur the seconds it takes. Fix stations only matter during a sabotage.
 */
const STATIONS = {
  jollof: { kind: "task", label: "Stir the jollof", room: "kitchen", x: 3.6, z: 1.45, f: Math.PI, game: "stir", dur: 5 },
  plates: { kind: "task", label: "Wash the plates", room: "kitchen", x: 7.4, z: 1.45, f: Math.PI, game: "scrub", dur: 5 },
  fridge: { kind: "task", label: "Restock the fridge", room: "kitchen", x: 10.1, z: 1.5, f: Math.PI, game: "tapall", dur: 5 },
  money: { kind: "task", label: "Count the market money", room: "lounge", x: 16, z: 4.6, f: Math.PI, game: "order", dur: 5 },
  aerial: { kind: "task", label: "Fix the TV aerial", room: "lounge", x: 21.7, z: 1.9, f: Math.PI, game: "dial", dur: 5 },
  cushions: { kind: "task", label: "Arrange the cushions", room: "lounge", x: 13.3, z: 3.6, f: -Math.PI / 2, game: "tapall", dur: 4 },
  crown: { kind: "task", label: "Polish the HoH crown", room: "hoh", x: 26.5, z: 3.3, f: Math.PI, game: "scrub", dur: 4 },
  jacuzzi: { kind: "task", label: "Skim the jacuzzi", room: "hoh", x: 27, z: 7.2, f: Math.PI / 2, game: "tapall", dur: 5 },
  weights: { kind: "task", label: "Rack the weights", room: "gym", x: 15.2, z: 11.5, f: Math.PI, game: "rhythm", dur: 5 },
  laundry: { kind: "task", label: "Fold the laundry", room: "bedroom", x: 5.5, z: 11.4, f: Math.PI, game: "tapall", dur: 5 },
  beds: { kind: "task", label: "Make the beds", room: "bedroom", x: 3.1, z: 15.4, f: -Math.PI / 2, game: "order", dur: 4 },
  pool: { kind: "task", label: "Skim the pool", room: "garden", x: 20, z: 15.6, f: 0, game: "tapall", dur: 5 },
  plantain: { kind: "task", label: "Water the plantain", room: "garden", x: 14.6, z: 23.8, f: Math.PI, game: "hold", dur: 4 },
  sweep: { kind: "task", label: "Sweep the compound", room: "garden", x: 24.5, z: 12.6, f: Math.PI / 4, game: "scrub", dur: 5 },
  gen: { kind: "fix", label: "Fix the gen", room: "garden", x: 34.2, z: 15, f: Math.PI / 2, game: "pull", dur: 3 },
  gas1: { kind: "fix", label: "Close the gas valve", room: "kitchen", x: 0.95, z: 3, f: -Math.PI / 2, game: "hold", dur: 2 },
  gas2: { kind: "fix", label: "Close the gas valve", room: "garden", x: 34.9, z: 22, f: Math.PI / 2, game: "hold", dur: 2 },
  bell: { kind: "bell", label: "Ring Mama Eye's bell", room: "lounge", x: 18.6, z: 6.4, f: Math.PI, game: null, dur: 0 },
};
const TASK_IDS = Object.keys(STATIONS).filter((k) => STATIONS[k].kind === "task");
/** Chores anyone watching can see finished (a tick pops over your head). Saboteurs can only fake them. */
const VISUAL = new Set(["jollof", "weights", "sweep", "pool", "plantain"]);
const TASKS_EACH = 7;

/** Where everyone stands when a round starts or a meeting ends. */
const SPAWN = [
  [13.2, 7.2], [14.6, 8.6], [16, 7.2], [17.4, 8.6], [18.8, 7.2],
  [20.2, 8.6], [21.4, 7.2], [13.2, 9.2], [16, 9.3], [19.2, 9.3],
];
/** Meeting marks: the lounge sofas, the armchairs, and two standing spots. */
const SEATS = [
  [13.6, 1.35, 0], [14.8, 1.35, 0], [16, 1.35, 0], [17.2, 1.35, 0], [18.4, 1.35, 0],
  [12.35, 2.9, Math.PI / 2], [12.35, 4.2, Math.PI / 2], [21.1, 3, -Math.PI / 2], [21.1, 5.2, -Math.PI / 2], [16, 5.5, Math.PI],
];
