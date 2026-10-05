// ---------------------------------------------------------------------------
// Lobby: seats, names, looks, settings, and starting a round.
// ---------------------------------------------------------------------------

function newPlayer(id, bot) {
  return {
    id, name: "Guest", look: null, bot: !!bot, on: true, ctl: bot ? "b" : "h", away: 0, hello: !!bot,
    x: SPAWN[0][0], z: SPAWN[0][1], f: 0, mv: 0, at: 0, tp: 0,
    alive: true, role: null, tasks: [], cd: 0, bell: 1, act: null, voted: null, deadAt: 0, known: false, ejected: false,
    spec: false, lastChat: 0, b: null,
  };
}

function freshState(ids, now) {
  return {
    v: 2, ver: 1, rng: hash(ids.join(",") + ":" + (now || 0)) || 1,
    phase: "LOBBY", now: now || 0, ends: 0, round: 0, pub: false, host: ids[0] || null,
    opts: { ...OPTS_DEFAULT }, fillAt: 0,
    ps: ids.map((id) => newPlayer(id, false)),
    bodies: [], sab: null, sabAt: 0, bellAt: 0, meet: null, res: null, end: null,
    feed: [], fid: 0, moved: false, cid: 0, stats: {},
  };
}

function freeLook(s, prefer) {
  const used = new Set(s.ps.filter((p) => p.look).map((p) => p.look));
  if (prefer && LOOKS.includes(prefer) && !used.has(prefer)) return prefer;
  return LOOKS.find((l) => !used.has(l)) || "pf";
}

function cleanName(raw) {
  let n = String(raw || "").replace(/[^\p{L}\p{N} ._'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);
  if (n.length < 2) return null;
  if (hasBadWord(n)) return null;
  return n;
}
function uniqueName(s, name, self) {
  const taken = new Set(s.ps.filter((p) => p !== self && p.hello).map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; i < 20; i++) { const n = `${name.slice(0, 12)} ${i}`; if (!taken.has(n.toLowerCase())) return n; }
  return name;
}

function lobbyHumans(s) { return s.ps.filter((p) => !p.bot && p.hello); }

function hello(s, p, a) {
  const first = !s.ps.some((q) => q.hello && !q.bot);
  p.name = uniqueName(s, cleanName(a.name) || p.name, p);
  p.look = freeLook(s, a.look);
  p.hello = true;
  if (first && typeof a.room === "string") s.pub = a.room.startsWith("q-");
  if (!s.host || !pOf(s, s.host) || pOf(s, s.host).bot) s.host = p.id;
  if (s.phase === "LOBBY" && s.pub && !s.fillAt) s.fillAt = s.now + T.fill;
  if (s.phase === "LOBBY" && s.pub && lobbyHumans(s).length >= meta.maxPlayers) s.fillAt = Math.min(s.fillAt, s.now + T.fillFull);
  feed(s, `${p.name} joined the house.`, "join");
}

function setOpts(s, a) {
  for (const k of Object.keys(OPTS_ALLOWED)) if (k in a && OPTS_ALLOWED[k].includes(a[k])) s.opts[k] = a[k];
}

/** Fill empty seats with AI housemates, deal roles and chores, and open the round. */
function startRound(s) {
  s.rng = (hash(s.ps.map((p) => p.id).join(",") + ":" + s.now + ":" + s.round) ^ s.rng) >>> 0 || 1;
  // Anyone who never said hello (closed the tab on the menu) does not play.
  s.ps = s.ps.filter((p) => p.hello && p.on);
  for (const p of s.ps) { p.spec = false; p.bot = !!p.bot; }
  const target = Math.max(s.opts.fill, s.ps.length);
  const names = new Set(s.ps.map((p) => p.name.toLowerCase()));
  for (const look of BOT_ORDER) {
    if (s.ps.length >= Math.min(target, meta.maxPlayers)) break;
    if (s.ps.some((p) => p.look === look)) continue;
    const bot = newPlayer("ai-" + look, true);
    bot.look = look;
    let nm = CAST[look].name;
    if (names.has(nm.toLowerCase())) nm = nm + " (AI)";
    bot.name = nm; names.add(nm.toLowerCase());
    s.ps.push(bot);
  }
  const n = s.ps.length;
  const nS = s.opts.sabs || (n <= 6 ? 1 : 2);
  const order = R.shuffle(s, s.ps.map((p) => p.id));
  const sabs = new Set(order.slice(0, Math.min(nS, Math.max(1, Math.floor((n - 1) / 2)))));
  const spots = R.shuffle(s, SPAWN);
  s.ps.forEach((p, i) => {
    p.role = sabs.has(p.id) ? "S" : "H";
    p.alive = true; p.known = false; p.ejected = false; p.deadAt = 0;
    p.tasks = R.shuffle(s, TASK_IDS).slice(0, TASKS_EACH).map((id) => ({ id, done: false }));
    p.x = spots[i % spots.length][0]; p.z = spots[i % spots.length][1]; p.f = Math.PI; p.tp += 1; p.at = s.now;
    p.bell = 1; p.voted = null; p.act = null; p.mv = 0;
    p.b = p.ctl === "b" ? brainNew() : null;
  });
  s.round += 1;
  s.bodies = []; s.sab = null; s.meet = null; s.res = null; s.end = null; s.feed = []; s.flash = [];
  s.phase = "INTRO"; s.ends = s.now + T.intro;
  s.stats = { strikes: {}, tasks: {}, meetings: 0 };
  feed(s, `Mama Eye: Housemates, ${sabs.size === 1 ? "one of you is" : sabs.size + " of you are"} not who you say you are.`, "sys");
}

/** Intro over: everyone may move, and the Saboteurs' clocks start. */
function openPlay(s) {
  s.phase = "PLAY"; s.ends = 0; s.playAt = s.now;
  for (const p of s.ps) if (isSab(p)) p.cd = s.now + T.firstKill;
  s.sabAt = s.now + T.sabFirst;
  s.bellAt = s.now + T.bellLock;
}

/** Back to the lobby with the same people (AI housemates leave). */
function toLobby(s) {
  s.ps = s.ps.filter((p) => !p.bot && p.on);
  for (const p of s.ps) {
    p.role = null; p.alive = true; p.tasks = []; p.spec = false; p.ctl = "h"; p.b = null; p.voted = null; p.act = null; p.known = false; p.ejected = false;
  }
  if (!s.ps.some((p) => p.id === s.host)) s.host = s.ps[0] ? s.ps[0].id : null;
  s.phase = "LOBBY"; s.ends = 0; s.bodies = []; s.sab = null; s.meet = null; s.res = null; s.end = null;
  s.fillAt = s.pub && s.ps.length ? s.now + T.fill : 0;
  s.feed = [];
}
