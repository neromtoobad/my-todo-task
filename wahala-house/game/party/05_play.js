// ---------------------------------------------------------------------------
// Play: moving, chores, strikes, reports, the bell, sabotage, vision, winning.
// ---------------------------------------------------------------------------

function visionOf(s, p) {
  if (!p.alive || p.spec) return Infinity;
  if (isSab(p)) return VISION.S;
  return s.sab && s.sab.k === "nepa" ? VISION.nepa : VISION.H;
}

/** Can `viewer` see the point (x, z)? Walls cut sight: other rooms need to be close. */
function seesPoint(s, viewer, x, z) {
  const r = visionOf(s, viewer);
  if (r === Infinity) return true;
  const d = Math.hypot(viewer.x - x, viewer.z - z);
  if (d > r) return false;
  return d <= VISION.close || roomAt(viewer.x, viewer.z) === roomAt(x, z);
}
function sees(s, viewer, other) {
  if (viewer.id === other.id) return true;
  if (!other.alive && viewer.alive) return false; // ghosts are invisible to the living
  return seesPoint(s, viewer, other.x, other.z);
}

function checkMove(s, p, a) {
  if (s.phase !== "PLAY") return "not now";
  if (p.spec) return "spectating";
  const { x, z } = a;
  if (typeof x !== "number" || typeof z !== "number" || !Number.isFinite(x) || !Number.isFinite(z)) return "bad move";
  if (!inBounds(x, z)) return "bad move";
  if (p.alive && !walkable(x, z)) return "bad move";
  const dt = Math.max(0.05, ((a._now || s.now) - (p.at || 0)) / 1000);
  const d = Math.hypot(x - p.x, z - p.z);
  const limit = (p.alive ? SPEED.maxHuman : SPEED.maxHuman * 1.6) * Math.min(dt, 2) + SPEED.slack;
  if (d > limit) return "bad move";
  return null;
}
function applyMove(s, p, a) {
  const d = Math.hypot(a.x - p.x, a.z - p.z);
  p.x = Math.round(a.x * 100) / 100; p.z = Math.round(a.z * 100) / 100;
  if (typeof a.f === "number" && Number.isFinite(a.f)) p.f = Math.round(a.f * 100) / 100;
  p.mv = d > 0.01 ? 1 : 0;
  p.at = a._now || s.now;
  if (p.act && dist(p, STATIONS[p.act.id]) > RANGE.use + 0.6) p.act = null;
  s.moved = true;
}

function nearStation(p, id, range) { const st = STATIONS[id]; return st && Math.hypot(p.x - st.x, p.z - st.z) <= (range || RANGE.use); }
function myTask(p, id) { return p.tasks.find((t) => t.id === id) || null; }

function stationOpen(s, p, id) {
  const st = STATIONS[id];
  if (!st) return "no such station";
  if (st.kind === "task") {
    const t = myTask(p, id);
    if (!t) return "That's not one of your chores.";
    if (t.done) return "Already done.";
    return null;
  }
  if (st.kind === "fix") {
    if (!p.alive) return "Ghosts can't fix that.";
    if (!s.sab) return "Nothing to fix.";
    if (id === "gen" && s.sab.k !== "nepa") return "The gen is fine.";
    if ((id === "gas1" || id === "gas2") && (s.sab.k !== "gas" || s.sab.fixed.includes(id))) return "This valve is fine.";
    return null;
  }
  return "Use the bell button.";
}

function finishStation(s, p, id) {
  const st = STATIONS[id];
  p.act = null;
  s.dirty = true;
  if (st.kind === "task") {
    const t = myTask(p, id);
    t.done = true;
    if (!isSab(p)) {
      s.stats.tasks[p.id] = (s.stats.tasks[p.id] || 0) + 1;
      if (VISUAL.has(id) && p.alive) {
        const saw = living(s).filter((w) => w.id !== p.id && sees(s, w, p));
        s.flash = (s.flash || []).filter((f) => s.now - f.at < 3000);
        s.fl = (s.fl || 0) + 1;
        s.flash.push({ i: s.fl, id: p.id, st: id, at: s.now, to: saw.map((w) => w.id) });
        for (const w of saw) if (w.b) { w.b.sus[p.id] = Math.min(0, (w.b.sus[p.id] || 0)) - 25; w.b.clear[p.id] = id; }
      }
      checkWin(s);
    }
    return;
  }
  if (id === "gen") { s.sab = null; s.sabAt = Math.max(s.sabAt, s.now + T.sabCd); feed(s, `${p.name} fixed the gen. Light don come back!`, "fix"); return; }
  s.sab.fixed.push(id);
  if (s.sab.fixed.length >= 2) { s.sab = null; s.sabAt = Math.max(s.sabAt, s.now + T.sabCd); feed(s, "Both gas valves closed. The house can breathe.", "fix"); }
}

function taskBar(s) {
  let all = 0, done = 0;
  for (const p of playing(s)) if (!isSab(p)) for (const t of p.tasks) { all += 1; if (t.done) done += 1; }
  return all ? done / all : 0;
}

function canStrike(s, p, target) {
  if (s.phase !== "PLAY") return "not now";
  if (!isSab(p) || !p.alive) return "You can't do that.";
  if (s.now < p.cd) return "Not yet.";
  if (!target || !target.alive || target.spec || isSab(target)) return "No target.";
  if (dist(p, target) > RANGE.strike) return "Too far.";
  return null;
}
function strike(s, p, target) {
  s.dirty = true;
  target.alive = false; target.deadAt = s.now; target.act = null; target.by = p.id;
  s.bodies.push({ id: target.id, x: target.x, z: target.z, at: s.now, by: p.id });
  p.cd = s.now + s.opts.kill * 1000;
  s.stats.strikes[p.id] = (s.stats.strikes[p.id] || 0) + 1;
  // Bots in sight may notice.
  for (const w of living(s)) {
    if (w.id === p.id || w.id === target.id || !w.b) continue;
    if (sees(s, w, p) && R.chance(s, isSab(w) ? 1 : 0.7)) w.b.saw.push({ k: "strike", who: p.id, victim: target.id, room: roomAt(p.x, p.z), at: s.now });
  }
  checkWin(s);
}

function bodyNear(s, p) {
  let best = null, bd = Infinity;
  for (const b of s.bodies) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d <= RANGE.report && d < bd) { best = b; bd = d; } }
  return best;
}

function canSabotage(s, p, k) {
  if (s.phase !== "PLAY") return "not now";
  if (!isSab(p)) return "You can't do that.";
  if (k !== "nepa" && k !== "gas") return "bad sabotage";
  if (s.sab) return "A sabotage is already on.";
  if (s.now < s.sabAt) return "Not yet.";
  return null;
}
function sabotage(s, p, k) {
  s.sab = { k, at: s.now, ends: k === "gas" ? s.now + T.gas : 0, fixed: [], by: p.id };
  s.sabAt = s.now + T.sabCd;
  feed(s, k === "nepa" ? "NEPA has taken light! Fix the gen in the garden." : "Gas leak! Close both valves before the house fills up!", "sab");
}

function checkWin(s) {
  if (s.phase === "END" || s.phase === "LOBBY") return;
  const live = living(s);
  const S = live.filter(isSab).length, H = live.length - S;
  if (S === 0) return endGame(s, "H", "Every Saboteur is out of the house.");
  if (S >= H) return endGame(s, "S", "The Saboteurs took over the house.");
  if (taskBar(s) >= 1) return endGame(s, "H", "The house finished every chore.");
}

function endGame(s, win, why) {
  s.phase = "END"; s.ends = s.now + T.endBack; s.sab = null; s.meet = null;
  s.end = { win, why, at: s.now };
  feed(s, why, "end");
}

/** Every tick while playing: sabotage clocks and dropped players. */
function tickPlay(s) {
  if (s.sab && s.sab.k === "gas" && s.now >= s.sab.ends) endGame(s, "S", "The gas leak emptied the house. Saboteurs win.");
}
