/**
 * Oathbreakers client. The server (src/logic.js) is authoritative: this file
 * only renders the `view` it receives and sends intents back as actions.
 * Assets (portraits, videos, voices, music) are Higgsfield CDN URLs in assets.js.
 */
import { A } from "./assets.js";

// ── net ────────────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);

function playerId() {
  const key = "hf:game:playerId";
  let id = null;
  try { id = localStorage.getItem(key); } catch {}
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(key, id); } catch {}
  }
  return id;
}

/** Every browser gets its own private season (room), unless ?room= says otherwise. */
const room = (params.get("room") || `s-${playerId()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60) || "main";

let socket = null;
let retry = 0;

function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(room)}`);
  socket.addEventListener("open", () => { retry = 0; send({ type: "join", playerId: playerId() }); });
  socket.addEventListener("message", (event) => {
    if (event.data === "__pong") return;
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === "state") onState(msg);
    else if (msg.type === "error") toast(msg.error);
  });
  socket.addEventListener("close", () => {
    retry = Math.min(retry + 1, 6);
    setTimeout(connect, 500 * 2 ** (retry - 1));
  });
  setInterval(() => { if (socket && socket.readyState === 1) socket.send("__ping"); }, 25000);
}

function send(msg) {
  if (socket && socket.readyState === 1) socket.send(JSON.stringify(msg));
}
const act = (action) => { busy = true; send({ type: "action", action }); };

// ── dom helpers ────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}
/** Render text with *stage directions* as italics, never as markup. */
function rich(text) {
  const frag = document.createDocumentFragment();
  String(text || "").split(/(\*[^*]+\*)/g).forEach((part) => {
    if (!part) return;
    if (part.startsWith("*") && part.endsWith("*")) frag.append(el("em", { text: part.slice(1, -1) }));
    else frag.append(document.createTextNode(part));
  });
  return frag;
}
let toastTimer = 0;
function toast(msg) {
  const t = $("#toast");
  t.textContent = String(msg).toUpperCase();
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  busy = false;
}
function flash() { const f = $("#flash"); f.classList.add("on"); setTimeout(() => f.classList.remove("on"), 450); }

// ── cast data (display only) ───────────────────────────────────────────────

const CAST = {
  ada: { name: "Ada", full: "Adaeze \"Ada\" Okonkwo", from: "Lagos, Nigeria", fame: "Star of the TV crime hit Inspector Ada", line: "Case closed. It's you." },
  rafa: { name: "Rafa", full: "Rafael \"Rafa\" Duarte", from: "Sao Paulo, Brazil", fame: "Superstar striker", line: "I would never. On my mother!" },
  minseo: { name: "Min-seo", full: "Han Min-seo", from: "Seoul, South Korea", fame: "K-pop group center", line: "I noticed something. Maybe it's nothing." },
  celia: { name: "Celia", full: "Dame Celia Hartwell", from: "London, UK", fame: "Legendary Shakespearean actress", line: "Darling, I have lied for a living for fifty years." },
  marcus: { name: "Marcus", full: "Marcus Vale", from: "Los Angeles, USA", fame: "Late-night talk show host", line: "Hey, hey, can we all just take a breath?" },
  marisol: { name: "Marisol", full: "Marisol Ibarra", from: "Oaxaca, Mexico", fame: "Beloved TV chef", line: "Sit. Eat. Then tell me the truth." },
  kenji: { name: "Kenji", full: "Kenji Moriyama", from: "Osaka, Japan", fame: "Las Vegas illusionist", line: "Watch the left hand. Always the left hand." },
  tomas: { name: "Tomas", full: "Tomas Lindqvist", from: "Stockholm, Sweden", fame: "Chess grandmaster turned poker champion", line: "Emotion is noise. Votes are data." },
  zara: { name: "Zara", full: "Zara Haddad", from: "Beirut / Paris", fame: "Supermodel turned designer", line: "I don't dislike you. I just don't think about you." },
  kwame: { name: "Kwame", full: "Kwame Mensah", from: "Accra / London", fame: "Arena-tour stand-up comedian", line: "I'm joking... unless?" },
  tayla: { name: "Tayla", full: "Tayla Brooks", from: "Gold Coast, Australia", fame: "Olympic swimming champion", line: "Mate, I literally can't lie. Look at my face." },
};
const FAMES = ["ACTOR", "MUSICIAN", "ATHLETE", "INFLUENCER", "CHEF", "COMEDIAN"];
const FLAVOR = [
  "Someone at this table is lying.",
  "The candles never lie. People do.",
  "Gold for the loyal. Everything for the traitor.",
  "Smile at breakfast. Vote at dinner.",
];

// ── assets ─────────────────────────────────────────────────────────────────

const img = (k) => (A.img && A.img[k]) || "";
const vid = (k) => (A.vid && A.vid[k]) || "";
const aud = (k) => (A.aud && A.aud[k]) || "";

function hostKey(day, final) {
  if (final || day >= 5) return 5;
  return Math.max(0, day | 0);
}
function portrait(id, emo) {
  if (id === "laird") return img(`host_${hostKey(view ? view.day : 0, view && view.final)}`);
  if (id === "you") return img(`av_${view && view.you ? view.you.av : 0}`);
  const e = { suspicious: "suspicious", shocked: "shocked", smug: "smug", delight: "smug" }[emo] || "neutral";
  return img(`${id}_${e}`) || img(`${id}_neutral`);
}
function nameOf(id) {
  if (id === "laird") return "THE LAIRD";
  if (id === "you") return view && view.you ? view.you.name : "YOU";
  if (CAST[id]) return CAST[id].name;
  const r = view && view.roster ? view.roster.find((p) => p.id === id) : null;
  return r ? r.name : id;
}

// ── audio ──────────────────────────────────────────────────────────────────

let soundOn = true;
try { soundOn = localStorage.getItem("ob:sound") !== "off"; } catch {}
let unlocked = false;
const music = { key: null, el: null };
let voiceEl = null;

function fadeTo(a, target, ms, done) {
  const from = a.volume;
  const t0 = performance.now();
  function step(t) {
    const k = Math.min(1, (t - t0) / ms);
    a.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k < 1) requestAnimationFrame(step); else if (done) done();
  }
  requestAnimationFrame(step);
}
const MUSIC_VOL = 0.28;
function playMusic(key) {
  if (!key || music.key === key) return;
  const url = aud(`m_${key}`);
  const old = music.el;
  music.key = key;
  if (old) fadeTo(old, 0, 900, () => old.pause());
  if (!url) { music.el = null; return; }
  const a = new Audio(url);
  a.loop = !key.startsWith("sting");
  a.volume = 0;
  music.el = a;
  if (soundOn && unlocked) { a.play().catch(() => {}); fadeTo(a, MUSIC_VOL, 1200); }
}
function sfx(key, vol = 0.55) {
  if (!soundOn || !unlocked) return;
  const url = aud(`s_${key}`);
  if (!url) return;
  const a = new Audio(url);
  a.volume = vol;
  a.play().catch(() => {});
}
function voice(key) {
  if (voiceEl) { voiceEl.pause(); voiceEl = null; }
  if (!soundOn || !unlocked || !key) return;
  if (key.startsWith("sfx_")) { sfx(key.slice(4)); return; }
  const url = aud(key);
  if (!url) return;
  const a = new Audio(url);
  a.volume = 0.95;
  voiceEl = a;
  if (music.el) fadeTo(music.el, 0.08, 250);
  a.addEventListener("ended", () => { if (music.el && voiceEl === a) fadeTo(music.el, MUSIC_VOL, 600); });
  a.play().catch(() => {});
}
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  if (music.el && soundOn) { music.el.play().catch(() => {}); fadeTo(music.el, MUSIC_VOL, 1200); }
}
function setSound(on) {
  soundOn = on;
  try { localStorage.setItem("ob:sound", on ? "on" : "off"); } catch {}
  $("#hudSound").textContent = on ? "♪" : "✕";
  if (music.el) { if (on && unlocked) { music.el.play().catch(() => {}); fadeTo(music.el, MUSIC_VOL, 400); } else music.el.pause(); }
  if (!on && voiceEl) voiceEl.pause();
}

// ── background ─────────────────────────────────────────────────────────────

let bgKey = null;
function setBg(key) {
  if (!key || key === bgKey) return;
  bgKey = key;
  const im = $("#bgImg");
  const v = $("#bgVid");
  const loop = vid(`loop_${key}`);
  im.classList.remove("on");
  v.classList.remove("on");
  const url = img(`bg_${key}`);
  setTimeout(() => {
    if (url) { im.src = url; im.onload = () => im.classList.add("on"); }
    if (loop) {
      v.src = loop;
      v.play().then(() => v.classList.add("on")).catch(() => {});
    } else { v.removeAttribute("src"); v.load(); }
  }, 250);
}

// ── dialogue player ────────────────────────────────────────────────────────

let dlg = null; // { lines, i, typing, done, token }
let typeTimer = 0;

function showLine(ln) {
  const box = $("#dialog");
  box.hidden = false;
  const p = $("#dlgPortrait");
  const text = $("#dlgText");
  const name = $("#dlgName");
  if (ln.w === "narr") {
    p.classList.add("none");
    name.textContent = "";
    text.classList.add("narr");
  } else {
    p.classList.remove("none");
    p.querySelector("img").src = portrait(ln.w, ln.e);
    name.textContent = nameOf(ln.w).toUpperCase();
    text.classList.remove("narr");
  }
  voice(ln.v);
  // Typewriter: reveal characters, keep stage directions as italics at the end.
  const full = String(ln.t || "");
  let n = 0;
  dlg.typing = true;
  clearInterval(typeTimer);
  const speed = full.length > 140 ? 12 : 18;
  typeTimer = setInterval(() => {
    n += 2;
    text.replaceChildren(rich(full.slice(0, n).replace(/\*[^*]*$/, "")));
    if (n >= full.length) { clearInterval(typeTimer); dlg.typing = false; text.replaceChildren(rich(full)); }
  }, speed);
}

function playLines(lines, onDone, opts = {}) {
  clearInterval(typeTimer);
  const token = {};
  dlg = { lines: lines || [], i: 0, typing: false, done: onDone, token, onLine: opts.onLine };
  if (!dlg.lines.length) { $("#dialog").hidden = true; const d = dlg; dlg = null; if (onDone) onDone(); return token; }
  if (dlg.onLine) dlg.onLine(dlg.lines[0], 0);
  showLine(dlg.lines[0]);
  return token;
}
function advance() {
  if (!dlg) return;
  if (dlg.typing) {
    clearInterval(typeTimer);
    dlg.typing = false;
    $("#dlgText").replaceChildren(rich(dlg.lines[dlg.i].t));
    return;
  }
  dlg.i += 1;
  if (dlg.i >= dlg.lines.length) {
    const done = dlg.done;
    dlg = null;
    $("#dialog").hidden = true;
    if (done) done();
    return;
  }
  if (dlg.onLine) dlg.onLine(dlg.lines[dlg.i], dlg.i);
  showLine(dlg.lines[dlg.i]);
}
function cancelDialog() { dlg = null; clearInterval(typeTimer); $("#dialog").hidden = true; }
$("#dialog").addEventListener("click", () => advance());

// ── state + rendering ──────────────────────────────────────────────────────

let view = null;
let lastSig = "";
let busy = false;
let seen = { k: null, lines: [] }; // for log scenes: which lines were already played
const scene = $("#scene");

function onState(msg) {
  view = msg.view || { phase: "LOBBY", sc: { k: "LOBBY" } };
  busy = false;
  updateHud();
  const sig = `${view.phase}|${view.day}|${JSON.stringify(view.sc)}`;
  if (sig === lastSig) return;
  lastSig = sig;
  if (!unlocked && view.phase !== "LOBBY") return resumeSplash();
  renderScene();
}

function resumeSplash() {
  cancelDialog();
  scene.className = "";
  setBg("exterior");
  scene.replaceChildren(el("div", { class: "stack center" },
    el("h1", { class: "title", text: "OATHBREAKERS" }),
    el("p", { class: "subtitle", text: "YOUR SEASON IS WAITING" }),
    el("div", { class: "row" }, el("button", { class: "btn", text: "CONTINUE SEASON", onclick: () => { unlockAudio(); renderScene(); } }),
      el("button", { class: "btn ghost", text: "NEW SEASON", onclick: () => { unlockAudio(); send({ type: "reset" }); } })),
  ));
}

function updateHud() {
  const hud = $("#hud");
  if (!view || view.phase === "LOBBY") { hud.hidden = true; return; }
  hud.hidden = false;
  const d = view.day;
  const label = {
    INTRO: "ARRIVAL", ROLE: "ARRIVAL", BREAKFAST: `DAY ${d} - BREAKFAST`, M_INTRO: `DAY ${d} - MISSION`, M_PLAY: `DAY ${d} - MISSION`,
    M_RESULT: `DAY ${d} - MISSION`, GALLERY: `DAY ${d} - THE GALLERY`, RT: `DAY ${d} - THE ROUND TABLE`, VOTE: `DAY ${d} - THE ROUND TABLE`,
    REVEAL: `DAY ${d} - THE ROUND TABLE`, EXILE: `DAY ${d} - THE ROUND TABLE`, NIGHT: `DAY ${d} - NIGHT`, TOWER: `DAY ${d} - NIGHT`,
    OFFER: `DAY ${d} - NIGHT`, LC: "THE LAST CANDLE", LC_RESULT: "THE LAST CANDLE", OUT: "OUT OF THE GAME", FINALE: "FINALE",
  }[view.phase] || "";
  $("#hudPhase").textContent = view.final && ["RT", "VOTE", "REVEAL", "EXILE"].includes(view.phase) ? "THE LAST CANDLE" : label;
  $("#hudPot").textContent = `POT: ${Number(view.pot || 0).toLocaleString("en-US")} GOLD`;
  $("#hudLeft").textContent = `${view.left} REMAIN`;
  $("#hudShield").hidden = !(view.you && view.you.shield);
  const dg = view.you && view.you.dagger;
  $("#hudDagger").hidden = !dg;
  if (dg) $("#hudDagger").textContent = `DAGGER: ${dg} ROUND TABLE${dg > 1 ? "S" : ""} LEFT`;
  peek(false);
}
function peek(on) {
  const b = $("#hudRole");
  b.classList.remove("S", "O");
  if (on && view && view.you) {
    b.textContent = view.you.role === "O" ? "OATHBREAKER" : "SWORN";
    b.classList.add(view.you.role);
  } else b.textContent = matchMedia("(max-width: 640px)").matches ? "HOLD: ROLE" : "HOLD R TO PEEK";
}

function renderScene() {
  cancelDialog();
  closeOverlay();
  const sc = view.sc || { k: "LOBBY" };
  scene.className = "";
  scene.scrollTop = 0;
  if (sc.bg) setBg(sc.bg);
  if (sc.music) playMusic(sc.music);
  const fn = RENDER[sc.k] || RENDER.LOBBY;
  fn(sc);
}

// Small building blocks
function actions(...btns) { return el("div", { class: "row", style: "margin-top:14px" }, ...btns); }
function nextBtn(label) {
  return el("button", { class: "btn", text: label || "CONTINUE", onclick: (e) => { if (busy) return; e.currentTarget.disabled = true; act({ t: "next" }); } });
}
function peopleGrid(ids, opts = {}) {
  const grid = el("div", { class: "people" });
  for (const id of ids) {
    const r = view.roster.find((p) => p.id === id);
    const card = el("button", {
      class: `person${opts.selected === id ? " sel" : ""}${r && !r.alive ? " dead" : ""}`, type: "button",
      onclick: () => opts.onPick && opts.onPick(id, card),
    }, el("img", { src: portrait(id, opts.emo && opts.emo[id]), alt: "", onerror: (e) => { e.target.style.visibility = "hidden"; } }), el("span", { class: "nm", text: nameOf(id).toUpperCase() }));
    const role = r && r.role && !r.human ? r.role : null;
    if (role && opts.showRoles !== false) card.append(el("span", { class: `tag ${role}`, text: role === "O" ? "OATHBREAKER" : "SWORN" }));
    if (opts.votes && opts.votes[id]) card.append(el("span", { class: "votes", text: `×${opts.votes[id]}` }));
    grid.append(card);
  }
  return grid;
}
function selectIn(grid, card) {
  for (const c of grid.querySelectorAll(".person")) c.classList.remove("sel");
  card.classList.add("sel");
}
function logView(lines) {
  const box = el("div", { class: "log" });
  for (const ln of lines) box.append(logLine(ln));
  requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  return box;
}
function logLine(ln) {
  const cls = `ln${ln.w === "narr" ? " narr" : ""}${ln.w === "you" ? " you" : ""}`;
  const row = el("div", { class: cls });
  if (ln.w !== "narr") row.append(el("img", { src: portrait(ln.w, ln.e), alt: "" }));
  const body = el("div", {}, ln.w !== "narr" ? el("div", { class: "who", text: nameOf(ln.w).toUpperCase() }) : null, el("div", { class: "txt" }, rich(ln.t)));
  row.append(body);
  return row;
}
/** Lines in a log scene that have not been played yet. */
function unseen(sc) {
  const key = `${view.phase}|${view.day}`;
  if (seen.k !== key) seen = { k: key, lines: [] };
  const prev = seen.lines.map((l) => JSON.stringify(l));
  const fresh = [];
  const pool = prev.slice();
  for (const ln of sc.lines || []) {
    const s = JSON.stringify(ln);
    const i = pool.indexOf(s);
    if (i >= 0) pool.splice(i, 1); else fresh.push(ln);
  }
  seen.lines = (sc.lines || []).slice();
  return fresh;
}

// ── scenes ─────────────────────────────────────────────────────────────────

const RENDER = {};

RENDER.LOBBY = () => {
  playMusic("theme");
  setBg("exterior");
  scene.className = "menu";
  let name = "";
  let av = 0;
  let fame = "ACTOR";
  let fate = "random";
  try {
    name = localStorage.getItem("ob:name") || "";
    av = Number(localStorage.getItem("ob:av") || 0) || 0;
    fame = localStorage.getItem("ob:fame") || "ACTOR";
  } catch {}
  const nameIn = el("input", { type: "text", placeholder: "Your name, contestant", maxlength: "16", value: name });
  const avWrap = el("div", { class: "avatars" });
  for (let i = 0; i < 6; i++) {
    const b = el("button", { class: `avatar${i === av ? " sel" : ""}`, type: "button", onclick: () => { av = i; for (const x of avWrap.children) x.classList.remove("sel"); b.classList.add("sel"); } }, el("img", { src: img(`av_${i}`), alt: `Avatar ${i + 1}` }));
    avWrap.append(b);
  }
  const pills = (vals, cur, set, labels) => {
    const w = el("div", { class: "pills" });
    vals.forEach((v, i) => {
      const b = el("button", { class: `pill${v === cur ? " sel" : ""}`, type: "button", text: labels ? labels[i] : v, onclick: () => { set(v); for (const x of w.children) x.classList.remove("sel"); b.classList.add("sel"); } });
      w.append(b);
    });
    return w;
  };
  const flavor = el("p", { class: "flavor", text: FLAVOR[0] });
  let fi = 0;
  const flavTimer = setInterval(() => {
    if (!flavor.isConnected) return clearInterval(flavTimer);
    fi = (fi + 1) % FLAVOR.length;
    flavor.style.opacity = 0;
    setTimeout(() => { flavor.textContent = FLAVOR[fi]; flavor.style.opacity = 1; }, 400);
  }, 3600);
  const start = el("button", {
    class: "btn", text: "ENTER THE CASTLE", onclick: () => {
      const n = nameIn.value.trim();
      if (n.length < 2) return toast("Your name needs at least 2 characters");
      try { localStorage.setItem("ob:name", n); localStorage.setItem("ob:av", String(av)); localStorage.setItem("ob:fame", fame); } catch {}
      unlockAudio();
      sfx("door");
      act({ t: "start", name: n, av, fame, fate, seed: Math.floor(Math.random() * 2147483647) });
    },
  });
  scene.replaceChildren(el("div", { class: "menu-wrap" },
    el("div", { class: "center", style: "margin-top:4vh" },
      el("h1", { class: "title", text: "OATHBREAKERS" }),
      el("p", { class: "subtitle", text: "TRUST NO ONE AT RAVENHOLT" })),
    flavor,
    el("div", { class: "card stack" },
      el("div", {}, el("div", { class: "label", text: "YOUR NAME" }), nameIn),
      el("div", {}, el("div", { class: "label", text: "CHOOSE YOUR FACE" }), avWrap),
      el("div", {}, el("div", { class: "label", text: "FAMOUS FOR:" }), pills(FAMES, fame, (v) => { fame = v; })),
      el("div", {}, el("div", { class: "label", text: "YOUR FATE:" }), pills(["random", "sworn", "oath"], fate, (v) => { fate = v; }, ["RANDOM", "SWORN", "OATHBREAKER"])),
      el("div", { class: "row" }, start,
        el("button", { class: "btn ghost", text: "HOW TO PLAY", onclick: () => howTo() }),
        el("button", { class: "btn ghost", text: "MEET THE CAST", onclick: () => meetCast() })),
      el("p", { class: "muted center", style: "margin:0;font-size:16px" }, "Mouse or touch to play. SPACE advances, J opens the Journal, hold R to peek at your role, ESC pauses.")),
    el("div", { class: "version", text: "Oathbreakers v1.0" }),
  ));
  // Warm the cache for the first scenes.
  for (const id of Object.keys(CAST)) { const i = new Image(); i.src = img(`${id}_neutral`); }
};

RENDER.INTRO = (sc) => {
  const cam = vid("hostv_0");
  const wrap = el("div", { class: "stack center" });
  if (cam) {
    const v = el("video", { src: cam, muted: true, playsinline: true, autoplay: true });
    v.muted = true;
    wrap.append(el("div", { class: "hostcam" }, v));
  }
  scene.replaceChildren(wrap);
  sfx("crow");
  playLines(sc.lines, () => {
    wrap.replaceChildren(el("h2", { class: "h2", text: "ELEVEN FAMOUS FACES. THREE LIARS." }),
      peopleGrid(Object.keys(CAST), { showRoles: false }),
      actions(nextBtn(sc.next)));
  }, {
    onLine: (ln) => {
      if (ln.w !== "laird" && ln.w !== "narr" && wrap.querySelector(".hostcam")) wrap.replaceChildren(el("h2", { class: "h2", text: "THE CONTESTANTS" }));
    },
  });
};

RENDER.ROLE = (sc) => {
  const wrap = el("div", { class: "stack center" });
  scene.replaceChildren(wrap);
  playLines(sc.lines, () => {
    const seal = el("div", { class: "seal", role: "button", tabindex: "0" }, el("img", { src: img("favicon"), alt: "" }), el("span", { class: "tap", text: "TAP TO BREAK THE SEAL" }));
    const open = () => {
      if (seal.classList.contains("open")) return;
      seal.classList.add("open");
      sfx("seal");
      const O = sc.role === "O";
      setTimeout(() => {
        if (O) { flash(); sfx("dagger"); } else sfx("shimmer");
        wrap.replaceChildren(el("div", { class: "rolecard card" },
          el("div", { class: `big ${sc.role}`, text: O ? "YOU ARE AN OATHBREAKER" : "YOU ARE SWORN" }),
          el("p", { style: "margin:0;font-size:22px", text: O ? "Blend in. Murder by night. Take it all." : "Find the Oathbreakers. Exile them. Share the gold." }),
          O && sc.fellows && sc.fellows.length ? el("p", { class: "muted", style: "margin:0", text: `YOUR FELLOW OATHBREAKERS: ${sc.fellows.join(", ")}` }) : null,
          O && sc.fellows ? peopleGrid(view.roster.filter((p) => p.role === "O" && !p.human).map((p) => p.id)) : null,
          actions(nextBtn(sc.next))));
      }, 650);
    };
    seal.addEventListener("click", open);
    seal.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });
    wrap.append(seal);
  });
};

RENDER.BREAKFAST = (sc) => {
  const wrap = el("div", { class: "stack center" });
  scene.replaceChildren(wrap);
  const cam = vid(`hostv_${hostKey(sc.day, view.final)}`);
  const go = () => {
    wrap.replaceChildren();
    if (sc.victim) {
      const card = peopleGrid([sc.victim], { showRoles: false });
      card.style.width = "160px";
      wrap.append(el("h2", { class: "h2", text: `${nameOf(sc.victim).toUpperCase()} HAS BEEN MURDERED` }), card);
    }
    playLines(sc.lines, () => wrap.append(actions(nextBtn(sc.next))), {
      onLine: (ln) => { if (sc.victim && ln.w === "narr" && ln.t.includes("did not come")) { sfx("snuff"); flash(); } },
    });
  };
  sfx("door");
  if (cam) {
    const v = el("video", { src: cam, muted: true, playsinline: true, autoplay: true });
    v.muted = true;
    const box = el("div", { class: "hostcam", style: "cursor:pointer" }, v);
    wrap.append(el("h2", { class: "h2", text: `BREAKFAST - DAY ${sc.day}` }), box, el("p", { class: "muted", text: "The Laird makes his entrance. Click to continue." }));
    let went = false;
    const once = () => { if (!went) { went = true; go(); } };
    box.addEventListener("click", once);
    v.addEventListener("ended", once);
    setTimeout(once, 6000);
  } else go();
};

RENDER.M_INTRO = (sc) => {
  scene.replaceChildren(el("div", { class: "stack center" }, el("div", { class: "subtitle", text: `DAY ${sc.day} MISSION` }), el("h1", { class: "title", style: "font-size:clamp(28px,6vw,60px)", text: sc.title })));
  playLines(sc.lines, () => scene.firstChild.append(actions(nextBtn(sc.next))));
};

RENDER.M_RESULT = (sc) => {
  const wrap = el("div", { class: "stack center" });
  if (sc.title) wrap.append(el("h2", { class: "h2", text: sc.title }));
  if (sc.gold !== undefined) { wrap.append(el("div", { class: "gold-num", text: `+${Number(sc.gold).toLocaleString("en-US")} GOLD` })); sfx("coins"); }
  scene.replaceChildren(wrap);
  playLines(sc.lines, () => {
    if (sc.award === "shield") { sfx("shimmer"); wrap.append(el("div", { class: "card award" }, el("span", { class: "ic", text: "🛡" }), "You found a SHIELD. No one can murder you tonight. Tell no one... or tell everyone.")); }
    if (sc.award === "dagger") { sfx("dagger"); wrap.append(el("div", { class: "card award" }, el("span", { class: "ic", text: "🗡" }), "You won the DAGGER. Your vote counts twice at one of the next two Round Tables.")); }
    if (sc.board) {
      const max = 20;
      const bars = el("div", { class: "card bars" });
      for (const b of sc.board) bars.append(el("div", { class: "bar" }, el("span", { text: nameOf(b.id).toUpperCase() }), el("div", { class: "fill", style: `width:${(b.n / max) * 100}%` }), el("span", { text: String(b.n) })));
      wrap.append(bars);
    }
    wrap.append(actions(nextBtn(sc.next)));
  });
};

RENDER.M_STORY = (sc) => {
  const wrap = el("div", { class: "stack center" },
    el("h2", { class: "h2", text: sc.title }),
    el("div", { class: "subtitle", text: `STEP ${sc.step + 1} OF ${sc.steps}` }),
    el("div", { class: "card", style: "font-size:22px" }, rich(sc.q)));
  const row = el("div", { class: "row" });
  sc.opts.forEach((o, i) => row.append(el("button", { class: `btn${i === 0 ? "" : " ghost"}`, text: o.toUpperCase(), onclick: (e) => { if (busy) return; e.currentTarget.disabled = true; sfx("seal"); act({ t: "mchoice", i }); } })));
  wrap.append(row);
  scene.replaceChildren(wrap);
};

// Rune glyphs for the vault (simple angular strokes).
const RUNES = [
  "M30 10 L30 90 M30 30 L70 15 M30 50 L70 35",
  "M25 90 L25 10 L75 40 L75 90",
  "M30 10 L30 90 M30 30 L70 50 L30 70",
  "M50 10 L50 90 M50 30 L25 15 M50 30 L75 15",
  "M20 50 L50 15 L80 50 L50 85 Z",
  "M20 20 L80 80 M80 20 L20 80",
];
function runeSvg(i) {
  const ns = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("viewBox", "0 0 100 100");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", RUNES[i]);
  s.append(p);
  return s;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

let gameKeys = null; // per-minigame key handler
RENDER.M_VAULT = (sc) => {
  const rnd = mulberry(sc.seed);
  const seq = Array.from({ length: sc.len }, () => Math.floor(rnd() * sc.runes));
  const status = el("div", { class: "h2", text: "WATCH THE DOOR" });
  const sub = el("p", { class: "muted center", style: "margin:0", text: "Your leg of the relay. The sequence grows each round. Five others go after you." });
  const pad = el("div", { class: "runes" });
  const btns = [];
  let round = 1; let pos = 0; let input = false; let over = false;
  const light = (i, cls = "lit", ms = 380) => { btns[i].classList.add(cls); setTimeout(() => btns[i].classList.remove(cls), ms); };
  const finish = (score) => {
    if (over) return; over = true; input = false; gameKeys = null;
    status.textContent = score === sc.len ? "THE DOOR OPENS" : `SLIPPED ON RUNE ${score + 1}`;
    setTimeout(() => act({ t: "mscore", score }), 900);
  };
  const show = () => {
    input = false; pos = 0;
    status.textContent = `WATCH THE DOOR - ROUND ${round} OF ${sc.len}`;
    let k = 0;
    const tick = () => {
      if (k >= round) { input = true; status.textContent = `YOUR TURN - ${round} RUNE${round > 1 ? "S" : ""}`; return; }
      light(seq[k], "lit", 420); sfx("rune", 0.4); k += 1; setTimeout(tick, 620);
    };
    setTimeout(tick, 600);
  };
  const press = (i) => {
    if (!input || over) return;
    if (i === seq[pos]) {
      light(i); sfx("rune", 0.45); pos += 1;
      if (pos >= round) {
        input = false;
        if (round >= sc.len) return finish(sc.len);
        round += 1; setTimeout(show, 700);
      }
    } else { light(i, "bad", 600); sfx("fail"); finish(round - 1); }
  };
  for (let i = 0; i < sc.runes; i++) {
    const b = el("button", { class: "rune", type: "button", onclick: () => press(i) }, runeSvg(i));
    btns.push(b); pad.append(b);
  }
  gameKeys = (e) => { const n = Number(e.key); if (n >= 1 && n <= 6) press(n - 1); };
  scene.replaceChildren(el("div", { class: "stack center" }, el("div", { class: "subtitle", text: sc.title }), status, sub, pad, el("p", { class: "muted", style: "margin:0;font-size:15px", text: "Tap the runes or press 1-6." })));
  show();
};

RENDER.M_LANTERN = (sc) => {
  const field = el("div", { class: "lantern-field" }, el("div", { class: "target" }), el("div", { class: "flame" }));
  const ring = el("div", { class: "ring" });
  field.append(ring);
  const row = el("div", { class: "lantern-row" });
  const pips = [];
  for (let i = 0; i < sc.count; i++) { const p = el("i"); pips.push(p); row.append(p); }
  const status = el("div", { class: "h2", text: "LIGHT THE LANTERNS" });
  let i = 0; let hits = 0; let t0 = 0; let dur = 1500; let done = false; let waiting = false; let raf = 0;
  const WIN = 0.2;
  const scaleAt = (t) => 3 - 2.5 * Math.min(1, (t - t0) / dur);
  const next = () => {
    if (i >= sc.count) {
      done = true; gameKeys = null; cancelAnimationFrame(raf);
      status.textContent = `${hits} OF ${sc.count} LIT`;
      setTimeout(() => act({ t: "mscore", score: hits }), 900);
      return;
    }
    dur = Math.max(700, 1500 - 180 * Math.floor(i / 5));
    t0 = performance.now(); waiting = true;
    status.textContent = `LANTERN ${i + 1} OF ${sc.count}`;
    loop();
  };
  const resolve = (hit) => {
    waiting = false;
    pips[i].classList.add(hit ? "hit" : "miss");
    if (hit) { hits++; sfx("whoosh", 0.4); } else sfx("fail", 0.35);
    i++;
    setTimeout(next, 320);
  };
  const loop = () => {
    raf = requestAnimationFrame((t) => {
      if (!waiting || done) return;
      const s = scaleAt(t);
      ring.style.transform = `translate(-50%, -50%) scale(${s})`;
      ring.style.borderColor = Math.abs(s - 1) < WIN ? "#fff3d6" : "";
      if (s <= 0.5) return resolve(false);
      loop();
    });
  };
  const press = () => { if (!waiting || done) return; resolve(Math.abs(scaleAt(performance.now()) - 1) < WIN); };
  field.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });
  gameKeys = (e) => { if (e.code === "Space") { e.preventDefault(); press(); } };
  scene.replaceChildren(el("div", { class: "stack center" }, el("div", { class: "subtitle", text: sc.title }), status,
    el("p", { class: "muted center", style: "margin:0", text: "Tap the flame (or press SPACE) when the ring meets the dashed circle." }), field, row));
  setTimeout(next, 900);
};

RENDER.GALLERY = (sc) => {
  const fresh = unseen(sc);
  let who = null;
  const talksLeft = sc.talks;
  const grid = peopleGrid(sc.people, { onPick: (id, card) => { who = id; selectIn(grid, card); prompts.hidden = talksLeft <= 0; pickName.textContent = `TALKING TO ${nameOf(id).toUpperCase()}`; } });
  const pickName = el("div", { class: "label", text: talksLeft > 0 ? "PICK SOMEONE TO TALK TO" : "NO CONVERSATIONS LEFT" });
  const accuseRow = el("div", { class: "row", hidden: true });
  const say = (q, target) => { if (!who || busy) return; act({ t: "talk", who, q, target }); };
  const prompts = el("div", { class: "stack", hidden: true },
    el("div", { class: "row" }, ...sc.prompts.map((p, q) => el("button", {
      class: "btn ghost small", text: p, onclick: () => {
        if (q === 3) {
          accuseRow.hidden = false;
          accuseRow.replaceChildren(...view.roster.filter((r) => r.alive && !r.human).map((r) => el("button", { class: "pill", text: r.name.toUpperCase(), onclick: () => say(3, r.id) })));
        } else say(q);
      },
    }))),
    accuseRow,
    el("form", { onsubmit: (e) => { e.preventDefault(); const v = e.target.elements.msg.value.trim(); if (!v || !who || busy) return; act({ t: "talk", who, text: v.slice(0, 200) }); } },
      el("input", { type: "text", name: "msg", placeholder: "Say something... (Enter to send)", maxlength: "200", autocomplete: "off" })));
  const controls = el("div", { class: "card stack" },
    el("div", { class: "h2", style: "text-align:left;font-size:20px", text: `THE GALLERY - ${talksLeft} CONVERSATION${talksLeft === 1 ? "" : "S"} LEFT` }),
    logView(sc.lines), pickName, prompts,
    el("div", { class: "row" },
      el("button", { class: "btn ghost small", text: `EAVESDROP (${sc.eaves} LEFT)`, disabled: sc.eaves <= 0, onclick: () => { if (!busy) act({ t: "eaves" }); } }),
      el("button", { class: "btn", text: "GO TO THE ROUND TABLE", onclick: () => { if (!busy) act({ t: "toRT" }); } })));
  scene.replaceChildren(el("div", { class: "split" }, el("div", { class: "card" }, el("div", { class: "label", text: "THE GUESTS" }), grid), controls));
  if (fresh.length && fresh.some((l) => l.w !== "you")) {
    controls.style.visibility = "hidden";
    playLines(fresh.filter((l) => l.w !== "you"), () => { controls.style.visibility = ""; });
  }
};

RENDER.RT = (sc) => {
  const fresh = unseen(sc);
  const speaks = sc.speaks;
  let mode = null;
  const people = view.roster.filter((p) => p.alive && !p.human).map((p) => p.id);
  const acc = {};
  for (const id of sc.accused || []) acc[id] = 1;
  const pickRow = el("div", { hidden: true });
  const speak = (kind, target) => { if (!busy) { sfx("slap", 0.3); act({ t: "speak", kind, target }); } };
  const choose = (kind) => {
    mode = kind;
    pickRow.hidden = false;
    pickRow.replaceChildren(el("div", { class: "label", text: kind === "accuse" ? "ACCUSE WHO?" : "DEFEND WHO?" }),
      peopleGrid(people, { onPick: (id) => speak(mode, id) }));
  };
  const controls = el("div", { class: "card stack" },
    el("div", { class: "h2", style: "text-align:left;font-size:20px", text: sc.final ? "THE LAST CANDLE - ROUND TABLE" : "THE ROUND TABLE" }),
    logView(sc.lines),
    speaks > 0 ? el("div", { class: "label", text: `SPEAK UP (${speaks} LEFT)` }) : null,
    speaks > 0 ? el("div", { class: "row" },
      el("button", { class: "btn ghost small", text: "ACCUSE...", onclick: () => choose("accuse") }),
      el("button", { class: "btn ghost small", text: "DEFEND...", onclick: () => choose("defend") }),
      el("button", { class: "btn ghost small", text: "DEFEND MYSELF", onclick: () => speak("self") }),
      el("button", { class: "btn ghost small", text: "STAY SILENT", onclick: () => speak("silent") })) : null,
    pickRow,
    el("div", { class: "row" }, el("button", { class: "btn blood", text: "TO THE VOTE", onclick: () => { if (!busy) act({ t: "toVote" }); } })));
  scene.replaceChildren(el("div", { class: "split" },
    el("div", { class: "card" }, el("div", { class: "label", text: "AT THE TABLE" }), peopleGrid(people, { showRoles: true, votes: null })),
    controls));
  const toPlay = fresh.filter((l) => l.w !== "you");
  if (toPlay.length) {
    controls.style.visibility = "hidden";
    playLines(toPlay, () => { controls.style.visibility = ""; }, { onLine: (ln) => { if (ln.t.includes("Every head turns")) sfx("gasp"); } });
  }
};

RENDER.VOTE = (sc) => {
  let target = null;
  let dagger = false;
  const confirm = el("button", { class: "btn blood", text: "CONFIRM VOTE", disabled: true, onclick: (e) => {
    if (!target || busy) return; e.currentTarget.disabled = true; sfx("seal"); act({ t: "vote", target, dagger });
  } });
  const grid = peopleGrid(sc.people, { onPick: (id, card) => { target = id; selectIn(grid, card); confirm.disabled = false; confirm.textContent = `CONFIRM VOTE: ${nameOf(id).toUpperCase()}`; } });
  const dBtn = sc.dagger ? el("button", { class: "btn ghost", text: "USE THE DAGGER", onclick: (e) => { dagger = !dagger; e.currentTarget.classList.toggle("sel", dagger); e.currentTarget.textContent = dagger ? "DAGGER DRAWN (VOTE x2)" : "USE THE DAGGER"; if (dagger) sfx("dagger"); } }) : null;
  const wrap = el("div", { class: "stack center" }, el("h2", { class: "h2", text: "WRITE A NAME" }), grid, actions(dBtn, confirm));
  scene.replaceChildren(wrap);
  wrap.style.visibility = "hidden";
  playLines(sc.lines, () => { wrap.style.visibility = ""; });
};

RENDER.REVEAL = (sc) => {
  const list = el("div", { class: "stack" });
  const bars = el("div", { class: "card bars", hidden: true });
  const after = el("div", { class: "stack center" });
  const wrap = el("div", { class: "stack center" }, el("h2", { class: "h2", text: sc.revote ? "THE REVOTE" : "THE VOTES" }), list, bars, after);
  scene.replaceChildren(wrap);
  const showTally = () => {
    const entries = Object.entries(sc.tally || {}).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 1;
    bars.replaceChildren(...entries.map(([id, n]) => el("div", { class: "bar" }, el("span", { text: nameOf(id).toUpperCase() }), el("div", { class: "fill", style: `width:${(n / max) * 100}%` }), el("span", { text: String(n) }))));
    bars.hidden = false;
  };
  const finish = () => {
    showTally();
    const done = () => {
      if (sc.tie && !sc.tie.includes("you")) {
        after.append(el("div", { class: "label", text: "REVOTE: CHOOSE ONE OF THE TIED" }),
          peopleGrid(sc.tie, { onPick: (id) => { if (!busy) { sfx("seal"); act({ t: "vote", target: id }); } } }));
      } else after.append(actions(nextBtn(sc.next)));
    };
    const tail = (sc.lines || []).filter((l) => !l.v || l.v !== "l_quills");
    if (tail.length) playLines(tail, done); else done();
  };
  let k = 0;
  const reveal = sc.reveal || [];
  sfx("heartbeat", 0.3);
  const step = () => {
    if (k >= reveal.length) return finish();
    const r = reveal[k++];
    const card = el("div", { class: "votecard" },
      el("img", { src: portrait(r.v, "neutral"), alt: "", style: "width:46px;height:61px;object-fit:cover;border-radius:8px" }),
      el("div", {}, el("div", { class: "label", style: "margin:0 0 6px", text: `${nameOf(r.v).toUpperCase()} VOTES FOR` }),
        el("div", { class: "parch", text: nameOf(r.t).toUpperCase() + (r.x2 ? "  ×2" : "") })),
      r.why ? el("div", { class: "why" }, rich(r.why)) : null);
    if (r.x2) list.append(el("div", { class: "muted", text: `${nameOf(r.v)} draws the Dagger. Their vote counts twice.` }));
    list.append(card);
    sfx(r.x2 ? "dagger" : "slap", 0.45);
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setTimeout(step, r.why ? 1500 : 900);
  };
  const first = (sc.lines || []).filter((l) => l.v === "l_quills");
  if (first.length) playLines(first, step); else step();
};

RENDER.EXILE = (sc) => {
  const who = sc.who;
  const hero = el("div", { class: "exile-hero" });
  const clip = who !== "you" ? vid(`exile_${who}`) : "";
  if (clip) { const v = el("video", { src: clip, muted: true, playsinline: true, autoplay: true }); v.muted = true; hero.append(v); }
  else hero.append(el("img", { src: portrait(who, "neutral"), alt: "" }));
  const verdict = el("div", { class: "verdict", hidden: true });
  const wrap = el("div", { class: "stack center" }, el("h2", { class: "h2", text: `${nameOf(who).toUpperCase()}, YOU HAVE BEEN EXILED` }), hero, verdict);
  scene.replaceChildren(wrap);
  sfx("snuff");
  playLines(sc.lines, () => wrap.append(actions(nextBtn(sc.next))), {
    onLine: (ln) => {
      if (ln.v && (ln.v.startsWith("sworn_") || ln.v.startsWith("oath_"))) {
        const O = ln.v.startsWith("oath_");
        verdict.hidden = false;
        verdict.className = `verdict ${O ? "O" : "S"}`;
        verdict.textContent = O ? "I AM AN OATHBREAKER" : "I AM SWORN";
        if (O) { flash(); playMusic("sting_o"); } else sfx("gasp");
      }
    },
  });
  if (who === "you" && sc.reveal) {
    verdict.hidden = false;
    verdict.className = `verdict ${sc.reveal}`;
    verdict.textContent = sc.reveal === "O" ? "YOU WERE AN OATHBREAKER" : "YOU WERE SWORN";
  }
};

RENDER.NIGHT = (sc) => {
  const wrap = el("div", { class: "stack center" }, el("h1", { class: "title", style: "font-size:clamp(26px,5vw,52px)", text: sc.role === "O" ? "THE TOWER" : "NIGHT FALLS" }));
  scene.replaceChildren(wrap);
  sfx("crow");
  playLines(sc.lines, () => wrap.append(actions(nextBtn(sc.next))));
};

RENDER.TOWER = (sc) => {
  let target = sc.suggest || null;
  const confirm = el("button", { class: "btn blood", text: "CONFIRM MURDER", disabled: !target, onclick: (e) => { if (!target || busy) return; e.currentTarget.disabled = true; sfx("dagger"); act({ t: "murder", target }); } });
  const rec = sc.canRecruit ? el("button", { class: "btn ghost", text: "RECRUIT", onclick: () => { if (target && !busy) { sfx("seal"); act({ t: "recruit", target }); } } }) : null;
  const ult = sc.canUlt ? el("button", { class: "btn ghost", text: "ULTIMATUM", onclick: () => { if (target && !busy) { sfx("seal"); act({ t: "ultimatum", target }); } } }) : null;
  const grid = peopleGrid(sc.targets, { selected: target, onPick: (id, card) => { target = id; selectIn(grid, card); confirm.disabled = false; confirm.textContent = `CONFIRM MURDER: ${nameOf(id).toUpperCase()}`; } });
  if (target) confirm.textContent = `CONFIRM MURDER: ${nameOf(target).toUpperCase()}`;
  const wrap = el("div", { class: "stack center" }, el("h1", { class: "title", style: "font-size:clamp(26px,5vw,52px)", text: "THE TOWER" }),
    el("p", { class: "subtitle", text: "CHOOSE WHO WILL NOT WAKE." }), el("div", { class: "label", text: "MARK FOR MURDER" }), grid, actions(rec, ult, confirm));
  scene.replaceChildren(wrap);
  wrap.style.visibility = "hidden";
  playLines(sc.lines, () => { wrap.style.visibility = ""; });
};

RENDER.OFFER = (sc) => {
  const wrap = el("div", { class: "stack center offer" });
  const body = el("div", { class: "letter" }, ...sc.lines.map((l) => el("p", { style: "margin:6px 0" }, rich(l.t))));
  wrap.append(el("h2", { class: "h2", text: sc.kind === "ult" ? "AN ULTIMATUM" : "A SEALED LETTER" }), body,
    actions(el("button", { class: "btn blood", text: sc.opts[0], onclick: () => { if (!busy) { sfx("seal"); act({ t: "accept", yes: true }); } } }),
      el("button", { class: "btn ghost", text: sc.opts[1], onclick: () => { if (!busy) { sfx("snuff"); act({ t: "accept", yes: false }); } } })));
  scene.replaceChildren(wrap);
  sfx("door");
};

RENDER.LC = (sc) => {
  const wrap = el("div", { class: "stack center" }, el("h1", { class: "title", style: "font-size:clamp(28px,6vw,60px)", text: "THE LAST CANDLE" }),
    el("p", { class: "subtitle", text: `${sc.n} REMAIN` }), peopleGrid(sc.people.filter((id) => id !== "you"), { showRoles: true }));
  scene.replaceChildren(wrap);
  playLines(sc.lines, () => wrap.append(actions(
    el("button", { class: "btn", text: "END THE GAME", onclick: () => { if (!busy) { sfx("snuff"); act({ t: "endvote", end: true }); } } }),
    el("button", { class: "btn blood", text: "EXILE AGAIN", onclick: () => { if (!busy) { sfx("slap"); act({ t: "endvote", end: false }); } } }))));
};

RENDER.LC_RESULT = (sc) => {
  const list = el("div", { class: "card stack" });
  for (const [id, v] of Object.entries(sc.votes || {})) list.append(el("div", { class: "bar", style: "grid-template-columns:1fr auto" }, el("span", { text: nameOf(id).toUpperCase() }), el("span", { style: `color:${v === "END" ? "var(--amber)" : "var(--oath)"}`, text: v === "END" ? "END THE GAME" : "EXILE AGAIN" })));
  const wrap = el("div", { class: "stack center" }, el("h2", { class: "h2", text: "THE CANDLE STILL BURNS" }), list);
  scene.replaceChildren(wrap);
  playLines(sc.lines, () => wrap.append(actions(nextBtn(sc.next))));
};

RENDER.OUT = (sc) => {
  const wrap = el("div", { class: "stack center" }, el("h1", { class: "big-title O", text: sc.title }));
  scene.replaceChildren(wrap);
  flash();
  playLines(sc.lines, () => wrap.append(actions(
    el("button", { class: "btn", text: "WATCH TO THE END", onclick: (e) => { if (!busy) { e.currentTarget.disabled = true; act({ t: "watch" }); } } }),
    el("button", { class: "btn ghost", text: "NEW SEASON", onclick: () => send({ type: "reset" }) }))));
};

RENDER.FINALE = (sc) => {
  const side = sc.side;
  const wrap = el("div", { class: "stack center" },
    el("h1", { class: `big-title ${side}`, text: sc.title }),
    el("p", { class: "gold-num", style: "font-size:clamp(18px,3vw,26px)", text: sc.sub }));
  scene.replaceChildren(wrap);
  if (side === "O") flash();
  playLines(sc.lines, () => {
    wrap.append(el("h2", { class: "h2", text: "THE TRUTH" }),
      peopleGrid(view.roster.filter((p) => !p.human).map((p) => p.id), { showRoles: true }),
      el("div", { class: "card", style: "font-size:18px" },
        el("div", {}, `Correct votes: ${sc.stats.correct}/${sc.stats.cast}`),
        el("div", {}, `Days survived: ${sc.stats.days}`),
        el("div", {}, `Your role: ${view.you.role === "O" ? "OATHBREAKER" : "SWORN"}`)));
    if (sc.timeline && sc.timeline.length) {
      wrap.append(el("div", { class: "card stack", style: "text-align:left" }, el("div", { class: "label", text: "WHAT HAPPENED AFTER YOU LEFT" }),
        ...sc.timeline.map((t) => el("div", { class: "entry" }, el("span", { class: "d", text: `DAY ${t.d}` }), t.t))));
    }
    wrap.append(actions(el("button", { class: "btn", text: "NEW SEASON", onclick: () => send({ type: "reset" }) })));
  });
};

// ── overlays: journal, pause, how to play, cast ────────────────────────────

function openOverlay(content) {
  const o = $("#overlay");
  o.replaceChildren(el("div", { class: "panel card" }, content));
  o.hidden = false;
}
function closeOverlay() { $("#overlay").hidden = true; }
$("#overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeOverlay(); });
const closeBtn = () => el("button", { class: "btn ghost small", text: "CLOSE", onclick: closeOverlay });

function notes() { try { return JSON.parse(localStorage.getItem(`ob:notes:${room}`) || "{}"); } catch { return {}; } }
function setNote(id, v) { const n = notes(); n[id] = n[id] === v ? null : v; try { localStorage.setItem(`ob:notes:${room}`, JSON.stringify(n)); } catch {} }

function journalOverlay(tab = "EVIDENCE") {
  if (!view || view.phase === "LOBBY") return;
  const tabs = ["EVIDENCE", "VOTES", "FALLEN", "MY NOTES"];
  const body = el("div", { class: "stack" });
  const entries = (kinds) => (view.journal || []).filter((j) => kinds.includes(j.k)).slice().reverse()
    .map((j) => el("div", { class: "entry" }, el("span", { class: "d", text: `DAY ${j.d}` }), j.t));
  if (tab === "EVIDENCE") body.append(...(entries(["clue", "talk"]).length ? entries(["clue", "talk"]) : [el("p", { class: "muted", text: "Nothing yet. Missions and conversations leave a trail." })]));
  if (tab === "VOTES") {
    const vs = (view.votes || []).slice().reverse();
    if (!vs.length) body.append(el("p", { class: "muted", text: "No votes cast yet." }));
    for (const v of vs) body.append(el("div", { class: "entry" }, el("span", { class: "d", text: `DAY ${v.d}` }),
      Object.entries(v.v).map(([a, b]) => `${nameOf(a)} → ${nameOf(b)}`).join(" · ")));
  }
  if (tab === "FALLEN") {
    const out = view.roster.filter((p) => !p.alive);
    if (!out.length) body.append(el("p", { class: "muted", text: "Everyone still breathes. For now." }));
    body.append(...entries(["murder", "exile"]));
  }
  if (tab === "MY NOTES") {
    const n = notes();
    const grid = el("div", { class: "cast-grid" });
    for (const p of view.roster.filter((r) => !r.human)) {
      const tags = el("div", { class: "note-tags" });
      for (const [v, label, cls] of [["TRUST", "TRUST", "t"], ["UNSURE", "UNSURE", "u"], ["SUSPECT", "SUSPECT", "s"]]) {
        tags.append(el("button", { class: `${cls}${n[p.id] === v ? " on" : ""}`, type: "button", text: label, onclick: (e) => { e.stopPropagation(); setNote(p.id, v); journalOverlay("MY NOTES"); } }));
      }
      grid.append(el("div", { class: `cast-card${p.alive ? "" : " dead"}`, style: p.alive ? "" : "opacity:.5" },
        el("img", { src: portrait(p.id, "neutral"), alt: "" }),
        el("div", {}, el("b", { text: p.name.toUpperCase() }), p.role && !p.human ? (p.role === "O" ? "Oathbreaker" : "Sworn") : (p.alive ? "" : p.out), tags)));
    }
    body.append(grid);
  }
  openOverlay(el("div", { class: "stack" },
    el("div", { class: "row", style: "justify-content:space-between" }, el("div", { class: "h2", style: "margin:0", text: "JOURNAL" }), closeBtn()),
    el("div", { class: "tabs" }, ...tabs.map((t) => el("button", { class: `pill${t === tab ? " sel" : ""}`, text: t, onclick: () => journalOverlay(t) }))),
    body));
}

function howTo() {
  openOverlay(el("div", { class: "stack", style: "font-size:19px" },
    el("div", { class: "row", style: "justify-content:space-between" }, el("div", { class: "h2", style: "margin:0", text: "HOW TO PLAY" }), closeBtn()),
    el("p", {}, "Twelve celebrities, one castle. Three are secretly OATHBREAKERS. Everyone else is SWORN."),
    el("p", {}, "Each day: a MISSION fills the prize pot, the GALLERY lets you question the cast, and the ROUND TABLE votes one player out. The exiled player reveals who they really were."),
    el("p", {}, "Each night, the Oathbreakers murder one Sworn. A SHIELD protects you for one night. The DAGGER doubles your vote once."),
    el("p", {}, "Watch the evidence: fumbled runes, light chests, low lantern scores, suspicious votes, and each character's tell when they lie. Your JOURNAL (J) keeps track."),
    el("p", {}, "At THE LAST CANDLE, the final four vote to END THE GAME or EXILE AGAIN. If only Sworn remain, they split the pot. If a single Oathbreaker remains, they take it all.")));
}

function meetCast() {
  const grid = el("div", { class: "cast-grid" });
  for (const [id, c] of Object.entries(CAST)) {
    grid.append(el("button", { class: "cast-card", type: "button", onclick: () => { unlockAudio(); voice(`sig_${id}`); } },
      el("img", { src: img(`${id}_neutral`), alt: "" }),
      el("div", {}, el("b", { text: c.full }), el("span", { class: "muted", text: `${c.fame}. ${c.from}.` }), el("div", { style: "font-style:italic;margin-top:4px", text: `"${c.line}"` }))));
  }
  openOverlay(el("div", { class: "stack" },
    el("div", { class: "row", style: "justify-content:space-between" }, el("div", { class: "h2", style: "margin:0", text: "MEET THE CAST" }), closeBtn()),
    el("p", { class: "muted", style: "margin:0", text: "Tap a card to hear them. Hosted by Lachlan Rook, the Laird of Ravenholt." }), grid));
}

function pauseMenu() {
  if (!$("#overlay").hidden) return closeOverlay();
  openOverlay(el("div", { class: "stack center" },
    el("h2", { class: "h2", text: "PAUSED" }),
    el("div", { class: "row" },
      el("button", { class: "btn", text: "RESUME", onclick: closeOverlay }),
      el("button", { class: "btn ghost", text: "HOW TO PLAY", onclick: howTo }),
      el("button", { class: "btn ghost", text: soundOn ? "SOUND: ON" : "SOUND: OFF", onclick: (e) => { setSound(!soundOn); e.currentTarget.textContent = soundOn ? "SOUND: ON" : "SOUND: OFF"; } }),
      el("button", { class: "btn blood", text: "QUIT TO MENU", onclick: () => { closeOverlay(); send({ type: "reset" }); } })),
    el("p", { class: "muted", style: "margin:0;font-size:14px", text: `Season: ${room}` })));
}

// ── input ──────────────────────────────────────────────────────────────────

$("#hudJournal").addEventListener("click", () => journalOverlay());
$("#hudMenu").addEventListener("click", () => pauseMenu());
$("#hudSound").addEventListener("click", () => setSound(!soundOn));
$("#hudRole").addEventListener("pointerdown", () => peek(true));
for (const ev of ["pointerup", "pointerleave", "pointercancel"]) $("#hudRole").addEventListener(ev, () => peek(false));
setSound(soundOn);

window.addEventListener("keydown", (e) => {
  const typing = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
  if (e.code === "Escape") { e.preventDefault(); if (!$("#overlay").hidden) closeOverlay(); else if (view && view.phase !== "LOBBY") pauseMenu(); return; }
  if (typing) return;
  if (gameKeys && view && view.phase === "M_PLAY") { gameKeys(e); return; }
  if (e.code === "Space" && dlg) { e.preventDefault(); advance(); return; }
  if (e.code === "KeyJ") { e.preventDefault(); if ($("#overlay").hidden) journalOverlay(); else closeOverlay(); return; }
  if (e.code === "KeyR" && !e.repeat) peek(true);
});
window.addEventListener("keyup", (e) => { if (e.code === "KeyR") peek(false); });
document.addEventListener("pointerdown", () => unlockAudio(), { once: true });

connect();
