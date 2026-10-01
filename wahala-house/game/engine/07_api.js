// ---------------------------------------------------------------------------
// Event dispatch
// ---------------------------------------------------------------------------

function trigger(s, r, kind) {
  const me = s.hm[0];
  switch (kind) {
    case "night": if (nightEvent(s, r)) evRun(s, r); return;
    case "hoh": startHoh(s, r); break;
    case "wager": startWager(s, r); break;
    case "diary": if (!me.out) startDiary(s, r); else s.done[s.day + ":diary"] = true; break;
    case "noms": startNoms(s, r); break;
    case "nomreveal": startNomReveal(s, r); break;
    case "veto": startVeto(s, r); break;
    case "hustle": startHustle(s, r); break;
    case "wresult": startWresult(s, r); break;
    case "strike": if (strikeEvent(s, r)) evRun(s, r); return;
    case "strikereveal": startStrikeReveal(s, r); break;
    case "party": startParty(s, r); break;
    case "live": startLive(s, r); break;
    case "sleep": newDay(s, r); if (s.mission && !s.mission.done && s.day > s.mission.until) { s.mission.done = true; s.mission.failed = true; note(s, `${EYE}: Your secret mission has expired.`, "info"); } return;
    default: return;
  }
  evRun(s, r);
}

/** Advance the clock by n ticks, stopping when an event takes over. */
function run(s, r, n) {
  for (let i = 0; i < n; i++) {
    if (s.phase !== "ROAM") return;
    const due = advance(s, r);
    if (due) { trigger(s, r, due); if (s.phase !== "ROAM") return; if (due === "sleep") return; }
    else if (s.min % 30 === 20 && (maybeIncident(s, r) || maybeApproach(s, r))) { evRun(s, r); return; }
  }
}

function fastForward(s, r) {
  const target = nextEventMin(s);
  let guard = 0;
  const day = s.day;
  while (s.phase === "ROAM" && guard < 130) {
    guard += 1;
    const due = advance(s, r);
    if (due) { trigger(s, r, due); if (s.phase !== "ROAM" || due === "sleep" || s.day !== day) return; }
    else if (s.min % 30 === 20 && (maybeIncident(s, r) || maybeApproach(s, r))) { evRun(s, r); return; }
    if (s.min >= target && s.phase === "ROAM" && !due) return;
  }
}

// ---------------------------------------------------------------------------
// The six exports
// ---------------------------------------------------------------------------

export function setup(players) {
  return { v: 1, phase: "LOBBY", pid: players[0] || "" };
}

const PHASE_ACTIONS = {
  LOBBY: ["start"],
  EV: ["next", "skip", "pick", "score"],
  ROAM: ["tick", "ff", "room", "talk", "listen", "buy", "rest", "do"],
  END: [],
};

function current(s) { return s.ev ? s.ev.q[s.ev.i] : null; }

/** A beat that carries a result the player must see; skipping always stops on one. */
function isKeyBeat(b) { return !!(b.key || b.focus || b.out || b.reveal || b.board || b.ledger || b.votes || b.team || b.missing || b.callers); }

/** Skip ahead through talk to the next result, choice or mini-game. */
function skipBeats(s, r) {
  s.ev.i += 1;
  evRun(s, r);
  for (let guard = 0; s.ev && guard < 400; guard++) {
    const it = current(s);
    if (!it || !it.b || isKeyBeat(it.b)) return;
    s.ev.i += 1;
    evRun(s, r);
  }
}

/** The set the show is on right now (beats can move it mid-event). */
function stageNow(ev) {
  let st = ev.stage;
  for (let k = 0; k <= ev.i && k < ev.q.length; k++) if (ev.q[k].b && ev.q[k].b.stage) st = ev.q[k].b.stage;
  return st;
}

export function validateAction(state, playerId, action) {
  const s = state;
  if (!action || typeof action !== "object" || typeof action.t !== "string") return { ok: false, error: "bad action" };
  if (s.pid && playerId !== s.pid) return { ok: false, error: "not your season" };
  const allowed = PHASE_ACTIONS[s.phase] || [];
  if (!allowed.includes(action.t)) return { ok: false, error: `not now (${s.phase})` };
  const a = action;
  const me = s.hm ? s.hm[0] : null;
  switch (a.t) {
    case "start": {
      if (typeof a.name !== "string") return { ok: false, error: "name required" };
      const n = a.name.trim();
      if (n.length < 2 || n.length > 16) return { ok: false, error: "name must be 2-16 characters" };
      if (!/^[\p{L}\p{N} .'-]+$/u.test(n)) return { ok: false, error: "letters and numbers only" };
      if (a.look !== "f" && a.look !== "m") return { ok: false, error: "bad look" };
      if (!["random", "housemate", "saboteur"].includes(a.fate)) return { ok: false, error: "bad fate" };
      if (!isInt(a.seed)) return { ok: false, error: "bad seed" };
      return { ok: true };
    }
    case "next": case "skip": { const it = current(s); return it && it.b ? { ok: true } : { ok: false, error: "nothing to advance" }; }
    case "pick": {
      const it = current(s);
      if (!it || !it.c) return { ok: false, error: "no choice pending" };
      const vals = it.c.o.map((o) => o.v);
      if (it.c.n > 1) {
        if (!Array.isArray(a.v) || a.v.length !== it.c.n) return { ok: false, error: `pick ${it.c.n}` };
        if (new Set(a.v).size !== a.v.length) return { ok: false, error: "no duplicates" };
        if (!a.v.every((x) => typeof x === "string" && vals.includes(x))) return { ok: false, error: "bad pick" };
        return { ok: true };
      }
      if (typeof a.v !== "string" || !vals.includes(a.v)) return { ok: false, error: "bad pick" };
      return { ok: true };
    }
    case "score": {
      const it = current(s);
      if (!it || !it.m) return { ok: false, error: "no game running" };
      if (it.m.g === "jollof") return isInt(a.v) && a.v >= 0 && a.v <= 6000 ? { ok: true } : { ok: false, error: "bad score" };
      if (it.m.g === "dance") return isInt(a.v) && a.v >= 0 && a.v <= 100 ? { ok: true } : { ok: false, error: "bad score" };
      if (it.m.g === "hustle") {
        const v = a.v;
        if (!v || typeof v !== "object" || !isInt(v.profit) || v.profit < 0 || v.profit > 8000000) return { ok: false, error: "bad profit" };
        if (!isInt(v.skim) || v.skim < 0 || v.skim > 2000000 || (v.skim > 0 && me.role !== "S")) return { ok: false, error: "bad skim" };
        return { ok: true };
      }
      return { ok: false, error: "bad game" };
    }
    case "tick": case "ff": return { ok: true };
    case "do": {
      if (typeof a.what !== "string" || !DOINGS[a.what]) return { ok: false, error: "bad activity" };
      const why = canDo(s, a.what);
      return why ? { ok: false, error: why } : { ok: true };
    }
    case "rest": {
      if (me.out) return { ok: false, error: "you are out" };
      if (me.room !== "bedroom" && me.room !== "gym") return { ok: false, error: "rest in the bedroom or work out in the gym" };
      return { ok: true };
    }
    case "room": {
      if (me.out) return { ok: false, error: "you are out" };
      if (!ROAM_ROOMS.includes(a.room)) return { ok: false, error: "bad room" };
      if (a.room === "hoh" && s.hoh !== ME && s.tenant !== ME) return { ok: false, error: "The HoH Lounge is locked." };
      return { ok: true };
    }
    case "talk": {
      if (typeof a.who !== "string" || typeof a.act !== "string" || !ACTS[a.act]) return { ok: false, error: "bad move" };
      if (a.x !== undefined && typeof a.x !== "string") return { ok: false, error: "bad target" };
      if (a.claim !== undefined && typeof a.claim !== "string") return { ok: false, error: "bad claim" };
      const why = canTalk(s, a.who, a.act, a);
      return why ? { ok: false, error: why } : { ok: true };
    }
    case "listen": {
      if (!isInt(a.id)) return { ok: false, error: "bad scene" };
      const sc = s.scenes.find((z) => z.id === a.id);
      if (!sc || sc.until <= s.min || sc.d !== s.day) return { ok: false, error: "That conversation is over." };
      if (me.out || sc.room !== me.room) return { ok: false, error: "You're too far away to hear." };
      if (sc.heard) return { ok: false, error: "You already heard this one." };
      return { ok: true };
    }
    case "buy": {
      if (me.out) return { ok: false, error: "you are out" };
      if (a.item === "peek") return me.coins >= 150 ? { ok: true } : { ok: false, error: "A Sneak Peek costs 150 coins." };
      if (a.item === "immunity") {
        if (me.immune) return { ok: false, error: "You are already immune." };
        if (s.done["3:noms"]) return { ok: false, error: "Nominations are over this week." };
        return me.coins >= 800 ? { ok: true } : { ok: false, error: "The Immunity Token costs 800 coins." };
      }
      return { ok: false, error: "bad item" };
    }
  }
  return { ok: false, error: "unknown action" };
}

export function applyAction(state, playerId, action) {
  if (state.phase === "LOBBY") {
    return initSeason(state.pid || playerId, { name: action.name.trim(), look: action.look, fate: action.fate, seed: action.seed });
  }
  const s = clone(state);
  const r = rngFrom(s.seed);
  const a = action;
  const me = s.hm[0];
  s.last = a.t === "talk" ? s.last : null;
  switch (a.t) {
    case "next": s.ev.i += 1; evRun(s, r); break;
    case "skip": skipBeats(s, r); break;
    case "pick": {
      const it = current(s);
      s.ev.i += 1;
      FN[it.c.h](s, r, a.v, it.c.ctx);
      evRun(s, r);
      break;
    }
    case "score": {
      const it = current(s);
      s.ev.i += 1;
      FN[it.m.h](s, r, a.v);
      evRun(s, r);
      break;
    }
    case "tick": run(s, r, 1); break;
    case "ff": fastForward(s, r); break;
    case "do": doThing(s, r, a.what); run(s, r, DOINGS[a.what].ticks); break;
    case "rest": {
      if (me.room === "bedroom") { me.comp = clamp(me.comp + 15); note(s, "You rested. Composure +15.", "good"); run(s, r, 6); }
      else { me.comp = clamp(me.comp + 8); me.fans = clamp(me.fans + 1); note(s, "Good workout. Composure +8.", "good"); run(s, r, 3); }
      break;
    }
    case "room": me.room = a.room; me.spot = 0; break;
    case "talk": talk(s, r, a); break;
    case "listen": listen(s, r, a.id); break;
    case "buy": buy(s, r, a.item); break;
  }
  s.seed = r.state;
  return s;
}

export function isGameOver(state) {
  if (!state || state.phase !== "END" || !state.result) return { over: false };
  const res = state.result;
  return { over: true, winner: res.out ? "house" : "you", headline: res.headline, grade: res.grade };
}

// ---------------------------------------------------------------------------
// What the browser is allowed to see
// ---------------------------------------------------------------------------

const PUBLIC_KIND = { flirt: "flirt", kiss: "kiss", argue: "argue", gossip: "whisper", deal: "whisper", scheme: "whisper", bond: "chat", cry: "cry" };

export function viewFor(state, playerId) {
  const s = state;
  if (!s || s.phase === "LOBBY" || !s.hm) return { phase: "LOBBY" };
  const me = s.hm[0];
  const partner = me.role === "S" ? s.sabs.find((x) => x !== ME) : null;
  const over = s.phase === "END";
  const nomsPublic = s.done["3:nomreveal"] || s.day > 3;
  const hm = s.hm.slice(1).map((h) => {
    const v = rel(s, h.id, ME);
    const badges = [];
    if (s.hoh === h.id) badges.push("HOH");
    if (s.tenant === h.id) badges.push("TENANT");
    if (nomsPublic && s.noms.includes(h.id)) badges.push("NOMINATED");
    if (h.strikes) badges.push("STRIKES " + h.strikes);
    const sh = findShip(s, ME, h.id);
    return {
      id: h.id, name: h.name, out: h.out ? h.out.how : null, room: h.room, spot: h.spot, act: h.act, with: h.with, sc: h.sc, watch: h.watch || null,
      badges, strikes: h.strikes,
      feel: { f: level(v[F]), r: level(v[RO]), t: level(v[TR]), b: level(v[BF]) },
      promised: s.prom[h.id + ">" + ME] === "save", squad: inSquad(s, h.id), ship: sh ? (sh.official ? "official" : "spark") : null,
      role: over || h.id === partner || (h.out && h.out.how === "ejected") ? h.role : null,
      sab: h.id === partner ? true : undefined,
    };
  });
  const scenes = s.scenes.filter((sc) => sc.until > s.min && sc.d === s.day).map((sc) => ({ id: sc.id, k: PUBLIC_KIND[sc.k], room: sc.room, a: sc.a, b: sc.b, heard: sc.heard }));
  const it = s.ev ? s.ev.q[s.ev.i] : null;
  const ev = s.ev ? { k: s.ev.k, n: s.ev.n || 0, stage: s.ev.stage, stageNow: stageNow(s.ev), title: s.ev.title, i: s.ev.i, item: it ? { b: it.b, c: it.c ? Object.assign({}, it.c, { h: undefined, auto: undefined }) : undefined, m: it.m ? Object.assign({}, it.m, { h: undefined }) : undefined } : null } : null;
  const nextM = nextEventMin(s);
  const nextK = (SCHEDULE[s.day] || []).find(([m, k]) => m === nextM && !s.done[s.day + ":" + k]);
  return {
    phase: s.phase, day: s.day, dayName: DAYS[s.day], min: s.min, clock: hhmm(s.min), block: BLOCK_NAMES[blockOf(s.min)],
    pot: s.pot,
    you: {
      name: me.name, look: me.look, role: me.role, partner, energy: me.energy, coins: me.coins, comp: me.comp, fans: me.fans,
      strikes: me.strikes, room: me.room, immune: me.immune, out: me.out ? me.out.how : null,
      hoh: s.hoh === ME, tenant: s.tenant === ME, nominated: nomsPublic && s.noms.includes(ME),
      doings: Object.fromEntries(Object.keys(DOINGS).map((k) => [k, doneToday(s, k)])),
    },
    dark: !!s.dark && s.dark > s.day * 1440 + s.min,
    hm,
    ships: s.ships.filter((sh) => sh.official || sh.a === ME || sh.b === ME).map((sh) => ({ a: sh.a, b: sh.b, name: sh.name, official: sh.official })),
    beefs: s.beefs.slice(-20),
    squad: s.squads.find((q) => q.members.includes(ME)) || null,
    scenes, heard: s.heard, heardId: s.heardId || 0,
    gb: s.gb, feed: s.feed.slice(-12), notes: s.notes.slice(-8), last: s.last,
    hoh: s.hoh, tenant: s.tenant, noms: nomsPublic ? s.noms : [], teams: s.teams,
    mission: s.mission ? { text: s.mission.text, done: !!s.mission.done, failed: !!s.mission.failed } : null,
    lies: s.lies.map((l) => ({ to: l.to, about: l.about, c: l.c, exposed: l.exposed })),
    ev, next: nextK ? { at: hhmm(nextK[0]), k: nextK[1] } : null,
    log: s.log.slice(-15),
    result: s.result,
  };
}
