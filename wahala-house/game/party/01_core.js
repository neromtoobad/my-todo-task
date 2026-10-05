/**
 * WAHALA HOUSE: Party Mode.
 *
 * Five to ten players share the house. One or two of them are secret
 * Saboteurs. Housemates do chores to fill the task bar; Saboteurs fake chores,
 * strike housemates who are alone with them and sabotage the house. A body or
 * the emergency bell calls a House Meeting: everyone talks, then votes someone
 * out. AI housemates fill empty seats and take over for anyone who drops.
 *
 * Contract: six pure exports, no imports, no timers, no Math.random or
 * Date.now. The room injects the server clock as `action._now` and drives time
 * with `{t:"_tick"}` system actions; randomness is a seeded generator in state.
 */

export const meta = { game: "Wahala House", minPlayers: 1, maxPlayers: 10 };

// ---------------------------------------------------------------------------
// Timings (ms) and tuning
// ---------------------------------------------------------------------------

const T = {
  intro: 6500,
  firstKill: 12000,
  sabFirst: 15000,
  sabCd: 30000,
  gas: 40000,
  bellLock: 15000,
  result: 7500,
  fill: 30000,
  fillFull: 3000,
  away: 15000,
  endBack: 25000,
  taskSlack: 0.75,
};
const SPEED = { walk: 2.6, maxHuman: 6, slack: 1.2 };
const RANGE = { strike: 1.9, report: 2.6, use: 2.3, bell: 2.3 };
const VISION = { H: 6.5, S: 7.5, nepa: 2.6, close: 3.2 };
const OPTS_DEFAULT = { fill: 8, sabs: 0, kill: 40, discuss: 40, vote: 25, reveal: true };
const OPTS_ALLOWED = { fill: [5, 6, 7, 8, 9, 10], sabs: [0, 1, 2, 3], kill: [20, 25, 30, 35, 40, 50], discuss: [20, 30, 40, 60, 90], vote: [15, 20, 25, 30, 45], reveal: [true, false] };

/** Character looks a seat can wear: the ten housemates plus the two player models. */
const LOOKS = ["tobi", "ada", "musa", "ivie", "kunle", "ebi", "nedu", "nkoyo", "zee", "mekus", "pf", "pm"];
const CAST = {
  tobi: { name: "Tobi", ex: ["Omo!", "Chai!", "Odogwu!"] },
  ada: { name: "Ada", ex: ["Ehen!", "Nne!", "Chineke!"] },
  musa: { name: "Musa", ex: ["Hmm.", "Wallahi.", "Ah."] },
  ivie: { name: "Ivie", ex: ["Ehn ehn.", "Darling!", "Oya!"] },
  kunle: { name: "Kunle", ex: ["Jesu!", "Ah ah!", "Haba!"] },
  ebi: { name: "Ebi", ex: ["Tufiakwa!", "Abeg!", "See me see trouble!"] },
  nedu: { name: "Nedu", ex: ["Interesting.", "Omo.", "See ehn."] },
  nkoyo: { name: "Nkoyo", ex: ["Eh heh!", "My God!", "Nawa o!"] },
  zee: { name: "Zee", ex: ["Excuse me?", "Wow.", "Kai!"] },
  mekus: { name: "Mekus", ex: ["Nwanne!", "Ahn ahn!", "Hear me!"] },
  pf: { name: "Housemate", ex: ["Omo!", "Ehen!"] },
  pm: { name: "Housemate", ex: ["Omo!", "Chai!"] },
};
const BOT_ORDER = ["tobi", "ada", "musa", "ivie", "kunle", "ebi", "nedu", "nkoyo", "zee", "mekus"];

// ---------------------------------------------------------------------------
// Seeded randomness (mulberry32 over a uint32 kept in state)
// ---------------------------------------------------------------------------

function rnd(s) {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const R = {
  int: (s, n) => Math.floor(rnd(s) * n),
  pick: (s, a) => a[Math.floor(rnd(s) * a.length)],
  chance: (s, p) => rnd(s) < p,
  range: (s, a, b) => a + rnd(s) * (b - a),
  shuffle: (s, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
};
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clone = (o) => JSON.parse(JSON.stringify(o));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const pOf = (s, id) => s.ps.find((p) => p.id === id) || null;
const playing = (s) => s.ps.filter((p) => !p.spec);
const living = (s) => s.ps.filter((p) => !p.spec && p.alive);
const humans = (s) => s.ps.filter((p) => !p.bot);
const isSab = (p) => p && p.role === "S";
function bump(s) { s.ver = (s.ver || 0) + 1; }
function feed(s, text, k) { s.dirty = true; s.fid = (s.fid || 0) + 1; s.feed.push({ i: s.fid, t: text, k: k || "", at: s.now }); if (s.feed.length > 8) s.feed.splice(0, s.feed.length - 8); }
function exOf(p, s) { const c = CAST[p.look] || CAST.pf; return R.pick(s, c.ex); }
