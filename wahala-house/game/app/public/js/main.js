// Wahala House client entry. The server (src/logic.js) is authoritative: this
// file turns the view it sends into a living house (who stands where, who is
// flirting or fighting, what the cameras show) and sends the player's intents
// back as actions. Nothing here decides an outcome.
import * as THREE from "three";
import { World } from "./world.js";
import { Actor, restFor, SCENE_MOVES, SCENE_ICON, spotOf } from "./cast.js";
import { AnimLib } from "./retarget.js";
import { CAST, AI_IDS, STAGE, VO, gatherLayout, roomAt, FACE_CAM, WORLD } from "./data.js";
import { UI, $, el, portrait } from "./ui.js";
import { audio } from "./audio.js";
import { playGame } from "./games.js";

// ------------------------------------------------------------------ net
const params = new URLSearchParams(location.search);
function playerId() {
  const key = "wh:pid";
  let id = null;
  try { id = localStorage.getItem(key); } catch {}
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(key, id); } catch {}
  }
  return id;
}
/** Every browser gets its own private season, unless ?room= says otherwise. */
const ROOM = (params.get("room") || `s-${playerId()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60) || "main";

let socket = null, retry = 0;
function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(ROOM)}`);
  socket.addEventListener("open", () => { retry = 0; send({ type: "join", playerId: playerId() }); });
  socket.addEventListener("message", (e) => {
    if (e.data === "__pong") return;
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type === "state") onState(msg.view);
    else if (msg.type === "error") onError(msg.error);
  });
  socket.addEventListener("close", () => {
    retry = Math.min(retry + 1, 6);
    setTimeout(connect, 500 * 2 ** (retry - 1));
  });
}
setInterval(() => { if (socket && socket.readyState === 1) socket.send("__ping"); }, 25000);
function send(m) { if (socket && socket.readyState === 1) { socket.send(JSON.stringify(m)); return true; } return false; }

// ------------------------------------------------------------------ app
const app = {
  view: null, modalOpen: false, dialogOpen: false, choiceOpen: false, busy: false, gameOn: false,
  fastForward() { const v = app.view; if (v && v.phase === "ROAM" && !app.busy) { act({ t: "ff" }); did.ff = true; audio.sfx("s_whoosh", 0.5); } },
  newSeason() { const r = $("#recap"); if (r) r.remove(); endShown = false; send({ type: "reset" }); },
  openShop() { openShop(); },
};
window.__wh = app; // handy for QA in the console
/** A snapshot of every body on screen, for QA scripts and the console. */
app.debug = () => ({
  ready, lib: !!lib, quality: typeof qLevel === "number" ? qLevel : 0, stage,
  actors: Object.fromEntries(Object.entries(actors).map(([k, a]) => [k, { fallback: !!a.fallback, ready: a.ready, anim: a.anim, clips: Object.keys(a.clips).length, visible: a.visible, pos: [+a.pos.x.toFixed(2), +a.pos.z.toFixed(2)], y: +(a.yOff || 0).toFixed(2) }])),
});
function act(a) { app.busy = true; app.busyAt = performance.now(); send({ type: "action", action: a }); }
app.act = act; // for QA scripts and the console; the server validates everything

let world, ui, lib = null;
const actors = {}; // id -> Actor (AI ids, "dapo", "pf", "pm")
let player = null; // the Actor for "you"
let ready = false, pendingView = null, gotFirst = false;
let menuShown = false, endShown = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let chain = Promise.resolve();
const queue = (fn) => { chain = chain.then(fn).catch((e) => console.error(e)); return chain; };

function actorOf(id) {
  if (id === "you") return player;
  return actors[id] || null;
}
function nameOf(id) {
  const v = app.view;
  if (id === "you") return (v && v.you && v.you.name) || "You";
  if (id === "dapo") return "Dapo";
  return CAST[id] ? CAST[id].name : id;
}
const hmOf = (v, id) => (v && v.hm ? v.hm.find((h) => h.id === id) : null);

// ------------------------------------------------------------------ boot
const LOAD_LINES = ["Frying the plantain...", "Waking up Mama Eye...", "Ironing the agbada...", "Charging the ring lights...", "Hiding the cameras...", "Stocking the jollof..."];

async function boot() {
  world = new World($("#c"));
  ui = new UI(app);
  const openBook = ui.openBook.bind(ui), openTea = ui.openTea.bind(ui);
  ui.openBook = () => { did.book = true; openBook(); };
  ui.openTea = () => { did.tea = true; openTea(); };
  world.follow(new THREE.Vector3(22, 0, 12), true);
  world.setTime(11 * 60);
  requestAnimationFrame(frame);
  connect();
  let done = 0;
  const ids = [...AI_IDS, "dapo", "pf", "pm"];
  const total = ids.length + 2;
  const step = () => { done += 1; ui.loading(Math.min(0.99, done / total), LOAD_LINES[done % LOAD_LINES.length]); };
  ui.loading(0.03, LOAD_LINES[0]);
  const props = world.loadProps().catch(() => null).then(step);
  try { lib = new AnimLib(await (await fetch("assets/anim/lib.json")).json()); } catch (e) { console.warn("move library failed to load", e); lib = null; }
  step();
  await Promise.all(ids.map(async (id) => {
    const a = new Actor(id === "pf" || id === "pm" ? "you" : id, lib, id);
    a.key = id;
    actors[id] = a;
    await a.load();
    a.visible = false;
    a.sync();
    world.scene.add(a.root);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.95;
    hit.userData.actor = id;
    a.root.add(hit);
    a.hit = hit;
    makeTag(a, id);
    step();
  }));
  await props;
  actors.dapo.speed = 1.4;
  player = actors.pf;
  ready = true;
  ui.loading(1);
  if (pendingView) { const v = pendingView; pendingView = null; apply(v, null); }
  else setTimeout(() => { if (!app.view) showLobby(); }, 4000);
}

// ------------------------------------------------------------------ state
function onState(v) {
  app.busy = false;
  const prev = app.view;
  app.view = v;
  if (!ready) { pendingView = v; return; }
  apply(v, prev);
}

function onError(err) {
  app.busy = false;
  lastRoomSent = null;
  if (ui) ui.toast(String(err || "Something went wrong."), "bad");
  // Let the current event item be shown again so the player is never stuck.
  if (app.view && app.view.phase === "EV") { handledItem = null; queue(() => processEv(app.view)); }
}

function apply(v, prev) {
  if (!v || v.phase === "LOBBY") { showLobby(); return; }
  if (menuShown) { ui.hideMenu(); menuShown = false; }
  lobbyMode = false;
  if (camMode === "lobby") camMode = "follow";
  if (!gotFirst) {
    // Joining a season already in progress: don't replay old toasts or talks.
    gotFirst = true;
    if (prev === null) {
      ui.lastNote = Math.max(0, ...(v.notes || []).map((n) => n.id));
      lastTalkN = v.last ? v.last.n : 0;
      lastHeard = v.heardId || 0;
      for (const sc of v.scenes || []) alerted.add(sc.id);
    }
  }
  choosePlayer(v.you.look);
  world.setHohLocked(!(v.you.hoh || v.you.tenant));
  ui.renderHud(v);
  if (prev && prev.day && v.day > prev.day && v.phase === "ROAM") newDay(v);
  if (v.phase === "EV") processEv(v);
  else {
    if (evKey) exitEvent(v);
    if (v.phase === "ROAM") { syncRoam(v); checkTalk(v); checkHeard(v); }
    if (v.phase === "END") showEnd(v);
  }
  renderGist(v);
  if (v.phase === "ROAM") alertScenes(v);
  if (!app.gameOn) audio.playMusic(musicFor(v));
}

const EV_MUSIC = { entry: "m_live", live: "m_live", nomreveal: "m_live", wresult: "m_live", strikereveal: "m_live", hoh: "m_game", wager: "m_market", hustle: "m_market", party: "m_party", night: "m_sab", strike: "m_sab", diary: "m_night", noms: "m_night", veto: "m_game" };
function musicFor(v) {
  if (!v || v.phase === "LOBBY") return "m_day";
  if (v.phase === "END") return "m_live";
  if (v.phase === "EV" && v.ev) return v.ev.k === "approach" ? (v.min >= 1260 || v.min < 420 ? "m_night" : "m_day") : EV_MUSIC[v.ev.k] || "m_live";
  return v.min >= 1260 || v.min < 420 ? "m_night" : "m_day";
}

function choosePlayer(look) {
  const want = look === "m" ? actors.pm : actors.pf;
  if (player === want) return;
  const old = player;
  player = want;
  if (old) { want.pos.copy(old.pos); want.face = old.face; old.visible = false; old.sync(); }
}

// ------------------------------------------------------------------ lobby
let lobbyMode = false;
function showLobby() {
  const r = $("#recap"); if (r) r.remove();
  ui.hideDialog(); ui.closeChoice(); ui.closeWheel(); ui.closeModal();
  const b = $("#board"); if (b) b.remove();
  ui.renderHud(null);
  evKey = null; handledItem = null; endShown = false; gotFirst = true;
  lastTalkN = 0; lastHeard = 0; ui.lastNote = 0; ui.lastFeed = 0; ui.prevFans = undefined;
  world.partyMode = false;
  if (!menuShown) {
    menuShown = true;
    ui.showMenu(({ name, look, fate }) => act({ t: "start", name, look, fate, seed: Math.floor(Math.random() * 2147483647) }));
  }
  if (!lobbyMode && ready) {
    lobbyMode = true;
    // The house carries on behind the menu.
    const spots = [["lounge", 0], ["lounge", 2], ["kitchen", 0], ["kitchen", 3], ["garden", 0], ["garden", 2], ["garden", 6], ["gym", 0], ["lounge", 7], ["garden", 9]];
    AI_IDS.forEach((id, i) => {
      const a = actors[id]; const [room, k] = spots[i];
      const s = spotOf(room, k);
      const [anim, surface] = restFor(s, s.pose === "lounger" ? "sunbathe" : s.pose === "work" ? "workout" : s.pose === "sit" ? "sit" : "idle");
      a.visible = true; a.place(s.p[0], s.p[1], s.r); a.setBase(anim, a.restY(anim, surface));
    });
    for (const k of ["dapo", "pf", "pm"]) { actors[k].visible = false; actors[k].sync(); }
    camMode = "lobby";
  }
  audio.playMusic("m_day");
}

// ------------------------------------------------------------------ the house (ROAM)
const pairSpots = {};
function standPoint(x, z) { return world.nearestFree(x, z); }

function pairFor(v, sc) {
  if (pairSpots[sc.id]) return pairSpots[sc.id];
  const ha = hmOf(v, sc.a);
  const sp = ha ? spotOf(ha.room, ha.spot) : null;
  const [ax, az] = standPoint(sp ? sp.p[0] : 16, sp ? sp.p[1] : 5);
  const dirs = [[0.7, 0.7], [1, 0], [0, 1], [-0.7, 0.7], [0.7, -0.7], [-1, 0], [0, -1]];
  let b = [ax + 0.9, az];
  for (const [dx, dz] of dirs) {
    const bx = ax + dx * 0.95, bz = az + dz * 0.95;
    if (world.walkable(bx, bz) && roomAt(bx, bz) === sc.room) { b = [bx, bz]; break; }
  }
  const p = { A: [ax, az], B: b };
  pairSpots[sc.id] = p;
  return p;
}
const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);

function goTo(a, x, z, face, anim, y, opts = {}) {
  a.baseAnim = anim;
  a.baseY = y || 0;
  a.hurry = !!opts.hurry || Math.hypot(x - a.pos.x, z - a.pos.z) > 12;
  if (opts.snap || !a.visible) {
    a.visible = true;
    a.place(x, z, face);
    a.yOff = a.baseY;
    a.play(anim);
    if (opts.done) opts.done();
    return;
  }
  a.walkTo(world, x, z, face, () => { a.hurry = false; if (opts.done) opts.done(); });
  if (!a.path.length) { a.yOff = a.baseY; a.play(anim); }
}

function syncRoam(v, snap) {
  const live = new Set();
  for (const sc of v.scenes) live.add(sc.id);
  for (const k of Object.keys(pairSpots)) if (!live.has(Number(k))) delete pairSpots[k];
  for (const h of v.hm) {
    const a = actors[h.id];
    if (!a) continue;
    a.scene = null;
    a.watching = null;
    if (h.out) { if (!a.leaving) { a.visible = false; a.path = []; a.sync(); } continue; }
    const ws = h.watch ? v.scenes.find((z) => z.id === h.watch) : null;
    if (ws) {
      // Gather round: stand in a loose ring and stare.
      const p = pairFor(v, ws);
      const mid = [(p.A[0] + p.B[0]) / 2, (p.A[1] + p.B[1]) / 2];
      a.watching = { k: ws.k };
      const key = `w${ws.id}`;
      if (a.tkey !== key) {
        a.tkey = key;
        const idx = v.hm.filter((z) => z.watch === ws.id).findIndex((z) => z.id === h.id);
        // Beside and behind the pair (as the camera sees it), never in front of them.
        const ang = [Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 1.25][Math.max(0, idx) % 3];
        const [wx, wz] = world.nearestFree(mid[0] + Math.cos(ang) * 1.9, mid[1] + Math.sin(ang) * 1.9);
        goTo(a, wx, wz, faceTo([wx, wz], mid), "idle", 0, { snap: snap || !a.visible });
      }
      continue;
    }
    const sc = h.sc ? v.scenes.find((z) => z.id === h.sc) : null;
    if (sc) {
      const p = pairFor(v, sc);
      const me = h.id === sc.a ? p.A : p.B, other = h.id === sc.a ? p.B : p.A;
      const key = `sc${sc.id}`;
      a.scene = { k: sc.k, role: h.id === sc.a ? 0 : 1, id: sc.id };
      if (a.tkey !== key) {
        a.tkey = key;
        const mv = (SCENE_MOVES[sc.k] || ["talk", "talk2"])[a.scene.role];
        goTo(a, me[0], me[1], faceTo(me, other), mv, 0, { snap: snap || !a.visible });
      }
      continue;
    }
    const s = spotOf(h.room, h.spot);
    if (!s) {
      // Still on an event mark (the arena). Stay put; appear there if hidden.
      if (!a.visible) { const m = gatherLayout("arena", 11)[AI_IDS.indexOf(h.id)]; goTo(a, m.p[0], m.p[1], m.r, "idle", 0, { snap: true }); }
      continue;
    }
    const key = `${h.room}:${h.spot}:${h.act}`;
    if (a.tkey === key && a.visible) continue;
    a.tkey = key;
    const [anim, surface] = restFor(s, h.act);
    goTo(a, s.p[0], s.p[1], s.r, anim, a.restY(anim, surface), { snap: snap || !a.visible });
  }
  // Nobody sits on Dapo's stage between shows.
  actors.dapo.visible = false; actors.dapo.sync();
  if (v.you.out) { player.visible = false; player.sync(); }
  else if (!player.visible) respawn(v.you.room);
}

const ROOM_DOOR = { lounge: [17, 7], kitchen: [6, 6], garden: [22, 13.5], bedroom: [5.5, 16], gym: [14, 13], hoh: [26.5, 4.2] };
function respawn(room) {
  const [x, z] = world.nearestFree(...(ROOM_DOOR[room] || ROOM_DOOR.lounge));
  player.visible = true;
  player.place(x, z, FACE_CAM);
  player.baseAnim = "idle"; player.baseY = 0; player.yOff = 0;
  player.play("idle");
  lastRoomSent = room;
  world.follow(camFocus(player), true);
}

function newDay(v) {
  ui.banner(`DAY ${v.day}`, `${v.dayName.toUpperCase()} MORNING`);
  audio.sfx("s_chime", 0.5);
  if (!v.you.out) respawn("bedroom");
}

// Scene gestures: people in a scene swap between their move and talking.
let sceneClock = 0;
function animateScenes(dt) {
  sceneClock += dt;
  if (sceneClock < 3.2) return;
  sceneClock = 0;
  for (const id of AI_IDS) {
    const a = actors[id];
    if (!a.scene || a.path.length || !a.visible) continue;
    const mv = (SCENE_MOVES[a.scene.k] || ["talk", "talk2"])[a.scene.role];
    const alt = a.scene.k === "argue" ? "wag" : a.scene.k === "cry" ? "sad" : a.scene.role ? "talk2" : "talk";
    a.setBase(a.baseAnim === mv ? alt : mv);
  }
  for (const id of AI_IDS) {
    const a = actors[id];
    if (!a.watching || a.path.length || !a.visible || a.oneShot || Math.random() < 0.4) continue;
    const pool = a.watching.k === "argue" ? ["sassy", "wag", "talk2", "angry"] : a.watching.k === "kiss" ? ["cheer", "heart", "happy"] : ["talk2", "happy"];
    a.gesture(pool[Math.floor(Math.random() * pool.length)], 2.6);
  }
  // A little life: idle housemates sometimes gesture.
  const idle = AI_IDS.map((id) => actors[id]).filter((a) => a.visible && !a.scene && !a.path.length && a.baseAnim === "idle" && !a.oneShot);
  if (idle.length && Math.random() < 0.5) idle[Math.floor(Math.random() * idle.length)].gesture(["talk2", "sassy", "wave", "happy"][Math.floor(Math.random() * 4)], 3);
}

// ------------------------------------------------------------------ hot gist
const GIST_RANK = { argue: 0, kiss: 1, cry: 2, flirt: 3, whisper: 4 };
const GIST_ICON = { argue: "💢", kiss: "💋", cry: "😢", flirt: "💘", whisper: "🤫" };
const GIST_VERB = { argue: "are fighting", kiss: "are kissing", cry: "is crying", flirt: "are flirting", whisper: "are whispering" };
const ROOM_LABEL = { lounge: "Lounge", kitchen: "Kitchen", garden: "Garden", bedroom: "Bedroom", gym: "Gym", hoh: "HoH Lounge" };
function gistText(sc) {
  const who = sc.k === "cry" ? nameOf(sc.a) : `${nameOf(sc.a)} & ${nameOf(sc.b)}`;
  return `${who} ${GIST_VERB[sc.k] || "are talking"}`;
}
function renderGist(v) {
  let box = $("#gist");
  if (!box) {
    box = el("div", { id: "gist" });
    box.addEventListener("click", (e) => { const b = e.target.closest("[data-sc]"); if (b) goToScene(Number(b.dataset.sc)); });
    ui.root.append(box);
  }
  const list = v.phase === "ROAM" && !v.you.out ? v.scenes.filter((sc) => GIST_RANK[sc.k] !== undefined && !sc.heard).sort((a, b) => GIST_RANK[a.k] - GIST_RANK[b.k]).slice(0, 3) : [];
  box.hidden = !list.length;
  const html = list.map((sc) => `<button type="button" data-sc="${sc.id}" class="g-${sc.k}"><i>${GIST_ICON[sc.k]}</i><span><b>${gistText(sc)}</b><small>${sc.room === v.you.room ? "RIGHT HERE" : (ROOM_LABEL[sc.room] || sc.room).toUpperCase()}</small></span></button>`).join("");
  if (box._html !== html) { box._html = html; box.innerHTML = list.length ? `<div class="gh">HOT GIST</div>${html}` : ""; }
}
function goToScene(id) {
  const v = app.view;
  const sc = v && v.scenes.find((z) => z.id === id);
  if (!sc || v.phase !== "ROAM" || v.you.out) return;
  if (sc.room === "hoh" && !(v.you.hoh || v.you.tenant)) { ui.toast("The HoH Lounge is locked. You can only watch from outside.", "info"); return; }
  const p = pairFor(v, sc);
  const mid = [(p.A[0] + p.B[0]) / 2, (p.A[1] + p.B[1]) / 2];
  const [x, z] = world.nearestFree(mid[0] + 1.6, mid[1] + 1.6);
  player.hurry = true;
  player.walkTo(world, x, z, faceTo([x, z], mid), () => { player.hurry = false; });
  did.move = true;
  did.gist = true;
  audio.sfx("s_whoosh", 0.3);
}
const alerted = new Set();
function alertScenes(v) {
  for (const sc of v.scenes) {
    if (alerted.has(sc.id)) continue;
    alerted.add(sc.id);
    if (!gotFirst || v.you.out) continue;
    const where = sc.room === v.you.room ? "right here" : `in the ${ROOM_LABEL[sc.room] || sc.room}`;
    if (sc.k === "argue") { ui.toast(`💢 Shouting ${where}! ${nameOf(sc.a)} and ${nameOf(sc.b)} are going at it.`, "bad"); }
    else if (sc.k === "kiss") { ui.toast(`💋 ${nameOf(sc.a)} and ${nameOf(sc.b)} are kissing ${where}!`, "good"); }
  }
}

// ------------------------------------------------------------------ talking & listening
let lastTalkN = 0, lastHeard = 0;
const PLAYER_MOVE = { chat: "talk", joke: "happy", compliment: "talk2", deep: "talk", hug: "heart", gift: "talk2", flirt: "heart", askout: "heart", kiss: "heart", breakup: "sad", gist: "talk2", setup: "talk2", asksave: "talk", squad: "talk", swear: "talk", bribe: "talk2", receipt: "talk2", shade: "sassy", argue: "angry", accuse: "wag", apologize: "sad", peace: "talk" };
const LOVE = new Set(["flirt", "askout", "kiss", "hug", "compliment"]);
function replyMove(act, out) {
  if (out === "bad") return act === "breakup" ? "sad" : ["argue", "accuse", "shade", "setup"].includes(act) ? "angry" : "sassy";
  if (out === "good") return LOVE.has(act) ? "heart" : act === "joke" ? "cheer" : "happy";
  return "talk2";
}
function replyMood(act, out) {
  if (out === "bad") return act === "breakup" ? "sad" : "angry";
  if (out === "good") return LOVE.has(act) ? "flirty" : "happy";
  return act === "accuse" || act === "setup" ? "shock" : "neutral";
}

function checkTalk(v) {
  const L = v.last;
  if (!L || L.n <= lastTalkN) return;
  lastTalkN = L.n;
  queue(() => playTalk(L));
}

/** Emoji a housemate pops after your move lands, by move and outcome. */
function talkPop(act, out) {
  if (out === "good") return { joke: "😂", flirt: "😍", askout: "💞", kiss: "💋", hug: "🤗", gift: "🥰", compliment: "😊", deep: "🥹", shade: "😂", argue: "😮‍💨", apologize: "🤝", peace: "🤝", squad: "🤝", swear: "🤝", bribe: "💰", gist: "😱", setup: "😡", receipt: "😱", accuse: "😰", breakup: "🥲" }[act] || "😊";
  if (out === "bad") return { joke: "😑", flirt: "🙅", askout: "💔", kiss: "😠", breakup: "💔", shade: "💢", argue: "💢", accuse: "💢", bribe: "😠", gist: "🙄", setup: "🙄", hug: "✋" }[act] || "🙄";
  return "😐";
}
/** How you take their answer. */
function yourReaction(act, out) {
  if (out === "good") return act === "joke" || act === "askout" || act === "squad" ? "cheer" : LOVE.has(act) ? "heart" : "happy";
  if (out === "bad") return ["argue", "shade", "accuse", "setup"].includes(act) ? "angry" : LOVE.has(act) || act === "breakup" ? "sad" : "sassy";
  return null;
}
const LOUD = new Set(["argue", "shade", "accuse", "kiss", "askout", "breakup"]);
const talkCam = { pos: new THREE.Vector3(), yOff: 0, visible: true };

async function playTalk(L) {
  const h = actors[L.who];
  const staged = h && h.visible && player.visible;
  const prevFocus = camFocusVec, prevZoom = zoomTarget;
  if (staged) {
    const pf = [player.pos.x, player.pos.z], hf = [h.pos.x, h.pos.z];
    player.wantFace = faceTo(pf, hf);
    if (!h.path.length && h.baseAnim !== "sleep") h.wantFace = faceTo(hf, pf);
    // Close-up on the two of you.
    talkCam.pos.set((pf[0] + hf[0]) / 2, 0, (pf[1] + hf[1]) / 2);
    talkCam.yOff = ((player.yOff || 0) + (h.yOff || 0)) / 2;
    camFocusVec = talkCam;
    zoomTarget = Math.min(prevZoom, 3);
  }
  if (L.act === "kiss" && L.out !== "bad") audio.sfx("s_kiss", 0.7);
  else if (L.act === "gift" || L.act === "bribe") audio.sfx("s_cash", 0.6);
  else if (L.out === "bad") audio.sfx("s_ooh", 0.45);
  for (let i = 0; i < L.lines.length; i++) {
    const l = L.lines[i];
    const mine = l.w === "you";
    const a = actorOf(l.w);
    if (a && a.visible) a.gesture(l.anim || (mine ? PLAYER_MOVE[L.act] || "talk" : replyMove(L.act, L.out)), 3.4);
    if (i === L.lines.length - 1 && !mine && staged) {
      // The answer lands: they pop, you react, and anyone nearby turns to look.
      pop(L.who, talkPop(L.act, L.out));
      const mv = yourReaction(L.act, L.out);
      if (mv) setTimeout(() => { if (player.visible && !player.path.length) player.gesture(mv, 2.4); }, 900);
      if (LOUD.has(L.act) && L.out !== "meh") reactNearby(L.who, L.act, L.out);
    } else if (l.mood && !mine && staged) pop(l.w, l.mood === "angry" ? "👀" : l.mood === "happy" ? "😊" : "💭");
    await ui.line(l.w, l.t, { mood: l.mood || (mine ? (LOVE.has(L.act) ? "flirty" : L.out === "bad" && i > 0 ? "angry" : "neutral") : replyMood(L.act, L.out)), fx: i === L.lines.length - 1 ? L.fx : null });
  }
  ui.hideDialog();
  if (staged && camFocusVec === talkCam) { camFocusVec = prevFocus; zoomTarget = prevZoom; }
}

/** Housemates near a loud moment turn and react. */
function reactNearby(who, act, out) {
  const v = app.view;
  if (!v) return;
  const t = actors[who];
  const love = act === "kiss" || act === "askout";
  const pool = v.hm.filter((h) => !h.out && h.id !== who && h.room === v.you.room && h.act !== "sleep" && !h.sc)
    .map((h) => actors[h.id]).filter((a) => a && a.visible && !a.path.length && Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) < 8);
  pool.slice(0, 4).forEach((a, i) => setTimeout(() => {
    if (!a.visible || a.path.length) return;
    a.wantFace = faceTo([a.pos.x, a.pos.z], [(player.pos.x + t.pos.x) / 2, (player.pos.z + t.pos.z) / 2]);
    a.gesture(love ? (out === "good" ? "cheer" : "sassy") : i % 2 ? "wag" : "sassy", 2.8);
    pop(a.id, love ? (out === "good" ? ["😱", "👀", "🙈"][i % 3] : "😬") : ["😮", "🍿", "👀"][i % 3]);
  }, 400 + i * 220));
}

// ------------------------------------------------------------------ reaction pops
const pops = [];
function pop(id, emoji) {
  const a = actorOf(id);
  if (!a || !a.visible || !emoji) return;
  const e = el("div", { class: "rpop", text: emoji });
  tagBox.append(e);
  pops.push({ a, e, t0: performance.now() });
}
function updatePops() {
  const now = performance.now(), w = window.innerWidth, h = window.innerHeight;
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i], k = (now - p.t0) / 1700;
    if (k >= 1 || !p.a.visible) { p.e.remove(); pops.splice(i, 1); continue; }
    p.a.headWorld(tmpV); tmpV.y += 0.45 + k * 0.45; tmpV.project(world.camera);
    const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
    const sc = k < 0.12 ? 0.5 + (k / 0.12) * 0.6 : k < 0.2 ? 1.1 - ((k - 0.12) / 0.08) * 0.1 : 1;
    p.e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${sc.toFixed(2)})`;
    p.e.style.opacity = k > 0.75 ? ((1 - k) / 0.25).toFixed(2) : "1";
  }
}

function checkHeard(v) {
  if (!v.heardId || v.heardId <= lastHeard) return;
  lastHeard = v.heardId;
  const lines = v.heard || [];
  queue(async () => {
    player.gesture("sneak", 5);
    audio.sfx("s_heart", 0.4);
    await ui.line("sys", "You lean in and listen...", {});
    for (const l of lines) await ui.line(l.w, l.t, { mood: "neutral" });
    ui.hideDialog();
  });
}

let talkTarget = null;
/** Nearest housemate in your room. Sticky: keeps the last target while they stay close. */
function nearestHousemate(maxD, sticky) {
  const v = app.view;
  if (!v || !player.visible) return null;
  if (sticky && talkTarget) {
    const h = v.hm.find((z) => z.id === talkTarget);
    const a = actors[talkTarget];
    if (h && !h.out && h.room === v.you.room && a && a.visible && Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) < maxD + 0.6) return h;
  }
  let best = null, bd = maxD;
  for (const h of v.hm) {
    if (h.out || h.room !== v.you.room) continue;
    const a = actors[h.id];
    if (!a || !a.visible) continue;
    const d = Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z);
    if (d < bd) { bd = d; best = h; }
  }
  if (sticky) talkTarget = best ? best.id : null;
  return best;
}
function sceneHere() {
  const v = app.view;
  if (!v || v.you.out) return null;
  return v.scenes.find((sc) => sc.room === v.you.room && !sc.heard) || null;
}

function talkTo(id) {
  const v = app.view;
  if (!v || v.phase !== "ROAM" || v.you.out) return;
  const h = hmOf(v, id);
  const a = actors[id];
  if (!h || h.out || !a) return;
  const d = Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z);
  const open = () => {
    player.wantFace = faceTo([player.pos.x, player.pos.z], [a.pos.x, a.pos.z]);
    ui.openWheel(id, (pick) => act(Object.assign({ t: "talk", who: id }, pick)));
    did.talk = true;
    audio.sfx("s_ping", 0.35);
  };
  if (d <= 2.4) { open(); return; }
  // Walk over first.
  const dx = player.pos.x - a.pos.x, dz = player.pos.z - a.pos.z, l = Math.hypot(dx, dz) || 1;
  const [tx, tz] = world.nearestFree(a.pos.x + (dx / l) * 1.1, a.pos.z + (dz / l) * 1.1);
  player.hurry = true;
  player.walkTo(world, tx, tz, undefined, () => { player.hurry = false; const v2 = app.view; const h2 = hmOf(v2, id); if (h2 && h2.room === v2.you.room && v2.phase === "ROAM") open(); });
}

function listen() {
  const sc = sceneHere();
  const v = app.view;
  if (!sc || !v || v.phase !== "ROAM" || app.busy) return;
  act({ t: "listen", id: sc.id });
  did.listen = true;
}

function rest() {
  const v = app.view;
  if (!v || v.phase !== "ROAM" || v.you.out || app.busy) return;
  if (v.you.room !== "bedroom" && v.you.room !== "gym") { ui.toast("Rest in the Bedroom, or work out in the Gym Corner.", "info"); return; }
  act({ t: "rest" });
  if (v.you.room === "gym") player.gesture("workout", 4);
  else player.gesture("sleep", 3);
}

const EMOTES = ["wave", "cheer", "dance1", "sassy", "happy", "dance2", "heart"];
let emoteI = 0;
function emote() { if (!player.visible) return; player.gesture(EMOTES[emoteI++ % EMOTES.length], 3.5); }

function openShop() {
  const v = app.view;
  if (!v || v.phase !== "ROAM" || v.you.out) return;
  const item = (id, title, cost, text) => el("div", { class: "shopitem" },
    el("div", {}, el("h4", { text: title }), el("p", { class: "muted", text })),
    el("button", { class: "btn", type: "button", disabled: v.you.coins < cost ? "true" : null, onclick: () => { ui.closeModal(); act({ t: "buy", item: id }); audio.sfx("s_cash", 0.6); } }, `🪙 ${cost}`));
  ui.modal("MAMA EYE'S SHOP", el("div", { class: "shop" },
    el("p", { class: "muted", text: `You have ${v.you.coins} coins. Win them in games and tasks, or earn them from missions.` }),
    item("peek", "SNEAK PEEK", 150, "Mama Eye shows you one private Diary Room confession. It goes straight into your Gist Book as a Receipt."),
    item("immunity", "IMMUNITY TOKEN", 800, "Nobody can nominate you this week. Only before Wednesday's nominations.")));
}

// ------------------------------------------------------------------ events
let evKey = null, handledItem = null, stage = null, entryCount = 0, lastItemI = null;
const STAGE_CAM = { arena: [[28.4, 13.2], 5.4], lounge: [[16.8, 4.8], 5.2], kitchen: [[5.6, 7.2], 5.4], diary: [[61.5, 1.9], 3.0], redroom: [[81.4, 2.3], 3.3] };

function processEv(v) {
  const ev = v.ev;
  if (!ev) return;
  const key = `${v.day}:${ev.k}:${ev.n || 0}`;
  if (key !== evKey) {
    evKey = key;
    handledItem = null;
    lastItemI = null;
    const first = ev;
    queue(() => enterEvent(v, first));
  }
  const itemKey = `${key}:${ev.i}`;
  if (itemKey === handledItem) return;
  handledItem = itemKey;
  const jumped = lastItemI !== null && ev.i > lastItemI + 1;
  lastItemI = ev.i;
  if (jumped) queue(() => restage(app.view));
  queue(() => playItem(app.view, app.view.ev));
}

/** After a skip, put everyone where the show now is (entrances that were skipped included). */
function restage(v) {
  if (!v || v.phase !== "EV" || !v.ev) return;
  ui.hideDialog();
  clearBoard();
  const st = v.ev.stageNow || v.ev.stage;
  return cut(() => arrange(st, v, { k: v.ev.k, i: v.ev.i }));
}

function cut(fn) {
  const f = $("#fade");
  return new Promise((res) => {
    f.classList.add("on");
    setTimeout(() => { fn(); setTimeout(() => { f.classList.remove("on"); res(); }, 120); }, 380);
  });
}

async function enterEvent(v, ev) {
  ui.closeWheel(); ui.closeModal(); ui.prompt("");
  player.path = [];
  keys.clear();
  entryCount = 0;
  if (ev.stage === "here") { ui.banner(ev.title || "", null, "small"); arrange("here", v, ev); audio.sfx(ev.title === "WAHALA INCOMING" ? "s_ooh" : "s_ping", 0.5); return; }
  ui.banner(ev.title || ev.k.toUpperCase());
  await cut(() => arrange(ev.i > 0 ? ev.stageNow || ev.stage : ev.stage, v, ev));
}

/** Put everyone on their marks for a stage. */
function arrange(st, v, ev) {
  if (st === "here") {
    // Someone came to you: the house carries on around you.
    stage = "here";
    camMode = "follow";
    camFocusVec = player;
    zoomTarget = 3.4;
    return;
  }
  stage = st;
  for (const [k, l] of Object.entries(world.setLights || {})) l.visible = k === st;
  camMode = "stage";
  const [c, z] = STAGE_CAM[st] || STAGE_CAM.lounge;
  camStage = new THREE.Vector3(c[0], 0.9, c[1]);
  zoomTarget = z;
  camFocusVec = null;
  // This runs under the fade, so cut straight to the new set.
  world.follow(camStage, true);
  world.setZoom(z);
  world.partyMode = ev && ev.k === "party";
  for (const id of AI_IDS) { const a = actors[id]; a.scene = null; a.tkey = null; a.leaving = false; a.oneShot = null; }
  const inHouse = v.hm.filter((h) => !h.out).map((h) => h.id);
  const meIn = !v.you.out;
  const hideAll = () => { for (const k of Object.keys(actors)) { actors[k].visible = false; actors[k].path = []; actors[k].sync(); } };
  if (st === "diary") {
    hideAll();
    if (meIn) { player.visible = true; player.place(STAGE.diary.p[0], STAGE.diary.p[1], STAGE.diary.r); player.baseAnim = "sit"; player.baseY = player.restY("sit", 0.5); player.yOff = player.baseY; player.play("sit"); }
    return;
  }
  if (st === "redroom") {
    hideAll();
    const who = [meIn ? "you" : null, v.you.partner && !hmOf(v, v.you.partner)?.out ? v.you.partner : null].filter(Boolean);
    who.forEach((id, i) => { const a = actorOf(id); const m = STAGE.red[i]; a.visible = true; a.place(m.p[0], m.p[1], m.r); a.baseAnim = "idle"; a.baseY = 0; a.yOff = 0; a.play(i ? "sassy" : "idle"); });
    return;
  }
  if (ev && ev.k === "entry" && ev.i < 2) {
    // Nobody is in the house yet. Dapo opens the show.
    hideAll();
    placeDapo();
    return;
  }
  const order = inHouse.slice();
  if (meIn) order.splice(Math.min(3, order.length), 0, "you");
  const marks = gatherLayout(st, order.length);
  hideAll();
  order.forEach((id, i) => {
    const a = actorOf(id); if (!a) return;
    a.visible = true; a.place(marks[i].p[0], marks[i].p[1], marks[i].r);
    a.baseAnim = world.partyMode ? ["dance1", "dance2", "dance3"][i % 3] : "idle"; a.baseY = 0; a.yOff = 0;
    a.play(a.baseAnim, { offset: Math.random() });
  });
  if (ev && (ev.k === "entry" || ev.k === "live")) placeDapo();
}

function placeDapo() {
  const d = actors.dapo;
  d.visible = true;
  d.place(STAGE.dapo.p[0], STAGE.dapo.p[1], STAGE.dapo.r);
  d.baseAnim = "idle"; d.baseY = world.stageTop || 0.35; d.yOff = d.baseY;
  d.play("idle");
}

const ANIM_CLIP = { cheer: "cheer", angry: "angry", shock: "sad", sad: "sad", kiss: "heart", point: "wag", strut: "strut", dance: "dance1" };
const ANIM_MOOD = { cheer: "happy", angry: "angry", shock: "shock", sad: "sad", kiss: "flirty", point: "angry", strut: "happy", dance: "happy", heart: "flirty", happy: "happy", sassy: "neutral", sneak: "neutral", talk: "neutral", talk2: "neutral", wag: "angry" };
const HOSTS = new Set(["eye", "dapo", "sys", "whisper"]);

async function playItem(v, ev) {
  if (!v || v.phase !== "EV" || !ev || !ev.item) return;
  const it = ev.item;
  if (it.b) {
    const how = await playBeat(v, ev, it.b);
    act({ t: how === "skip" ? "skip" : "next" });
  } else if (it.c) {
    ui.hideDialog();
    clearBoard();
    await sleep(120);
    ui.choice(it.c, (val) => act({ t: "pick", v: val }));
  } else if (it.m) {
    ui.hideDialog();
    clearBoard();
    const score = await runMini(v, it.m);
    act({ t: "score", v: score });
  }
}

const REACT = { shock: ["sad", "wag", "sassy"], cheer: ["cheer", "happy", "wave"], sad: ["sad", "wave"], angry: ["sassy", "wag"], point: ["sassy", "wag"] };
const REACT_POP = { shock: ["😱", "😮", "👀"], cheer: ["👏", "🎉", "🙌"], sad: ["😢", "🥺"], angry: ["😬", "🍿"], point: ["👀", "😬"] };
let beatTok = 0;
/** A couple of housemates react to a big moment, and the camera cuts to one of them. */
function cutIn(b, focusA) {
  const tok = ++beatTok;
  if (!b.focus || !REACT[b.anim] || !focusA || stage === "here" || stage === "diary" || stage === "redroom") return;
  const crowd = present().filter((id) => id !== b.focus && id !== "you").sort(() => Math.random() - 0.5).slice(0, 2);
  crowd.forEach((id, i) => setTimeout(() => {
    if (beatTok !== tok) return;
    const a = actorOf(id); if (!a || !a.visible) return;
    a.wantFace = faceTo([a.pos.x, a.pos.z], [focusA.pos.x, focusA.pos.z]);
    a.gesture(REACT[b.anim][i % REACT[b.anim].length], 3);
    pop(id, REACT_POP[b.anim][i % REACT_POP[b.anim].length]);
  }, 700 + i * 350));
  if (!crowd.length || (b.auto && b.auto < 3000)) return;
  const live = () => beatTok === tok && app.view && app.view.phase === "EV";
  setTimeout(() => { if (live()) { const a = actorOf(crowd[0]); if (a && a.visible) camFocusVec = a; } }, 1500);
  setTimeout(() => { if (live() && focusA.visible) camFocusVec = focusA; }, 2800);
}

async function playBeat(v, ev, b) {
  if (b.stage && b.stage !== stage) await cut(() => arrange(b.stage, v, null));
  if (b.enter) enterActor(b.enter);
  if (b.approach) approachPlayer(b.approach);
  const speaker = HOSTS.has(b.w) ? (b.w === "dapo" ? actors.dapo : null) : actorOf(b.w);
  tagFocus = new Set([b.w, b.focus, b.enter, ...(b.pair || [])].filter(Boolean));
  // Camera: the focus, else the speaker, else the whole stage.
  const focusA = b.focus ? actorOf(b.focus) : null;
  const camOn = (focusA && focusA.visible && focusA) || (b.enter ? null : speaker && speaker.visible ? speaker : null);
  camFocusVec = camOn ? camOn : null;
  if (b.enter) camFocusVec = null;
  zoomTarget = camOn ? (stage === "diary" || stage === "redroom" ? 2.8 : stage === "here" ? 3.2 : 3.8) : (STAGE_CAM[stage] || STAGE_CAM.lounge)[1];
  if (stage === "here" && !camOn) camFocusVec = player;
  // Moves.
  let targets = [];
  if (b.pair) targets = b.pair;
  else if (b.anim === "cheer" && b.out) targets = present().filter((id) => id !== b.out);
  else if (b.focus && HOSTS.has(b.w)) targets = [b.focus];
  else if (!HOSTS.has(b.w) || b.w === "dapo") targets = [b.w];
  else if (b.anim) targets = present();
  if (b.anim) {
    for (const id of targets) {
      const a = actorOf(id); if (!a || !a.visible) continue;
      let clip = ANIM_CLIP[b.anim] || (lib && lib.has(b.anim) ? b.anim : "talk");
      if (b.anim === "dance") clip = ["dance1", "dance2", "dance3"][Math.floor(Math.random() * 3)];
      if (b.anim === "strut" && b.enter === id) continue; // already strutting in
      a.gesture(clip, 4);
    }
  } else if (speaker && speaker.visible) speaker.gesture(Math.random() < 0.5 ? "talk" : "talk2", 3.2);
  if (b.callers) for (const id of b.callers) { const a = actorOf(id); if (a && a.visible) { if (focusA) a.wantFace = faceTo([a.pos.x, a.pos.z], [focusA.pos.x, focusA.pos.z]); a.gesture("wag", 3.5); } }
  if (b.team && v.teams && v.teams[b.team]) for (const id of v.teams[b.team]) { const a = actorOf(id); if (a && a.visible) a.gesture("cheer", 3); }
  // Sound.
  const vo = VO.find(([re]) => re.test(b.t || ""));
  if (vo) audio.voice(vo[1]);
  if (b.anim === "cheer" || b.enter) audio.sfx("s_cheer", b.enter ? 0.35 : 0.55);
  if (b.anim === "shock" || b.missing) audio.sfx("s_gasp", 0.6);
  if (b.anim === "kiss") audio.sfx("s_kiss", 0.7);
  if (b.anim === "angry" && b.pair) audio.sfx("s_ooh", 0.55);
  if (b.votes || b.board) audio.sfx("s_drumroll", 0.6);
  if (b.reveal) audio.sfx("s_heart", 0.6);
  if (b.ledger) audio.sfx("s_cash", 0.6);
  showBoard(b, v);
  cutIn(b, focusA && focusA.visible ? focusA : null);
  const mood = b.anim ? (b.focus && HOSTS.has(b.w) ? "neutral" : ANIM_MOOD[b.anim]) : "neutral";
  const how = await ui.line(b.w, b.t, { mood, sub: b.sub, fx: null, auto: b.auto, skippable: true });
  clearBoard();
  if (b.out) leaveHouse(b.out);
  return how;
}

function present() {
  return [...AI_IDS, "you"].filter((id) => { const a = actorOf(id); return a && a.visible; });
}

function enterActor(id) {
  const a = actorOf(id);
  if (!a) return;
  const marks = gatherLayout("arena", 11);
  const m = marks[Math.min(entryCount, marks.length - 1)];
  entryCount += 1;
  const gate = world.nearestFree(33.6, 16.2);
  a.visible = true;
  a.place(gate[0], gate[1], Math.PI);
  a.baseAnim = "idle"; a.baseY = 0; a.yOff = 0;
  a.speed = 1.6;
  a.walkTo(world, m.p[0], m.p[1], m.r, () => a.gesture("wave", 2.5));
  a.play("strut");
  camFocusVec = a;
  zoomTarget = 4;
}

function approachPlayer(id) {
  const a = actorOf(id);
  if (!a || !player.visible) return;
  if (!a.visible) {
    const v = app.view;
    const [dx, dz] = world.nearestFree(...(ROOM_DOOR[v.you.room] || ROOM_DOOR.lounge));
    a.visible = true; a.place(dx, dz, FACE_CAM);
  }
  const ddx = a.pos.x - player.pos.x, ddz = a.pos.z - player.pos.z, l = Math.hypot(ddx, ddz) || 1;
  const [tx, tz] = world.nearestFree(player.pos.x + (ddx / l) * 1.05, player.pos.z + (ddz / l) * 1.05);
  a.baseAnim = "idle"; a.baseY = 0; a.oneShot = null; a.tkey = null;
  a.hurry = l > 6;
  a.walkTo(world, tx, tz, faceTo([tx, tz], [player.pos.x, player.pos.z]), () => { a.hurry = false; });
  player.path = [];
  player.wantFace = faceTo([player.pos.x, player.pos.z], [tx, tz]);
  player.baseAnim = "idle";
}

function leaveHouse(id) {
  const a = actorOf(id);
  if (!a || !a.visible) return;
  a.leaving = true;
  a.oneShot = null;
  audio.sfx("s_whoosh", 0.5);
  // The house turns to see them off; they wave, then walk out through the gate.
  const crowd = present().filter((k) => k !== id).map(actorOf).filter((o) => o && !o.path.length);
  crowd.forEach((o, i) => {
    o.wantFace = faceTo([o.pos.x, o.pos.z], [a.pos.x, a.pos.z]);
    setTimeout(() => { if (o.visible && !o.path.length) o.gesture(i % 3 === 2 ? "sad" : "wave", 2.8); }, 250 + i * 140);
  });
  a.gesture("wave", 1.6);
  pop(id, "👋");
  const gate = world.nearestFree(33.6, 24.5);
  setTimeout(() => {
    if (!a.leaving) return;
    a.baseAnim = "idle";
    a.walkTo(world, gate[0], gate[1], undefined, () => { a.visible = false; a.leaving = false; a.sync(); });
  }, 1500);
}

function showBoard(b, v) {
  clearBoard();
  let rows = null, title = "";
  if (b.board) { title = "JOLLOF RUSH SCORES"; rows = b.board.map((r) => [r.id, r.sc]); }
  else if (b.votes) { title = "LIVE VOTES"; rows = Object.entries(b.votes).sort((a, c) => c[1] - a[1]).map(([id, n]) => [id, `${n}%`]); }
  else if (b.ledger) { title = "BALOGUN HUSTLE"; rows = Object.entries(b.ledger).map(([t, n]) => [t, "₦" + Number(n).toLocaleString("en-US")]); }
  if (!rows) return;
  const box = el("div", { id: "board", class: "panel" }, el("h4", { text: title }),
    ...rows.map(([id, val], i) => el("div", { class: "brow" + (id === "you" ? " me" : "") + (i === 0 ? " top" : "") },
      el("b", { text: `${i + 1}` }),
      CAST[id] || id === "you" ? el("img", { src: ui.pic(id, i === 0 ? "happy" : "neutral"), alt: "" }) : null,
      el("span", { text: CAST[id] || id === "you" ? nameOf(id) : `TEAM ${id}` }), el("em", { text: String(val) }))));
  ui.root.append(box);
  void v;
}
function clearBoard() { const b = $("#board"); if (b) b.remove(); }

let danceI = 1;
async function runMini(v, m) {
  app.gameOn = true;
  app.gameKind = m.g;
  document.body.classList.add("gaming");
  keys.clear();
  // The dancers in the arena follow the player's rhythm.
  const ctx = {
    ui, audio, view: v, nameOf, portrait: (id, mood) => ui.pic(id, mood),
    onHit(grade) {
      if (m.g !== "dance") return;
      if (grade === "miss") player.gesture("sad", 0.8);
      else if (grade === "move") { danceI = (danceI + 1) % 3; player.setBase(["dance1", "dance2", "dance3"][danceI]); }
    },
  };
  if (m.g === "dance" && player.visible) {
    camFocusVec = player; zoomTarget = 4.2;
    player.setBase("dance2");
    const rival = m.vs ? actorOf(m.vs) : null;
    if (rival && rival.visible) rival.setBase("dance3");
  }
  let score;
  try { score = await playGame(m, ctx); }
  catch (e) { console.error(e); score = m.g === "hustle" ? { profit: 0, skim: 0 } : 0; }
  app.gameOn = false;
  document.body.classList.remove("gaming");
  camFocusVec = null;
  zoomTarget = (STAGE_CAM[stage] || STAGE_CAM.lounge)[1];
  audio.playMusic(musicFor(app.view));
  return score;
}

function exitEvent(v) {
  evKey = null;
  handledItem = null;
  const wasSet = stage === "diary" || stage === "redroom";
  stage = null;
  ui.hideDialog();
  clearBoard();
  world.partyMode = false;
  camMode = "follow";
  camFocusVec = null;
  zoomTarget = baseZoom;
  for (const id of AI_IDS) { actors[id].oneShot = null; actors[id].tkey = null; }
  const back = () => {
    for (const l of Object.values(world.setLights || {})) l.visible = false;
    actors.dapo.visible = false; actors.dapo.sync();
    if (v.you.out) { player.visible = false; player.sync(); return; }
    const inside = player.visible && player.pos.x >= 0 && player.pos.x <= WORLD.w && player.pos.z >= 0 && player.pos.z <= WORLD.d;
    if (!inside) respawn(v.you.room);
    else { player.setBase("idle"); lastRoomSent = v.you.room; }
  };
  if (wasSet) queue(() => cut(() => { back(); syncRoam(app.view, true); }));
  else back();
}

function showEnd(v) {
  if (endShown || !v.result) return;
  endShown = true;
  queue(async () => {
    ui.hideDialog();
    clearBoard();
    await sleep(400);
    ui.recap(v.result, () => app.newSeason());
    audio.sfx("s_cheer", 0.6);
  });
}

// ------------------------------------------------------------------ tags over heads
const tagBox = $("#tags");
function makeTag(a, id) {
  const c = CAST[id] ? CAST[id].color : id === "dapo" ? "#8a3cff" : "#f2b632";
  const t = el("div", { class: "ntag", style: { "--c": c } }, el("i", { class: "ic" }), el("b", { text: id === "pf" || id === "pm" ? "YOU" : id === "dapo" ? "DAPO" : CAST[id].name }));
  t.hidden = true;
  tagBox.append(t);
  a.tag = t;
}
const tmpV = new THREE.Vector3();
let tagFocus = new Set();
function updateTags() {
  const v = app.view;
  const w = window.innerWidth, h = window.innerHeight;
  const roam = v && v.phase === "ROAM";
  const icons = {};
  if (v && v.scenes && roam) for (const sc of v.scenes) { icons[sc.a] = SCENE_ICON[sc.k] || "💬"; }
  // In the house, name only the few people nearest you; elsewhere, only who is talking.
  const named = new Set();
  if (roam && player.visible) {
    AI_IDS.map((id) => [id, actors[id]]).filter(([, a]) => a.visible).map(([id, a]) => [id, Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z)])
      .filter(([, d]) => d < 7).sort((p, q) => p[1] - q[1]).slice(0, 4).forEach(([id]) => named.add(id));
  } else if (roam) for (const id of AI_IDS) named.add(id);
  for (const [id, a] of Object.entries(actors)) {
    const t = a.tag;
    if (!t) continue;
    const isMe = id === "pf" || id === "pm";
    const key = isMe ? "you" : id;
    const hasIcon = !!icons[id];
    const want = roam ? (isMe || named.has(id) || hasIcon) : tagFocus.has(key);
    const show = want && a.visible && !lobbyMode && v && v.phase !== "END";
    if (!show) { if (!t.hidden) t.hidden = true; continue; }
    t.classList.toggle("ic-only", roam && !isMe && !named.has(id));
    a.headWorld(tmpV).project(world.camera);
    const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
    if (x < -60 || x > w + 60 || y < -40 || y > h + 40) { t.hidden = true; continue; }
    t.hidden = false;
    t.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const hm = v && v.hm ? v.hm.find((z) => z.id === id) : null;
    const ic = icons[id] || (hm && hm.act === "sleep" && roam ? "💤" : hm && v.hoh === id ? "👑" : "");
    const icEl = t.firstChild;
    if (icEl.textContent !== ic) icEl.textContent = ic;
  }
}

// ------------------------------------------------------------------ camera
let camMode = "lobby", camStage = new THREE.Vector3(16, 0.9, 8), camFocusVec = null;
let baseZoom = 6, zoomTarget = 6;
const camV = new THREE.Vector3();
function camFocus(a) { return camV.set(a.pos.x, 0.9 + (a.yOff || 0), a.pos.z); }
let lobbyT = 0;
function updateCamera(dt) {
  if (lobbyMode) {
    lobbyT += dt * 0.05;
    const x = 20 + Math.sin(lobbyT) * 8, z = 12 + Math.cos(lobbyT * 0.8) * 5;
    world.follow(camV.set(x, 0.5, z));
    zoomTarget = 9;
  } else if (camFocusVec && camFocusVec.visible !== false) world.follow(camFocus(camFocusVec));
  else if (camMode === "stage") world.follow(camStage);
  else if (spectate) world.follow(spectate);
  else if (player && player.visible) world.follow(camFocus(player));
  // The dialogue box covers the bottom of the screen: aim a little lower so
  // whoever is talking sits above it.
  const lift = app.dialogOpen ? 0.35 * world.zoom : 0;
  dialogLift += (lift - dialogLift) * Math.min(1, dt * 4);
  if (dialogLift > 0.01) world.camTarget.add(camV.set(dialogLift * 0.7071, 0, dialogLift * 0.7071));
  if (Math.abs(world.zoom - zoomTarget) > 0.01) world.setZoom(world.zoom + (zoomTarget - world.zoom) * Math.min(1, dt * 3));
}
let spectate = null, dialogLift = 0;

// ------------------------------------------------------------------ input
const keys = new Set();
const MOVE_KEYS = { w: [-1, -1], arrowup: [-1, -1], s: [1, 1], arrowdown: [1, 1], a: [-1, 1], arrowleft: [-1, 1], d: [1, -1], arrowright: [1, -1] };
const typing = (e) => e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");

window.addEventListener("keydown", (e) => {
  if (typing(e) || !ready) return;
  const k = e.key.toLowerCase();
  if (k === "tab") e.preventDefault();
  if (e.key === "Escape") {
    if ($("#wheel")) ui.closeWheel();
    else if ($("#modal")) ui.closeModal();
    else if (!app.dialogOpen && !app.choiceOpen && !app.gameOn && app.view && app.view.phase !== "LOBBY") ui.pause();
    return;
  }
  if (app.dialogOpen || app.choiceOpen || app.gameOn || menuShown) return;
  const v = app.view;
  if (!v || v.phase === "LOBBY" || v.phase === "END") return;
  if (MOVE_KEYS[k]) { if (!app.modalOpen) { keys.add(k); e.preventDefault(); } return; }
  if (app.modalOpen) {
    if ((k === "j" && $("#modal .book")) || k === "tab") ui.closeModal();
    return;
  }
  if (v.phase !== "ROAM") return;
  switch (k) {
    case "e": { const h = nearestHousemate(2.6, true); if (h) talkTo(h.id); break; }
    case "l": listen(); break;
    case "j": ui.openBook(); break;
    case "tab": ui.openTea(); break;
    case "f": app.fastForward(); break;
    case "q": emote(); break;
    case "r": rest(); break;
    case "b": openShop(); break;
    case "h": doThing("chores"); break;
    case "c": doThing("cook"); break;
    case "n": doThing("snoop"); break;
    case "p": doThing("prank"); break;
    case "=": case "+": baseZoom = Math.max(4, baseZoom - 1); zoomTarget = baseZoom; break;
    case "-": case "_": baseZoom = Math.min(12, baseZoom + 1); zoomTarget = baseZoom; break;
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

const canvas = $("#c");
canvas.addEventListener("wheel", (e) => {
  if (!app.view || app.view.phase !== "ROAM") return;
  e.preventDefault();
  baseZoom = Math.max(4, Math.min(12, baseZoom + Math.sign(e.deltaY) * 0.6));
  zoomTarget = baseZoom;
}, { passive: false });

let down = null;
canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
  down = null;
  if (moved > 10 || dt > 600) return;
  tap(e.clientX, e.clientY);
});
const ray = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
function tap(cx, cy) {
  const v = app.view;
  if (!ready || !v || v.phase !== "ROAM" || app.modalOpen || app.dialogOpen || app.choiceOpen || app.gameOn) return;
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, world.camera);
  const hits = ray.intersectObjects(AI_IDS.map((id) => actors[id]).filter((a) => a.visible && a.hit).map((a) => a.hit), false);
  if (hits.length && !v.you.out) { talkTo(hits[0].object.userData.actor); return; }
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(ground, p)) return;
  if (v.you.out) { spectate = new THREE.Vector3(p.x, 0.9, p.z); return; }
  if (p.x < 0 || p.z < 0 || p.x > WORLD.w || p.z > WORLD.d) return;
  const [x, z] = world.nearestFree(p.x, p.z);
  player.walkTo(world, x, z);
  did.move = true;
  ripple(cx, cy);
}
function ripple(x, y) {
  const r = el("div", { class: "ripple", style: { left: x + "px", top: y + "px" } });
  document.body.append(r);
  setTimeout(() => r.remove(), 600);
}

document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("#prompt [data-a]");
  if (!b) return;
  const a = b.dataset.a;
  if (a === "talk") talkTo(b.dataset.id);
  else if (a === "listen") listen();
  else if (a === "rest") rest();
  else if (a === "do") doThing(b.dataset.w);
});

// Player movement: screen-relative WASD with wall sliding.
let lastRoomSent = null;
function movePlayer(dt) {
  const v = app.view;
  if (!v || v.phase !== "ROAM" || !player) return;
  let dx = 0, dz = 0;
  for (const k of keys) { const m = MOVE_KEYS[k]; if (m) { dx += m[0]; dz += m[1]; } }
  if (v.you.out) {
    if (dx || dz) { spectate = spectate || new THREE.Vector3(player.pos.x || 18, 0.9, player.pos.z || 12); const l = Math.hypot(dx, dz); spectate.x = Math.max(0, Math.min(WORLD.w, spectate.x + (dx / l) * 9 * dt)); spectate.z = Math.max(0, Math.min(WORLD.d, spectate.z + (dz / l) * 9 * dt)); }
    return;
  }
  if (dx || dz) {
    const l = Math.hypot(dx, dz);
    const sp = 3.1 * dt;
    const nx = player.pos.x + (dx / l) * sp, nz = player.pos.z + (dz / l) * sp;
    player.path = [];
    if (world.walkable(nx, nz)) { player.pos.x = nx; player.pos.z = nz; }
    else if (world.walkable(nx, player.pos.z)) player.pos.x = nx;
    else if (world.walkable(player.pos.x, nz)) player.pos.z = nz;
    player.wantFace = Math.atan2(dx, dz);
    player.yOff = 0;
    player.oneShot = null;
    if (player.anim !== "walk") player.play("walk", { speed: 1.35 });
    player.moving = true;
    did.move = true;
  } else if (player.moving) {
    player.moving = false;
    if (!player.path.length) { player.baseAnim = "idle"; player.play("idle"); }
  }
  player.speed = 2.8;
  // Tell the server when you change rooms.
  const room = roomAt(player.pos.x, player.pos.z);
  if (room !== v.you.room && room !== lastRoomSent && !app.busy) {
    if (room === "hoh" && !(v.you.hoh || v.you.tenant)) return;
    lastRoomSent = room;
    act({ t: "room", room });
  }
  if (room === v.you.room) lastRoomSent = room;
}

let promptT = 0;
// [action, key, label, rooms, per day]; the server has the same limits.
const DO_LIST = [
  ["chores", "h", "DO CHORES", ["kitchen", "lounge"], 3],
  ["cook", "c", "COOK FOR THE HOUSE", ["kitchen"], 1],
  ["snoop", "n", "SNOOP", ["bedroom"], 2],
  ["prank", "p", "PRANK SOMEONE", ["lounge", "garden", "kitchen"], 1],
];
const DO_MOVE = { chores: "talk2", cook: "talk2", snoop: "sneak", prank: "happy" };
function doThing(what) {
  const v = app.view;
  if (!v || v.phase !== "ROAM" || v.you.out || app.busy) return;
  const d = DO_LIST.find((x) => x[0] === what);
  if (!d || !d[3].includes(v.you.room)) return;
  act({ t: "do", what });
  did.doing = true;
  player.gesture(DO_MOVE[what] || "talk2", 3.5);
  audio.sfx(what === "cook" ? "s_sizzle" : what === "prank" ? "s_whoosh" : "s_ping", 0.4);
}
function updatePrompt(dt) {
  promptT += dt;
  if (promptT < 0.2) return;
  promptT = 0;
  const v = app.view;
  if (!v || v.phase !== "ROAM" || app.modalOpen || app.dialogOpen || app.choiceOpen) { ui.prompt(""); return; }
  if (v.you.out) { ui.prompt(`<span class="pl">YOU ARE WATCHING FROM HOME. Tap or use WASD to look around.</span>`); return; }
  const parts = [];
  const h = nearestHousemate(2.6, true);
  if (h) parts.push(`<button type="button" data-a="talk" data-id="${h.id}"><kbd>E</kbd> TALK TO ${h.name.toUpperCase()}</button>`);
  const sc = sceneHere();
  if (sc) {
    const A = nameOf(sc.a), B = nameOf(sc.b);
    const what = { whisper: `${A} & ${B} are whispering`, flirt: `${A} & ${B} are flirting`, argue: `${A} & ${B} are arguing`, kiss: `${A} & ${B} are getting close`, chat: `${A} & ${B} are bonding`, cry: `${A} is crying to ${B}` }[sc.k] || `${A} & ${B} are talking`;
    parts.push(`<button type="button" data-a="listen" class="hot"><kbd>L</kbd> LISTEN: ${what}</button>`);
  }
  if (v.you.room === "bedroom" || v.you.room === "gym") parts.push(`<button type="button" data-a="rest"><kbd>R</kbd> ${v.you.room === "gym" ? "WORK OUT" : "REST"}</button>`);
  // Free things to do in this room (no energy needed).
  const dn = v.you.doings || {};
  const someone = v.hm.some((h) => !h.out && h.room === v.you.room && h.act !== "sleep");
  for (const [what, key, label, rooms, max] of DO_LIST) {
    if (!rooms.includes(v.you.room) || (dn[what] || 0) >= max) continue;
    if (what === "prank" && !someone) continue;
    parts.push(`<button type="button" data-a="do" data-w="${what}" class="do"><kbd>${key.toUpperCase()}</kbd> ${label}</button>`);
  }
  ui.prompt(parts.join(""));
}

// ------------------------------------------------------------------ hints
// One tip at a time, shown when it becomes useful, gone once you've done it.
const did = { move: false, talk: false, listen: false, book: false, tea: false, ff: false, gist: false, doing: false };
let hintsSeen = {};
try { hintsSeen = JSON.parse(localStorage.getItem("wh:hints") || "{}"); } catch {}
const HINTS = [
  { id: "move", text: "Walk with WASD or the arrow keys, or tap the floor.", when: () => true, done: () => did.move },
  { id: "talk", text: "Walk up to a housemate and press E, or tap them, to talk.", when: () => !!nearestHousemate(5), done: () => did.talk },
  { id: "listen", text: "Someone is talking nearby. Press L to listen in: what you hear becomes a Receipt.", when: () => !!sceneHere(), done: () => did.listen },
  { id: "gist", text: "Drama alert! Tap a HOT GIST item on the left to run straight there.", when: (v) => v.scenes.some((sc) => sc.k === "argue" || sc.k === "kiss"), done: () => did.gist },
  { id: "energy", text: "Every move costs Social Energy. You get 10 a day, so spend it on the people who matter.", when: () => did.talk, ms: 7000 },
  { id: "book", text: "You have a Receipt! Press J to open your Gist Book.", when: (v) => v.gb.some((g) => g.k === "receipt"), done: () => did.book },
  { id: "tea", text: "Press TAB for the Tea Board: how every housemate feels about you.", when: (v) => v.day >= 1, done: () => did.tea },
  { id: "doing", text: "Things to do that cost no energy: chores for coins, cooking for the house, snooping in the bedroom. Look for the buttons at the bottom.", when: (v) => v.day >= 1 && ["kitchen", "bedroom", "lounge"].includes(v.you.room), done: () => did.doing },
  { id: "ff", text: "Out of energy or waiting? Press F to skip ahead to the next show.", when: (v) => v.you.energy <= 3 || v.min >= 1380, done: () => did.ff },
];
let hintNow = null, hintSince = 0, hintT = 0;
function markHint(id) { hintsSeen[id] = 1; try { localStorage.setItem("wh:hints", JSON.stringify(hintsSeen)); } catch {} }
function updateHints(dt) {
  hintT += dt;
  if (hintT < 0.5) return;
  hintT = 0;
  const v = app.view;
  const quiet = !v || v.phase !== "ROAM" || v.you.out || app.modalOpen || app.dialogOpen || app.choiceOpen || app.gameOn;
  if (hintNow) {
    const h = HINTS.find((x) => x.id === hintNow);
    const finished = (h.done && h.done(v)) || (h.ms && performance.now() - hintSince > h.ms);
    if (finished) { markHint(h.id); hintNow = null; ui.hint(""); return; }
    if (quiet) ui.hint("");
    else ui.hint(h.text);
    return;
  }
  if (quiet) return;
  for (const h of HINTS) {
    if (hintsSeen[h.id]) continue;
    if (h.done && h.done(v)) { markHint(h.id); continue; }
    if (h.when(v)) { hintNow = h.id; hintSince = performance.now(); ui.hint(h.text); audio.sfx("s_ping", 0.25); return; }
  }
}

// ------------------------------------------------------------------ clock
let tickAcc = 0;
const TICK_SECS = 5;
function clockTick(dt) {
  const v = app.view;
  if (!v || v.phase !== "ROAM" || app.busy || app.modalOpen || app.dialogOpen || app.choiceOpen || app.gameOn || document.hidden) return;
  tickAcc += dt;
  if (tickAcc >= TICK_SECS) { tickAcc = 0; act({ t: "tick" }); }
}
setInterval(() => { if (app.busy && performance.now() - (app.busyAt || 0) > 8000) app.busy = false; }, 2000);

// ------------------------------------------------------------------ frame
const clock = new THREE.Clock();
let shownMin = 660, lightT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (!world) return;
  const now = performance.now();
  if (ready) {
    movePlayer(dt);
    for (const a of Object.values(actors)) if (a.visible || a.path.length) a.update(dt, now);
    animateScenes(dt);
    clockTick(dt);
    updatePrompt(dt);
    updateHints(dt);
  }
  updateCamera(dt);
  const v = app.view;
  const target = v && v.min ? v.min : 660;
  if (Math.abs(target - shownMin) > 180) shownMin = target;
  else shownMin += (target - shownMin) * Math.min(1, dt * 1.5);
  lightT += dt;
  if (lightT > 0.2) { lightT = 0; world.dark = !!(v && v.dark); world.setTime(stage === "arena" && v && v.ev && ["live", "party", "entry"].includes(v.ev.k) ? Math.max(shownMin, 1260) : shownMin, world.partyMode); }
  world.update(dt, t);
  // A full-screen mini-game hides the house: don't pay to draw it.
  const covered = app.gameOn && app.gameKind !== "dance";
  if (!covered) world.render();
  if (ready && !covered) { updateTags(); updatePops(); }
  if (!covered) adaptQuality(dt);
}

// Weak devices: drop pixel ratio, then shadows, if we can't hold ~30 fps.
const HQ = params.has("hq");
let qAcc = 0, qFrames = 0, qLevel = 0;
function adaptQuality(dt) {
  if (HQ || qLevel >= 2 || !ready) return;
  qAcc += dt; qFrames += 1;
  if (qAcc < 4) return;
  const fps = qFrames / qAcc;
  qAcc = 0; qFrames = 0;
  if (fps >= 28) return;
  qLevel += 1;
  if (qLevel === 1) { world.renderer.setPixelRatio(1); world.resize(); }
  else {
    world.renderer.shadowMap.enabled = false;
    world.scene.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
  }
  console.info("quality level", qLevel, "fps", fps.toFixed(1));
}

boot().catch((e) => {
  console.error(e);
  const u = $("#ui");
  if (u) u.append(el("div", { class: "fatal" }, "Wahala House could not start: " + (e && e.message ? e.message : e)));
});
