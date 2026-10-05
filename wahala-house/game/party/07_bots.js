// ---------------------------------------------------------------------------
// AI housemates. They only know what they have seen or heard: bots never read
// roles they should not know. They walk the same grid humans do.
// ---------------------------------------------------------------------------

function brainNew() {
  return { goal: null, gk: null, path: [], until: 0, doing: null, seen: {}, saw: [], sus: {}, clear: {}, plan: [], voteAt: 0, hunt: null, rethink: 0, reportBody: null, reportAt: 0, rooms: [], defended: 0, idleUntil: 0, vouched: {} };
}

function setGoal(s, p, xz, key) {
  const b = p.b;
  b.path = findPath([p.x, p.z], xz);
  b.goal = xz; b.gk = key; b.doing = null;
}

function stepAlong(s, p, dt) {
  const b = p.b;
  if (!b.path.length) { p.mv = 0; return true; }
  let left = SPEED.walk * dt;
  while (left > 0 && b.path.length) {
    const [tx, tz] = b.path[0];
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d <= left) { p.x = tx; p.z = tz; b.path.shift(); left -= d; if (d > 0.001) p.f = Math.atan2(dx, dz); }
    else { p.x += (dx / d) * left; p.z += (dz / d) * left; p.f = Math.atan2(dx, dz); left = 0; }
  }
  p.x = Math.round(p.x * 100) / 100; p.z = Math.round(p.z * 100) / 100; p.f = Math.round(p.f * 100) / 100;
  p.mv = 1; p.at = s.now; s.moved = true;
  return !b.path.length;
}

/** Pick what to do next: a chore, a fake chore, or a wander. */
function nextChore(s, p) {
  const b = p.b;
  const open = p.tasks.filter((t) => !t.done);
  if (open.length && R.chance(s, isSab(p) ? 0.75 : 0.8)) {
    // Housemates like company: sometimes pick a chore in a room where people are.
    if (!isSab(p) && R.chance(s, 0.35)) {
      const busy = new Set(Object.values(b.seen).filter((v) => s.now - v.at < 8000).map((v) => v.room));
      const social = open.filter((t) => busy.has(STATIONS[t.id].room));
      if (social.length) { const id = R.pick(s, social).id; setGoal(s, p, [STATIONS[id].x, STATIONS[id].z], "task:" + id); return; }
    }
    // Nearest of a couple of random picks: feels purposeful without being a robot.
    const picks = R.shuffle(s, open).slice(0, 2).map((t) => t.id);
    picks.sort((a, c) => Math.hypot(STATIONS[a].x - p.x, STATIONS[a].z - p.z) - Math.hypot(STATIONS[c].x - p.x, STATIONS[c].z - p.z));
    const id = picks[0];
    setGoal(s, p, [STATIONS[id].x, STATIONS[id].z], "task:" + id);
    return;
  }
  const id = R.pick(s, Object.keys(STATIONS));
  const st = STATIONS[id];
  setGoal(s, p, nearestFree(st.x + R.range(s, -1.5, 1.5), st.z + R.range(s, -1.5, 1.5)), "wander");
}

function witnessesOf(s, sab, target) {
  return living(s).filter((w) => w.id !== sab.id && w.id !== target.id && !isSab(w) && (sees(s, w, sab) || sees(s, w, target))).length;
}

function sabThink(s, p) {
  const b = p.b;
  // A body you made: sometimes walk off, sometimes cry wolf.
  if (s.now >= p.cd && !b.doing) {
    const targets = living(s).filter((q) => !isSab(q) && Math.hypot(q.x - p.x, q.z - p.z) < 11);
    let best = null;
    for (const q of targets) if (witnessesOf(s, p, q) === 0 && (!best || dist(p, q) < dist(p, best))) best = q;
    if (best) {
      if (dist(p, best) <= RANGE.strike) {
        if (R.chance(s, 0.55)) {
          strike(s, p, best);
          b.hunt = null;
          if (s.phase !== "PLAY") return;
          if (R.chance(s, 0.18)) { b.reportBody = best.id; b.reportAt = s.now + R.range(s, 1500, 3500); }
          else { const far = R.pick(s, TASK_IDS); setGoal(s, p, [STATIONS[far].x, STATIONS[far].z], "flee"); }
          return;
        }
      } else if (!b.hunt || b.hunt !== best.id || s.now >= b.rethink) {
        b.hunt = best.id; b.rethink = s.now + 900;
        setGoal(s, p, [best.x, best.z], "hunt");
      }
    } else if (b.hunt) { b.hunt = null; b.path = []; }
    // Nobody alone? Cut the light and try again in the dark.
    if (!best && !s.sab && s.now >= s.sabAt && R.chance(s, 0.03)) sabotage(s, p, "nepa");
  }
  if (!s.sab && s.now >= s.sabAt && R.chance(s, 0.006)) {
    const k = R.chance(s, 0.3) && s.now - (s.playAt || 0) > 50000 && living(s).filter((q) => !isSab(q)).length >= 3 ? "gas" : "nepa";
    sabotage(s, p, k);
  }
}

/** Send the nearest housemate bots to fix a sabotage. */
function assignFixers(s) {
  if (!s.sab || s.sab.assigned) return;
  const pool = living(s).filter((p) => p.ctl === "b" && !isSab(p));
  const stations = s.sab.k === "nepa" ? ["gen"] : ["gas1", "gas2"];
  const used = new Set();
  s.sab.assigned = {};
  for (const id of stations) {
    const st = STATIONS[id];
    const order = pool.filter((p) => !used.has(p.id)).sort((a, c) => Math.hypot(a.x - st.x, a.z - st.z) - Math.hypot(c.x - st.x, c.z - st.z));
    for (const p of order.slice(0, s.sab.k === "nepa" ? 2 : 1)) { used.add(p.id); s.sab.assigned[p.id] = id; setGoal(s, p, [st.x, st.z], "fix:" + id); }
  }
}

function botPerceive(s, p) {
  const b = p.b;
  const room = roomAt(p.x, p.z);
  if (!b.rooms.length || b.rooms[b.rooms.length - 1].room !== room) { b.rooms.push({ room, at: s.now }); if (b.rooms.length > 6) b.rooms.shift(); }
  for (const q of living(s)) if (q.id !== p.id && sees(s, p, q)) b.seen[q.id] = { room: roomAt(q.x, q.z), at: s.now };
  if (b.reportBody) return;
  for (const body of s.bodies) {
    if (!seesPoint(s, p, body.x, body.z)) continue;
    if (isSab(p)) continue; // Saboteurs walk past bodies they did not plan to report.
    b.reportBody = body.id; b.reportAt = s.now + R.range(s, 500, 1600);
    break;
  }
}

function botPlay(s, p, dt) {
  const b = p.b;
  if (p.alive) botPerceive(s, p);
  // Report a body once you reach it.
  if (b.reportBody && p.alive && s.now >= b.reportAt) {
    const body = s.bodies.find((x) => x.id === b.reportBody);
    if (!body) b.reportBody = null;
    else if (Math.hypot(body.x - p.x, body.z - p.z) <= RANGE.report) {
      for (const q of living(s)) if (q.id !== p.id && sees(s, p, q) && Math.hypot(q.x - body.x, q.z - body.z) < 6) b.sus[q.id] = (b.sus[q.id] || 0) + 12;
      startMeeting(s, p.id, "body", body.id);
      return;
    }
    else if (b.gk !== "body") setGoal(s, p, [body.x, body.z], "body");
  }
  if (p.alive && isSab(p)) { sabThink(s, p); if (s.phase !== "PLAY") return; }
  if (s.sab && s.sab.assigned && s.sab.assigned[p.id] && !(b.gk || "").startsWith("fix:")) {
    const id = s.sab.assigned[p.id];
    setGoal(s, p, [STATIONS[id].x, STATIONS[id].z], "fix:" + id);
  }
  // Doing something at a station.
  if (b.doing) {
    if (s.now < b.until) { p.mv = 0; return; }
    const id = b.doing; b.doing = null;
    if (STATIONS[id].kind === "task" && myTask(p, id) && !myTask(p, id).done && nearStation(p, id)) finishStation(s, p, id);
    else if (STATIONS[id].kind === "fix" && !stationOpen(s, p, id) && nearStation(p, id)) finishStation(s, p, id);
    if (s.phase !== "PLAY") return;
    b.gk = null; b.idleUntil = s.now + R.range(s, 1500, 5000);
    return;
  }
  if (!b.path.length && s.now < b.idleUntil) { p.mv = 0; return; }
  const arrived = stepAlong(s, p, dt);
  if (!arrived) return;
  const gk = b.gk || "";
  if (gk.startsWith("task:") || gk.startsWith("fix:")) {
    const id = gk.split(":")[1];
    const st = STATIONS[id];
    if (st.kind === "fix" && stationOpen(s, p, id)) { b.gk = null; return; }
    p.f = st.f;
    b.doing = id; b.until = s.now + st.dur * 1000 * R.range(s, 1.05, 1.5);
    p.mv = 0;
    return;
  }
  if (gk === "hunt" || gk === "body") { b.gk = null; return; }
  b.gk = null;
  b.idleUntil = s.now + R.range(s, 400, 2500);
  nextChore(s, p);
}

/** Drive every AI-controlled body for one tick of `dt` seconds. */
function tickBots(s, dt) {
  if (s.phase !== "PLAY") return;
  assignFixers(s);
  for (const p of s.ps) {
    if (p.ctl !== "b" || p.spec) continue;
    if (!p.b) p.b = brainNew();
    if (!p.alive && isSab(p)) { if (!p.b.path.length && R.chance(s, 0.02)) nextChore(s, p); else stepAlong(s, p, dt); continue; }
    botPlay(s, p, dt);
    if (s.phase !== "PLAY") return;
  }
}

// ---------------------------------------------------------------------------
// Meetings: what bots say and how they vote.
// ---------------------------------------------------------------------------

const ROOMS_SAID = (r) => ROOM_NAME[r] || "house";

function say(s, p, at, text, about, k) { p.b.plan.push({ at, text, about: about || null, k: k || null }); }

function botsPlanMeeting(s) {
  const m = s.meet;
  const victim = m.body ? pOf(s, m.body) : null;
  const where = ROOMS_SAID(m.room);
  for (const p of living(s)) {
    if (p.ctl !== "b") continue;
    const b = p.b || (p.b = brainNew());
    b.plan = []; b.path = []; b.doing = null; b.hunt = null; b.reportBody = null; b.voteAt = 0;
    let t = s.now + R.range(s, 1500, 4000);
    const ex = exOf(p, s);
    if (m.by === p.id) {
      if (m.kind === "body") say(s, p, s.now + R.range(s, 900, 2000), `${ex} Body for the ${where}! Na ${victim ? victim.name : "somebody"}.`);
      else say(s, p, s.now + R.range(s, 900, 2000), "I ring the bell because something no dey add up.");
      t += 2500;
    }
    // What this bot actually saw.
    const sawIt = b.saw.find((w) => w.k === "strike" && pOf(s, w.who) && pOf(s, w.who).alive && !isSab(p));
    if (sawIt) {
      const killer = pOf(s, sawIt.who);
      b.sus[killer.id] = 200;
      say(s, p, t, `I SEE AM! ${killer.name} strike ${nameOf(s, sawIt.victim)} for the ${ROOMS_SAID(sawIt.room)}! Vote ${killer.name}!`, killer.id, "ev");
      continue;
    }
    if (isSab(p)) {
      const others = living(s).filter((q) => q.id !== p.id && !isSab(q));
      if (R.chance(s, 0.5) && others.length) {
        const mark = R.pick(s, others);
        b.sus[mark.id] = (b.sus[mark.id] || 0) + 30;
        say(s, p, t, R.pick(s, [`${mark.name} dey move sus. Always following people around.`, `Where was ${mark.name}? I never see them doing any chore.`, `${mark.name} was close to the ${where}. Just saying.`]), mark.id, "acc");
      } else {
        const last = b.rooms.length ? b.rooms[b.rooms.length - 1].room : "lounge";
        say(s, p, t, R.pick(s, [`I was in the ${ROOMS_SAID(last)} doing my chores.`, "No be me o. I was busy with my chores.", "Skip am. We no get evidence."]));
      }
      continue;
    }
    // Housemates: who was last seen with the victim, and who was near the body's room lately?
    const vs = victim && b.seen[victim.id];
    const sameRoom = vs && vs.room === m.room;
    const withVictim = vs && s.now - vs.at < (sameRoom ? 60000 : 30000) ? Object.entries(b.seen).filter(([id, v]) => id !== p.id && id !== victim.id && v.room === vs.room && Math.abs(v.at - vs.at) < 12000 && pOf(s, id) && pOf(s, id).alive && !b.clear[id]).map(([id]) => id) : [];
    for (const id of withVictim) b.sus[id] = (b.sus[id] || 0) + (sameRoom ? (withVictim.length === 1 ? 40 : 18) : 8);
    const near = Object.entries(b.seen).filter(([id, v]) => id !== p.id && v.room === m.room && s.now - v.at < 25000 && pOf(s, id) && pOf(s, id).alive).map(([id]) => id);
    for (const id of near) b.sus[id] = (b.sus[id] || 0) + 10;
    if (withVictim.length && (sameRoom || R.chance(s, 0.3)) && R.chance(s, 0.85)) {
      const id = withVictim.length === 1 ? withVictim[0] : R.pick(s, withVictim);
      say(s, p, t, R.pick(s, [`I last saw ${victim.name} with ${nameOf(s, id)} in the ${ROOMS_SAID(vs.room)}.`, `${nameOf(s, id)}, you were with ${victim.name} in the ${ROOMS_SAID(vs.room)}. Explain.`]), id, sameRoom ? "ev" : "acc");
    } else if (m.kind === "body" && near.length && R.chance(s, 0.8)) {
      const id = R.pick(s, near);
      say(s, p, t, R.pick(s, [`${nameOf(s, id)} was around the ${where} just now.`, `I saw ${nameOf(s, id)} near the ${where}. Hmm.`]), id, "acc");
    } else if (R.chance(s, 0.65)) {
      const last = b.rooms.length ? b.rooms[b.rooms.length - 1].room : "lounge";
      say(s, p, t, R.pick(s, [`I was in the ${ROOMS_SAID(last)}.`, `I was doing chores in the ${ROOMS_SAID(last)}.`, "Who was alone just now?", "Skip am if nobody see anything."]));
    }
  }
}

const ACCUSE_RE = /\b(sus|vote|saw|see am|kill|strike|struck|liar|lie|lying|did it|na (him|her|am)|guilty|fake)\b/i;
const VOUCH_RE = /\b(clear|safe|with me|innocent|not (him|her)|trust)\b/i;

/** Bots weigh what is said in meetings, and defend themselves when named. */
function botsHear(s, line) {
  if (!line || line.g) return;
  const speaker = pOf(s, line.w);
  const named = [];
  if (line.about) named.push(line.about);
  else {
    const low = ` ${line.t.toLowerCase()} `;
    for (const p of s.ps) if (p.id !== line.w && p.name.length >= 2 && low.includes(p.name.toLowerCase())) named.push(p.id);
  }
  if (!named.length) return;
  const q = line.q;
  // How much a line moves suspicion: evidence > accusation > a defensive "na lie".
  let weight;
  if (line.k) weight = { ev: 18, acc: 7, def: 3, vouch: -14 }[line.k] || 0;
  else if (q !== undefined) weight = { 2: 14, 14: 8, 3: 6, 7: 6, 13: 5, 4: -10 }[q] || 2;
  else weight = /\b(saw|see am|with|caught)\b/i.test(line.t) && ACCUSE_RE.test(line.t) ? 12 : ACCUSE_RE.test(line.t) ? 7 : VOUCH_RE.test(line.t) ? -10 : 2;
  const accuse = weight >= 5, vouch = weight < 0;
  for (const p of living(s)) {
    if (p.ctl !== "b" || p.id === line.w) continue;
    const b = p.b || (p.b = brainNew());
    const trust = (b.sus[line.w] || 0) > 40 ? 0.4 : 1;
    for (const id of named) {
      if (id === p.id) {
        if (accuse && s.now - b.defended > 4000) {
          b.defended = s.now;
          const last = b.rooms.length ? b.rooms[b.rooms.length - 1].room : "lounge";
          say(s, p, s.now + R.range(s, 1200, 2600), R.pick(s, [`Me?! I was in the ${ROOMS_SAID(last)}!`, `${exOf(p, s)} Na lie! ${speaker ? speaker.name : "You"} dey find who to blame.`, `No be me o! Check the ${ROOMS_SAID(last)}.`]), line.w, "def");
          b.sus[line.w] = (b.sus[line.w] || 0) + 10;
        }
        continue;
      }
      if (isSab(p)) { if (accuse) b.sus[id] = (b.sus[id] || 0) + weight; continue; }
      if (b.clear[id]) {
        if (accuse && !b.vouched[id] && pOf(s, id) && pOf(s, id).alive) {
          b.vouched[id] = 1;
          say(s, p, s.now + R.range(s, 1500, 3000), `${nameOf(s, id)} is clear. I watched them finish the ${STATIONS[b.clear[id]].label.toLowerCase().replace(/^\w+ /, "")}.`, id, "vouch");
        }
        continue;
      }
      b.sus[id] = (b.sus[id] || 0) + weight * (weight > 0 ? trust : 1);
    }
  }
}

function botsPlanVotes(s) {
  const span = Math.max(3000, s.opts.vote * 1000 * 0.7);
  for (const p of living(s)) if (p.ctl === "b") p.b.voteAt = s.now + R.range(s, 1500, span);
}

function botChoose(s, p) {
  const b = p.b;
  const cands = living(s).filter((q) => q.id !== p.id);
  if (isSab(p)) {
    const heat = {};
    for (const line of (s.meet && s.meet.chat) || []) if (line.about) heat[line.about] = (heat[line.about] || 0) + 1;
    const hs = cands.filter((q) => !isSab(q)).sort((a, c) => ((heat[c.id] || 0) + (b.sus[c.id] || 0) / 20) - ((heat[a.id] || 0) + (b.sus[a.id] || 0) / 20));
    if (hs.length && ((heat[hs[0].id] || 0) >= 1 || (b.sus[hs[0].id] || 0) >= 25)) return hs[0].id;
    return R.chance(s, 0.6) || !hs.length ? "skip" : R.pick(s, hs).id;
  }
  const ranked = cands.slice().sort((a, c) => (b.sus[c.id] || 0) - (b.sus[a.id] || 0));
  const top = ranked.length ? b.sus[ranked[0].id] || 0 : 0, second = ranked.length > 1 ? b.sus[ranked[1].id] || 0 : 0;
  if (top >= 25 && top - second >= 8) return ranked[0].id;
  if (top >= 15 && top - second >= 8 && R.chance(s, 0.35)) return ranked[0].id;
  return "skip";
}

function tickMeetingBots(s) {
  for (const p of s.ps) {
    if (p.ctl !== "b" || !p.b || !p.alive || p.spec) continue;
    const b = p.b;
    while (b.plan.length && b.plan[0].at <= s.now && s.now - (p.lastChat || 0) >= 1200) {
      const line = b.plan.shift();
      chatLine(s, p, line.text, line.about ? { about: line.about, k: line.k } : undefined);
      botsHear(s, s.meet.chat[s.meet.chat.length - 1]);
    }
    b.plan.sort((x, y) => x.at - y.at);
    if (s.phase === "VOTE" && !p.voted && b.voteAt && s.now >= b.voteAt) applyVote(s, p, botChoose(s, p));
  }
}
