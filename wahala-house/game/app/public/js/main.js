// Wahala House Party Mode client. The server (src/logic.js) is authoritative:
// this file draws the house and the people in it from the view it sends,
// walks your own body locally (the server checks every step), and sends your
// intents back. Nothing here decides an outcome.
import * as THREE from "three";
import { World } from "./world.js";
import { Actor } from "./cast.js";
import { AnimLib } from "./retarget.js";
import { WORLD, FACE_CAM } from "./data.js";
import { $, el, LOOK_COLOR } from "./dom.js";
import { Hud } from "./hud.js";
import { audio } from "./audio.js";
import { openChore } from "./chores.js";
import { STATIONS, RANGE, LOOKS } from "./stations.js";

// ------------------------------------------------------------------ identity
const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
function playerId() {
  let id = store.get("wh:pid", null);
  if (!id) { id = Math.random().toString(36).slice(2, 10); store.set("wh:pid", id); }
  return id;
}
const ME = playerId();
const cleanRoom = (r) => String(r || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);

// ------------------------------------------------------------------ net
const app = {
  view: null, room: null, skew: 0, name: store.get("wh:name", ""), look: store.get("wh:look", "pf"),
  serverNow() { return Date.now() + app.skew; },
};
window.__wh = app; // for QA scripts and the console; the server validates everything

let socket = null, retry = 0, leaving = false;
function connect(room) {
  leaving = false;
  app.room = room;
  history.replaceState(null, "", room.startsWith("q-") ? "/?q=1" : `/?room=${encodeURIComponent(room)}`);
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(room)}`);
  socket = ws;
  ws.addEventListener("open", () => {
    retry = 0;
    send({ type: "join", playerId: ME });
    act({ t: "hello", name: app.name, look: app.look, room });
  });
  ws.addEventListener("message", (e) => {
    if (e.data === "__pong") return;
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type === "state") onState(msg);
    else if (msg.type === "error") onError(msg.error);
  });
  ws.addEventListener("close", () => {
    if (ws !== socket || leaving) return;
    retry = Math.min(retry + 1, 6);
    setTimeout(() => { if (!leaving && app.room === room) connect(room); }, 400 * 2 ** (retry - 1));
  });
}
setInterval(() => { if (socket && socket.readyState === 1) socket.send("__ping"); }, 25000);
function send(m) { if (socket && socket.readyState === 1) { socket.send(JSON.stringify(m)); return true; } return false; }
function act(a) { return send({ type: "action", action: a }); }
app.act = act;

function leave() {
  leaving = true;
  if (socket) socket.close();
  socket = null;
  app.view = null; app.room = null;
  history.replaceState(null, "", "/");
  closeChore();
  resetScene();
  showHome();
}

// ------------------------------------------------------------------ world
let world, hud, lib = null, ready = false;
const actors = {}; // look -> Actor
const tmpV = new THREE.Vector3();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  world = new World($("#c"));
  hud = new Hud(app);
  app.hud = hud;
  world.setHohLocked(false);
  world.follow(new THREE.Vector3(17, 0, 7), true);
  world.setTime(17 * 60);
  requestAnimationFrame(frame);
  const LINES = ["Frying the plantain...", "Waking up Mama Eye...", "Hiding the Saboteurs...", "Charging the gen...", "Ironing the agbada...", "Stocking the jollof..."];
  let done = 0;
  const total = LOOKS.length + 2;
  const step = () => { done += 1; hud.loading(Math.min(0.99, done / total), LINES[done % LINES.length]); };
  hud.loading(0.03, LINES[0]);
  const props = world.loadProps().catch(() => null).then(step);
  try { lib = new AnimLib(await (await fetch("assets/anim/lib.json")).json()); } catch (e) { console.warn("move library failed to load", e); }
  step();
  await Promise.all(LOOKS.map(async (look) => {
    const a = new Actor(look, lib, look);
    actors[look] = a;
    await a.load();
    a.visible = false; a.sync();
    a.speed = 3.1;
    world.scene.add(a.root);
    makeTag(a, look);
    step();
  }));
  await props;
  ready = true;
  hud.loading(1);
  const invite = cleanRoom(params.get("room"));
  if (invite) showHome(invite); else showHome();
}

function showHome(invite) {
  stage("home");
  hud.home({ name: app.name, look: app.look, invite, stats: null }, {
    quick: async (name, look) => { remember(name, look); try { const r = await (await fetch("/api/quick")).json(); connect(r.room); } catch { hud.toast("Couldn't reach the house. Try again.", "bad"); } },
    create: (name, look) => { remember(name, look); connect(newCode()); },
    join: (name, look, code) => { remember(name, look); connect(cleanRoom(code)); },
  });
  fetch("/api/stats").then((r) => r.json()).then((s) => hud.setStats(s)).catch(() => {});
}
function remember(name, look) { app.name = name; app.look = look; store.set("wh:name", name); store.set("wh:look", look); }
function newCode() { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let c = ""; for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }

// ------------------------------------------------------------------ state
let prevPhase = null, lastTp = -1, lastBodies = new Set(), lastFlash = 0, wasAlive = true, lastChatId = 0;

function onState(msg) {
  const v = msg.view;
  if (!v) return;
  app.skew = v.now - Date.now();
  const prev = app.view;
  app.view = v;
  if (!ready) return;
  if (!v.me) { if (!msg.seats.includes(ME)) hud.full(() => { leave(); quickAgain(); }); return; }
  apply(v, prev);
}
async function quickAgain() { try { const r = await (await fetch("/api/quick")).json(); connect(r.room); } catch {} }

function onError(err) {
  if (err === "bad move") { snapMe(); return; }
  if (err === "Too fast.") return;
  if (hud) hud.toast(String(err || "Something went wrong."), "bad");
}

function apply(v, prev) {
  const phase = v.phase;
  if (phase !== prevPhase) enterPhase(v, prevPhase);
  hud.feed(v);
  switch (phase) {
    case "LOBBY": hud.lobby(v, lobbyOn); break;
    case "INTRO": hud.intro(v); break;
    case "PLAY": hud.play(v, playOn); break;
    case "MEET": case "VOTE": case "RESULT": hud.meeting(v, meetOn); break;
    case "END": hud.end(v, endOn); break;
  }
  // Server moved me (round start, meeting, back from a meeting).
  if (v.me.tp !== lastTp) { lastTp = v.me.tp; snapMe(); }
  // Someone was struck where I could see.
  const bodies = new Set((v.bodies || []).map((b) => b.id));
  for (const id of bodies) if (!lastBodies.has(id) && phase === "PLAY") audio.sfx("s_gasp", 0.5);
  lastBodies = bodies;
  if (wasAlive && !v.me.alive && v.me.by && phase === "PLAY") struck(v);
  wasAlive = v.me.alive;
  for (const f of v.flash || []) if (f.i > lastFlash) { lastFlash = f.i; const p = v.ps.find((q) => q.id === f.id); if (p) pop(actors[p.look], "✅"); }
  if (v.meet) for (const c of v.meet.chat) if (c.i > lastChatId) { lastChatId = c.i; bubble(c); }
  if (prev && prev.sab && !v.sab && phase === "PLAY") audio.sfx("s_chime", 0.6);
  if (v.sab && (!prev || !prev.sab)) { audio.sfx("s_buzzer", 0.7); if (v.sab.k === "nepa") hud.banner("NEPA HAS TAKEN LIGHT!", "bad"); else hud.banner("GAS LEAK! CLOSE THE VALVES!", "bad"); }
  world.dark = phase === "PLAY" && !!v.sab && v.sab.k === "nepa";
  music(v);
  syncActors(v);
}

function enterPhase(v, from) {
  prevPhase = v.phase;
  closeChore();
  const sm = $("#sabmenu"); if (sm) sm.remove();
  const q = $("#quick"); if (q) q.remove();
  switch (v.phase) {
    case "LOBBY": stage("lobby"); lastChatId = 0; for (const a of Object.values(actors)) { a.lobbyI = undefined; setGhost(a, false); } break;
    case "INTRO":
      stage("intro");
      wasAlive = true;
      if (v.me.role === "S") audio.voice("wh_saboteur"); else audio.voice("eye_welcome");
      break;
    case "PLAY":
      for (const a of Object.values(actors)) { if (a.leaving) { a.leaving = false; a.path = []; } a.seatKey = null; a.lobbyI = undefined; }
      stage("play"); if (from === "INTRO") hud.banner(v.me.role === "S" ? "Blend in. Strike when nobody is watching." : "Do your chores. Watch everybody.", v.me.role === "S" ? "bad" : "good"); break;
    case "MEET": stage("meet"); break;
    case "VOTE": audio.sfx("s_drumroll", 0.5); break;
    case "RESULT": if (v.res && v.res.out) { audio.voice("dapo_evicted"); setTimeout(() => walkOut(v.res.out), 2600); } break;
    case "END": stage("end"); for (const a of Object.values(actors)) { a.lobbyI = undefined; a.leaving = false; } break;
  }
}

function music(v) {
  const k = v.phase === "LOBBY" ? "m_day"
    : v.phase === "INTRO" ? (v.me.role === "S" ? "m_sab" : "m_game")
      : v.phase === "PLAY" ? (v.sab ? (v.sab.k === "nepa" ? "m_night" : "m_sab") : "m_game")
        : v.phase === "END" ? (v.end && v.end.win === "S" ? "m_sab" : "m_party") : "m_live";
  audio.playMusic(k);
}

// ------------------------------------------------------------------ handlers from the HUD
const lobbyOn = {
  look: (l) => { app.look = l; store.set("wh:look", l); act({ t: "look", look: l }); },
  opts: (o) => act(Object.assign({ t: "opts" }, o)),
  start: () => act({ t: "start" }),
  leave: () => leave(),
};
const playOn = {
  act: (a) => doAction(a),
  map: () => hud.map(app.view, player() ? [player().pos.x, player().pos.z] : null),
  menu: () => hud.menu({ leave }),
};
const meetOn = {
  chat: (c) => act(Object.assign({ t: "chat" }, c)),
  vote: (who) => act({ t: "vote", who }),
};
const endOn = { again: () => act({ t: "again" }), leave: () => leave() };

// ------------------------------------------------------------------ people
const meP = () => (app.view ? app.view.ps.find((p) => p.id === ME) : null);
function player() { const v = app.view; return v && v.me ? actors[v.me.look] : null; }
const LOBBY_LINE = (i, n) => [13.2 + (i * 8.4) / Math.max(1, n - 1 || 1), 7.6 + (i % 2) * 0.9];

function resetScene() {
  for (const a of Object.values(actors)) { a.visible = false; a.path = []; a.sync(); if (a.tag) a.tag.hidden = true; }
}

function setGhost(a, on) {
  if (!a.model || a.ghost === on) return;
  a.ghost = on;
  a.model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) { m.transparent = on; m.opacity = on ? 0.38 : 1; m.depthWrite = !on; m.needsUpdate = true; }
  });
}

/** Place every body from the view: lineup in the lobby, seats in meetings, live positions in play. */
function syncActors(v) {
  const used = new Set();
  const me = v.me;
  const ghostView = !me.alive || me.spec;
  const lobby = v.phase === "LOBBY" || v.phase === "END";
  const meeting = v.phase === "MEET" || v.phase === "VOTE" || v.phase === "RESULT";
  const list = v.ps.filter((p) => !p.spec);
  list.forEach((p, i) => {
    const a = actors[p.look];
    if (!a) return;
    used.add(p.look);
    a.pid = p.id; a.pname = p.name; a.prole = p.role; a.palive = p.alive !== false;
    if (lobby) {
      const [x, z] = LOBBY_LINE(i, list.length);
      if (!a.visible || a.lobbyI !== i) {
        a.lobbyI = i;
        place(a, x, z, FACE_CAM, "idle");
        if (v.phase === "END" && v.end) a.setBase((p.role === "S") === (v.end.win === "S") ? "cheer" : "sad", 0);
        else if (!a.waved) { a.waved = true; a.gesture("wave", 2.5); }
      }
      setGhost(a, false);
      return;
    }
    a.lobbyI = undefined; a.waved = false;
    if (a.leaving) return;
    if (p.id === ME) {
      setGhost(a, !me.alive && !me.spec);
      if (me.spec) { a.visible = false; a.sync(); return; }
      if (meeting) seat(a, p);
      else if (!a.visible) place(a, me.x, me.z, me.f, "idle");
      return;
    }
    if (p.x === undefined) { if (!isBodyOf(v, p.id)) hide(a); return; }
    setGhost(a, p.alive === false);
    if (meeting) { seat(a, p); return; }
    a.tx = p.x; a.tz = p.z; a.tf = p.f; a.tmv = p.mv;
    if (!a.visible || Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 4) place(a, p.x, p.z, p.f, "idle");
    a.remote = true;
  });
  // Bodies: the living see the body itself; ghosts see a marker (the ghost is walking around).
  for (const b of v.bodies || []) {
    const p = v.ps.find((q) => q.id === b.id);
    if (!p) continue;
    const a = actors[p.look];
    used.add(p.look);
    if (!ghostView) {
      a.remote = false; a.body = true;
      if (!a.visible || a.baseAnim !== "sleep" || Math.hypot(a.pos.x - b.x, a.pos.z - b.z) > 0.2) {
        a.visible = true; a.path = []; a.oneShot = null;
        a.place(b.x, b.z, a.face);
        a.setBase("sleep", a.restY("sleep", 0));
      }
    }
  }
  for (const [look, a] of Object.entries(actors)) {
    if (!used.has(look)) hide(a);
    if (!(v.bodies || []).some((b) => (v.ps.find((q) => q.id === b.id) || {}).look === look)) a.body = false;
  }
}
const isBodyOf = (v, id) => (v.bodies || []).some((b) => b.id === id);
function hide(a) { if (!a.visible) return; a.visible = false; a.path = []; a.remote = false; a.sync(); }
function place(a, x, z, f, anim) {
  a.visible = true; a.path = []; a.oneShot = null; a.leaving = false;
  a.place(x, z, f === undefined ? a.face : f);
  a.setBase(anim || "idle", 0);
  a.yOff = 0; a.sync();
}
function seat(a, p) {
  if (p.x === undefined) return;
  const sitting = p.seat !== undefined && p.seat < 9 && p.alive !== false;
  const key = `${p.x},${p.z},${sitting}`;
  if (a.seatKey === key && a.visible) return;
  a.seatKey = key; a.remote = false;
  place(a, p.x, p.z, p.f, sitting ? "sit" : "idle");
  if (sitting) { a.setBase("sit", a.restY("sit", 0.4)); a.yOff = a.baseY; a.sync(); }
}

app.snapMe = () => snapMe(); // QA: put the local body where the server says it is
function snapMe() {
  const v = app.view, a = player();
  if (!v || !a || !v.me) return;
  if (v.phase === "LOBBY" || v.me.spec) return;
  a.seatKey = null;
  if (v.phase === "MEET" || v.phase === "VOTE" || v.phase === "RESULT") { const p = meP(); if (p) seat(a, p); return; }
  place(a, v.me.x, v.me.z, v.me.f, "idle");
  lastSent = { x: v.me.x, z: v.me.z, t: 0 };
}

function walkOut(id) {
  const v = app.view;
  const p = v && v.ps.find((q) => q.id === id);
  if (!p) return;
  const a = actors[p.look];
  if (!a || !a.visible) return;
  a.leaving = true; a.seatKey = null; a.yOff = 0;
  pop(a, "👋");
  a.gesture("wave", 1.4);
  for (const o of Object.values(actors)) if (o !== a && o.visible) { o.wantFace = Math.atan2(a.pos.x - o.pos.x, a.pos.z - o.pos.z); }
  setTimeout(() => {
    if (!a.leaving) return;
    a.baseAnim = "idle";
    a.speed = 1.8;
    a.walkTo(world, 22.4, 9.6, undefined, () => { a.visible = false; a.leaving = false; a.sync(); a.speed = 3.1; });
  }, 1400);
}

function struck(v) {
  audio.sfx("s_gasp", 0.8);
  const killer = v.ps.find((p) => p.id === v.me.by);
  const box = el("div", { id: "struck", class: "screen dim" }, el("div", { class: "scard" }, el("h1", { text: "💀 STRUCK!" }), el("p", { text: `${killer ? killer.name : "A Saboteur"} got you.` }), el("p", { class: "sub", text: "You're a ghost now. The living can't see or hear you." })));
  document.body.append(box);
  setTimeout(() => box.remove(), 3200);
}

// ------------------------------------------------------------------ chores and actions
let chore = null, choreId = null;
function closeChore() { if (chore) { chore.close(); chore = null; } choreId = null; }

function nearestStation(v, x, z) {
  const me = v.me;
  let best = null, bd = RANGE.use;
  const ids = me.tasks.filter((t) => !t.done).map((t) => t.id);
  if (v.sab && me.alive) ids.push(...(v.sab.k === "nepa" ? ["gen"] : ["gas1", "gas2"].filter((g) => !v.sab.fixed.includes(g))));
  for (const id of ids) { const st = STATIONS[id]; const d = Math.hypot(st.x - x, st.z - z); if (d <= bd) { bd = d; best = id; } }
  return best;
}
function nearestBody(v, x, z) {
  let best = null, bd = RANGE.report;
  for (const b of v.bodies || []) { const d = Math.hypot(b.x - x, b.z - z); if (d <= bd) { bd = d; best = b; } }
  return best;
}
function strikeTarget(v, x, z) {
  let best = null, bd = RANGE.strike;
  for (const p of v.ps) {
    if (p.id === ME || p.role === "S" || p.alive === false || p.x === undefined || p.spec) continue;
    const a = actors[p.look];
    const d = Math.hypot(a.pos.x - x, a.pos.z - z);
    if (d <= bd) { bd = d; best = p; }
  }
  return best;
}

function actionState() {
  const v = app.view, a = player();
  if (!v || v.phase !== "PLAY" || !a || v.me.spec) return {};
  const me = v.me, now = app.serverNow();
  const x = a.pos.x, z = a.pos.z;
  const st = nearestStation(v, x, z);
  const out = {};
  out.use = { on: !!st && !chore, hidden: false, label: st ? (STATIONS[st].kind === "fix" ? "FIX" : "USE") : "USE" };
  if (me.alive) {
    out.report = { on: !!nearestBody(v, x, z), hidden: !nearestBody(v, x, z) };
    const nearBell = Math.hypot(STATIONS.bell.x - x, STATIONS.bell.z - z) <= RANGE.bell;
    out.bell = { on: nearBell && me.bell > 0 && now >= v.bellAt && !v.sab, hidden: !nearBell, secs: nearBell && now < v.bellAt ? Math.ceil((v.bellAt - now) / 1000) : 0 };
  }
  if (me.role === "S" && me.alive) {
    const t = strikeTarget(v, x, z);
    const cd = Math.max(0, Math.ceil((me.cd - now) / 1000));
    out.strike = { on: !!t && cd === 0, secs: cd, hidden: false };
    const scd = Math.max(0, Math.ceil(((v.sabAt || 0) - now) / 1000));
    out.sab = { on: !v.sab && scd === 0, secs: v.sab ? 0 : scd, hidden: false };
  }
  return out;
}

function doAction(kind) {
  const v = app.view, a = player();
  if (!v || v.phase !== "PLAY" || !a) return;
  const x = a.pos.x, z = a.pos.z;
  flushPos(true);
  if (kind === "use") {
    const id = nearestStation(v, x, z);
    if (!id || chore) return;
    const st = STATIONS[id];
    act({ t: "use", id });
    choreId = id;
    a.wantFace = st.f;
    chore = openChore(id, st, {
      minMs: st.dur * 1000 * 0.8,
      fake: v.me.role === "S" && st.kind === "task",
      onDone: () => { act({ t: "done", id }); chore = null; choreId = null; },
      onCancel: () => { act({ t: "cancel" }); chore = null; choreId = null; },
    });
  } else if (kind === "report") { if (nearestBody(v, x, z)) act({ t: "report" }); }
  else if (kind === "bell") act({ t: "bell" });
  else if (kind === "strike") { const t = strikeTarget(v, x, z); if (t) { act({ t: "strike", who: t.id }); a.gesture("angry", 1.2); } }
  else if (kind === "sab") hud.sabMenu(v, (k) => act({ t: "sab", k }));
}

// ------------------------------------------------------------------ moving
const keys = new Set();
const MOVE_KEYS = { w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1] };
const joy = { x: 0, y: 0, on: false };
let lastSent = { x: 0, z: 0, t: 0 }, moving = false;

function canMove() {
  const v = app.view;
  return v && v.phase === "PLAY" && !chore && !$("#modal") && !$("#map") && !$("#struck");
}

function movePlayer(dt) {
  const v = app.view, a = player();
  if (!v || !a || v.phase !== "PLAY") return;
  const free = !v.me.alive || v.me.spec;
  let dx = 0, dz = 0;
  if (canMove()) {
    for (const k of keys) { const m = MOVE_KEYS[k]; if (m) { dx += m[0]; dz += m[1]; } }
    if (joy.on && Math.hypot(joy.x, joy.y) > 0.18) { dx += joy.x + joy.y; dz += -joy.x + joy.y; }
  }
  if (v.me.spec) { if (dx || dz) { const l = Math.hypot(dx, dz); specCam.x = clampX(specCam.x + (dx / l) * 8 * dt); specCam.z = clampZ(specCam.z + (dz / l) * 8 * dt); } return; }
  if (dx || dz) {
    a.path = [];
    const l = Math.hypot(dx, dz);
    const sp = (free ? 3.6 : 3.1) * dt * Math.min(1, l);
    const nx = a.pos.x + (dx / l) * sp, nz = a.pos.z + (dz / l) * sp;
    if (free) { a.pos.x = clampX(nx); a.pos.z = clampZ(nz); }
    else if (world.walkable(nx, nz)) { a.pos.x = nx; a.pos.z = nz; }
    else if (world.walkable(nx, a.pos.z)) a.pos.x = nx;
    else if (world.walkable(a.pos.x, nz)) a.pos.z = nz;
    a.wantFace = Math.atan2(dx, dz);
    a.yOff = 0; a.oneShot = null;
    if (a.anim !== "walk") a.play("walk", { speed: 1.35 });
    moving = true;
  } else if (moving && !a.path.length) {
    moving = false;
    a.baseAnim = "idle"; a.play("idle");
    flushPos(true);
  }
  // Leaving a chore station closes the chore.
  if (chore && choreId && Math.hypot(STATIONS[choreId].x - a.pos.x, STATIONS[choreId].z - a.pos.z) > RANGE.use + 0.5) { chore.cancel(); }
  flushPos(false);
}
const clampX = (x) => Math.max(0.3, Math.min(WORLD.w - 0.3, x));
const clampZ = (z) => Math.max(0.3, Math.min(WORLD.d - 0.3, z));

function flushPos(force) {
  const v = app.view, a = player();
  if (!v || !a || v.phase !== "PLAY" || v.me.spec) return;
  const now = performance.now();
  const d = Math.hypot(a.pos.x - lastSent.x, a.pos.z - lastSent.z);
  if (d < 0.02 && !force) return;
  if (!force && now - lastSent.t < 110) return;
  if (d < 0.005) return;
  lastSent = { x: a.pos.x, z: a.pos.z, t: now };
  act({ t: "p", x: Math.round(a.pos.x * 100) / 100, z: Math.round(a.pos.z * 100) / 100, f: Math.round(a.wantFace * 100) / 100 });
}

// Others: glide toward the latest server position.
function moveOthers(dt) {
  for (const a of Object.values(actors)) {
    if (!a.remote || !a.visible || a.leaving) continue;
    const dx = a.tx - a.pos.x, dz = a.tz - a.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.02) {
      const step = Math.min(d, Math.max(3.4 * dt, d * Math.min(1, dt * 6)));
      a.pos.x += (dx / d) * step; a.pos.z += (dz / d) * step;
      a.wantFace = Math.atan2(dx, dz);
      if (a.anim !== "walk" && !a.oneShot) a.play("walk", { speed: 1.35 });
    } else {
      a.wantFace = typeof a.tf === "number" ? a.tf : a.wantFace;
      if (a.anim === "walk") a.play(a.baseAnim || "idle");
    }
  }
}

// ------------------------------------------------------------------ input
const typing = (e) => e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
window.addEventListener("keydown", (e) => {
  if (typing(e) || !ready) return;
  const k = e.key.toLowerCase();
  const v = app.view;
  if (e.key === "Escape") {
    for (const id of ["map", "modal", "sabmenu", "quick"]) { const n = $("#" + id); if (n) { n.remove(); return; } }
    if (chore) { chore.cancel(); return; }
    if (v && v.phase === "PLAY") hud.menu({ leave });
    return;
  }
  if (!v || v.phase !== "PLAY") return;
  if (MOVE_KEYS[k]) { keys.add(k); e.preventDefault(); return; }
  const st = actionState();
  if (k === "e" && st.use && st.use.on) doAction("use");
  else if (k === "r" && st.report && st.report.on) doAction("report");
  else if (k === "b" && st.bell && st.bell.on) doAction("bell");
  else if (k === "q" && st.strike && st.strike.on) doAction("strike");
  else if (k === "x" && st.sab && st.sab.on) doAction("sab");
  else if (k === "m") playOn.map();
  else if (k === "=" || k === "+") baseZoom = Math.max(3.5, baseZoom - 0.6);
  else if (k === "-" || k === "_") baseZoom = Math.min(9, baseZoom + 0.6);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
window.addEventListener("pointerdown", () => audio.unlock(), { once: true });

const canvas = $("#c");
canvas.addEventListener("wheel", (e) => { if (!app.view || app.view.phase !== "PLAY") return; e.preventDefault(); baseZoom = Math.max(3.5, Math.min(9, baseZoom + Math.sign(e.deltaY) * 0.4)); }, { passive: false });
let down = null;
canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
  down = null;
  if (moved > 10 || dt > 600 || !canMove()) return;
  tapWalk(e.clientX, e.clientY);
});
const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
function tapWalk(cx, cy) {
  const v = app.view, a = player();
  if (!v || !a || v.me.spec) return;
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, world.camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(ground, p)) return;
  if (p.x < 0 || p.z < 0 || p.x > WORLD.w || p.z > WORLD.d) return;
  if (!v.me.alive) { a.path = [[p.x, p.z]]; a.baseAnim = "idle"; a.play("walk", { speed: 1.35 }); return; }
  const [x, z] = world.nearestFree(p.x, p.z);
  a.walkTo(world, x, z);
  a.play("walk", { speed: 1.35 });
  ripple(cx, cy);
}
function ripple(x, y) { const r = el("div", { class: "ripple", style: { left: x + "px", top: y + "px" } }); document.body.append(r); setTimeout(() => r.remove(), 600); }

// Touch joystick (drawn only on touch screens).
function makeJoystick() {
  const base = el("div", { id: "joy" }, el("i"));
  document.body.append(base);
  const knob = base.querySelector("i");
  let id = null, cx = 0, cy = 0;
  const R = 46;
  base.addEventListener("pointerdown", (e) => { id = e.pointerId; base.setPointerCapture(id); const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.on = true; upd(e); });
  const upd = (e) => {
    if (e.pointerId !== id) return;
    let x = e.clientX - cx, y = e.clientY - cy;
    const l = Math.hypot(x, y);
    if (l > R) { x = (x / l) * R; y = (y / l) * R; }
    knob.style.transform = `translate(${x}px, ${y}px)`;
    joy.x = x / R; joy.y = y / R;
  };
  base.addEventListener("pointermove", upd);
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.on = false; joy.x = joy.y = 0; knob.style.transform = ""; };
  base.addEventListener("pointerup", end);
  base.addEventListener("pointercancel", end);
}
if (matchMedia("(pointer: coarse)").matches) makeJoystick();

// ------------------------------------------------------------------ overlays: tags, pops, bubbles, fog, markers
const tagBox = $("#tags");
function makeTag(a, look) {
  const t = el("div", { class: "ntag", style: { "--c": LOOK_COLOR[look] } }, el("i", { class: "bub" }), el("b"));
  t.hidden = true;
  tagBox.append(t);
  a.tag = t;
}
function bubble(c) {
  const v = app.view;
  const p = v && v.ps.find((q) => q.id === c.w);
  if (!p) return;
  const a = actors[p.look];
  if (!a || !a.tag) return;
  const b = a.tag.querySelector(".bub");
  b.textContent = c.t.length > 60 ? c.t.slice(0, 58) + "..." : c.t;
  a.bubbleUntil = performance.now() + 3800;
  a.gesture(Math.random() < 0.5 ? "talk" : "talk2", 2.5);
}
const pops = [];
function pop(a, emoji) {
  if (!a || !a.visible) return;
  const e = el("div", { class: "rpop", text: emoji });
  tagBox.append(e);
  pops.push({ a, e, t0: performance.now() });
}
const markers = {};
function marker(id) {
  if (!markers[id]) { markers[id] = el("div", { class: "smark", text: STATIONS[id].icon }); tagBox.append(markers[id]); }
  return markers[id];
}
function project(x, y, z) {
  tmpV.set(x, y, z).project(world.camera);
  return [(tmpV.x * 0.5 + 0.5) * window.innerWidth, (-tmpV.y * 0.5 + 0.5) * window.innerHeight];
}

function updateOverlays() {
  const v = app.view;
  const now = performance.now();
  const play = v && v.phase === "PLAY";
  for (const [look, a] of Object.entries(actors)) {
    const t = a.tag;
    if (!t) continue;
    const show = v && a.visible && !a.body && v.phase !== "END";
    if (!show) { if (!t.hidden) t.hidden = true; continue; }
    const [x, y] = project(a.pos.x, (a.yOff || 0) + 2.05, a.pos.z);
    if (x < -80 || x > innerWidth + 80 || y < -60 || y > innerHeight + 60) { t.hidden = true; continue; }
    t.hidden = false;
    t.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const label = (a.palive === false ? "👻 " : "") + (a.pname || "");
    const nb = t.lastChild;
    if (nb.textContent !== label) nb.textContent = label;
    t.classList.toggle("sab", a.prole === "S");
    t.classList.toggle("me", a.pid === ME);
    t.classList.toggle("ghost", a.palive === false);
    const bub = t.firstChild;
    const talking = (a.bubbleUntil || 0) > now;
    if (bub.hidden === talking) bub.hidden = !talking;
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i], k = (now - p.t0) / 1700;
    if (k >= 1 || !p.a.visible) { p.e.remove(); pops.splice(i, 1); continue; }
    const [x, y] = project(p.a.pos.x, (p.a.yOff || 0) + 2.5 + k * 0.45, p.a.pos.z);
    p.e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${k < 0.12 ? (0.5 + k * 5).toFixed(2) : "1"})`;
    p.e.style.opacity = k > 0.75 ? ((1 - k) / 0.25).toFixed(2) : "1";
  }
  // Chore markers for things I can do, and the fog of what I can't see.
  const want = new Set();
  if (play && v.me && !v.me.spec) {
    for (const t of v.me.tasks) if (!t.done) want.add(t.id);
    if (v.sab && v.me.alive) (v.sab.k === "nepa" ? ["gen"] : ["gas1", "gas2"].filter((g) => !v.sab.fixed.includes(g))).forEach((g) => want.add(g));
  }
  for (const id of Object.keys(STATIONS)) {
    if (STATIONS[id].kind === "bell") continue;
    const m = markers[id];
    if (!want.has(id)) { if (m) m.hidden = true; continue; }
    const mk = marker(id);
    const [x, y] = project(STATIONS[id].x, 1.6, STATIONS[id].z);
    mk.hidden = false;
    mk.classList.toggle("fix", STATIONS[id].kind === "fix");
    mk.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
  fog(v);
}

function fog(v) {
  let f = $("#fog");
  if (!f) { f = el("div", { id: "fog" }); document.body.insertBefore(f, $("#tags")); }
  const a = player();
  const on = v && v.phase === "PLAY" && v.me && v.me.alive && !v.me.spec && a && a.visible && v.vis && v.vis < 50;
  f.classList.toggle("gas", !!(v && v.phase === "PLAY" && v.sab && v.sab.k === "gas"));
  if (!on) { if (f.style.background) f.style.background = ""; return; }
  const [x, y] = project(a.pos.x, 0.9, a.pos.z);
  const [x2] = project(a.pos.x + 0.7071 * v.vis, 0.9, a.pos.z - 0.7071 * v.vis);
  const rx = Math.abs(x2 - x);
  const ry = rx * 0.62;
  const dark = v.sab && v.sab.k === "nepa" ? 0.93 : 0.72;
  f.style.background = `radial-gradient(${rx.toFixed(0)}px ${ry.toFixed(0)}px at ${x.toFixed(0)}px ${y.toFixed(0)}px, rgba(8,4,14,0) 0%, rgba(8,4,14,0) 72%, rgba(8,4,14,${dark}) 100%)`;
}

// ------------------------------------------------------------------ camera
let camMode = "home", baseZoom = 5.6, zoomTarget = 7;
const camStage = new THREE.Vector3(17, 0.9, 7), specCam = new THREE.Vector3(18, 0.9, 12), camV = new THREE.Vector3();
function stage(mode) {
  camMode = mode;
  if (mode === "home") { zoomTarget = 7.5; }
  if (mode === "lobby") { camStage.set(17.2, 0.9, 7.4); zoomTarget = 4.4; resetScene(); }
  if (mode === "intro") { zoomTarget = 3.2; }
  if (mode === "play") { zoomTarget = baseZoom; }
  if (mode === "meet") { camStage.set(16.6, 0.9, 3.6); zoomTarget = 4.6; }
  if (mode === "end") { camStage.set(17, 0.9, 6); zoomTarget = 5.5; }
}
let homeT = 0;
function updateCamera(dt) {
  const v = app.view, a = player();
  if (camMode === "home") { homeT += dt * 0.05; world.follow(camV.set(18 + Math.sin(homeT) * 8, 0.5, 12 + Math.cos(homeT * 0.8) * 5)); }
  else if ((camMode === "play" || camMode === "intro") && v && v.me && v.me.spec) world.follow(specCam);
  else if ((camMode === "play" || camMode === "intro") && a && a.visible) { world.follow(camV.set(a.pos.x, 0.9, a.pos.z)); if (camMode === "play") zoomTarget = baseZoom; }
  else world.follow(camStage);
  // Keep the scene in the part of the screen a side panel or bottom sheet leaves free.
  const panel = $("#lobby") || $("#meet .mpanel");
  let ox = 0, oy = 0;
  if (panel) {
    const r = panel.getBoundingClientRect();
    if (innerWidth > 760) ox = (innerWidth - r.left) / 2; else oy = (innerHeight - r.top) / 2;
  }
  panelOff.x += (ox - panelOff.x) * Math.min(1, dt * 5); panelOff.y += (oy - panelOff.y) * Math.min(1, dt * 5);
  if (Math.abs(panelOff.x) > 1 || Math.abs(panelOff.y) > 1) {
    const ppu = innerHeight / (2 * world.zoom * (world.aspect < 1 ? 1.35 : 1));
    const right = panelOff.x / ppu, down = panelOff.y / ppu;
    // Screen right is world (+x, -z); screen down is world (+x, +z) foreshortened by the camera tilt.
    world.camTarget.x += (right * 0.7071) + (down * 0.7071 / 0.577);
    world.camTarget.z += (-right * 0.7071) + (down * 0.7071 / 0.577);
  }
  if (Math.abs(world.zoom - zoomTarget) > 0.01) world.setZoom(world.zoom + (zoomTarget - world.zoom) * Math.min(1, dt * 3));
}
const panelOff = { x: 0, y: 0 };

// ------------------------------------------------------------------ frame
const clock = new THREE.Clock();
let lightT = 0, hudT = 0;
function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta();
  clock.lastDelta = raw;
  const dt = Math.min(0.05, raw);
  if (!world) return;
  const now = performance.now();
  if (ready) {
    const mdt = Math.min(0.1, clock.lastDelta || dt);
    movePlayer(mdt);
    moveOthers(mdt);
    for (const a of Object.values(actors)) if (a.visible || a.path.length) a.update(dt, now);
    hudT += dt;
    if (hudT > 0.1) {
      hudT = 0;
      hud.actions(actionState());
      const v = app.view;
      if (v && v.phase === "LOBBY") hud.lobby(v, lobbyOn);
      else if (v && (v.phase === "MEET" || v.phase === "VOTE")) hud.meeting(v, meetOn);
      else if (v && v.phase === "PLAY") hud.play(v, playOn);
      else if (v && v.phase === "END") hud.endTimer(v);
    }
  }
  updateCamera(dt);
  lightT += dt;
  if (lightT > 0.25) { lightT = 0; world.setTime(app.view && app.view.phase === "PLAY" && world.dark ? 22 * 60 : 17 * 60 + 30, false); }
  world.update(dt, clock.elapsedTime);
  if (!chore || window.innerWidth > 760) world.render();
  if (ready) updateOverlays();
}

boot();
