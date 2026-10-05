// ---------------------------------------------------------------------------
// The six exports, plus the server clock tick and presence system actions.
// ---------------------------------------------------------------------------

export function setup(players) {
  return freshState(players.slice(), 0);
}

const OK = { ok: true };
const no = (error) => ({ ok: false, error });

export function validateAction(state, playerId, a) {
  if (!a || typeof a !== "object" || typeof a.t !== "string") return no("bad action");
  if (a.t.startsWith("_")) return no("not allowed");
  const s = Object.assign({}, state, { now: Math.max(state.now || 0, Number(a._now) || 0) });
  const p = pOf(s, playerId);
  if (!p) return no("join first");
  switch (a.t) {
    case "hello":
      if (typeof a.name !== "string" || a.name.length > 40) return no("bad name");
      if (a.look !== undefined && typeof a.look !== "string") return no("bad look");
      if (!p.hello && !cleanName(a.name)) return no("Pick a name of 2 to 14 letters.");
      return OK;
    case "look":
      if (s.phase !== "LOBBY") return no("not now");
      if (!LOOKS.includes(a.look)) return no("bad look");
      if (s.ps.some((q) => q !== p && q.look === a.look)) return no("Someone already picked that look.");
      return OK;
    case "opts":
      if (s.phase !== "LOBBY") return no("not now");
      if (s.host !== p.id) return no("Only the host can change settings.");
      return OK;
    case "start":
      if (s.phase !== "LOBBY") return no("not now");
      if (s.host !== p.id) return no("Only the host can start.");
      if (!lobbyHumans(s).length) return no("Nobody is here.");
      return OK;
    case "again":
      if (s.phase !== "END") return no("not now");
      if (s.host !== p.id && !s.pub) return no("Only the host can restart.");
      return OK;
    case "p": {
      const e = checkMove(s, p, a);
      return e ? no(e) : OK;
    }
    case "use": {
      if (s.phase !== "PLAY" || p.spec) return no("not now");
      if (!STATIONS[a.id] || STATIONS[a.id].kind === "bell") return no("no such station");
      if (!nearStation(p, a.id)) return no("Get closer.");
      const e = stationOpen(s, p, a.id);
      return e ? no(e) : OK;
    }
    case "done": {
      if (s.phase !== "PLAY" || p.spec) return no("not now");
      if (!p.act || p.act.id !== a.id) return no("Start it first.");
      const st = STATIONS[a.id];
      if (s.now - p.act.at < st.dur * 1000 * T.taskSlack) return no("Too fast.");
      if (!nearStation(p, a.id, RANGE.use + 0.6)) return no("Get closer.");
      const e = stationOpen(s, p, a.id);
      return e ? no(e) : OK;
    }
    case "cancel":
      return OK;
    case "strike": {
      const e = canStrike(s, p, pOf(s, a.who));
      return e ? no(e) : OK;
    }
    case "report":
      if (s.phase !== "PLAY" || !p.alive || p.spec) return no("not now");
      return bodyNear(s, p) ? OK : no("No body here.");
    case "bell":
      if (s.phase !== "PLAY" || !p.alive || p.spec) return no("not now");
      if (!nearStation(p, "bell", RANGE.bell)) return no("Get to the bell in the lounge.");
      if (p.bell <= 0) return no("You already rang the bell this game.");
      if (s.sab) return no("Fix the sabotage first.");
      if (s.now < s.bellAt) return no("The bell is cooling down.");
      return OK;
    case "sab": {
      const e = canSabotage(s, p, a.k);
      return e ? no(e) : OK;
    }
    case "chat": {
      const e = checkChat(s, p, a);
      return e ? no(e) : OK;
    }
    case "vote": {
      const e = checkVote(s, p, a);
      return e ? no(e) : OK;
    }
    default:
      return no("unknown action");
  }
}

export function applyAction(state, playerId, a) {
  // Movement is the hot path (several times a second per player): copy only what changes.
  if (a.t === "p") {
    const s = Object.assign({}, state, { now: Math.max(state.now || 0, Number(a._now) || 0) });
    s.ps = state.ps.slice();
    const i = s.ps.findIndex((q) => q.id === playerId);
    if (i < 0) return state;
    s.ps[i] = Object.assign({}, s.ps[i]);
    applyMove(s, s.ps[i], a);
    return s;
  }
  const s = clone(state);
  s.now = Math.max(s.now || 0, Number(a._now) || 0);
  if (a.t === "_tick") { tick(s); return s; }
  if (a.t === "_join") { join(s, playerId); bump(s); return s; }
  if (a.t === "_leave") { leave(s, playerId); bump(s); return s; }
  const p = pOf(s, playerId);
  if (!p) return state;
  switch (a.t) {
    case "hello":
      if (s.phase === "LOBBY" || !p.hello || p.spec) hello(s, p, a);
      break;
    case "look": p.look = a.look; break;
    case "opts": setOpts(s, a); break;
    case "start": startRound(s); break;
    case "again": toLobby(s); break;
    case "use": p.act = { id: a.id, at: s.now }; break;
    case "done": finishStation(s, p, a.id); break;
    case "cancel": p.act = null; break;
    case "strike": strike(s, p, pOf(s, a.who)); break;
    case "report": startMeeting(s, p.id, "body", bodyNear(s, p).id); break;
    case "bell": p.bell -= 1; startMeeting(s, p.id, "bell", null); break;
    case "sab": sabotage(s, p, a.k); break;
    case "chat": applyChat(s, p, a); break;
    case "vote": applyVote(s, p, a.who); break;
  }
  bump(s);
  return s;
}

/** A browser for this seat connected. Returning players get their body back. */
function join(s, id) {
  const p = pOf(s, id);
  if (p) {
    p.on = true; p.away = 0;
    if (!p.bot && p.ctl === "b") { p.ctl = "h"; p.b = null; if (s.phase === "PLAY") feed(s, `${p.name} is back.`, "join"); }
    return;
  }
  const q = newPlayer(id, false);
  q.on = true;
  if (s.phase !== "LOBBY") { q.spec = true; q.alive = false; }
  s.ps.push(q);
}

/** The last browser for this seat closed. */
function leave(s, id) {
  const p = pOf(s, id);
  if (!p) return;
  p.on = false; p.away = s.now;
  if (s.phase === "LOBBY" || p.spec) {
    s.ps = s.ps.filter((q) => q !== p);
    if (p.hello && !p.spec) feed(s, `${p.name} left.`, "join");
  }
  if (s.host === id) { const next = s.ps.find((q) => !q.bot && q.on && q.hello); s.host = next ? next.id : null; }
  if (s.phase === "LOBBY" && s.pub && !lobbyHumans(s).length) s.fillAt = 0;
}

function tick(s) {
  const dt = Math.min(0.5, Math.max(0, (s.now - (s.lastTick || s.now)) / 1000));
  s.lastTick = s.now;
  const before = s.phase;
  switch (s.phase) {
    case "LOBBY":
      if (s.pub && s.fillAt && s.now >= s.fillAt && lobbyHumans(s).some((p) => p.on)) startRound(s);
      break;
    case "INTRO":
      if (s.now >= s.ends) openPlay(s);
      break;
    case "PLAY":
      for (const p of s.ps) {
        if (!p.bot && !p.on && p.ctl === "h" && !p.spec && s.now - p.away > T.away) {
          p.ctl = "b"; p.b = brainNew();
          if (p.alive) feed(s, `${p.name}'s network dropped. AI is playing for them until they're back.`, "join");
        }
      }
      tickPlay(s);
      if (s.phase === "PLAY") tickBots(s, dt);
      break;
    case "MEET":
      tickMeetingBots(s);
      if (s.now >= s.ends) openVote(s);
      break;
    case "VOTE":
      tickMeetingBots(s);
      if (s.phase === "VOTE" && s.now >= s.ends) closeVote(s);
      break;
    case "RESULT":
      if (s.now >= s.ends) afterResult(s);
      break;
    case "END":
      if (s.pub && s.now >= s.ends) toLobby(s);
      break;
  }
  if (s.phase !== before || s.moved || s.dirty) { bump(s); s.moved = false; s.dirty = false; }
}

export function isGameOver() {
  return { over: false };
}

const SHOW_ALL = new Set(["INTRO", "MEET", "VOTE", "RESULT", "END"]);

export function viewFor(state, playerId) {
  const s = state;
  const me = pOf(s, playerId);
  const base = { v: s.ver, phase: s.phase, now: s.now, ends: s.ends, fillAt: s.fillAt, pub: s.pub, host: s.host, opts: s.opts, round: s.round, bar: s.phase === "LOBBY" ? 0 : Math.round(taskBar(s) * 1000) / 1000, feed: s.feed };
  if (!me) return Object.assign(base, { me: null, ps: s.ps.filter((p) => p.hello).map((p) => ({ id: p.id, name: p.name, look: p.look, bot: p.bot })) });
  const ghost = !me.alive || me.spec;
  const end = s.phase === "END";
  const ps = [];
  for (const p of s.ps) {
    if (!p.hello) continue;
    const o = { id: p.id, name: p.name, look: p.look, bot: p.bot, on: p.on };
    if (s.phase !== "LOBBY") {
      o.spec = p.spec || undefined;
      o.alive = ghost || end || p.known || p.id === me.id ? p.alive : true;
      if (!o.alive && p.ejected) o.ej = 1;
      const show = p.id === me.id || (p.alive ? (ghost || SHOW_ALL.has(s.phase) || sees(s, me, p)) : ghost && !p.spec);
      if (show && !p.spec) { o.x = p.x; o.z = p.z; o.f = p.f; o.mv = p.mv; }
      if (end || (isSab(me) && isSab(p))) o.role = p.role;
      if (s.phase === "VOTE" || s.phase === "RESULT") o.voted = p.voted ? 1 : 0;
      if (s.meet && s.meet.seats) { const k = s.meet.seats.indexOf(p.id); if (k >= 0) o.seat = k; }
    }
    ps.push(o);
  }
  const view = Object.assign(base, {
    me: {
      id: me.id, name: me.name, look: me.look, hello: me.hello, role: s.phase === "LOBBY" ? null : me.role, alive: me.alive, spec: me.spec, ghost,
      x: me.x, z: me.z, f: me.f, tp: me.tp, tasks: me.tasks, act: me.act, bell: me.bell,
      cd: isSab(me) ? me.cd : 0, ej: me.ejected || undefined,
    },
    ps,
    vis: s.phase === "PLAY" ? visionOf(s, me) : 0,
    bellAt: s.bellAt,
    bodies: s.phase === "PLAY" ? s.bodies.filter((b) => ghost || seesPoint(s, me, b.x, b.z)).map((b) => ({ id: b.id, x: b.x, z: b.z })) : [],
    sab: s.sab ? { k: s.sab.k, ends: s.sab.ends, fixed: s.sab.fixed } : null,
  });
  if (isSab(me)) view.sabAt = s.sabAt;
  if (s.phase === "PLAY" && s.flash && s.flash.length) {
    const fl = s.flash.filter((f) => s.now - f.at < 3000 && (ghost || f.to.includes(me.id) || f.id === me.id)).map((f) => ({ i: f.i, id: f.id }));
    if (fl.length) view.flash = fl;
  }
  if (s.meet) {
    view.meet = {
      by: s.meet.by, kind: s.meet.kind, body: s.meet.body, room: s.meet.room,
      chat: s.meet.chat.filter((c) => !c.g || ghost).map((c) => ({ i: c.i, w: c.w, t: c.t, g: c.g || undefined })),
      myVote: me.voted,
    };
  }
  if (s.res) view.res = { out: s.res.out, role: s.opts.reveal || end ? s.res.role : null, tally: s.res.tally, skips: s.res.skips, tie: s.res.tie };
  if (s.end) view.end = { win: s.end.win, why: s.end.why, stats: s.stats };
  return view;
}
