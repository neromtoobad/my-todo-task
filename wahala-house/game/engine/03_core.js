// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** mulberry32. The state lives in s.seed so the whole season replays exactly. */
function rngFrom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    f: next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    range: (lo, hi) => lo + next() * (hi - lo),
    shuffle: (arr) => { const o = arr.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t; } return o; },
    get state() { return a; },
  };
}

const clamp = (v, lo = 0, hi = 100) => (v < lo ? lo : v > hi ? hi : v);
const clone = (o) => JSON.parse(JSON.stringify(o));
const isInt = (v) => typeof v === "number" && Number.isInteger(v);
const naira = (n) => "₦" + Math.round(n).toLocaleString("en-US");
const hhmm = (min) => { const m = ((min % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

function blockOf(min) {
  if (min < 720) return 0; // morning
  if (min < 1020) return 1; // afternoon
  if (min < 1320) return 2; // evening
  return 3; // night
}
const BLOCK_NAMES = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"];

function hmOf(s, id) { for (const h of s.hm) if (h.id === id) return h; return null; }
function nameOf(s, id) { if (id === ME) return s.hm[0].name; const c = BY[id]; return c ? c.name : id; }
function inHouse(s) { return s.hm.filter((h) => !h.out); }
function inHouseIds(s) { return inHouse(s).map((h) => h.id); }
function aiIn(s) { return s.hm.filter((h) => !h.out && !h.human); }
function isSab(s, id) { const h = hmOf(s, id); return !!h && h.role === "S"; }

// ---------------------------------------------------------------------------
// Relationships: rel["a>b"] = [friendship, romance, trust, beef, attraction, suspicion]
// How a feels about b. Values 0-100.
// ---------------------------------------------------------------------------

const F = 0, RO = 1, TR = 2, BF = 3, AT = 4, SU = 5;

function rel(s, a, b) { return s.rel[a + ">" + b]; }
function bump(s, a, b, idx, d) { const v = rel(s, a, b); if (v) v[idx] = clamp(Math.round(v[idx] + d)); }
function mutual(s, a, b, idx, d) { bump(s, a, b, idx, d); bump(s, b, a, idx, d); }

/** Overall liking of a toward b, used for saves and votes. */
function liking(s, a, b) {
  const v = rel(s, a, b);
  if (!v) return 0;
  return v[F] + v[TR] * 0.6 + v[RO] * 0.8 - v[BF] * 0.9 - v[SU] * 0.5;
}

/** Fuzzy 0-4 level the player can see for how an AI feels about them. */
function level(v) { return v >= 80 ? 4 : v >= 60 ? 3 : v >= 40 ? 2 : v >= 20 ? 1 : 0; }

// ---------------------------------------------------------------------------
// Logs, feed, notes, memories
// ---------------------------------------------------------------------------

function note(s, text, kind = "info") {
  s.nid += 1;
  s.notes.push({ id: s.nid, t: text, k: kind });
  if (s.notes.length > 12) s.notes.splice(0, s.notes.length - 12);
}

function logEv(s, text, kind) {
  s.log.push({ d: s.day, m: s.min, t: text, k: kind });
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

function tweet(s, r, key, a, b, shipName) {
  const tpl = TWEET[key];
  if (!tpl) return;
  const t = r.pick(tpl).replace(/\{a\}/g, nameOf(s, a)).replace(/\{b\}/g, b ? nameOf(s, b) : "").replace(/\{s\}/g, shipName || "");
  s.feed.push({ h: r.pick(FEED_HANDLES), t, n: s.nid + s.feed.length });
  if (s.feed.length > 30) s.feed.splice(0, s.feed.length - 30);
}

function remember(s, who, item) {
  if (!s.mem[who]) return;
  s.mem[who].push(Object.assign({ d: s.day, m: s.min }, item));
  if (s.mem[who].length > 24) s.mem[who].splice(0, s.mem[who].length - 24);
}

function addGist(s, kind, text, tag, about) {
  s.gid += 1;
  s.gb.unshift({ id: s.gid, d: s.day, m: s.min, k: kind, t: text, tag: tag || "", about: about || [] });
  if (s.gb.length > 60) s.gb.length = 60;
}
function hasTag(s, prefix) { return s.gb.some((g) => g.k !== "gist" && g.tag && g.tag.split(" ").some((t) => t.indexOf(prefix) === 0)); }

/** Fill a template with a speaker's voice. */
function fill(s, r, tpl, speaker, extra) {
  const c = BY[speaker];
  const you = s.hm[0].name;
  let pet = c ? r.pick(c.pet) : "my friend";
  if (c && extra && extra.romantic) pet = r.pick(c.petR);
  return tpl
    .replace(/\{ex\}/g, c ? r.pick(c.ex) : "Omo!")
    .replace(/\{pet\}/g, pet)
    .replace(/\{you\}/g, you)
    .replace(/\{me\}/g, c ? c.name : you)
    .replace(/\{x\}/g, extra && extra.x ? nameOf(s, extra.x) : "them")
    .replace(/\{secret\}/g, (c && SECRETS[speaker]) || "");
}

function shipName(a, b) {
  const x = a.slice(0, Math.ceil(a.length / 2));
  const y = b.slice(Math.floor(b.length / 2));
  return (x + y).replace(/^./, (m) => m.toUpperCase());
}

function findShip(s, a, b) { return s.ships.find((sh) => (sh.a === a && sh.b === b) || (sh.a === b && sh.b === a)); }
function makeShip(s, r, a, b, official) {
  let sh = findShip(s, a, b);
  if (!sh) {
    sh = { a, b, name: shipName(nameOf(s, a), nameOf(s, b)), official: false, d: s.day };
    s.ships.push(sh);
    tweet(s, r, "ship", a, b, sh.name);
  }
  if (official && !sh.official) { sh.official = true; logEv(s, `${nameOf(s, a)} and ${nameOf(s, b)} are officially a couple. #${sh.name}`, "ship"); }
  return sh;
}
function breakShip(s, a, b) { s.ships = s.ships.filter((sh) => !((sh.a === a && sh.b === b) || (sh.a === b && sh.b === a))); }

function addBeef(s, a, b) {
  if (!s.beefs.some((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a))) s.beefs.push([a, b]);
}

function strike(s, r, id, why) {
  const h = hmOf(s, id);
  if (!h || h.out) return;
  h.strikes += 1;
  const nm = nameOf(s, id);
  logEv(s, `${nm} received a strike for ${why}.`, "strike");
  note(s, `${EYE}: ${nm}, you have received a strike for ${why}. (${h.strikes}/3)`, "strike");
  h.comp = clamp(h.comp - 12);
  if (id !== ME) tweet(s, r, "fight", id, id);
}
