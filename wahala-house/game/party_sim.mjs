// Party Mode simulator: checks the map data, then plays many all-AI games (one
// seat is a human who drops at the start so the AI takes over) and reports how
// they end. Also asserts that no housemate's view ever leaks a role.
import fs from "node:fs";
import * as G from "./app/src/logic.js";

const N = Number(process.argv[2] || 60);
const VERBOSE = process.argv.includes("-v");

// Reach into the engine's internals for map checks.
const src = fs.readFileSync(new URL("./app/src/logic.js", import.meta.url), "utf8").replace(/^export /gm, "");
const I = new Function(src + "; return { STATIONS, SPAWN, SEATS, walkable, findPath, roomAt };")();
let mapErr = 0;
for (const [id, st] of Object.entries(I.STATIONS)) {
  if (!I.walkable(st.x, st.z)) { console.log("STATION NOT WALKABLE", id, st.x, st.z); mapErr++; }
  else if (I.roomAt(st.x, st.z) !== st.room) { console.log("STATION ROOM MISMATCH", id, I.roomAt(st.x, st.z), "!=", st.room); mapErr++; }
  const path = I.findPath([16, 7.2], [st.x, st.z]);
  const end = path[path.length - 1];
  if (!end || Math.hypot(end[0] - st.x, end[1] - st.z) > 0.3) { console.log("STATION UNREACHABLE", id); mapErr++; }
}
for (const [x, z] of I.SPAWN) if (!I.walkable(x, z)) { console.log("SPAWN NOT WALKABLE", x, z); mapErr++; }
// The client's copy of stations and quick lines must match the server's.
const C = await import("./app/public/js/stations.js");
const Q = new Function(src + "; return { QUICK, ROOM_NAME };")();
for (const [id, st] of Object.entries(I.STATIONS)) {
  const c = C.STATIONS[id];
  if (!c || ["kind", "label", "room", "x", "z", "game", "dur"].some((k) => c[k] !== st[k])) { console.log("CLIENT STATION DRIFT", id); mapErr++; }
}
if (JSON.stringify(C.QUICK) !== JSON.stringify(Q.QUICK) || JSON.stringify(C.ROOM_NAME) !== JSON.stringify(Q.ROOM_NAME)) { console.log("CLIENT QUICK/ROOM DRIFT"); mapErr++; }
console.log("map check:", mapErr ? `${mapErr} problems` : "ok");

function play(seed) {
  let now = 1_000_000 + seed * 7919;
  let s = G.setup(["h1"]);
  const act = (pid, a) => {
    const full = Object.assign({}, a, { _now: now });
    const v = G.validateAction(s, pid, full);
    if (!v.ok) throw new Error(`rejected ${a.t}: ${v.error}`);
    s = G.applyAction(s, pid, full);
  };
  const sys = (pid, t) => { s = G.applyAction(s, pid, { t, _now: now }); };
  act("h1", { t: "hello", name: "Dimeji", look: "pf", room: "r-TEST" + seed });
  act("h1", { t: "opts", fill: 6 + (seed % 5) });
  act("h1", { t: "start" });
  sys("h1", "_leave");
  let ticks = 0, leaks = 0, meetings = 0, lastPhase = s.phase;
  const ejections = [];
  while (s.phase !== "END" && ticks < 20 * 60 * 5) {
    now += 200; ticks++;
    s = G.applyAction(s, "", { t: "_tick", _now: now });
    if (s.phase !== lastPhase) {
      if (s.phase === "MEET") meetings++;
      if (lastPhase === "VOTE" && s.res) ejections.push(s.res.out ? (s.ps.find((p) => p.id === s.res.out).role) : "-");
      lastPhase = s.phase;
    }
    if (ticks % 25 === 0 && s.phase !== "END") {
      JSON.stringify(s);
      for (const p of s.ps) {
        const v = G.viewFor(s, p.id);
        if (p.role === "H") for (const o of v.ps) if (o.role && o.id !== p.id) leaks++;
        const raw = JSON.stringify(v);
        if (raw.includes('"saw"') || raw.includes('"sus"')) leaks++;
      }
    }
  }
  const sab = s.ps.filter((p) => p.role === "S").map((p) => p.name);
  return { seed, n: s.ps.length, sabs: sab.length, win: s.end ? s.end.win : "TIMEOUT", why: s.end ? s.end.why : "", mins: +(ticks / 300).toFixed(1), meetings, ejections: ejections.join(""), strikes: Object.values(s.stats.strikes || {}).reduce((a, b) => a + b, 0), bar: G.viewFor(s, "h1").bar, leaks, kb: Math.round(JSON.stringify(s).length / 1024) };
}

const rows = [];
const t0 = Date.now();
for (let i = 1; i <= N; i++) {
  try { rows.push(play(i)); } catch (e) { console.log("CRASH seed", i, e.stack); process.exit(1); }
  if (VERBOSE) console.log(rows[rows.length - 1]);
}
const by = (k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
const avg = (k) => (rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(1);
const ej = rows.map((r) => r.ejections).join("");
console.log(JSON.stringify({
  games: rows.length, secs: ((Date.now() - t0) / 1000).toFixed(1), wins: by("win"),
  reasons: by("why"), avgMins: avg("mins"), avgMeetings: avg("meetings"), avgStrikes: avg("strikes"),
  ejected: { sab: (ej.match(/S/g) || []).length, housemate: (ej.match(/H/g) || []).length, nobody: (ej.match(/-/g) || []).length },
  leaks: rows.reduce((a, r) => a + r.leaks, 0), maxStateKB: Math.max(...rows.map((r) => r.kb)),
}, null, 1));
