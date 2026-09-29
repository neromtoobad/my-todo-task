// Fuzz the Oathbreakers engine: play many seasons with random legal actions and
// check the contract (purity, determinism, termination, no hidden-role leaks).
// Usage: node sim.mjs [seasons]
import * as L from "./app/src/logic.js";

const N = Number(process.argv[2] || 2000);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

function chooseAction(view, rnd) {
  const sc = view.sc;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const people = (view.roster || []).filter((p) => p.alive && !p.human).map((p) => p.id);
  switch (view.phase) {
    case "LOBBY": return { t: "start", name: "Tester", av: Math.floor(rnd() * 6), fame: pick(["ACTOR", "MUSICIAN", "ATHLETE", "INFLUENCER", "CHEF", "COMEDIAN"]), fate: pick(["random", "sworn", "oath"]), seed: Math.floor(rnd() * 1e9) };
    case "M_PLAY":
      if (sc.k === "M_VAULT") return { t: "mscore", score: Math.floor(rnd() * 7) };
      if (sc.k === "M_LANTERN") return { t: "mscore", score: Math.floor(rnd() * 21) };
      return { t: "mchoice", i: Math.floor(rnd() * sc.opts.length) };
    case "GALLERY": {
      const x = rnd();
      if (sc.talks > 0 && x < 0.6) {
        if (rnd() < 0.2) return { t: "talk", who: pick(people), text: pick(["I think it's Rafa", "who do you trust?", "hello there", "tell me about the mission", "I have a shield"]) };
        const q = Math.floor(rnd() * 5);
        return { t: "talk", who: pick(people), q, target: pick(people) };
      }
      if (sc.eaves > 0 && x < 0.75) return { t: "eaves" };
      return { t: "toRT" };
    }
    case "RT":
      if (sc.speaks > 0 && rnd() < 0.6) return { t: "speak", kind: pick(["accuse", "defend", "self", "silent"]), target: pick(people) };
      return { t: "toVote" };
    case "VOTE": return { t: "vote", target: pick(people), dagger: view.you.dagger > 0 && rnd() < 0.5 };
    case "REVEAL":
      if (sc.tie && !sc.tie.includes("you")) return { t: "vote", target: pick(sc.tie) };
      return { t: "next" };
    case "TOWER": {
      const opts = ["murder"];
      if (sc.canRecruit) opts.push("recruit");
      if (sc.canUlt) opts.push("ultimatum");
      return { t: pick(opts), target: pick(sc.targets) };
    }
    case "OFFER": return { t: "accept", yes: rnd() < 0.5 };
    case "LC": return { t: "endvote", end: rnd() < 0.5 };
    case "OUT": return { t: "watch" };
    default: return { t: "next" };
  }
}

function leakCheck(state, view) {
  const you = state.ps[0];
  for (const rv of view.roster) {
    if (rv.human) continue;
    const real = state.ps.find((p) => p.id === rv.id);
    if (rv.role === null) continue;
    const allowed = state.phase === "FINALE" || real.revealed || (you.role === "O" && real.role === "O");
    if (!allowed) throw new Error(`role leak: ${rv.id} in ${state.phase}`);
  }
  const json = JSON.stringify(view);
  if (json.includes('"sus"') || json.includes('"planned"')) throw new Error("internal state leaked into view");
}

const stats = { seasons: 0, steps: 0, sworn: 0, oath: 0, humanO: 0, out: 0, maxSteps: 0, maxBytes: 0, days: 0, rejected: 0 };
for (let g = 0; g < N; g++) {
  const rnd = mulberry(1000 + g);
  let state = L.setup(["p1"]);
  const actions = [];
  let steps = 0;
  while (!L.isGameOver(state).over) {
    if (steps++ > 400) throw new Error(`season ${g} did not terminate (phase ${state.phase}, day ${state.day})`);
    const view = L.viewFor(state, "p1");
    if (state.phase !== "LOBBY") leakCheck(state, view);
    const action = chooseAction(view, rnd);
    const v = L.validateAction(state, "p1", action);
    if (!v.ok) {
      stats.rejected++;
      // Fall back to a plain "next"/"toRT"/"toVote" if the random pick was illegal.
      const fb = { GALLERY: { t: "toRT" }, RT: { t: "toVote" } }[state.phase] || { t: "next" };
      const v2 = L.validateAction(state, "p1", fb);
      if (!v2.ok) throw new Error(`stuck in ${state.phase}: ${v.error} / ${v2.error} :: ${JSON.stringify(action)}`);
      actions.push(fb);
      state = L.applyAction(deepFreeze(state), "p1", fb);
    } else {
      actions.push(action);
      state = L.applyAction(deepFreeze(state), "p1", action);
    }
    const bytes = JSON.stringify(state).length;
    stats.maxBytes = Math.max(stats.maxBytes, bytes);
    if (JSON.stringify(JSON.parse(JSON.stringify(state))) !== JSON.stringify(state)) throw new Error("not serializable");
  }
  // Determinism: replay the same actions and compare.
  let replay = L.setup(["p1"]);
  for (const a of actions) replay = L.applyAction(replay, "p1", a);
  if (JSON.stringify(replay) !== JSON.stringify(state)) throw new Error(`season ${g} not deterministic`);
  const res = L.isGameOver(state);
  stats.seasons++;
  stats.steps += steps;
  stats.maxSteps = Math.max(stats.maxSteps, steps);
  stats.days += state.day;
  if (res.side === "O") stats.oath++; else stats.sworn++;
  if (state.ps[0].role === "O") stats.humanO++;
  if (!state.ps[0].alive) stats.out++;
}
console.log({
  ...stats,
  avgSteps: +(stats.steps / stats.seasons).toFixed(1),
  avgDays: +(stats.days / stats.seasons).toFixed(2),
  oathWinRate: +(stats.oath / stats.seasons).toFixed(3),
});
