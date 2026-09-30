// Fuzz simulator for the Wahala House engine: plays many seasons with a random
// bot, checks it never crashes, always finishes, replays deterministically and
// never leaks hidden roles through viewFor.
import * as G from "./app/src/logic.js";

const N = Number(process.argv[2] || 300);
const VERBOSE = process.argv.includes("-v");

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function botAction(v, rand, style) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  if (v.phase === "EV") {
    const it = v.ev.item;
    if (!it) return { t: "next" };
    if (it.b) return { t: "next" };
    if (it.c) {
      const vals = it.c.o.map((o) => o.v);
      if (it.c.n > 1) { const sh = vals.slice().sort(() => rand() - 0.5); return { t: "pick", v: sh.slice(0, it.c.n) }; }
      return { t: "pick", v: pick(vals) };
    }
    if (it.m) {
      if (it.m.g === "jollof") return { t: "score", v: Math.floor(rand() * 4000) };
      if (it.m.g === "dance") return { t: "score", v: Math.floor(rand() * 101) };
      return { t: "score", v: { profit: Math.floor(rand() * 4000000), skim: v.you.role === "S" && rand() < 0.5 ? Math.floor(rand() * 800000) : 0 } };
    }
  }
  if (v.phase === "ROAM") {
    const x = rand();
    if (v.you.out) return { t: "ff" };
    if (style === "passive") return rand() < 0.2 ? { t: "ff" } : { t: "tick" };
    const here = v.hm.filter((h) => !h.out && h.room === v.you.room && h.act !== "sleep");
    const sc = v.scenes.find((z) => z.room === v.you.room && !z.heard);
    if (sc && x < 0.5) return { t: "listen", id: sc.id };
    if (x < 0.15) return { t: "room", room: pick(["lounge", "kitchen", "garden", "bedroom", "gym"]) };
    if (x < 0.55 && here.length && v.you.energy > 0) {
      const t = pick(here);
      const acts = ["chat", "joke", "compliment", "deep", "hug", "flirt", "askout", "kiss", "gist", "setup", "asksave", "squad", "swear", "shade", "argue", "accuse", "apologize", "peace", "gift", "bribe", "receipt"];
      const act = pick(acts);
      const others = v.hm.filter((h) => !h.out && h.id !== t.id).map((h) => h.id);
      return { t: "talk", who: t.id, act, x: pick(others), claim: pick(["likes", "hates", "fake", "sab", "using"]) };
    }
    if (x < 0.6) return { t: "buy", item: pick(["peek", "immunity"]) };
    if (x < 0.65) return { t: "rest" };
    if (x < 0.75) return { t: "ff" };
    return { t: "tick" };
  }
  return null;
}

function playSeason(seed, fate, style) {
  const rand = rng(seed * 7 + 3);
  let st = G.setup(["p1"]);
  const start = { t: "start", name: "Dimeji", look: seed % 2 ? "m" : "f", fate, seed };
  if (!G.validateAction(st, "p1", start).ok) throw new Error("start rejected");
  st = G.applyAction(st, "p1", start);
  const trace = [start];
  let steps = 0, rejected = 0, maxSize = 0;
  while (st.phase !== "END" && steps < 20000) {
    steps += 1;
    const v = G.viewFor(st, "p1");
    // Leak check: other roles are hidden unless partner, ejected or game over.
    for (const h of v.hm) if (h.role && !(h.sab || h.out === "ejected" || v.phase === "END")) throw new Error(`role leak ${h.id}`);
    for (const sc of v.scenes) if (sc.lines) throw new Error("scene lines leaked");
    const a = botAction(v, rand, style);
    if (!a) throw new Error("bot stuck in " + st.phase);
    const ok = G.validateAction(st, "p1", a);
    if (!ok.ok) { rejected += 1; if (a.t !== "talk" && a.t !== "buy" && a.t !== "rest" && a.t !== "listen" && a.t !== "room") throw new Error(`rejected ${JSON.stringify(a)}: ${ok.error} (phase ${st.phase})`); const tick = { t: st.phase === "ROAM" ? "tick" : "next" }; if (G.validateAction(st, "p1", tick).ok) { st = G.applyAction(st, "p1", tick); trace.push(tick); } continue; }
    st = G.applyAction(st, "p1", a);
    trace.push(a);
    const size = JSON.stringify(st).length;
    if (size > maxSize) maxSize = size;
  }
  if (st.phase !== "END") throw new Error(`did not finish (day ${st.day} ${st.min} phase ${st.phase})`);
  return { st, trace, steps, rejected, maxSize };
}

function replay(trace) {
  let st = G.setup(["p1"]);
  for (const a of trace) st = G.applyAction(st, "p1", a);
  return st;
}

const stats = { n: 0, out: {}, grade: {}, sabExposed: 0, struckMe: 0, evictedMe: 0, survive: 0, steps: 0, maxSize: 0, rejected: 0 };
for (let i = 0; i < N; i++) {
  const fate = ["random", "housemate", "saboteur"][i % 3];
  const style = i % 4 === 0 ? "passive" : "active";
  let res;
  try { res = playSeason(1000 + i, fate, style); }
  catch (e) { console.error(`season ${i} (${fate}, ${style}) crashed:`, e.stack || e); process.exit(1); }
  const R = res.st.result;
  stats.n += 1; stats.steps += res.steps; stats.rejected += res.rejected;
  stats.maxSize = Math.max(stats.maxSize, res.maxSize);
  stats.grade[R.grade] = (stats.grade[R.grade] || 0) + 1;
  const how = R.out ? R.out.how : "survived";
  stats.out[how] = (stats.out[how] || 0) + 1;
  if (R.exposed.length) stats.sabExposed += 1;
  if (i < 20) {
    const again = replay(res.trace);
    if (JSON.stringify(again) !== JSON.stringify(res.st)) { console.error("non-deterministic replay in season", i); process.exit(1); }
  }
  if (VERBOSE && i < 3) console.log(JSON.stringify(R, null, 1).slice(0, 1500));
}
console.log(JSON.stringify({ seasons: stats.n, avgSteps: Math.round(stats.steps / stats.n), rejected: stats.rejected, maxStateKB: Math.round(stats.maxSize / 1024), outcomes: stats.out, grades: stats.grade, showdownExposures: stats.sabExposed }, null, 1));
