// ---------------------------------------------------------------------------
// Season setup
// ---------------------------------------------------------------------------

function initSeason(pid, a) {
  const r = rngFrom((a.seed >>> 0) ^ 0x5bd1e995);
  const s = {
    v: 1, pid, phase: "EV", day: 0, min: 1080, seed: 0,
    hm: [], rel: {}, mem: {}, prom: {}, squads: [], ships: [], beefs: [], lies: [],
    gb: [], gid: 0, feed: [], log: [], notes: [], nid: 0, scenes: [], scid: 0, heard: [],
    pot: 0, hoh: null, tenant: null, noms: [], saves: null, vetoed: null, teams: null,
    wager: null, plan: { skim: 0, plant: null, rumor: null }, strikeTarget: null, struck: null,
    diary: { fav: null, snake: null, mood: null, mission: null }, mission: null,
    ev: null, last: null, done: {}, result: null, out: null, peeks: 0, eye: 0,
  };
  // Player first, always at index 0.
  s.hm.push({
    id: ME, human: true, name: a.name, look: a.look, g: a.look === "m" ? "m" : "f", role: "H",
    out: null, room: "arena", spot: 11, act: "idle", with: null, sc: null,
    comp: 70, fans: 50, strikes: 0, coins: 200, energy: 10, immune: false, acts: 0, sus: 0,
  });
  for (const c of CAST) {
    s.hm.push({
      id: c.id, human: false, name: c.name, look: c.id, g: c.g, role: "H",
      out: null, room: "arena", spot: 0, act: "idle", with: null, sc: null,
      comp: 62 + r.int(16), fans: c.fans, strikes: 0, coins: 200, energy: 0, immune: false, acts: 0,
    });
    s.mem[c.id] = [];
  }
  // Roles: two Saboteurs.
  let sabs;
  const others = r.shuffle(AI_IDS);
  if (a.fate === "saboteur") sabs = [ME, others[0]];
  else if (a.fate === "housemate") sabs = [others[0], others[1]];
  else sabs = r.chance(2 / 11) ? [ME, others[0]] : [others[0], others[1]];
  for (const id of sabs) hmOf(s, id).role = "S";
  s.sabs = sabs;

  // Relationships.
  const ids = [ME].concat(AI_IDS);
  for (const x of ids) for (const y of ids) {
    if (x === y) continue;
    const cx = BY[x];
    let att = r.int(55);
    if (cx && cx.fl >= 4) att += 15;
    if (y !== ME && BY[y] && BY[y].fl >= 4) att += 10;
    s.rel[x + ">" + y] = [22 + r.int(16), 0, 22 + r.int(14), 0, clamp(att), 8 + r.int(10)];
  }
  for (const [x, y, f, ro, t, b] of HISTORY) {
    for (const [p, q] of [[x, y], [y, x]]) {
      const v = s.rel[p + ">" + q];
      v[F] = f; v[RO] = ro; v[TR] = t; v[BF] = b; if (ro) v[AT] = Math.max(v[AT], 60);
    }
  }
  seedRivalries(s, r);
  // Saboteurs quietly look after each other.
  if (sabs[0] !== ME && sabs[1] !== ME) { mutual(s, sabs[0], sabs[1], TR, 25); mutual(s, sabs[0], sabs[1], F, 10); }

  s.seed = r.state;
  startEntry(s, r);
  s.seed = r.state;
  return s;
}

// ---------------------------------------------------------------------------
// Where the housemates are
// ---------------------------------------------------------------------------

function freeSpot(s, r, room, exclude) {
  const used = new Set(s.hm.filter((h) => !h.out && h.room === room && h.id !== exclude).map((h) => h.spot));
  const n = ROOMS[room].spots;
  const free = [];
  for (let i = 0; i < n; i++) if (!used.has(i)) free.push(i);
  return free.length ? r.pick(free) : r.int(n);
}

function activityFor(s, r, h, room) {
  const b = blockOf(s.min);
  if (room === "bedroom") return s.min >= 1440 ? "sleep" : r.pick(["rest", "rest", "phone"]);
  if (room === "kitchen") return r.pick(["cook", "eat", "idle"]);
  if (room === "gym") return "workout";
  if (room === "garden") return b === 1 && r.chance(0.5) ? "sunbathe" : r.pick(["idle", "idle", "sit"]);
  if (room === "lounge" || room === "hoh") return r.pick(["sit", "sit", "idle"]);
  return "idle";
}

/** Re-plan where every idle AI goes. Runs on the hour. */
function placeAI(s, r) {
  const b = Math.min(2, blockOf(s.min));
  const late = s.min >= 1440;
  for (const h of aiIn(s)) {
    if (h.sc) continue; // mid-scene
    const c = BY[h.id];
    let room;
    if (late && r.chance(0.82)) room = "bedroom";
    else {
      const w = Object.assign({}, c.home[b]);
      for (const k of ROAM_ROOMS) w[k] = (w[k] || 0.4);
      w.hoh = s.hoh === h.id || s.tenant === h.id ? 3 : 0;
      if (h.comp < 35) { w.bedroom += 3; if (h.id === "ebi") w.gym += 2; }
      if (late) { w.garden += 1; w.bedroom += 2; }
      if (b < 2 && !late) w.bedroom = Math.min(w.bedroom, 1);
      // Drift toward the people they want, away from the people they can't stand.
      for (const o of inHouse(s)) {
        if (o.id === h.id || !ROAM_ROOMS.includes(o.room)) continue;
        const v = rel(s, h.id, o.id);
        if (v[RO] >= 45) w[o.room] += 2.5;
        if (v[F] >= 65) w[o.room] += 1.5;
        if (v[BF] >= 60) w[o.room] = Math.max(0.2, w[o.room] - 1.5);
      }
      if (w.hoh === 0) delete w.hoh;
      let tot = 0;
      for (const k in w) tot += w[k];
      let x = r.f() * tot;
      room = "lounge";
      for (const k in w) { x -= w[k]; if (x <= 0) { room = k; break; } }
    }
    if (room !== h.room) { h.room = room; h.spot = freeSpot(s, r, room, h.id); }
    h.act = activityFor(s, r, h, room);
    h.with = null;
    h.watch = null;
  }
}

// ---------------------------------------------------------------------------
// AI scenes: drama that happens whether or not the player is watching
// ---------------------------------------------------------------------------

const PRIVATE = { gossip: 1, deal: 1, scheme: 1 };

function pickSceneKind(s, r, a, b, room, alone) {
  const ab = rel(s, a, b), ba = rel(s, b, a);
  const night = s.min >= 1260;
  if (isSab(s, a) && isSab(s, b) && alone && r.chance(0.7)) return "scheme";
  if (ab[RO] >= 68 && ba[RO] >= 58 && (night || room === "hoh" || room === "garden") && r.chance(0.6)) return "kiss";
  // Real grudges boil over before anything else; hot heads boil over sooner.
  const beef = Math.max(ab[BF], ba[BF]), temper = Math.max(BY[a].tp, BY[b].tp);
  if (beef >= 55 && r.chance(0.8)) return "argue";
  if ((ab[RO] >= 35 || ba[RO] >= 35) && Math.max(ab[AT], ba[AT]) >= 45 && r.chance(0.7)) return "flirt";
  if (beef >= 38 && r.chance(0.3 + temper * 0.12)) return "argue";
  if (Math.min(hmOf(s, a).comp, hmOf(s, b).comp) < 45 && Math.max(ab[F], ba[F]) >= 30 && r.chance(0.65)) return "cry";
  if ((BY[a].sc >= 4 || BY[b].sc >= 4) && ab[F] >= 38 && s.day >= 1 && s.day <= 3 && r.chance(0.45)) return "deal";
  if (ab[F] >= 40 && r.chance(0.55)) return "gossip";
  if (Math.max(ab[AT], ba[AT]) >= 60 && r.chance(0.35)) return "flirt";
  return "bond";
}

/** Choose who a gossip or scheme scene is about. */
function gossipTarget(s, r, a, b, kind) {
  const pool = inHouseIds(s).filter((x) => x !== a && x !== b);
  let best = null, bestV = -1;
  for (const x of pool) {
    let v = rel(s, a, x)[BF] + rel(s, b, x)[BF] + rel(s, a, x)[SU] * 0.8 + r.int(25);
    if (kind === "scheme") v = threatOf(s, x) + r.int(20);
    if (x === ME) v += s.hm[0].fans >= 65 ? 12 : 4;
    if (v > bestV) { bestV = v; best = x; }
  }
  return best;
}

function startScene(s, r, kind, a, b, room) {
  const x = kind === "gossip" || kind === "scheme" ? gossipTarget(s, r, a, b, kind) : null;
  const tpl = r.pick(SCENES[kind]);
  const lines = tpl.map(([who, text]) => {
    const sp = who === "A" ? a : who === "B" ? b : null;
    return { w: sp, t: sp ? fill(s, r, text, sp, { x }) : text.replace(/\{x\}/g, x ? nameOf(s, x) : "") };
  });
  // Sometimes the first speaker opens in their own voice.
  const own = sceneOpener(r, a, kind);
  if (own) {
    const first = { w: a, t: fill(s, r, own, a, { x }) };
    if (kind === "gossip") lines[0] = first; else lines.unshift(first);
  }
  s.scid += 1;
  const sc = { id: s.scid, k: kind, room, a, b, x, until: s.min + 30 + 10 * r.int(2), lines, heard: false, d: s.day };
  s.scenes.push(sc);
  for (const id of [a, b]) { const h = hmOf(s, id); h.sc = sc.id; h.with = id === a ? b : a; h.act = kind; h.watch = null; }
  applyScene(s, r, sc);
  if (kind === "argue" || kind === "kiss") gatherCrowd(s, r, sc);
  return sc;
}

function applyScene(s, r, sc) {
  const { a, b, x, k } = sc;
  const A = hmOf(s, a), B = hmOf(s, b);
  const others = inHouse(s).filter((h) => h.room === sc.room && h.id !== a && h.id !== b && !h.human && h.act !== "sleep");
  if (k === "flirt") {
    bump(s, a, b, RO, 5 + rel(s, a, b)[AT] / 12); bump(s, b, a, RO, 4 + rel(s, b, a)[AT] / 12);
    A.fans = clamp(A.fans + 2); B.fans = clamp(B.fans + 2);
    if (rel(s, a, b)[RO] >= 55 && rel(s, b, a)[RO] >= 55) makeShip(s, r, a, b, false);
  } else if (k === "kiss") {
    mutual(s, a, b, RO, 10);
    const sh = makeShip(s, r, a, b, true);
    A.fans = clamp(A.fans + 6); B.fans = clamp(B.fans + 6);
    tweet(s, r, "kiss", a, b, sh.name);
    logEv(s, `${A.name} and ${B.name} kissed in the ${ROOMS[sc.room].name}.`, "kiss");
    // Jealousy.
    for (const h of inHouse(s)) {
      if (h.id === a || h.id === b) continue;
      for (const [p, q] of [[a, b], [b, a]]) {
        if (rel(s, h.id, p)[RO] >= 40) { bump(s, h.id, q, BF, 14); h.comp = clamp(h.comp - 10); if (h.human) note(s, `${A.name} and ${B.name} just kissed. Your heart...`, "love"); }
      }
    }
    for (const w of others) remember(s, w.id, { k: "kiss", x: a, y: b, room: ROOMS[sc.room].name.toLowerCase() });
  } else if (k === "argue") {
    mutual(s, a, b, BF, 10); mutual(s, a, b, F, -8);
    A.comp = clamp(A.comp - 9); B.comp = clamp(B.comp - 9);
    A.fans = clamp(A.fans + 4); B.fans = clamp(B.fans + 4);
    addBeef(s, a, b);
    tweet(s, r, "fight", a, b);
    logEv(s, `${A.name} and ${B.name} had a loud fight in the ${ROOMS[sc.room].name}.`, "fight");
    for (const w of others) remember(s, w.id, { k: "fight", x: a, y: b, room: ROOMS[sc.room].name.toLowerCase() });
    for (const h of [A, B]) {
      const c = BY[h.id];
      if (c.tp >= 4 && h.comp < 50 && r.chance(0.3)) strike(s, r, h.id, "threatening another housemate");
    }
    if (s.mission && s.mission.k === "fight" && !s.mission.done && s.mission.pair && s.mission.pair.includes(a) && s.mission.pair.includes(b)) completeMission(s, r);
  } else if (k === "gossip") {
    mutual(s, a, b, F, 5);
    bump(s, a, x, BF, 5); bump(s, b, x, BF, 6);
    bump(s, a, x, SU, 3); bump(s, b, x, SU, 4);
    bump(s, b, x, TR, -5);
    remember(s, b, { k: "gossip", x, src: a });
    for (const w of others) if (r.chance(BY[w.id].ob * 0.06)) remember(s, w.id, { k: "overheard", x, src: a });
  } else if (k === "deal") {
    mutual(s, a, b, TR, 10);
    s.prom[a + ">" + b] = "save"; s.prom[b + ">" + a] = "save";
  } else if (k === "bond") {
    mutual(s, a, b, F, 7); mutual(s, a, b, TR, 4);
    if (BY[a].wt >= 4) B.fans = clamp(B.fans + 1), A.fans = clamp(A.fans + 2);
  } else if (k === "cry") {
    mutual(s, a, b, F, 8);
    A.comp = clamp(A.comp + 14);
    A.fans = clamp(A.fans + 3);
  } else if (k === "scheme") {
    s.plan.plant = s.plan.plant || x;
    for (const w of others) if (r.chance(BY[w.id].ob * 0.05)) { remember(s, w.id, { k: "saw_scheme", x: a, y: b }); bump(s, w.id, a, SU, 18); bump(s, w.id, b, SU, 18); }
  }
}

function endScene(s, sc) {
  for (const id of [sc.a, sc.b]) {
    const h = hmOf(s, id);
    if (h && h.sc === sc.id) { h.sc = null; h.with = null; h.act = "idle"; }
  }
  for (const h of s.hm) if (h.watch === sc.id) { h.watch = null; h.act = "idle"; }
}

/** Every half hour, the house makes content. */
function runScenes(s, r) {
  const busy = new Set();
  for (const sc of s.scenes) if (sc.until > s.min && sc.d === s.day) { busy.add(sc.a); busy.add(sc.b); }
  for (const room of ROAM_ROOMS) {
    const ppl = aiIn(s).filter((h) => h.room === room && !busy.has(h.id) && h.act !== "sleep");
    if (ppl.length < 2) continue;
    const pChance = room === "bedroom" ? 0.25 : 0.5;
    if (!r.chance(pChance)) continue;
    // Pick the most charged pair, with some randomness.
    let best = null, bestV = -1;
    for (let i = 0; i < ppl.length; i++) for (let j = i + 1; j < ppl.length; j++) {
      const a = ppl[i].id, b = ppl[j].id, ab = rel(s, a, b), ba = rel(s, b, a);
      const v = Math.max(ab[RO], ba[RO]) + Math.max(ab[BF], ba[BF]) + ab[F] * 0.4 + r.int(40) + (isSab(s, a) && isSab(s, b) ? 25 : 0);
      if (v > bestV) { bestV = v; best = [a, b]; }
    }
    const present = inHouse(s).filter((h) => h.room === room && h.act !== "sleep").length;
    const kind = pickSceneKind(s, r, best[0], best[1], room, present === 2);
    // The one crying is whoever is lower on composure.
    if (kind === "cry" && hmOf(s, best[1]).comp < hmOf(s, best[0]).comp) best.reverse();
    startScene(s, r, kind, best[0], best[1], room);
    busy.add(best[0]); busy.add(best[1]);
  }
}

function threatOf(s, x) {
  if (isSab(s, x)) return -100;
  let t = 0;
  for (const sab of s.sabs) {
    if (hmOf(s, sab).out) continue;
    const v = rel(s, x, sab);
    if (v) t = Math.max(t, v[SU]);
  }
  if (x === ME) { if (s.gb.some((g) => /sab:|skim:/.test(g.tag))) t += 30; t += s.hm[0].sus * 2; }
  const h = hmOf(s, x);
  return t + (h ? h.fans / 6 : 0);
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/** Advance one tick (10 game minutes). Returns an event kind if one is due. */
function advance(s, r) {
  s.min += TICK;
  // Close finished scenes.
  for (const sc of s.scenes) if (sc.until <= s.min && sc.d === s.day) endScene(s, sc);
  s.scenes = s.scenes.filter((sc) => sc.until > s.min - 60 && sc.d === s.day);
  if (s.min % 60 === 0) placeAI(s, r);
  if (s.min % 30 === 0 && s.min < 1500) runScenes(s, r);
  checkLies(s, r);
  const due = (SCHEDULE[s.day] || []).find(([m, k]) => m <= s.min && !s.done[s.day + ":" + k]);
  if (due) return due[1];
  if (s.min >= DAY_END) return "sleep";
  return null;
}

function nextEventMin(s) {
  const due = (SCHEDULE[s.day] || []).filter(([m, k]) => !s.done[s.day + ":" + k]).map(([m]) => m);
  return due.length ? Math.min.apply(null, due) : DAY_END;
}

function newDay(s, r) {
  // Overnight: everyone sleeps it off a little.
  for (const h of inHouse(s)) {
    h.comp = clamp(h.comp + 12);
    if (h.human) { h.energy = 10; if (h.acts < 3) { h.fans = clamp(h.fans - 4); } h.acts = 0; }
    else { if (h.fans > 52 && s.scenes.filter((sc) => sc.a === h.id || sc.b === h.id).length === 0) h.fans = clamp(h.fans - 3); }
  }
  s.day += 1;
  s.min = DAY_START;
  s.scenes = [];
  for (const h of inHouse(s)) { h.sc = null; h.with = null; }
  if (s.hm[0].fans < 38 && !s.hm[0].out) tweet(s, r, "boring", ME);
  placeAI(s, r);
  if (!s.hm[0].out) { s.hm[0].room = "bedroom"; }
}

// ---------------------------------------------------------------------------
// Lies catch up with you
// ---------------------------------------------------------------------------

function checkLies(s, r) {
  if (s.min % 60 !== 0) return;
  for (const L of s.lies) {
    if (L.exposed) continue;
    const to = hmOf(s, L.to), about = hmOf(s, L.about);
    if (!to || !about || to.out || about.out) continue;
    // They compare notes when they are together and on speaking terms.
    const together = to.room === about.room;
    const talk = rel(s, L.to, L.about)[F] + rel(s, L.to, L.about)[TR] * 0.5;
    const p = (together ? 0.12 : 0.02) + talk / 900 + (BY[L.to].ob + BY[L.about].ob) * 0.006;
    if (r.chance(p)) {
      L.exposed = true;
      bump(s, L.to, ME, TR, -30); bump(s, L.about, ME, TR, -25);
      bump(s, L.to, ME, BF, 14); bump(s, L.about, ME, BF, 20);
      bump(s, L.to, L.about, BF, -10);
      s.hm[0].fans = clamp(s.hm[0].fans + 3);
      note(s, `Exposed! ${nameOf(s, L.to)} and ${nameOf(s, L.about)} compared notes. Your lie about ${nameOf(s, L.about)} is out.`, "bad");
      logEv(s, `${nameOf(s, L.to)} and ${nameOf(s, L.about)} exposed ${s.hm[0].name}'s lie.`, "lie");
      tweet(s, r, "youbad", ME);
    }
  }
}
