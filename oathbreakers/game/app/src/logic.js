/**
 * OATHBREAKERS - Ravenholt Castle.
 *
 * A single-player social deduction season: the human is one contestant among
 * eleven AI celebrities. Three are secretly Oathbreakers. Missions fill the
 * pot, the Round Table exiles one player a day, and the Oathbreakers murder
 * one Sworn every night.
 *
 * Contract (see ../AGENTS.md): six pure exports, no imports, no timers, no
 * Math.random / Date.now. Randomness is a seeded generator stored in state.
 * The engine decides everything; viewFor() is the only thing the browser sees,
 * so hidden roles and AI suspicion never leave the server.
 */

export const meta = { game: "Oathbreakers", minPlayers: 1, maxPlayers: 1 };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FAMES = ["ACTOR", "MUSICIAN", "ATHLETE", "INFLUENCER", "CHEF", "COMEDIAN"];

/** per = perception, dec = deception, loud = loudness, loy = loyalty (1-5). */
const CAST = [
  { id: "ada", name: "Ada", full: "Adaeze Okonkwo", field: "ACTOR", per: 3, dec: 3, loud: 5, loy: 3, open: "I've been investigating.", pet: "darling" },
  { id: "rafa", name: "Rafa", full: "Rafael Duarte", field: "ATHLETE", per: 2, dec: 2, loud: 5, loy: 5, open: "Listen, cara.", pet: "cara" },
  { id: "minseo", name: "Min-seo", full: "Han Min-seo", field: "MUSICIAN", per: 5, dec: 4, loud: 2, loy: 4, open: "Um... sorry.", pet: "" },
  { id: "celia", name: "Celia", full: "Dame Celia Hartwell", field: "ACTOR", per: 4, dec: 5, loud: 4, loy: 2, open: "Darling.", pet: "darling" },
  { id: "marcus", name: "Marcus", full: "Marcus Vale", field: "COMEDIAN", per: 4, dec: 4, loud: 4, loy: 2, open: "Folks, folks.", pet: "buddy" },
  { id: "marisol", name: "Marisol", full: "Marisol Ibarra", field: "CHEF", per: 3, dec: 2, loud: 3, loy: 5, open: "Ay, mijo.", pet: "mijo" },
  { id: "kenji", name: "Kenji", full: "Kenji Moriyama", field: "PERFORMER", per: 4, dec: 4, loud: 3, loy: 3, open: "Watch closely.", pet: "my friend" },
  { id: "tomas", name: "Tomas", full: "Tomas Lindqvist", field: "GAMER", per: 5, dec: 3, loud: 2, loy: 3, open: "Statistically,", pet: "" },
  { id: "zara", name: "Zara", full: "Zara Haddad", field: "INFLUENCER", per: 4, dec: 3, loud: 4, loy: 2, open: "Honestly?", pet: "sweetie" },
  { id: "kwame", name: "Kwame", full: "Kwame Mensah", field: "COMEDIAN", per: 3, dec: 3, loud: 5, loy: 4, open: "No offence, but", pet: "bruv" },
  { id: "tayla", name: "Tayla", full: "Tayla Brooks", field: "ATHLETE", per: 2, dec: 1, loud: 3, loy: 5, open: "Mate,", pet: "mate" },
];
const BY_ID = {};
for (const c of CAST) BY_ID[c.id] = c;

/** Built-in relationships: positive = friction (suspicion), negative = warmth. */
const BONDS = [
  ["rafa", "zara", 12], ["celia", "marcus", 12], ["kenji", "tomas", 7],
  ["minseo", "tayla", -12], ["kwame", "marcus", -5],
];

const SIGNATURE = {
  ada: "Case closed. It's you.",
  rafa: "I would never. On my mother!",
  minseo: "I noticed something. Maybe it's nothing.",
  celia: "Darling, I have lied for a living for fifty years.",
  marcus: "Hey, hey, can we all just take a breath?",
  marisol: "Sit. Eat. Then tell me the truth.",
  kenji: "Watch the left hand. Always the left hand.",
  tomas: "Emotion is noise. Votes are data.",
  zara: "I don't dislike you. I just don't think about you.",
  kwame: "I'm joking... unless?",
  tayla: "Mate, I literally can't lie. Look at my face.",
};

const QUOTES = [
  "\"All that glisters is not gold.\"",
  "\"The lady doth protest too much, methinks.\"",
  "\"Something is rotten in the state of Denmark.\"",
  "\"Though this be madness, yet there is method in it.\"",
];

const RIDDLES = [
  { q: "The more of me you take, the more you leave behind. What am I?", a: ["Footsteps", "Secrets", "Gold"], ok: 0 },
  { q: "I speak without a mouth and hear without ears. I come alive with the wind. What am I?", a: ["A ghost", "An echo", "A raven"], ok: 1 },
  { q: "What can fill a hall but takes up no space?", a: ["Silence", "Smoke", "Light"], ok: 2 },
  { q: "I have a face and two hands, but no arms or legs. What am I?", a: ["A clock", "A portrait", "A mirror"], ok: 0 },
  { q: "What has to be broken before you can use it?", a: ["An oath", "An egg", "A seal"], ok: 1 },
  { q: "The one who makes it sells it. The one who buys it never uses it. The one who uses it never knows. What is it?", a: ["A crown", "A coffin", "A candle"], ok: 1 },
];

const PATHS = ["STAG", "CROW", "WOLF"];
const MISSIONS = { 1: "vault", 2: "crossroads", 3: "lantern", 4: "mirror" };
const MISSION_MAX = { vault: 5000, crossroads: 6000, lantern: 7000, mirror: 8000 };
const MISSION_TITLE = {
  vault: "THE SEALED VAULT", crossroads: "THE CROSSROADS",
  lantern: "THE LANTERN RUN", mirror: "THE MIRROR HALL",
};
const MISSION_VOICE = { vault: "l_vault", crossroads: "l_crossroads", lantern: "l_lantern", mirror: "l_mirror" };
const HUMAN = "you";
const MAX_JOURNAL = 60;

// ---------------------------------------------------------------------------
// Seeded randomness (mulberry32). A local generator is created per call and
// its final position written back, so the input state is never mutated.
// ---------------------------------------------------------------------------

function rngFrom(seed) {
  let a = seed >>> 0;
  const r = {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(r.next() * n); },
    chance(p) { return r.next() < p; },
    pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r.next() * (i + 1));
        const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      }
      return out;
    },
    get seed() { return a; },
  };
  return r;
}

// ---------------------------------------------------------------------------
// Small helpers over state
// ---------------------------------------------------------------------------

const clone = (v) => JSON.parse(JSON.stringify(v));
const P = (s, id) => s.ps.find((p) => p.id === id);
const alive = (s) => s.ps.filter((p) => p.alive);
const aliveIds = (s) => alive(s).map((p) => p.id);
const oathAlive = (s) => alive(s).filter((p) => p.role === "O");
const swornAlive = (s) => alive(s).filter((p) => p.role === "S");
const aiAlive = (s) => alive(s).filter((p) => !p.human);
const nameOf = (s, id) => (id === HUMAN ? s.ps[0].name : BY_ID[id] ? BY_ID[id].name : id);
const human = (s) => s.ps[0];
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function journal(s, kind, txt) {
  s.journal.push({ d: s.day, k: kind, t: txt });
  if (s.journal.length > MAX_JOURNAL) s.journal = s.journal.slice(-MAX_JOURNAL);
}

function timeline(s, txt) {
  s.timeline.push({ d: s.day, t: txt });
  if (s.timeline.length > 80) s.timeline = s.timeline.slice(-80);
}

function line(w, t, e, v) {
  const out = { w, t };
  if (e) out.e = e;
  if (v) out.v = v;
  return out;
}
const laird = (t, v, e) => line("laird", t, e || "", v);
const narr = (t) => line("narr", t);

/** Add suspicion from AI `a` toward `t` (clamped 0-100). */
function sus(s, a, t, amt) {
  if (a === t || !s.sus[a]) return;
  s.sus[a][t] = clamp((s.sus[a][t] || 0) + amt, 0, 100);
}

/** Broadcast evidence against `t` to every living AI, scaled by perception. */
function evidence(s, t, amt, tag) {
  for (const p of aiAlive(s)) {
    if (p.id === t) continue;
    const c = BY_ID[p.id];
    sus(s, p.id, t, amt * (0.55 + 0.12 * c.per));
  }
  if (tag) {
    if (!s.ev[t]) s.ev[t] = [];
    s.ev[t].push(tag);
    if (s.ev[t].length > 6) s.ev[t] = s.ev[t].slice(-6);
  }
}

/** The O-team knows each other; everyone else guesses. */
function knowsO(s, a, t) {
  const pa = P(s, a);
  return pa && pa.role === "O" && P(s, t) && P(s, t).role === "O";
}

function reasonFor(s, t, r) {
  const tags = s.ev[t] || [];
  const nm = nameOf(s, t);
  if (tags.length && r.chance(0.75)) {
    const tag = tags[tags.length - 1 - r.int(Math.min(2, tags.length))];
    switch (tag.k) {
      case "slip": return `${nm} fumbled rune ${tag.n} in the vault. Nobody fumbles by accident.`;
      case "light": return `${nm} was on the ${tag.path} path, and that chest came back light.`;
      case "lantern": return `${nm} lit only ${tag.n} lanterns. I've seen them do better in their sleep.`;
      case "wrongvote": return `${nm} voted out ${tag.who}, and ${tag.who} was Sworn.`;
      case "defended": return `${nm} defended ${tag.who} right up until ${tag.who} was unmasked.`;
      case "shieldbuy": return `Someone bought a shield with our gold. My money's on ${nm}.`;
      case "glimpse": return `${nm} was named in the Glimpse. The mirror doesn't lie.`;
      case "accusedvictim": return `${tag.who} was pointing at ${nm} yesterday. Now ${tag.who} is dead.`;
      case "dish": return `Funny how ${nm} knew exactly who wouldn't need breakfast.`;
      default: break;
    }
  }
  return r.pick([
    `${nm} has been far too quiet.`,
    `${nm}'s story keeps changing.`,
    `I just don't trust ${nm}. Call it instinct.`,
    `${nm} watches everyone and says nothing.`,
    `${nm} has been working the room a bit too hard.`,
    `Every time something goes wrong, ${nm} is nearby.`,
  ]);
}

// ---------------------------------------------------------------------------
// Tells: stage directions that leak when a character lies (probabilistic),
// plus rare false tells from the honest ones so nothing is ever certain.
// ---------------------------------------------------------------------------

function withTell(s, r, id, text, lying) {
  const c = BY_ID[id];
  if (!c) return text;
  const p = lying ? clamp(0.8 - 0.12 * (c.dec - 1), 0.25, 0.85) : 0.08;
  if (!r.chance(p)) return text;
  switch (id) {
    case "ada": return `${text} *She closes her notebook.*`;
    case "rafa": return `${text} On my mother! On my mother's life!`;
    case "minseo": return lying ? "I trust everyone. Sorry. *She bows, very politely.*" : `${text} *She bows politely.*`;
    case "celia": return `${text} ${r.pick(QUOTES)}`;
    case "marcus": return `${text} But hey, why are you asking me?`;
    case "marisol": return `${text} *She wipes her hands on her apron. Twice.*`;
    case "kenji": return `${text} *A coin rolls across his knuckles.*`;
    case "tomas": return text;
    case "zara": return `${text} *She checks her nails.*`;
    case "kwame": return `${text} *He isn't smiling.*`;
    case "tayla": return `${text} *She won't meet your eyes.*`;
    default: return text;
  }
}

// ---------------------------------------------------------------------------
// Season setup
// ---------------------------------------------------------------------------

export function setup(players) {
  return { v: 1, phase: "LOBBY", pid: players[0] || "", day: 0, sc: { k: "LOBBY" } };
}

function initSeason(pid, a) {
  const r = rngFrom((a.seed >>> 0) ^ 0x9e3779b9);
  const s = {
    v: 1, pid, phase: "INTRO", day: 0, pot: 0, seed: 0, final: false,
    ps: [], sus: {}, ev: {}, journal: [], timeline: [], votes: [], acc: {},
    lastAcc: {}, flags: { recruitNext: false, ultimatumUsed: false, surprise: false, planned: null, glimpse: null },
    g: null, rt: null, m: null, night: null, out: null, sc: null, result: null, ff: false,
  };
  s.ps.push({
    id: HUMAN, human: true, name: a.name, av: a.av, fame: a.fame, role: "S",
    alive: true, out: null, outDay: 0, revealed: false, shield: false, claim: false, dagger: 0,
  });
  for (const c of CAST) {
    s.ps.push({
      id: c.id, human: false, name: c.name, role: "S", alive: true, out: null, outDay: 0,
      revealed: false, shield: false, claim: false, dagger: 0,
    });
  }
  // Deal roles: exactly three Oathbreakers.
  const aiIds = CAST.map((c) => c.id);
  let oath;
  if (a.fate === "oath" || (a.fate === "random" && r.chance(3 / 12))) {
    oath = [HUMAN, ...r.shuffle(aiIds).slice(0, 2)];
  } else {
    oath = r.shuffle(aiIds).slice(0, 3);
  }
  for (const id of oath) P(s, id).role = "O";

  // Suspicion: noise, rivalries, bonds, fans of the player.
  for (const c of CAST) {
    s.sus[c.id] = {};
    for (const p of s.ps) {
      if (p.id === c.id) continue;
      s.sus[c.id][p.id] = 15 + r.int(11);
    }
    if (c.field === a.fame) s.sus[c.id][HUMAN] += 8;
  }
  for (const [x, y, v] of BONDS) {
    s.sus[x][y] = clamp(s.sus[x][y] + v, 0, 100);
    s.sus[y][x] = clamp(s.sus[y][x] + v, 0, 100);
  }
  const fans = r.shuffle(aiIds.filter((id) => BY_ID[id].field !== a.fame)).slice(0, 2);
  for (const f of fans) s.sus[f][HUMAN] = clamp(s.sus[f][HUMAN] - 10, 0, 100);
  s.fans = fans;

  s.seed = r.seed;
  s.sc = introScene(s);
  return s;
}

function introScene(s) {
  const you = human(s);
  const lines = [
    laird("Welcome to Ravenholt, my darlings. Twelve of you walked in. Not all of you will walk out... and three of you are lying to my face already. De-li-cious.", "l_welcome", "delight"),
    narr(`The great doors close behind you, ${you.name}. Eleven famous faces turn to look.`),
  ];
  for (const c of CAST) lines.push(line(c.id, SIGNATURE[c.id], "neutral", `sig_${c.id}`));
  const fanNames = (s.fans || []).map((id) => nameOf(s, id));
  if (fanNames.length === 2) {
    lines.push(narr(`${fanNames[0]} and ${fanNames[1]} are clearly fans of yours. Everyone else is sizing you up.`));
  }
  const rivals = CAST.filter((c) => c.field === you.fame).map((c) => c.name);
  if (rivals.length) lines.push(narr(`${rivals.join(" and ")} ${rivals.length > 1 ? "are" : "is"} in your line of work. Expect some friction.`));
  return { k: "INTRO", bg: "exterior", music: "theme", lines, next: "TAKE YOUR SEAT" };
}

function roleScene(s) {
  const you = human(s);
  const lines = [laird("Tonight, three among you will be chosen. The rest of you... will have to find them.", "l_chosen")];
  const fellows = you.role === "O" ? oathAlive(s).filter((p) => !p.human).map((p) => p.name) : [];
  return { k: "ROLE", bg: "roundtable", music: "theme", lines, role: you.role, fellows, next: "BEGIN DAY 1" };
}

// ---------------------------------------------------------------------------
// Day flow
// ---------------------------------------------------------------------------

function startDay(s, r, d, breakfast) {
  s.day = d;
  s.acc = {};
  if (d >= 2) {
    s.phase = "BREAKFAST";
    s.sc = breakfast;
    return;
  }
  startMission(s, r);
}

function afterBreakfast(s, r) {
  if (!human(s).alive) return playerOut(s, r, "murdered");
  if (alive(s).length <= 4) return startLastCandle(s, r);
  startMission(s, r);
}

function startMission(s, r) {
  const kind = MISSIONS[s.day];
  if (!kind) {
    s.m = null;
    s.phase = "M_RESULT";
    s.sc = {
      k: "M_RESULT", bg: "gallery", music: "roundtable",
      lines: [laird("No mission today, my darlings. Just each other. Enjoy.", "l_riddle", "smug")],
      next: "TO THE GALLERY",
    };
    return;
  }
  const mseed = r.int(1 << 30);
  s.m = { kind, step: 0, seed: mseed, picks: [] };
  s.phase = "M_INTRO";
  const intro = {
    vault: "Behind that door lies a fortune. Remember the runes, my darlings, and it's yours.",
    crossroads: "Three paths. Three chests of gold. And somewhere out there... a thief.",
    lantern: "Light every lantern on the bridge. Miss one, and the gold slips into the moat.",
    mirror: "Mirrors never lie, my darlings. Shame the same can't be said for you.",
  }[kind];
  const how = {
    vault: "A relay of six. Each of you repeats the rune sequence on the vault door. Every clean leg adds 800 gold. You go live; watch who fumbles.",
    crossroads: "Three teams carry chests of gold through the forest by different paths. Choose your path, make the calls, and see whose chest arrives light.",
    lantern: "Twenty lanterns swing across the moat. Light each one as its ring meets the flame. The team's total decides the gold, and the best hand wins something sharp.",
    mirror: "Three riddle doors. Every right answer adds gold. At the end, the Laird may offer a glimpse of the truth, at a price.",
  }[kind];
  s.sc = {
    k: "M_INTRO", bg: kind, music: "mission", title: MISSION_TITLE[kind], day: s.day,
    lines: [laird(intro, MISSION_VOICE[kind], "delight"), narr(how)],
    next: "BEGIN THE MISSION",
  };
}

function missionPlayScene(s) {
  const m = s.m;
  const k = m.kind;
  if (k === "vault") {
    return { k: "M_VAULT", bg: "vault", music: "mission", title: MISSION_TITLE.vault, seed: m.seed, len: 6, runes: 6 };
  }
  if (k === "lantern") {
    return { k: "M_LANTERN", bg: "lantern", music: "mission", title: MISSION_TITLE.lantern, seed: m.seed, count: 20 };
  }
  if (k === "crossroads") return crossroadsScene(s);
  return mirrorScene(s);
}

const CROSS_STEPS = [
  { q: "Three paths wind into the mist. Which do you take?", a: ["Path of the STAG", "Path of the CROW", "Path of the WOLF"] },
  { q: "A cart of gold is stuck in the mud across the path. Another team's chest.", a: ["Stop and help them", "Leave it. Keep moving."] },
  { q: "A hooded stranger offers a shortcut through the bog.", a: ["Trust the stranger", "Stay on the road"] },
  { q: "The path forks around a ruined chapel.", a: ["Split up to cover both", "Stay together"] },
  { q: "At the gate, the Laird holds up a Shield. \"It's yours... for 1,500 gold from the pot. Secretly.\"", a: ["Take the Shield", "Walk past it"] },
];

function crossroadsScene(s) {
  const st = CROSS_STEPS[s.m.step];
  return {
    k: "M_STORY", bg: "crossroads", music: "mission", title: MISSION_TITLE.crossroads,
    step: s.m.step, steps: CROSS_STEPS.length, q: st.q, opts: st.a,
  };
}

function mirrorScene(s) {
  const m = s.m;
  if (!m.riddles) m.riddles = [];
  if (m.step < 3) {
    const rd = RIDDLES[m.order[m.step]];
    return {
      k: "M_STORY", bg: "mirror", music: "mission", title: MISSION_TITLE.mirror,
      step: m.step, steps: 4, q: `Door ${m.step + 1}: ${rd.q}`, opts: rd.a,
    };
  }
  return {
    k: "M_STORY", bg: "mirror", music: "mission", title: MISSION_TITLE.mirror, step: 3, steps: 4,
    q: "The last mirror shimmers. \"A glimpse of the truth,\" says the Laird. \"Three names, and at least one of them is an Oathbreaker. It costs 2,000 gold of the pot, and everyone will know.\"",
    opts: ["Buy the Glimpse", "Leave the mirror dark"],
  };
}

function aiParticipants(s, r, n) {
  return r.shuffle(aiAlive(s).map((p) => p.id)).slice(0, n);
}

function resolveVault(s, r, score) {
  const lines = [];
  const legs = [HUMAN, ...aiParticipants(s, r, 5)].filter((id) => P(s, id).alive);
  let gold = 0;
  let clean = 0;
  let best = null;
  const results = [];
  for (const id of legs) {
    let got;
    if (id === HUMAN) got = score;
    else {
      const c = BY_ID[id];
      const skill = 0.55 + 0.07 * c.per;
      got = 0;
      for (let i = 0; i < 6; i++) { if (r.chance(skill + 0.06)) got++; else break; }
      if (P(s, id).role === "O" && got === 6 && r.chance(0.5)) got = 2 + r.int(4);
    }
    results.push({ id, got });
    if (got === 6) { clean++; gold += 800; }
    else {
      const who = nameOf(s, id);
      if (id === HUMAN) journal(s, "clue", `You slipped on rune ${got + 1} in the vault.`);
      else {
        journal(s, "clue", `${who} slipped on rune ${got + 1} in the vault.`);
        evidence(s, id, P(s, id).role === "O" ? 16 : 9, { k: "slip", n: got + 1 });
      }
      if (id === HUMAN) evidence(s, HUMAN, 7, { k: "slip", n: got + 1 });
    }
  }
  if (clean === legs.length) gold += 200;
  const perfect = results.filter((x) => x.got === 6);
  if (score === 6) best = HUMAN;
  else if (perfect.length) best = r.pick(perfect).id;
  s.pot += gold;
  for (const x of results) {
    lines.push(narr(x.got === 6 ? `${nameOf(s, x.id)}: all six runes. The door hums.` : `${nameOf(s, x.id)}: slipped on rune ${x.got + 1}.`));
  }
  lines.push(laird(gold ? "The pot grows. And so does the temptation." : "Not a single coin. Embarrassing.", gold ? "l_potgrows" : ""));
  return { gold, best, lines };
}

function resolveLantern(s, r, score) {
  const lines = [];
  const ids = aliveIds(s);
  const scores = {};
  for (const id of ids) {
    if (id === HUMAN) { scores[id] = score; continue; }
    const c = BY_ID[id];
    let v = 9 + c.per + r.int(7) + (id === "tayla" ? 4 : 0) + (id === "rafa" ? 2 : 0);
    if (P(s, id).role === "O" && r.chance(id === "tayla" ? 0.9 : 0.4)) {
      v -= 5 + r.int(4);
      evidence(s, id, 13, { k: "lantern", n: clamp(v, 0, 20) });
    }
    scores[id] = clamp(v, 0, 20);
  }
  const total = ids.reduce((a, id) => a + scores[id], 0);
  const gold = Math.round((MISSION_MAX.lantern * total) / (20 * ids.length) / 50) * 50;
  s.pot += gold;
  const board = ids.slice().sort((a, b) => scores[b] - scores[a]);
  let best = board[0];
  if (scores[HUMAN] !== undefined && scores[HUMAN] >= scores[best]) best = HUMAN;
  lines.push(narr(`Lanterns lit: ${board.map((id) => `${nameOf(s, id)} ${scores[id]}`).join(" / ")}`));
  journal(s, "clue", `Lantern Run scores: ${board.map((id) => `${nameOf(s, id)} ${scores[id]}`).join(", ")}.`);
  lines.push(laird("The pot grows. And so does the temptation.", "l_potgrows"));
  return { gold, best, lines, board: board.map((id) => ({ id, n: scores[id] })) };
}

function resolveCrossroads(s, r) {
  const picks = s.m.picks;
  const lines = [];
  const others = r.shuffle(aiAlive(s).map((p) => p.id));
  const teams = { STAG: [], CROW: [], WOLF: [] };
  const mine = PATHS[picks[0]];
  teams[mine].push(HUMAN);
  for (const id of others) {
    // Fill the smallest team first, so they stay even.
    const order = PATHS.slice().sort((a, b) => teams[a].length - teams[b].length || PATHS.indexOf(a) - PATHS.indexOf(b));
    teams[order[0]].push(id);
  }
  let gold = 0;
  const chest = { STAG: 1700, CROW: 1700, WOLF: 1700 };
  // Your team's calls.
  if (picks[1] === 0) { chest[mine] -= 200; for (const p of aiAlive(s)) sus(s, p.id, HUMAN, -2); lines.push(narr("You help the stuck cart. It costs you time, but the others notice.")); }
  else lines.push(narr("You leave the cart in the mud. Somebody mutters behind you."));
  if (picks[2] === 0) {
    if (r.chance(0.5)) { chest[mine] += 300; lines.push(narr("The stranger's shortcut works. You arrive early.")); }
    else { chest[mine] -= 400; lines.push(narr("The shortcut is a bog. Coins sink into the mud.")); }
  } else lines.push(narr("You stay on the road. Slow, but safe."));
  if (picks[3] === 0) { lines.push(narr("You split up around the chapel. For a few minutes, nobody can vouch for anyone.")); }
  else { chest[mine] += 100; lines.push(narr("You stay together. Nobody out of sight, nobody out of mind.")); }

  // Which chest came back light? Usually a team with an Oathbreaker (not the human).
  const withO = PATHS.filter((p) => teams[p].some((id) => id !== HUMAN && P(s, id).role === "O"));
  const light = withO.length && r.chance(0.8) ? r.pick(withO) : r.pick(PATHS);
  chest[light] -= 700;
  for (const p of PATHS) gold += clamp(chest[p], 0, 2000);
  for (const id of teams[light]) if (id !== HUMAN) evidence(s, id, P(s, id).role === "O" ? 11 : 7, { k: "light", path: light });
  if (teams[light].includes(HUMAN) && light !== mine) evidence(s, HUMAN, 5, { k: "light", path: light });
  if (light === mine) evidence(s, HUMAN, 4, { k: "light", path: light });
  const roster = (p) => teams[p].map((id) => nameOf(s, id)).join(", ");
  for (const p of PATHS) journal(s, "clue", `${p} path: ${roster(p)}.`);
  journal(s, "clue", `The ${light} chest arrived 700 gold light.`);
  lines.push(narr(`STAG: ${roster("STAG")}. CROW: ${roster("CROW")}. WOLF: ${roster("WOLF")}.`));
  lines.push(narr(`The ${light} chest arrives 700 gold light.`));

  // The Shield offer.
  let bought = null;
  if (picks[4] === 0) bought = HUMAN;
  else {
    const buyer = r.pick(aiAlive(s).map((p) => p.id));
    if (r.chance(0.6)) bought = buyer;
  }
  let best = null;
  if (bought) {
    gold -= 1500;
    best = bought;
    lines.push(narr("At the gate, the pot drops by 1,500 gold. Someone bought the Shield."));
    journal(s, "clue", "Someone secretly bought the Shield for 1,500 gold.");
    if (bought !== HUMAN) {
      // A buyer tends to look guilty, but the rumor lands on the loud and the nervous.
      const rumor = r.pick(aiAlive(s).map((p) => p.id));
      if (s.ev[rumor]) s.ev[rumor].push({ k: "shieldbuy" }); else s.ev[rumor] = [{ k: "shieldbuy" }];
    }
  } else lines.push(narr("Nobody takes the Laird's Shield. The pot stays whole."));
  gold = Math.max(0, gold);
  s.pot += gold;
  lines.push(laird("The pot grows. And so does the temptation.", "l_potgrows"));
  return { gold, best, lines };
}

function resolveMirror(s, r) {
  const m = s.m;
  const lines = [];
  let right = 0;
  for (let i = 0; i < 3; i++) {
    const rd = RIDDLES[m.order[i]];
    const ok = m.picks[i] === rd.ok;
    if (ok) right++;
    lines.push(narr(`Door ${i + 1}: ${ok ? "the mirror clears. Correct." : `wrong. The answer was ${rd.a[rd.ok]}.`}`));
  }
  let gold = right * 2000 + (right === 3 ? 2000 : 0);
  if (m.picks[3] === 0 && !oathAlive(s).length) {
    lines.push(laird("A glimpse of the truth... but truth, my darlings, is never free.", "l_glimpse"));
    lines.push(narr("The mirror stays dark. It has nothing to show you... tonight. The gold stays in the pot."));
  } else if (m.picks[3] === 0) {
    gold -= 2000;
    const pool = r.shuffle(alive(s).filter((p) => !p.human || p.role === "O").map((p) => p.id));
    const o = oathAlive(s);
    const names = [r.pick(o).id];
    for (const id of pool) { if (names.length >= 3) break; if (!names.includes(id)) names.push(id); }
    const shown = r.shuffle(names);
    const txt = shown.map((id) => nameOf(s, id)).join(", ");
    lines.push(laird("A glimpse of the truth... but truth, my darlings, is never free.", "l_glimpse"));
    lines.push(narr(`The mirror shows three faces: ${txt}. At least one of them is an Oathbreaker.`));
    journal(s, "clue", `THE GLIMPSE: ${txt}. At least one is an Oathbreaker.`);
    for (const id of shown) if (id !== HUMAN) evidence(s, id, 14, { k: "glimpse" });
    if (shown.includes(HUMAN)) evidence(s, HUMAN, 8, { k: "glimpse" });
    s.flags.glimpse = shown;
  }
  gold = Math.max(0, gold);
  s.pot += gold;
  const best = right === 3 ? HUMAN : r.pick(aiAlive(s).map((p) => p.id));
  lines.push(laird("The pot grows. And so does the temptation.", "l_potgrows"));
  return { gold, best, lines };
}

function finishMission(s, r, res) {
  const kind = s.m.kind;
  const lines = res.lines.slice();
  lines.unshift(narr(`${MISSION_TITLE[kind]}: +${fmt(res.gold)} gold. The pot now holds ${fmt(s.pot)}.`));
  let award = null;
  if (kind === "lantern") {
    if (res.best) {
      P(s, res.best).dagger = 2;
      if (res.best === HUMAN) {
        award = "dagger";
        lines.push(laird("The dagger. One vote... sharpened into two.", "l_dagger", "smug"));
      } else lines.push(narr("Somebody pockets something sharp. Nobody says who."));
    }
  } else if (res.best) {
    P(s, res.best).shield = true;
    if (res.best === HUMAN) {
      award = "shield";
      lines.push(laird("A shield. Guard it well... and guard your tongue even better.", "l_shield", "smug"));
    } else if (kind !== "crossroads") lines.push(narr("Somebody slips a Shield into their pocket. You didn't see who."));
  }
  timeline(s, `${MISSION_TITLE[kind]} added ${fmt(res.gold)} gold.`);
  s.phase = "M_RESULT";
  s.sc = {
    k: "M_RESULT", bg: kind, music: "mission", title: MISSION_TITLE[kind], gold: res.gold, award,
    board: res.board || null, lines, next: "TO THE GALLERY",
  };
  s.m.done = true;
}

// ---------------------------------------------------------------------------
// Gallery (free time): conversations, eavesdropping, tells
// ---------------------------------------------------------------------------

function startGallery(s, r) {
  s.phase = "GALLERY";
  s.flags.planned = pickMurder(s, r, true);
  const lines = [narr("Free time in the Gallery. Three conversations before the Round Table. Choose them well.")];
  const marisol = P(s, "marisol");
  if (marisol && marisol.alive && marisol.role === "O" && s.flags.planned && r.chance(0.55)) {
    const v = s.flags.planned;
    lines.push(narr(`Marisol sets a special plate of her grandmother's pan dulce in front of ${nameOf(s, v)}. Just for ${v === HUMAN ? "you" : "them"}.`));
    journal(s, "clue", `Marisol baked a special dish for ${nameOf(s, v)} on day ${s.day}.`);
    s.flags.dish = v;
  } else s.flags.dish = null;
  s.g = { talks: 3, eaves: 1, log: lines };
  s.sc = gallerySceneFrom(s);
}

function gallerySceneFrom(s) {
  return {
    k: "GALLERY", bg: "gallery", music: "roundtable", talks: s.g.talks, eaves: s.g.eaves,
    lines: s.g.log.slice(-8),
    people: aiAlive(s).map((p) => p.id),
    prompts: ["Who do you suspect?", "Can I trust you?", "What happened on the mission?", "I think it's...", "I have a shield."],
  };
}

/** An AI's current top suspect, from its own point of view. */
function topSuspect(s, r, a, exclude) {
  const pa = P(s, a);
  let best = null;
  let bestV = -1;
  for (const p of alive(s)) {
    if (p.id === a || (exclude && exclude.includes(p.id))) continue;
    if (pa.role === "O" && p.role === "O") continue;
    let v = s.sus[a][p.id] || 0;
    if (pa.role === "O") v = (s.acc[p.id] || 0) * 8 + avgSus(s, p.id) + r.int(6);
    else v += r.int(5);
    if (v > bestV) { bestV = v; best = p.id; }
  }
  return best;
}

function avgSus(s, t) {
  let sum = 0; let n = 0;
  for (const p of aiAlive(s)) { if (p.id === t) continue; sum += s.sus[p.id][t] || 0; n++; }
  return n ? sum / n : 0;
}

function talk(s, r, who, q, target, text) {
  const c = BY_ID[who];
  const p = P(s, who);
  const lying = p.role === "O";
  const you = human(s);
  const out = [];
  const say = (t, e, isLie) => out.push(line(who, withTell(s, r, who, t, isLie), e || "neutral"));
  if (q === 0) {
    const t = topSuspect(s, r, who, [HUMAN]);
    if (who === "tomas") {
      const pool = alive(s).filter((x) => x.id !== who && x.id !== HUMAN && !(lying && x.role === "O")).map((x) => x.id);
      const three = r.shuffle(pool).slice(0, 2);
      if (t && !three.includes(t)) three.unshift(t);
      const names = three.slice(0, 3).map((id) => nameOf(s, id)).join(", ");
      say(lying ? `Seventy percent it's one of ${names}.` : `Seventy percent it's one of ${names}. And yes, I include myself in the other thirty.`, "suspicious");
    } else if (t) {
      say(`${c.open} ${reasonFor(s, t, r)}`, "suspicious", lying);
    } else say(`${c.open} Honestly, I have no idea.`, "neutral");
    if (t) journal(s, "talk", `${c.name} told you they suspect ${nameOf(s, t)}.`);
  } else if (q === 1) {
    if (lying) say(`Of course you can trust me, ${c.pet || you.name}. I'm the most loyal person in this castle.`, "smug", true);
    else if (s.sus[who][HUMAN] > 45) say(`Trust goes both ways, ${you.name}. Right now, I'm not sure about you.`, "suspicious");
    else say(`You can. I'm Sworn, ${c.pet || you.name}. Hand on heart.`, "neutral");
    sus(s, who, HUMAN, -2);
  } else if (q === 2) {
    const tags = [];
    for (const id of Object.keys(s.ev)) for (const tg of s.ev[id]) tags.push({ id, tg });
    if (tags.length) {
      const pick = r.pick(tags);
      if (lying && P(s, pick.id) && P(s, pick.id).role === "O") {
        const t = topSuspect(s, r, who, [HUMAN]);
        say(`${reasonFor(s, t || pick.id, r)} That's all I'll say.`, "suspicious", true);
      } else say(reasonFor(s, pick.id, r), "suspicious");
    } else say(`${c.open} Nothing stood out. Which is exactly what worries me.`, "neutral");
  } else if (q === 3) {
    const t = target;
    const tp = P(s, t);
    if (!tp) return out;
    if (t === who) {
      say(`Me? ${c.pet ? c.pet[0].toUpperCase() + c.pet.slice(1) : you.name}, you're making a mistake.`, "shocked", lying);
      sus(s, who, HUMAN, 12);
    } else if (lying && tp.role === "O") {
      // Defend a fellow Oathbreaker, but remember who is sniffing around.
      say(`${nameOf(s, t)}? No. You're chasing shadows.`, "neutral", true);
      s.flags.threat = (s.flags.threat || 0) + 6;
      sus(s, who, HUMAN, 8);
    } else {
      const agree = (s.sus[who][t] || 0) > 35 || lying;
      if (agree) say(`${nameOf(s, t)}... yes. I've had the same feeling.`, "suspicious", lying);
      else say(`${nameOf(s, t)}? I don't see it. Careful who you point at.`, "suspicious");
      sus(s, who, t, 8 * (1 - (s.sus[who][HUMAN] || 0) / 100));
      if (tp.role === "O" && lying) s.flags.threat = (s.flags.threat || 0) + 4;
    }
    journal(s, "talk", `You told ${c.name} you suspect ${nameOf(s, t)}.`);
  } else if (q === 4) {
    you.claim = true;
    if (lying) say("A shield? Good for you. I'll... keep that in mind.", "smug", true);
    else say(you.shield ? "Then sleep well tonight. I believe you." : "Hm. Everyone claims a shield eventually.", you.shield ? "neutral" : "suspicious");
    if (!you.shield) sus(s, who, HUMAN, 3);
    journal(s, "talk", `You told ${c.name} you have a shield.`);
  }
  return out;
}

function parseText(s, text) {
  const t = String(text || "").toLowerCase();
  for (const p of alive(s)) {
    if (p.human) continue;
    if (t.includes(p.name.toLowerCase()) || t.includes(p.id)) return { q: 3, target: p.id };
  }
  if (/shield/.test(t)) return { q: 4 };
  if (/trust|loyal|sworn|honest/.test(t)) return { q: 1 };
  if (/mission|vault|lantern|chest|path|mirror|riddle/.test(t)) return { q: 2 };
  if (/suspect|who|think|traitor|oath|killer|murder/.test(t)) return { q: 0 };
  return { q: -1 };
}

function eavesdrop(s, r) {
  const ais = r.shuffle(aiAlive(s).map((p) => p.id));
  if (ais.length < 2) return [narr("The Gallery is empty. Nobody left to overhear.")];
  const a = ais[0];
  const b = ais[1];
  const out = [narr(`You linger behind a tapestry. ${nameOf(s, a)} and ${nameOf(s, b)} are whispering.`)];
  const bothO = P(s, a).role === "O" && P(s, b).role === "O";
  if (bothO && r.chance(0.6)) {
    out.push(line(a, "...not tonight. Too many eyes on us.", "suspicious"));
    out.push(line(b, "Then we make them look somewhere else.", "smug"));
    journal(s, "clue", `You overheard ${nameOf(s, a)} and ${nameOf(s, b)}: "Too many eyes on us."`);
  } else {
    const t = topSuspect(s, r, a, [b]);
    out.push(line(a, t ? `I keep coming back to ${nameOf(s, t)}.` : "I don't know who to trust anymore.", "suspicious"));
    out.push(line(b, r.pick(["Keep your voice down.", "Same. Let's watch the vote.", "You're paranoid.", "Don't tell anyone I agreed."]), "neutral"));
    if (t) journal(s, "clue", `You overheard ${nameOf(s, a)} suspecting ${nameOf(s, t)}.`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Round Table
// ---------------------------------------------------------------------------

function startRoundTable(s, r) {
  s.phase = "RT";
  s.acc = {};
  const lines = [];
  if (s.final) lines.push(laird("Then back to the table. One more of you leaves... and nobody will know who they were.", "l_endorexile"));
  else lines.push(laird("Welcome to the Round Table. Somebody here is not who they say they are.", "l_roundtable"));
  const speakers = r.shuffle(aiAlive(s).map((p) => p.id)).filter((id) => r.chance(0.3 + 0.1 * BY_ID[id].loud)).slice(0, 6);
  if (!speakers.length && aiAlive(s).length) speakers.push(aiAlive(s)[0].id);
  for (const a of speakers) {
    const t = topSuspect(s, r, a);
    if (!t) continue;
    const lying = P(s, a).role === "O";
    lines.push(line(a, withTell(s, r, a, `${BY_ID[a].open} ${reasonFor(s, t, r)}`, lying), "suspicious"));
    s.acc[t] = (s.acc[t] || 0) + 1;
    s.lastAcc[a] = t;
    for (const b of aiAlive(s)) if (b.id !== a && b.id !== t) sus(s, b.id, t, 0.6 * BY_ID[a].loud * (1 - (s.sus[b.id][a] || 0) / 100));
    if (t === HUMAN) {
      lines.push(narr("Every head turns toward you."));
    } else if (r.chance(0.7)) {
      const tl = P(s, t).role === "O";
      const def = r.pick([
        "That's ridiculous and you know it.",
        "I have done nothing but help this team.",
        "Look at the votes. Look at who's pointing fingers.",
        "Fine. Vote me out, and watch the murders carry on.",
      ]);
      lines.push(line(t, withTell(s, r, t, def, tl), "shocked"));
    }
  }
  s.rt = { speaks: 2, log: lines };
  s.sc = rtScene(s);
}

function rtScene(s) {
  return {
    k: "RT", bg: "roundtable", music: "roundtable", final: s.final,
    lines: s.rt.log.slice(-10), speaks: s.rt.speaks,
    people: alive(s).filter((p) => !p.human).map((p) => p.id),
    accused: Object.keys(s.acc),
  };
}

function speak(s, r, kind, target) {
  const out = [];
  const you = human(s);
  const trustScale = (a) => 1 - (s.sus[a][HUMAN] || 0) / 100;
  if (kind === "accuse") {
    out.push(line(HUMAN, `I think it's ${nameOf(s, target)}. ${reasonFor(s, target, r)}`, "suspicious"));
    for (const p of aiAlive(s)) {
      if (p.id === target) continue;
      if (knowsO(s, p.id, target)) { s.flags.threat = (s.flags.threat || 0) + 5; continue; }
      sus(s, p.id, target, 10 * trustScale(p.id));
    }
    sus(s, target, HUMAN, 15);
    s.acc[target] = (s.acc[target] || 0) + 1;
    s.lastAcc[HUMAN] = target;
    const tl = P(s, target).role === "O";
    out.push(line(target, withTell(s, r, target, r.pick(["How dare you.", "You've got it wrong, and you'll regret it.", "Interesting. Why so keen to point at me?"]), tl), "shocked"));
  } else if (kind === "defend") {
    out.push(line(HUMAN, `Leave ${nameOf(s, target)} alone. I'd stake my place here on them.`, "neutral"));
    for (const p of aiAlive(s)) if (p.id !== target) sus(s, p.id, target, -7 * trustScale(p.id));
    if (!s.def) s.def = {};
    s.def[target] = s.day;
    sus(s, target, HUMAN, -12);
  } else if (kind === "self") {
    out.push(line(HUMAN, `I'm Sworn. I've played this straight from day one. Look at my votes.`, "neutral"));
    for (const p of aiAlive(s)) sus(s, p.id, HUMAN, -(4 + r.int(5)));
    if (s.acc[HUMAN]) s.acc[HUMAN] = Math.max(0, s.acc[HUMAN] - 1);
  } else {
    out.push(narr("You say nothing. Silence can be louder than a speech."));
    for (const p of aiAlive(s)) sus(s, p.id, HUMAN, 2);
  }
  if (you.role === "S" && kind === "accuse" && P(s, target).role === "S") {
    // Nothing: Sworn accusing Sworn is exactly what the Oathbreakers want.
  }
  return out;
}

/** Each living AI casts a vote. The human's vote (and dagger) is passed in. */
function castVotes(s, r, humanVote, dagger, among, excluded) {
  const votes = {};
  const voters = alive(s).filter((p) => !(excluded || []).includes(p.id));
  const cand = (among || aliveIds(s));
  // First pass: Sworn intentions, used by the Oathbreakers to blend in or bus.
  const tally = {};
  const intent = {};
  for (const p of voters) {
    if (p.human) continue;
    if (p.role === "O") continue;
    let best = null; let bv = -1;
    for (const t of cand) {
      if (t === p.id) continue;
      const herd = (s.acc[t] || 0) * (6 - BY_ID[p.id].per) * 0.9;
      const v = (s.sus[p.id][t] || 0) + herd + r.int(9);
      if (v > bv) { bv = v; best = t; }
    }
    intent[p.id] = best;
    tally[best] = (tally[best] || 0) + 1;
  }
  const leader = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  for (const p of voters) {
    if (p.human) continue;
    if (p.role === "S") { votes[p.id] = intent[p.id]; continue; }
    // Oathbreaker: bus a doomed partner, otherwise pile onto a Sworn.
    if (leader && leader !== p.id && P(s, leader).role === "O" && (tally[leader] || 0) >= voters.length * 0.4 && r.chance(0.65)) {
      votes[p.id] = leader;
      continue;
    }
    let best = null; let bv = -1;
    for (const t of cand) {
      if (t === p.id) continue;
      const tp = P(s, t);
      if (tp.role === "O") continue;
      const v = (tally[t] || 0) * 10 + (s.acc[t] || 0) * 5 + avgSus(s, t) + r.int(8);
      if (v > bv) { bv = v; best = t; }
    }
    if (!best) best = cand.find((t) => t !== p.id) || null;
    votes[p.id] = best;
  }
  if (human(s).alive && !(excluded || []).includes(HUMAN) && humanVote) votes[HUMAN] = humanVote;
  const weight = {};
  for (const v of Object.keys(votes)) weight[v] = 1;
  if (dagger && votes[HUMAN]) weight[HUMAN] = 2;
  // AI dagger holders strike when they are sure.
  for (const p of voters) {
    if (p.human || !p.dagger || !votes[p.id]) continue;
    const t = votes[p.id];
    if ((s.sus[p.id][t] || 0) > 45 || p.role === "O" || p.dagger === 1) { weight[p.id] = 2; p.daggerUsedNow = true; }
  }
  return { votes, weight };
}

function tallyVotes(votes, weight) {
  const t = {};
  for (const v of Object.keys(votes)) { const x = votes[v]; if (x) t[x] = (t[x] || 0) + (weight[v] || 1); }
  let max = 0;
  for (const k of Object.keys(t)) if (t[k] > max) max = t[k];
  const top = Object.keys(t).filter((k) => t[k] === max);
  return { t, top, max };
}

function voteReveal(s, r, res) {
  const order = r.shuffle(Object.keys(res.votes));
  const reveal = [];
  for (const v of order) {
    const t = res.votes[v];
    if (!t) continue;
    let why;
    if (v === HUMAN) why = "";
    else why = withTell(s, r, v, reasonFor(s, t, r), P(s, v).role === "O" && P(s, t).role === "S");
    reveal.push({ v, t, why, x2: (res.weight[v] || 1) > 1 });
  }
  return reveal;
}

function doVote(s, r, humanVote, useDagger) {
  const you = human(s);
  const dagger = !!(useDagger && you.dagger > 0);
  const res = castVotes(s, r, humanVote, dagger);
  if (dagger) you.dagger = 0;
  for (const p of s.ps) {
    if (p.daggerUsedNow) { p.dagger = 0; delete p.daggerUsedNow; }
    else if (p.dagger > 0) p.dagger -= 1;
  }
  const reveal = voteReveal(s, r, res);
  const tl = tallyVotes(res.votes, res.weight);
  s.rt.first = { votes: res.votes, weight: res.weight };
  const lines = [laird("Pick up your quills. Write a name. Make it count.", "l_quills")];
  s.phase = "REVEAL";
  if (tl.top.length > 1) {
    s.rt.tied = tl.top;
    lines.push(laird("A tie! How thrilling. Plead your case, and we vote again.", "l_tie", "delight"));
  } else s.rt.out = tl.top[0];
  s.sc = { k: "REVEAL", bg: "roundtable", music: "roundtable", reveal, tally: tl.t, lines, tie: tl.top.length > 1 ? tl.top : null, next: tl.top.length > 1 ? "REVOTE" : "THE VERDICT" };
  recordVotes(s, res.votes);
}

function recordVotes(s, votes) {
  s.votes.push({ d: s.day, v: votes });
  if (s.votes.length > 12) s.votes = s.votes.slice(-12);
}

function doRevote(s, r, humanVote) {
  const tied = s.rt.tied;
  const res = castVotes(s, r, humanVote, false, tied, tied);
  const reveal = voteReveal(s, r, res);
  const tl = tallyVotes(res.votes, res.weight);
  const lines = [];
  let out;
  if (tl.top.length > 1 || !tl.top.length) {
    out = r.pick(tl.top.length ? tl.top : tied);
    lines.push(laird("Still tied. Then fate decides. Draw your stones.", "l_stones"));
    lines.push(narr(`${nameOf(s, out)} draws the black stone.`));
  } else out = tl.top[0];
  s.rt.out = out;
  s.rt.tied = null;
  s.phase = "REVEAL";
  s.sc = { k: "REVEAL", bg: "roundtable", music: "roundtable", reveal, tally: tl.t, lines, revote: true, next: "THE VERDICT" };
  recordVotes(s, res.votes);
}

function exile(s, r) {
  const id = s.rt.out;
  const p = P(s, id);
  p.alive = false;
  p.out = "exiled";
  p.outDay = s.day;
  const lines = [];
  const reveals = !s.final;
  if (id !== HUMAN) {
    lines.push(line(id, r.pick([
      "Well. I didn't see that coming. Good luck, all of you. You'll need it.",
      "You've made a mistake tonight. Remember that when the next one dies.",
      "I came here to win. I'm leaving with my head high.",
      "Fine. But look at who pushed hardest for this. Look closely.",
    ]), "neutral"));
  }
  if (reveals) {
    p.revealed = true;
    lines.push(laird("Please. Tell the table. Who... are... you?", "l_whoareyou"));
    if (id !== HUMAN) lines.push(line(id, p.role === "O" ? "I am... an Oathbreaker." : "I am Sworn.", p.role === "O" ? "smug" : "neutral", `${p.role === "O" ? "oath" : "sworn"}_${id}`));
    if (p.role === "O") lines.push(laird("Ooh. Got one.", "l_gotone", "delight"));
    else lines.push(laird("Oh dear. Oh dear, oh dear. You've banished one of your own.", "l_ohdear", "smug"));
    // Evidence from the votes.
    const last = s.votes[s.votes.length - 1];
    if (last) {
      for (const v of Object.keys(last.v)) {
        if (last.v[v] !== id || v === id) continue;
        if (p.role === "S") evidence(s, v, P(s, v) && P(s, v).role === "O" ? 9 : 5, { k: "wrongvote", who: p.name || nameOf(s, id) });
        else for (const a of aiAlive(s)) sus(s, a.id, v, -6);
      }
    }
    if (p.role === "O") {
      if (s.def && s.def[id] && human(s).alive) evidence(s, HUMAN, 10, { k: "defended", who: nameOf(s, id) });
      s.flags.recruitNext = oathAlive(s).length === 1;
    }
    journal(s, "exile", `Day ${s.day}: ${nameOf(s, id)} was exiled and revealed ${p.role === "O" ? "an OATHBREAKER" : "SWORN"}.`);
    timeline(s, `${nameOf(s, id)} was exiled (${p.role === "O" ? "Oathbreaker" : "Sworn"}).`);
  } else {
    lines.push(narr(`${nameOf(s, id)} leaves the castle without revealing who they are.`));
    journal(s, "exile", `Day ${s.day}: ${nameOf(s, id)} was exiled at the Last Candle. Role unknown.`);
    timeline(s, `${nameOf(s, id)} was exiled at the Last Candle.`);
  }
  s.phase = "EXILE";
  s.sc = {
    k: "EXILE", bg: "roundtable", music: "roundtable", who: id, reveal: reveals ? p.role : null,
    lines, next: id === HUMAN ? "CONTINUE" : s.final ? "CONTINUE" : "NIGHT FALLS",
  };
}

function afterExile(s, r) {
  if (!human(s).alive) return playerOut(s, r, "exiled");
  if (s.final) {
    if (alive(s).length <= 2) return finale(s, r);
    return startLastCandle(s, r);
  }
  startNight(s, r);
}

// ---------------------------------------------------------------------------
// Night
// ---------------------------------------------------------------------------

/** The Oathbreakers' preferred victim. `dry` = planning ahead, no side effects. */
function pickMurder(s, r, dry) {
  const os = oathAlive(s);
  if (!os.length) return null;
  let best = null; let bv = -Infinity;
  for (const t of swornAlive(s)) {
    let v = 0;
    if (t.human) v += 18 + (s.flags.threat || 0);
    else {
      for (const o of os) v += (s.sus[t.id][o.id] || 0);
      v = v / os.length;
      v += BY_ID[t.id].loud * 3 + BY_ID[t.id].per * 4;
      const acc = s.lastAcc[t.id];
      if (acc && P(s, acc) && P(s, acc).role === "O") v -= 6;
    }
    if (t.claim) v -= 20;
    if (t.human) v *= s.day <= 2 ? 0.25 : 0.55;
    v += dry ? 0 : r.int(18);
    if (v > bv) { bv = v; best = t.id; }
  }
  return best;
}

function startNight(s, r) {
  s.night = { day: s.day };
  const os = oathAlive(s);
  const you = human(s);
  // No Oathbreakers left: the Laird appoints a new one, and nobody dies tonight.
  if (!os.length) {
    if (alive(s).length >= 7) {
      const pool = swornAlive(s);
      const pick = pool.slice().sort((a, b) => avgSus(s, a.id) - avgSus(s, b.id))[r.int(Math.min(3, pool.length))];
      pick.role = "O";
      s.flags.surprise = true;
      timeline(s, `The Laird secretly appointed ${nameOf(s, pick.id)} as a new Oathbreaker.`);
      if (pick.human) {
        s.phase = "NIGHT";
        s.sc = {
          k: "NIGHT", bg: "tower", music: "night", role: "O",
          lines: [laird("I have a wee surprise for you...", "l_surprise", "smug"), narr("A letter sealed in black wax lies on your pillow. The Laird has chosen you. You are now an OATHBREAKER."), narr("Nobody dies tonight. Tomorrow, you hunt.")],
          next: "DAWN",
        };
        s.night.result = { none: true };
        return;
      }
      s.night.result = { none: true };
      return nightSworn(s, r, [laird("Off to bed, my darlings. Lock your doors.", "l_bed")]);
    }
    s.night.result = { none: true };
    return nightSworn(s, r, [laird("Off to bed, my darlings. Lock your doors.", "l_bed")]);
  }
  if (you.alive && you.role === "O") {
    s.phase = "TOWER";
    const canRecruit = s.flags.recruitNext && alive(s).length >= 6;
    const canUlt = os.length === 1 && !s.flags.ultimatumUsed && alive(s).length >= 5 && !canRecruit;
    const fellow = os.filter((p) => !p.human);
    const lines = [laird("Good evening, my wee monsters. Who's it to be?", "l_monsters", "smug")];
    const sug = pickMurder(s, r, true);
    for (const f of fellow) {
      const t = r.chance(0.7) ? sug : topSuspect(s, r, f.id);
      if (t) lines.push(line(f.id, `${nameOf(s, t)}. ${r.pick(["They're getting too close.", "They'll turn the table on us.", "Nobody will suspect us for that one.", "It has to be tonight."])}`, "smug"));
    }
    if (canRecruit) lines.push(laird("One of you has fallen. Perhaps it's time... for new blood.", "l_newblood"));
    if (canUlt) lines.push(laird("Alone in the tower. Time to make someone an offer they cannot refuse.", "l_offer"));
    s.sc = {
      k: "TOWER", bg: "tower", music: "night", lines,
      targets: swornAlive(s).map((p) => p.id), canRecruit, canUlt, suggest: sug,
    };
    return;
  }
  // Human is Sworn (or out): the AI Oathbreakers act.
  const lines = [laird("Off to bed, my darlings. Lock your doors.", "l_bed")];
  const canRecruit = s.flags.recruitNext && alive(s).length >= 6 && r.chance(0.55);
  const canUlt = !canRecruit && os.length === 1 && !s.flags.ultimatumUsed && alive(s).length >= 5 && r.chance(0.5);
  if (canRecruit || canUlt) {
    s.flags.recruitNext = false;
    if (canUlt) s.flags.ultimatumUsed = true;
    const pool = swornAlive(s);
    let t;
    if (you.alive && you.role === "S" && r.chance(0.35)) t = HUMAN;
    else t = pool.filter((p) => !p.human).sort((a, b) => avgSus(s, a.id) - avgSus(s, b.id))[0]?.id || null;
    if (t === HUMAN) {
      s.phase = "OFFER";
      s.night.offer = canUlt ? "ult" : "recruit";
      s.sc = {
        k: "OFFER", bg: "tower", music: "night", kind: s.night.offer,
        lines: canUlt
          ? [narr("A hooded figure blocks your path in the corridor."), narr("\"Join us, or never leave this room.\"")]
          : [narr("A sealed letter slides under your door."), narr("\"Join us. Tell no one.\"")],
        opts: canUlt ? ["TAKE THE OATH", "REFUSE"] : ["TAKE THE OATH", "BURN THE LETTER"],
      };
      return;
    }
    if (t) {
      const accept = r.chance(canUlt ? 0.75 : 0.65);
      if (accept) {
        P(s, t).role = "O";
        timeline(s, `${nameOf(s, t)} was ${canUlt ? "given an ultimatum" : "recruited"} and joined the Oathbreakers.`);
        s.night.result = { none: true };
      } else if (canUlt) {
        killAt(s, t);
        s.night.result = { victim: t };
        timeline(s, `${nameOf(s, t)} refused an ultimatum and was murdered.`);
      } else {
        s.night.result = { none: true };
        timeline(s, `${nameOf(s, t)} refused to join the Oathbreakers.`);
      }
      return nightSworn(s, r, lines);
    }
  }
  s.flags.recruitNext = false;
  const v = pickMurder(s, r, false);
  resolveMurder(s, r, v);
  nightSworn(s, r, lines);
}

function killAt(s, id) {
  const p = P(s, id);
  p.alive = false;
  p.out = "murdered";
  p.outDay = s.day;
}

function resolveMurder(s, r, v) {
  if (!v) { s.night.result = { none: true }; return; }
  const p = P(s, v);
  if (p.shield) {
    s.night.result = { shielded: v };
    timeline(s, `The Oathbreakers came for ${nameOf(s, v)}, but a Shield stopped them.`);
    return;
  }
  killAt(s, v);
  s.night.result = { victim: v };
  timeline(s, `${nameOf(s, v)} was murdered in the night.`);
}

function nightSworn(s, r, lines) {
  s.phase = "NIGHT";
  const all = lines.slice();
  all.push(narr("NIGHT FALLS OVER RAVENHOLT. Lock your door. Pray you see breakfast."));
  s.sc = { k: "NIGHT", bg: "exterior", music: "night", lines: all, next: "WAIT FOR DAWN" };
}

function endNight(s, r) {
  for (const p of s.ps) p.shield = false;
  s.flags.threat = Math.floor((s.flags.threat || 0) / 2);
  const res = (s.night && s.night.result) || { none: true };
  const d = s.day + 1;
  if (!human(s).alive && res.victim === HUMAN) {
    s.day = d;
    return playerOut(s, r, "murdered");
  }
  const lines = [];
  lines.push(narr(`BREAKFAST - DAY ${d}. The doors open...`));
  if (res.victim) {
    const vName = nameOf(s, res.victim);
    lines.push(laird("Somebody didn't come down to breakfast. How terribly rude of them.", "l_breakfast", "smug"));
    lines.push(narr(`${vName} did not come to breakfast.`));
    const reactors = r.shuffle(aiAlive(s).map((p) => p.id)).slice(0, 2);
    for (const a of reactors) {
      lines.push(line(a, r.pick([
        `Not ${vName}. Not like this.`,
        `${vName} was onto someone. That's why.`,
        `Whoever did this is sitting at this table, eating eggs.`,
        `I can't believe ${vName} is gone.`,
      ]), "shocked", "sfx_gasp"));
    }
    const acc = s.lastAcc[res.victim];
    if (acc && P(s, acc) && P(s, acc).alive) evidence(s, acc, 5, { k: "accusedvictim", who: vName });
    if (s.flags.dish === res.victim && P(s, "marisol") && P(s, "marisol").alive) evidence(s, "marisol", 14, { k: "dish" });
    journal(s, "murder", `Night ${s.day}: ${vName} was murdered.`);
  } else if (res.shielded) {
    lines.push(laird("Well, well. Everyone came down to breakfast. Someone had a very lucky night.", "l_lucky", "delight"));
    journal(s, "murder", `Night ${s.day}: nobody died. A Shield held.`);
  } else {
    if (s.flags.surprise) {
      lines.push(laird("I have a wee surprise for you...", "l_surprise", "smug"));
      lines.push(narr("\"Every Oathbreaker is gone... or so you thought. Last night, I chose a new one.\""));
      journal(s, "murder", `Night ${s.day}: the Laird appointed a new, secret Oathbreaker.`);
      s.flags.surprise = false;
    } else {
      lines.push(laird("Well, well. Everyone came down to breakfast. Someone had a very lucky night.", "l_lucky", "delight"));
      journal(s, "murder", `Night ${s.day}: nobody died.`);
    }
  }
  s.night = null;
  startDay(s, r, d, {
    k: "BREAKFAST", bg: "breakfast", music: "theme", day: d, victim: res.victim || null,
    host: Math.min(d - 1, 5), lines, next: "CONTINUE",
  });
}

// ---------------------------------------------------------------------------
// The Last Candle (finale) and endings
// ---------------------------------------------------------------------------

function startLastCandle(s, r) {
  s.final = true;
  s.phase = "LC";
  s.sc = {
    k: "LC", bg: "candle", music: "finale", n: alive(s).length,
    lines: [
      laird("The last candle is lit. When it goes out, so does the game.", "l_lastcandle"),
      laird("End the game... or exile again. Choose wisely.", "l_endorexile"),
      narr("The vote must be unanimous to end."),
    ],
    people: aliveIds(s),
  };
}

function lastCandleVote(s, r, humanEnd) {
  const votes = {};
  for (const p of alive(s)) {
    if (p.human) { votes[p.id] = humanEnd ? "END" : "EXILE"; continue; }
    if (p.role === "O") { votes[p.id] = "END"; continue; }
    let max = 0;
    for (const q of alive(s)) if (q.id !== p.id) max = Math.max(max, s.sus[p.id][q.id] || 0);
    votes[p.id] = max > 52 - BY_ID[p.id].per * 2 ? "EXILE" : "END";
  }
  const unanimous = Object.values(votes).every((v) => v === "END");
  return { votes, unanimous };
}

function finale(s, r) {
  s.phase = "FINALE";
  const os = oathAlive(s);
  const winners = os.length ? os : swornAlive(s);
  const side = os.length ? "O" : "S";
  const share = winners.length ? Math.floor(s.pot / winners.length) : 0;
  const you = human(s);
  let title; let sub;
  if (!you.alive) {
    title = side === "O" ? "BETRAYED" : "THE SWORN PREVAIL";
    sub = side === "O" ? `The Oathbreakers take all ${fmt(s.pot)} gold.` : `The Sworn split ${fmt(s.pot)} gold. You were not there to see it.`;
  } else if (side === "S") {
    title = "THE SWORN PREVAIL";
    sub = `You split ${fmt(s.pot)} gold. Your share: ${fmt(share)} gold.`;
  } else if (you.role === "O") {
    title = "IT WAS YOU ALL ALONG";
    sub = `You take ${fmt(share)} gold.`;
  } else {
    title = "BETRAYED";
    sub = `The Oathbreakers take all ${fmt(s.pot)} gold.`;
  }
  const lines = [side === "O"
    ? laird("Betrayed! The Oathbreakers take it all. I'm almost proud.", "l_owin", "delight")
    : laird("The Sworn have prevailed! Every last traitor, found and banished. Magnificent.", "l_swin", "delight")];
  const correct = s.humanVotes ? s.humanVotes.filter((x) => x.ok).length : 0;
  const cast = s.humanVotes ? s.humanVotes.length : 0;
  s.result = { side, pot: s.pot, share: you.alive && winners.includes(you) ? share : 0 };
  s.sc = {
    k: "FINALE", bg: "candle", music: side === "O" ? "sting_o" : "sting_s", title, sub, side,
    lines, winners: winners.map((p) => p.id), share,
    stats: { correct, cast, days: you.alive ? s.day : you.outDay || s.day },
    timeline: s.ff ? s.timeline.slice(-30) : [],
  };
}

function playerOut(s, r, how) {
  const you = human(s);
  if (you.alive) { you.alive = false; you.out = how; you.outDay = s.day; }
  s.phase = "OUT";
  s.sc = {
    k: "OUT", bg: how === "murdered" ? "tower" : "roundtable", music: "night", how,
    title: how === "murdered" ? "YOU WERE MURDERED IN THE NIGHT" : "YOU HAVE BEEN EXILED",
    lines: how === "murdered"
      ? [narr("You never made it to breakfast. The Oathbreakers came for you in the dark.")]
      : [narr("The castle doors close behind you. The game goes on without you.")],
  };
}

/** Player is out and chose WATCH TO THE END: simulate the rest of the season. */
function fastForward(s, r) {
  s.ff = true;
  timeline(s, `${human(s).name} left the game (${human(s).out}).`);
  let guard = 0;
  while (guard++ < 30) {
    if (!oathAlive(s).length && alive(s).length < 5) break;
    if (alive(s).length <= 4 || s.final) {
      // Last Candle: exile until the AIs are satisfied or two remain.
      let g2 = 0;
      while (g2++ < 10 && alive(s).length > 2) {
        const lc = lastCandleVote(s, r, true);
        if (lc.unanimous) break;
        s.acc = {};
        const res = castVotes(s, r, null, false);
        const tl = tallyVotes(res.votes, res.weight);
        const out = tl.top.length ? r.pick(tl.top) : null;
        if (!out) break;
        const p = P(s, out);
        p.alive = false; p.out = "exiled"; p.outDay = s.day;
        timeline(s, `${nameOf(s, out)} was exiled at the Last Candle.`);
      }
      break;
    }
    // Night.
    startNight(s, r);
    if (s.phase === "OFFER" || s.phase === "TOWER") {
      // Only reachable for a living human; the human is out here.
      break;
    }
    for (const p of s.ps) p.shield = false;
    s.day += 1;
    if (alive(s).length <= 4) continue;
    // Day: mission gold and one exile.
    const kind = MISSIONS[s.day];
    if (kind) {
      const g = Math.round(MISSION_MAX[kind] * (0.5 + r.next() * 0.4) / 50) * 50;
      s.pot += g;
      timeline(s, `${MISSION_TITLE[kind]} added ${fmt(g)} gold.`);
    }
    s.acc = {};
    for (const a of aiAlive(s)) { const t = topSuspect(s, r, a.id); if (t) s.acc[t] = (s.acc[t] || 0) + 1; }
    const res = castVotes(s, r, null, false);
    const tl = tallyVotes(res.votes, res.weight);
    const out = tl.top.length ? r.pick(tl.top) : null;
    if (out) {
      const p = P(s, out);
      p.alive = false; p.out = "exiled"; p.outDay = s.day; p.revealed = true;
      timeline(s, `${nameOf(s, out)} was exiled (${p.role === "O" ? "Oathbreaker" : "Sworn"}).`);
      if (p.role === "O") s.flags.recruitNext = oathAlive(s).length === 1;
    }
  }
  finale(s, r);
}

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

const PHASE_ACTIONS = {
  LOBBY: ["start"],
  INTRO: ["next"],
  ROLE: ["next"],
  BREAKFAST: ["next"],
  M_INTRO: ["next"],
  M_PLAY: ["mscore", "mchoice"],
  M_RESULT: ["next"],
  GALLERY: ["talk", "eaves", "toRT"],
  RT: ["speak", "toVote"],
  VOTE: ["vote"],
  REVEAL: ["next", "vote"],
  EXILE: ["next"],
  TOWER: ["murder", "recruit", "ultimatum"],
  OFFER: ["accept"],
  NIGHT: ["next"],
  LC: ["endvote"],
  LC_RESULT: ["next"],
  OUT: ["watch"],
  FINALE: [],
};

const isInt = (v) => Number.isInteger(v);
const isAliveTarget = (s, id, allowSelf) => {
  const p = typeof id === "string" ? P(s, id) : null;
  return !!(p && p.alive && (allowSelf || !p.human));
};

export function validateAction(state, playerId, action) {
  if (!action || typeof action !== "object" || typeof action.t !== "string") return { ok: false, error: "bad action" };
  const s = state;
  const allowed = PHASE_ACTIONS[s.phase] || [];
  if (!allowed.includes(action.t)) return { ok: false, error: `not now (${s.phase})` };
  const a = action;
  switch (a.t) {
    case "start": {
      if (typeof a.name !== "string" || a.name.trim().length < 2 || a.name.trim().length > 16) return { ok: false, error: "name must be 2-16 characters" };
      if (!isInt(a.av) || a.av < 0 || a.av > 5) return { ok: false, error: "bad avatar" };
      if (!FAMES.includes(a.fame)) return { ok: false, error: "bad fame" };
      if (!["random", "sworn", "oath"].includes(a.fate)) return { ok: false, error: "bad fate" };
      if (!isInt(a.seed)) return { ok: false, error: "bad seed" };
      return { ok: true };
    }
    case "mscore": {
      const k = s.m && s.m.kind;
      if (k === "vault" && isInt(a.score) && a.score >= 0 && a.score <= 6) return { ok: true };
      if (k === "lantern" && isInt(a.score) && a.score >= 0 && a.score <= 20) return { ok: true };
      return { ok: false, error: "bad score" };
    }
    case "mchoice": {
      const k = s.m && s.m.kind;
      if (k === "crossroads") {
        const max = CROSS_STEPS[s.m.step] ? CROSS_STEPS[s.m.step].a.length : 0;
        if (isInt(a.i) && a.i >= 0 && a.i < max) return { ok: true };
      }
      if (k === "mirror" && isInt(a.i) && a.i >= 0 && a.i < (s.m.step < 3 ? 3 : 2)) return { ok: true };
      return { ok: false, error: "bad choice" };
    }
    case "talk": {
      if (!s.g || s.g.talks <= 0) return { ok: false, error: "no conversations left" };
      if (!isAliveTarget(s, a.who)) return { ok: false, error: "nobody by that name" };
      if (a.text !== undefined && (typeof a.text !== "string" || a.text.length > 200)) return { ok: false, error: "too long" };
      if (a.text === undefined) {
        if (!isInt(a.q) || a.q < 0 || a.q > 4) return { ok: false, error: "bad question" };
        if (a.q === 3 && !isAliveTarget(s, a.target)) return { ok: false, error: "pick someone to accuse" };
      }
      return { ok: true };
    }
    case "eaves": return s.g && s.g.eaves > 0 ? { ok: true } : { ok: false, error: "no eavesdrops left" };
    case "toRT": return { ok: true };
    case "speak": {
      if (!s.rt || s.rt.speaks <= 0) return { ok: false, error: "you have spoken enough" };
      if (!["accuse", "defend", "self", "silent"].includes(a.kind)) return { ok: false, error: "bad speech" };
      if ((a.kind === "accuse" || a.kind === "defend") && !isAliveTarget(s, a.target)) return { ok: false, error: "pick someone" };
      return { ok: true };
    }
    case "toVote": return { ok: true };
    case "vote": {
      if (s.phase === "REVEAL") {
        if (!s.rt || !s.rt.tied) return { ok: false, error: "no revote" };
        if (s.rt.tied.includes(HUMAN)) return { ok: false, error: "you are tied and cannot vote" };
        if (!s.rt.tied.includes(a.target)) return { ok: false, error: "vote for one of the tied" };
        return { ok: true };
      }
      if (!isAliveTarget(s, a.target)) return { ok: false, error: "vote for someone at the table" };
      if (a.dagger && !(human(s).dagger > 0)) return { ok: false, error: "no dagger" };
      return { ok: true };
    }
    case "next":
      if (s.phase === "REVEAL" && s.rt && s.rt.tied && !s.rt.tied.includes(HUMAN)) return { ok: false, error: "cast your revote" };
      return { ok: true };
    case "murder":
    case "recruit":
    case "ultimatum": {
      const t = P(s, a.target);
      if (!t || !t.alive || t.role !== "S") return { ok: false, error: "choose a Sworn" };
      if (a.t === "recruit" && !s.sc.canRecruit) return { ok: false, error: "cannot recruit tonight" };
      if (a.t === "ultimatum" && !s.sc.canUlt) return { ok: false, error: "no ultimatum tonight" };
      return { ok: true };
    }
    case "accept": return typeof a.yes === "boolean" ? { ok: true } : { ok: false, error: "yes or no" };
    case "endvote": return typeof a.end === "boolean" ? { ok: true } : { ok: false, error: "end or exile" };
    case "watch": return { ok: true };
    default: return { ok: false, error: "unknown action" };
  }
}

export function applyAction(state, playerId, action) {
  if (state.phase === "LOBBY") {
    return initSeason(state.pid || playerId, {
      name: action.name.trim(), av: action.av, fame: action.fame, fate: action.fate, seed: action.seed,
    });
  }
  const s = clone(state);
  const r = rngFrom(s.seed);
  const a = action;
  switch (s.phase) {
    case "INTRO":
      s.phase = "ROLE";
      s.sc = roleScene(s);
      break;
    case "ROLE":
      startDay(s, r, 1);
      break;
    case "BREAKFAST":
      afterBreakfast(s, r);
      break;
    case "M_INTRO":
      s.phase = "M_PLAY";
      if (s.m.kind === "mirror") s.m.order = r.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
      s.sc = missionPlayScene(s);
      break;
    case "M_PLAY": {
      const k = s.m.kind;
      if (a.t === "mscore") {
        finishMission(s, r, k === "vault" ? resolveVault(s, r, a.score) : resolveLantern(s, r, a.score));
      } else {
        s.m.picks.push(a.i);
        s.m.step += 1;
        const steps = k === "crossroads" ? CROSS_STEPS.length : 4;
        if (s.m.step >= steps) finishMission(s, r, k === "crossroads" ? resolveCrossroads(s, r) : resolveMirror(s, r));
        else s.sc = missionPlayScene(s);
      }
      break;
    }
    case "M_RESULT":
      startGallery(s, r);
      break;
    case "GALLERY":
      if (a.t === "toRT") { s.g = null; startRoundTable(s, r); break; }
      if (a.t === "eaves") {
        s.g.eaves -= 1;
        s.g.log.push(...eavesdrop(s, r));
      } else {
        s.g.talks -= 1;
        let q = a.q;
        let target = a.target;
        if (a.text !== undefined) {
          const clean = a.text.replace(/[<>]/g, "").slice(0, 200);
          s.g.log.push(line(HUMAN, clean));
          const parsed = parseText(s, clean);
          q = parsed.q;
          target = parsed.target;
          if (q === -1) {
            const lying = P(s, a.who).role === "O";
            s.g.log.push(line(a.who, withTell(s, r, a.who, r.pick(["Hm. Say more.", "I'm listening. Barely.", "That's one way to look at it.", "Careful what you say in this castle."]), lying), "neutral"));
            s.sc = gallerySceneFrom(s);
            break;
          }
        } else {
          const prompt = ["Who do you suspect?", "Can I trust you?", "What happened on the mission?", `I think it's ${nameOf(s, target)}.`, "I have a shield."][q];
          s.g.log.push(line(HUMAN, `${nameOf(s, a.who)}, ${prompt[0].toLowerCase()}${prompt.slice(1)}`));
        }
        s.g.log.push(...talk(s, r, a.who, q, target));
      }
      if (s.g.log.length > 30) s.g.log = s.g.log.slice(-30);
      s.sc = gallerySceneFrom(s);
      break;
    case "RT":
      if (a.t === "toVote") {
        s.phase = "VOTE";
        s.sc = {
          k: "VOTE", bg: "roundtable", music: "roundtable", final: s.final,
          lines: [laird("Pick up your quills. Write a name. Make it count.", "l_quills")],
          people: aiAlive(s).map((p) => p.id), dagger: human(s).dagger > 0,
        };
      } else {
        s.rt.speaks -= 1;
        s.rt.log.push(...speak(s, r, a.kind, a.target));
        if (s.rt.log.length > 30) s.rt.log = s.rt.log.slice(-30);
        s.sc = rtScene(s);
      }
      break;
    case "VOTE": {
      if (!s.humanVotes) s.humanVotes = [];
      s.humanVotes.push({ d: s.day, t: a.target, ok: P(s, a.target).role === "O" });
      doVote(s, r, a.target, !!a.dagger);
      break;
    }
    case "REVEAL":
      if (a.t === "vote") doRevote(s, r, a.target);
      else if (s.rt.tied) doRevote(s, r, null);
      else exile(s, r);
      break;
    case "EXILE":
      afterExile(s, r);
      break;
    case "TOWER": {
      s.flags.recruitNext = false;
      const t = a.target;
      if (a.t === "murder") {
        resolveMurder(s, r, t);
        const res = s.night.result;
        s.phase = "NIGHT";
        s.sc = {
          k: "NIGHT", bg: "tower", music: "night", role: "O",
          lines: res.shielded
            ? [narr(`The door would not open. ${nameOf(s, t)} was shielded.`)]
            : [narr(`It is done. ${nameOf(s, t)} will not come to breakfast.`)],
          next: "DAWN",
        };
      } else {
        if (a.t === "ultimatum") s.flags.ultimatumUsed = true;
        const accept = r.chance(a.t === "ultimatum" ? 0.8 : 0.75);
        const lines = [];
        if (accept) {
          P(s, t).role = "O";
          s.night.result = { none: true };
          lines.push(narr(`${nameOf(s, t)} takes the oath. You are no longer alone.`));
          timeline(s, `${nameOf(s, t)} joined the Oathbreakers.`);
        } else if (a.t === "ultimatum") {
          killAt(s, t);
          s.night.result = { victim: t };
          lines.push(narr(`${nameOf(s, t)} refuses. They will not leave that room.`));
        } else {
          s.night.result = { none: true };
          lines.push(narr(`${nameOf(s, t)} burns your letter. Nobody dies tonight, and now someone knows.`));
          sus(s, t, HUMAN, 25);
        }
        s.phase = "NIGHT";
        s.sc = { k: "NIGHT", bg: "tower", music: "night", role: "O", lines, next: "DAWN" };
      }
      break;
    }
    case "OFFER": {
      const kind = s.night.offer;
      const lines = [];
      if (a.yes) {
        human(s).role = "O";
        s.night.result = { none: true };
        const fellows = oathAlive(s).filter((p) => !p.human).map((p) => p.name);
        lines.push(narr(`You take the oath. Your fellow Oathbreakers: ${fellows.join(", ")}.`));
        timeline(s, `${human(s).name} joined the Oathbreakers.`);
      } else if (kind === "ult") {
        killAt(s, HUMAN);
        s.night.result = { victim: HUMAN };
        s.phase = "NIGHT";
        return (endNight(s, r), finalize(s, r));
      } else {
        s.night.result = { none: true };
        lines.push(narr("You burn the letter. The ashes smell of candle wax and fear."));
      }
      s.phase = "NIGHT";
      s.sc = { k: "NIGHT", bg: "exterior", music: "night", lines, role: human(s).role, next: "WAIT FOR DAWN" };
      break;
    }
    case "NIGHT":
      endNight(s, r);
      break;
    case "LC": {
      const lc = lastCandleVote(s, r, a.end);
      const lines = [];
      if (lc.unanimous) {
        lines.push(narr("Every candle vote reads END. The flame goes out."));
        finale(s, r);
        s.sc.lines = lines.concat(s.sc.lines);
        break;
      }
      lines.push(narr("Someone chose to exile again."));
      s.phase = "LC_RESULT";
      s.sc = { k: "LC_RESULT", bg: "candle", music: "finale", votes: lc.votes, lines, next: "BACK TO THE TABLE" };
      break;
    }
    case "LC_RESULT":
      startRoundTable(s, r);
      break;
    case "OUT":
      fastForward(s, r);
      break;
    default:
      break;
  }
  return finalize(s, r);
}

function finalize(s, r) {
  s.seed = r.seed;
  return s;
}

export function isGameOver(state) {
  if (!state || state.phase !== "FINALE") return { over: false };
  const res = state.result || {};
  return { over: true, winner: res.side === "O" ? "oathbreakers" : "sworn", side: res.side || null, share: res.share || 0 };
}

export function viewFor(state, playerId) {
  const s = state;
  if (!s || s.phase === "LOBBY") return { phase: "LOBBY", sc: { k: "LOBBY" } };
  const you = s.ps[0];
  const over = s.phase === "FINALE";
  const iAmO = you.role === "O";
  const roster = s.ps.map((p) => {
    let role = null;
    if (p.human) role = p.role;
    else if (over || p.revealed) role = p.role;
    else if (iAmO && p.role === "O") role = "O";
    return { id: p.id, name: p.name, alive: p.alive, out: p.out, outDay: p.outDay, role, human: !!p.human };
  });
  return {
    phase: s.phase,
    day: s.day,
    pot: s.pot,
    left: s.ps.filter((p) => p.alive).length,
    you: { name: you.name, av: you.av, fame: you.fame, role: you.role, alive: you.alive, shield: you.shield, dagger: you.dagger },
    roster,
    journal: s.journal.slice(-MAX_JOURNAL),
    sc: s.sc,
    final: !!s.final,
  };
}
