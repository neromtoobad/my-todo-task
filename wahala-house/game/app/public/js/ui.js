// DOM interface: menu, HUD, dialogue, choices, the interaction wheel, the Gist
// Book, the Tea Board, the viewer feed, toasts and the end screens.
import { CAST, AI_IDS, SPEAKERS, ACT_GROUPS, ACT_INFO, CLAIMS, ROOM_NAMES } from "./data.js";
import { audio } from "./audio.js";

export const $ = (s, r = document) => r.querySelector(s);
export function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith("--")) n.style.setProperty(sk, sv); else n.style[sk] = sv; } }
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}

export function portrait(id, mood = "neutral", look) {
  if (id === "you") return `assets/portraits/${look || "pf"}_${mood}.webp`;
  if (id === "dapo") return `assets/portraits/dapo_${mood === "neutral" ? "happy" : mood}.webp`;
  if (CAST[id]) return `assets/portraits/${id}_${mood}.webp`;
  return null;
}
export const naira = (n) => "₦" + Math.round(n || 0).toLocaleString("en-US");

const EV_LABEL = { hoh: "HEAD OF HOUSE GAME", wager: "WAGER TASK", diary: "DIARY ROOM", noms: "NOMINATIONS", nomreveal: "NOMINEES REVEALED", veto: "THE VETO", hustle: "BALOGUN HUSTLE", wresult: "WAGER RESULTS", strike: "MIDNIGHT STRIKE", strikereveal: "THE MORNING AFTER", party: "OWAMBE PARTY", live: "LIVE EVICTION SHOW", night: "LIGHTS OUT" };

export class UI {
  constructor(app) {
    this.app = app;
    this.root = $("#ui");
    this.lastNote = 0;
    this.lastFeed = 0;
    this.typing = null;
  }

  nameOf(id) {
    const v = this.app.view;
    if (id === "you") return (v && v.you && v.you.name) || "You";
    if (CAST[id]) return CAST[id].name;
    return id;
  }
  look() { return (this.app.view && this.app.view.you && this.app.view.you.look) || "f"; }
  pic(id, mood) { return portrait(id, mood, id === "you" ? (this.look() === "m" ? "pm" : "pf") : undefined); }

  // ------------------------------------------------------------------ menu
  showMenu(onStart) {
    const lines = ["Every smile in this house is a strategy.", "Omo, the cameras see everything.", "Two of them are lying. Maybe three.", "Ship or strategy? You decide."];
    let look = "f", fate = "random";
    const tag = el("p", { class: "tagline", text: lines[0] });
    let li = 0;
    this.tagTimer = setInterval(() => { li = (li + 1) % lines.length; tag.classList.remove("show"); setTimeout(() => { tag.textContent = lines[li]; tag.classList.add("show"); }, 300); }, 3800);
    const name = el("input", { type: "text", maxlength: "16", placeholder: "Your housemate name", autocomplete: "off", spellcheck: "false" });
    try { name.value = localStorage.getItem("wh:name") || ""; } catch {}
    const lookBtn = (v) => el("button", { class: "look" + (v === look ? " on" : ""), type: "button", "data-v": v, onclick: (e) => { look = v; for (const b of menu.querySelectorAll(".look")) b.classList.toggle("on", b.dataset.v === v); audio.sfx("s_whoosh", 0.4); } },
      el("img", { src: portrait("you", "happy", v === "m" ? "pm" : "pf"), alt: "" }), el("span", { text: v === "f" ? "HER" : "HIM" }));
    const fatePill = (v, label) => el("button", { class: "pill" + (v === fate ? " on" : ""), type: "button", "data-v": v, onclick: () => { fate = v; for (const b of menu.querySelectorAll(".pill")) b.classList.toggle("on", b.dataset.v === v); } }, label);
    const err = el("p", { class: "err" });
    const go = () => {
      const n = name.value.trim();
      if (n.length < 2) { err.textContent = "Your name needs at least 2 characters."; name.focus(); return; }
      try { localStorage.setItem("wh:name", n); } catch {}
      audio.unlock();
      onStart({ name: n, look, fate });
    };
    name.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    const menu = el("div", { id: "menu", class: "screen" },
      el("div", { class: "menu-bg" }),
      el("div", { class: "menu-card" },
        el("div", { class: "logo" }, el("span", { class: "l1", text: "WAHALA" }), el("span", { class: "l2", text: "HOUSE" })),
        el("p", { class: "sub", text: "TRUST NO HOUSEMATE" }),
        tag,
        el("label", { class: "lbl", text: "YOUR HOUSEMATE NAME" }), name,
        el("label", { class: "lbl", text: "CHOOSE YOUR LOOK" }), el("div", { class: "looks" }, lookBtn("f"), lookBtn("m")),
        el("label", { class: "lbl", text: "YOUR FATE" }), el("div", { class: "pills" }, fatePill("random", "RANDOM"), fatePill("housemate", "HOUSEMATE"), fatePill("saboteur", "SABOTEUR")),
        err,
        el("button", { class: "btn big", type: "button", onclick: go }, "ENTER THE HOUSE"),
        el("div", { class: "row" },
          el("button", { class: "btn ghost", type: "button", onclick: () => { audio.unlock(); this.showHow(); } }, "HOW TO PLAY"),
          el("button", { class: "btn ghost", type: "button", onclick: () => { audio.unlock(); this.showCast(); } }, "MEET THE HOUSEMATES")),
        el("p", { class: "ver", text: "Wahala House v1.0 - Week One" })));
    tag.classList.add("show");
    this.root.append(menu);
    setTimeout(() => name.focus(), 50);
  }
  hideMenu() { clearInterval(this.tagTimer); const m = $("#menu"); if (m) m.remove(); }

  loading(pct, label) {
    let l = $("#loading");
    if (pct >= 1) { if (l) l.remove(); return; }
    if (!l) { l = el("div", { id: "loading" }, el("div", { class: "lbar" }, el("i")), el("span")); this.root.append(l); }
    l.querySelector("i").style.width = Math.round(pct * 100) + "%";
    l.querySelector("span").textContent = label || "Setting up the house...";
  }

  showHow() {
    this.modal("HOW TO PLAY", el("div", { class: "how" },
      el("p", {}, el("b", { text: "Live in the house. " }), "Walk anywhere with WASD, the arrow keys, or by tapping the floor. The clock is always running: morning, afternoon, evening, night."),
      el("p", {}, el("b", { text: "Play people. " }), "Walk up to a housemate and press E (or tap them) to open the wheel: VIBE, LOVE, SCHEME, CONFRONT. Every move costs Social Energy (10 a day)."),
      el("p", {}, el("b", { text: "Eavesdrop. " }), "When housemates whisper, flirt or fight near you, press L to listen. What you witness becomes a Receipt in your Gist Book (J). Receipts make your claims believable."),
      el("p", {}, el("b", { text: "Lies are tracked. " }), "Spread gist or set people up, but if the two of them ever compare notes, your lie is exposed."),
      el("p", {}, el("b", { text: "The week. " }), "Monday: Head of House. Tuesday: wager task and Diary Room. Wednesday: nominations (save two). Thursday: Veto and BALOGUN HUSTLE. Friday: results and the Midnight Strike. Saturday: OWAMBE party. Sunday: Live Eviction and THE SHOWDOWN."),
      el("p", {}, el("b", { text: "Saboteurs. " }), "Two housemates secretly work for The Whisper. They skim the task money, frame people, and strike one housemate out on Friday. Find them. Or be one."),
      el("p", { class: "keys" }, "E talk  ·  L listen  ·  J Gist Book  ·  TAB Tea Board  ·  F fast-forward  ·  Q emote  ·  ESC close")));
  }

  showCast() {
    const grid = el("div", { class: "castgrid" }, AI_IDS.map((id) => {
      const c = CAST[id];
      return el("div", { class: "castcard", style: { "--c": c.color } },
        el("img", { src: portrait(id, "happy"), alt: "" }),
        el("h4", { text: c.full }), el("p", { class: "job", text: c.job }),
        el("p", { class: "traits", text: c.traits.join(" · ") }), el("p", { class: "sig", text: `"${c.sig}"` }));
    }));
    this.modal("MEET THE HOUSEMATES", grid, "wide");
  }

  modal(title, body, cls) {
    this.closeModal();
    const m = el("div", { id: "modal", class: "screen dim" + (cls ? " " + cls : ""), onclick: (e) => { if (e.target.id === "modal") this.closeModal(); } },
      el("div", { class: "panel" }, el("div", { class: "phead" }, el("h3", { text: title }), el("button", { class: "x", type: "button", onclick: () => this.closeModal() }, "✕")), el("div", { class: "pbody" }, body)));
    this.root.append(m);
    this.app.modalOpen = true;
  }
  closeModal() { const m = $("#modal"); if (m) m.remove(); this.app.modalOpen = !!$("#wheel"); }

  // ------------------------------------------------------------------ HUD
  renderHud(v) {
    let hud = $("#hud");
    if (!v || v.phase === "LOBBY") { if (hud) hud.hidden = true; return; }
    if (!hud) {
      hud = el("div", { id: "hud" },
        el("div", { class: "hl" }, el("div", { class: "chip time", id: "hTime" }), el("div", { class: "chip room", id: "hRoom" })),
        el("div", { class: "hc" }, el("div", { class: "pot", id: "hPot" })),
        el("div", { class: "hr" },
          el("div", { class: "stat", id: "hCoins" }), el("div", { class: "stat", id: "hEnergy" }), el("div", { class: "stat", id: "hComp" }), el("div", { class: "stat", id: "hFans" }), el("div", { class: "stat", id: "hStrikes" }),
          el("div", { class: "badges", id: "hBadges" }),
          el("div", { class: "hbtns" },
            el("button", { class: "hb", type: "button", title: "Shop (B)", onclick: () => this.app.openShop() }, "🛍️"),
            el("button", { class: "hb", type: "button", title: "Gist Book (J)", onclick: () => this.openBook() }, "📓"),
            el("button", { class: "hb", type: "button", title: "Tea Board (TAB)", onclick: () => this.openTea() }, "☕"),
            el("button", { class: "hb", type: "button", id: "hSound", title: "Sound", onclick: () => { $("#hSound").textContent = audio.toggle() ? "🔊" : "🔈"; } }, audio.enabled ? "🔊" : "🔈"),
            el("button", { class: "hb", type: "button", title: "Menu (ESC)", onclick: () => this.pause() }, "☰"))));
      this.root.append(hud);
      const feed = el("div", { id: "feed" });
      this.root.append(feed);
      const ff = el("button", { id: "ff", type: "button", onclick: () => this.app.fastForward() });
      this.root.append(ff);
      this.root.append(el("div", { id: "prompt" }));
      this.root.append(el("div", { id: "toasts" }));
    }
    hud.hidden = false;
    const y = v.you;
    $("#hTime").textContent = `DAY ${v.day} - ${v.dayName} - ${v.clock}`;
    $("#hRoom").textContent = y.out ? "OUT OF THE HOUSE" : (ROOM_NAMES[y.room] || "").toUpperCase();
    $("#hPot").innerHTML = `<small>PRIZE POT</small>${naira(v.pot)}`;
    $("#hCoins").innerHTML = `<small>COINS</small>🪙 ${y.coins}`;
    $("#hEnergy").innerHTML = `<small>ENERGY ${y.energy}/10</small><span class="pips">${"<i class=on></i>".repeat(Math.max(0, y.energy))}${"<i></i>".repeat(Math.max(0, 10 - y.energy))}</span>`;
    $("#hComp").innerHTML = `<small>COMPOSURE</small><span class="bar"><i style="width:${y.comp}%;background:${y.comp < 30 ? "var(--red)" : y.comp < 55 ? "var(--gold)" : "var(--emerald)"}"></i></span>`;
    const fd = this.prevFans === undefined ? 0 : y.fans - this.prevFans;
    if (fd) this.fanArrow = fd > 0 ? "▲" : "▼";
    this.prevFans = y.fans;
    $("#hFans").innerHTML = `<small>FANS</small>${y.fans} <b class="${this.fanArrow === "▼" ? "dn" : "up"}">${this.fanArrow || ""}</b>`;
    $("#hStrikes").innerHTML = `<small>STRIKES</small><span class="strk">${"⛔".repeat(y.strikes)}${"<i class=o>○</i>".repeat(Math.max(0, 3 - y.strikes))}</span>`;
    const badges = [];
    if (y.hoh) badges.push(["HEAD OF HOUSE", "gold"]);
    if (y.tenant) badges.push(["TENANT", "gold"]);
    if (y.nominated) badges.push(["NOMINATED", "red"]);
    if (y.immune) badges.push(["IMMUNE", "green"]);
    if (y.role === "S") badges.push(["SABOTEUR", "sab"]);
    $("#hBadges").replaceChildren(...badges.map(([t, c]) => el("span", { class: "badge " + c, text: t })));
    const ff = $("#ff");
    ff.hidden = v.phase !== "ROAM";
    ff.innerHTML = v.next ? `<small>NEXT: ${EV_LABEL[v.next.k] || v.next.k.toUpperCase()} ${v.next.at}</small>FAST-FORWARD <b>F</b> ⏩` : `<small>LIGHTS OUT AT 02:00</small>FAST-FORWARD <b>F</b> ⏩`;
    // Feed.
    if (v.feed && v.feed.length) {
      const last = v.feed[v.feed.length - 1];
      if (last.n !== this.lastFeed) {
        this.lastFeed = last.n;
        $("#feed").replaceChildren(el("div", { class: "fh", text: "LIVE FROM THE VIEWERS" }), ...v.feed.slice(-3).map((f) => el("div", { class: "tw" }, el("b", { text: f.h + " " }), f.t)));
      }
    }
    // Notes.
    for (const n of v.notes || []) if (n.id > this.lastNote) { this.lastNote = n.id; this.toast(n.t, n.k); }
  }

  /** The one-line tip under the HUD; empty text hides it. */
  hint(text) {
    let h = $("#hint");
    if (!h) { h = el("div", { id: "hint" }, el("span", { class: "hi", text: "TIP" }), el("span", { class: "ht" })); this.root.append(h); }
    const t = h.querySelector(".ht");
    if (t.textContent !== text) t.textContent = text || "";
    h.hidden = !text;
  }

  toast(text, kind = "info") {
    const box = $("#toasts"); if (!box) return;
    const t = el("div", { class: "toast " + kind, text });
    box.append(t);
    if (kind === "strike") audio.sfx("s_buzzer", 0.6);
    else if (kind === "bad") audio.sfx("s_ooh", 0.5);
    else if (kind === "good") audio.sfx("s_chime", 0.5);
    else audio.sfx("s_ping", 0.35);
    setTimeout(() => t.classList.add("out"), 4200);
    setTimeout(() => t.remove(), 4800);
    while (box.children.length > 4) box.firstChild.remove();
  }

  prompt(html) {
    const p = $("#prompt"); if (!p) return;
    if (p._html === html) return;
    p._html = html;
    p.innerHTML = html || "";
    p.hidden = !html;
  }

  pause() {
    this.modal("PAUSED", el("div", { class: "pausem" },
      el("button", { class: "btn", type: "button", onclick: () => this.closeModal() }, "RESUME"),
      el("button", { class: "btn ghost", type: "button", onclick: () => this.showHow() }, "HOW TO PLAY"),
      el("button", { class: "btn ghost", type: "button", onclick: () => this.showCast() }, "MEET THE HOUSEMATES"),
      el("button", { class: "btn danger", type: "button", onclick: () => { if (confirm("Quit this season and start over?")) { this.closeModal(); this.app.newSeason(); } } }, "QUIT TO MENU")));
  }

  // ------------------------------------------------------------------ dialogue
  /**
   * Show one line. Resolves when the player advances ("next"), when the line's
   * auto timer runs out ("next"), or when the player skips the scene ("skip").
   * opts.auto: ms to hold the finished line before moving on by itself.
   * opts.skippable: show the SKIP button (show events only).
   */
  line(who, text, opts = {}) {
    return new Promise((resolve) => {
      let d = $("#dialog");
      if (!d) {
        d = el("div", { id: "dialog" }, el("div", { class: "dp" }, el("img", { alt: "" })), el("div", { class: "db" }, el("div", { class: "dn" }), el("div", { class: "dt" }), el("div", { class: "dfx" }), el("div", { class: "dh", text: "Click or press SPACE" }),
          el("button", { class: "dskip", type: "button", title: "Skip to the next big moment (ESC)" }, "SKIP ▸▸")));
        this.root.append(d);
      }
      const skipBtn = d.querySelector(".dskip");
      skipBtn.hidden = !opts.skippable;
      const sp = SPEAKERS[who];
      const img = d.querySelector(".dp img");
      const src = sp ? sp.img : this.pic(who, opts.mood || "neutral");
      d.querySelector(".dp").hidden = !src;
      if (src) img.src = src;
      d.classList.toggle("red", !!(sp && sp.red));
      d.classList.toggle("sys", who === "sys");
      const nm = d.querySelector(".dn");
      nm.textContent = sp ? sp.name : this.nameOf(who).toUpperCase();
      nm.style.color = sp ? sp.color : (CAST[who] ? CAST[who].color : "var(--gold)");
      const fx = d.querySelector(".dfx");
      fx.replaceChildren(...(opts.fx || []).map((f) => el("span", { class: "fx", text: f })));
      const sub = opts.sub ? el("div", { class: "dsub", text: opts.sub }) : null;
      const t = d.querySelector(".dt");
      t.textContent = "";
      if (sub) t.after(sub);
      d.hidden = false;
      let i = 0, done = false, over = false, autoT = 0;
      const full = String(text || "");
      const speed = full.length > 140 ? 9 : 16;
      clearInterval(this.typing);
      const armAuto = () => { if (opts.auto) autoT = setTimeout(() => finish("next"), opts.auto); };
      this.typing = setInterval(() => { i += 2; t.textContent = full.slice(0, i); if (i >= full.length) { clearInterval(this.typing); done = true; armAuto(); } }, speed);
      const finish = (how) => {
        if (over) return;
        over = true;
        clearTimeout(autoT); clearInterval(this.typing);
        cleanup(); if (sub) sub.remove(); resolve(how);
      };
      const advance = (e) => {
        if (e && e.target && e.target.closest && e.target.closest(".dskip")) return;
        if (!done) { clearInterval(this.typing); t.textContent = full; done = true; armAuto(); return; }
        finish("next");
      };
      const skip = (e) => { if (e) e.stopPropagation(); finish("skip"); };
      const onKey = (e) => {
        if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); advance(); }
        else if (e.key === "Escape" && opts.skippable) { e.preventDefault(); skip(); }
      };
      const cleanup = () => { d.removeEventListener("click", advance); skipBtn.removeEventListener("click", skip); window.removeEventListener("keydown", onKey, true); };
      d.addEventListener("click", advance);
      skipBtn.addEventListener("click", skip);
      window.addEventListener("keydown", onKey, true);
      this.app.dialogOpen = true;
    });
  }
  hideDialog() { const d = $("#dialog"); if (d) d.hidden = true; this.app.dialogOpen = false; clearInterval(this.typing); }

  async lines(list, fxLast) {
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      await this.line(l.w, l.t, { mood: l.mood, fx: i === list.length - 1 ? fxLast : null });
    }
    this.hideDialog();
  }

  // ------------------------------------------------------------------ choices
  choice(spec, onPick) {
    this.closeChoice();
    const multi = spec.n > 1;
    const sel = new Set();
    const isPeople = spec.o.every((o) => CAST[o.v] || o.v === "pass" || o.v === "none");
    const confirm = multi ? el("button", { class: "btn", type: "button", disabled: "true", onclick: () => { this.closeChoice(); onPick([...sel]); } }, `CONFIRM (0/${spec.n})`) : null;
    const opts = spec.o.map((o) => {
      const b = el("button", { class: "opt" + (isPeople ? " person" : ""), type: "button", onclick: () => {
        audio.sfx("s_whoosh", 0.3);
        if (!multi) { this.closeChoice(); onPick(o.v); return; }
        if (sel.has(o.v)) sel.delete(o.v); else if (sel.size < spec.n) sel.add(o.v);
        b.classList.toggle("on", sel.has(o.v));
        confirm.textContent = `CONFIRM (${sel.size}/${spec.n})`;
        confirm.disabled = sel.size !== spec.n;
      } },
        isPeople && CAST[o.v] ? el("img", { src: portrait(o.v, "neutral"), alt: "" }) : null,
        el("span", { class: "ol", text: o.l }), o.sub ? el("small", { text: o.sub }) : null);
      return b;
    });
    const c = el("div", { id: "choice", class: "screen dim" },
      el("div", { class: "panel choicep" + (spec.k === "red" || spec.k === "redTarget" || spec.k === "strike" ? " red" : "") },
        el("h3", { text: spec.p }),
        el("div", { class: "opts" + (isPeople ? " people" : "") }, opts),
        confirm));
    this.root.append(c);
    this.app.choiceOpen = true;
  }
  closeChoice() { const c = $("#choice"); if (c) c.remove(); this.app.choiceOpen = false; }

  // ------------------------------------------------------------------ wheel
  openWheel(id, onAct) {
    const v = this.app.view;
    const h = v.hm.find((x) => x.id === id);
    if (!h) return;
    this.closeWheel();
    const f = h.feel;
    const meter = (label, n, cls) => el("div", { class: "meter " + cls }, el("small", { text: label }), el("span", { html: "<i class=on></i>".repeat(n) + "<i></i>".repeat(4 - n) }));
    let tab = "VIBE";
    const list = el("div", { class: "acts" });
    const tabs = el("div", { class: "tabs" }, Object.keys(ACT_GROUPS).map((g) => el("button", { class: "tab t-" + g.toLowerCase() + (g === tab ? " on" : ""), type: "button", "data-g": g, onclick: () => { tab = g; draw(); } }, g)));
    const draw = () => {
      for (const b of tabs.children) b.classList.toggle("on", b.dataset.g === tab);
      list.replaceChildren(...ACT_GROUPS[tab].map((a) => {
        const [label, cost, hint] = ACT_INFO[a];
        const disabled = v.you.energy < cost || (a === "breakup" && !h.ship) || (a === "gift" && v.you.coins < 60) || (a === "bribe" && v.you.coins < 120) || (a === "receipt" && !v.gb.some((g) => g.k === "receipt"));
        return el("button", { class: "act", type: "button", disabled: disabled ? "true" : null, onclick: () => pick(a) },
          el("span", { class: "an", text: label }), el("span", { class: "ac", text: `-${cost} ENERGY` }), el("small", { text: hint }));
      }));
    };
    const pick = (a) => {
      if (a === "gist") return this.pickPerson(id, "Spread gist about who?", (x) => this.pickClaim(x, (claim) => { this.closeWheel(); onAct({ act: a, x, claim }); }));
      if (a === "setup") return this.pickPerson(id, `Tell ${h.name} that who talked bad about them?`, (x) => { this.closeWheel(); onAct({ act: a, x }); });
      if (a === "receipt") {
        const about = new Set(); for (const g of v.gb) if (g.k === "receipt") for (const x of g.about) if (x !== id && x !== "you") about.add(x);
        return this.pickPerson(id, "Share a receipt about who?", (x) => { this.closeWheel(); onAct({ act: a, x }); }, [...about]);
      }
      this.closeWheel();
      onAct({ act: a });
    };
    const w = el("div", { id: "wheel", class: "screen dim", onclick: (e) => { if (e.target.id === "wheel") this.closeWheel(); } },
      el("div", { class: "panel wheelp", style: { "--c": CAST[id].color } },
        el("div", { class: "who" },
          el("img", { src: portrait(id, f.b >= 3 ? "angry" : f.r >= 3 ? "flirty" : f.f >= 3 ? "happy" : "neutral"), alt: "" }),
          el("div", {},
            el("h3", { text: h.name }), el("p", { class: "muted", text: CAST[id].traits.join(" · ") }),
            el("div", { class: "meters" }, meter("FRIEND", f.f, "mf"), meter("LOVE", f.r, "mr"), meter("TRUST", f.t, "mt"), meter("BEEF", f.b, "mb")),
            el("div", { class: "tags" }, h.promised ? el("span", { class: "tag", text: "PROMISED YOUR SAVE" }) : null, h.squad ? el("span", { class: "tag", text: "SQUAD" }) : null, h.ship ? el("span", { class: "tag pink", text: h.ship === "official" ? "YOUR SHIP" : "SPARK" }) : null, ...h.badges.map((b) => el("span", { class: "tag", text: b }))),
          ),
          el("button", { class: "x", type: "button", onclick: () => this.closeWheel() }, "✕")),
        tabs, list,
        el("p", { class: "energy", text: `SOCIAL ENERGY ${v.you.energy}/10  ·  COINS ${v.you.coins}` })));
    draw();
    this.root.append(w);
    this.app.modalOpen = true;
  }
  closeWheel() { const w = $("#wheel"); if (w) w.remove(); this.app.modalOpen = !!$("#modal"); }

  pickPerson(exclude, title, cb, only) {
    const v = this.app.view;
    const pool = v.hm.filter((h) => !h.out && h.id !== exclude && (!only || only.includes(h.id)));
    const body = el("div", { class: "opts people" }, pool.map((h) => el("button", { class: "opt person", type: "button", onclick: () => { cb(h.id); } }, el("img", { src: portrait(h.id, "neutral"), alt: "" }), el("span", { class: "ol", text: h.name }))));
    const panel = $("#wheel .panel");
    panel.replaceChildren(el("div", { class: "phead" }, el("h3", { text: title }), el("button", { class: "x", type: "button", onclick: () => this.closeWheel() }, "✕")), pool.length ? body : el("p", { text: "Nobody fits." }));
  }
  pickClaim(x, cb) {
    const panel = $("#wheel .panel");
    panel.replaceChildren(el("div", { class: "phead" }, el("h3", { text: `What do you say about ${this.nameOf(x)}?` }), el("button", { class: "x", type: "button", onclick: () => this.closeWheel() }, "✕")),
      el("div", { class: "opts" }, Object.entries(CLAIMS).map(([k, t]) => el("button", { class: "opt", type: "button", onclick: () => cb(k) }, el("span", { class: "ol", text: `"${this.nameOf(x)} ${t}."` })))),
      el("p", { class: "muted", text: "If it isn't true, it's a lie. Lies get exposed when people compare notes." }));
  }

  // ------------------------------------------------------------------ book / tea
  openBook() {
    const v = this.app.view; if (!v || !v.gb) return;
    let tab = "receipt";
    const body = el("div", { class: "book" });
    const tabs = el("div", { class: "tabs" }, [["receipt", "RECEIPTS"], ["gist", "GIST"], ["secret", "SECRETS"], ["lies", "YOUR LIES"], ["mission", "MISSION"]].map(([k, l]) => el("button", { class: "tab" + (k === tab ? " on" : ""), type: "button", "data-k": k, onclick: () => { tab = k; draw(); } }, l)));
    const day = (d, m) => `DAY ${d} ${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const draw = () => {
      for (const b of tabs.children) b.classList.toggle("on", b.dataset.k === tab);
      let items;
      if (tab === "lies") items = v.lies.length ? v.lies.map((l) => el("div", { class: "entry" + (l.exposed ? " bad" : "") }, el("b", { text: l.exposed ? "EXPOSED" : "STILL HIDDEN" }), ` You told ${this.nameOf(l.to)} that ${this.nameOf(l.about)} ${CLAIMS[l.c] || "said things"}.`)) : [el("p", { class: "muted", text: "No lies. Yet." })];
      else if (tab === "mission") items = [v.mission ? el("div", { class: "entry" }, el("b", { text: v.mission.done ? (v.mission.failed ? "EXPIRED" : "COMPLETE") : "ACTIVE" }), " " + v.mission.text) : el("p", { class: "muted", text: "Mama Eye has not given you a mission." })];
      else {
        const list = v.gb.filter((g) => g.k === tab);
        items = list.length ? list.map((g) => el("div", { class: "entry " + g.k }, el("small", { text: day(g.d, g.m) }), el("div", { text: g.t }))) : [el("p", { class: "muted", text: tab === "receipt" ? "Listen in on whispers (L) to collect receipts." : "Nothing here yet." })];
      }
      body.replaceChildren(...items);
    };
    draw();
    this.modal("GIST BOOK", el("div", {}, tabs, body), "wide");
  }

  openTea() {
    const v = this.app.view; if (!v || !v.hm) return;
    const pips = (n, cls) => el("span", { class: "pips " + cls, html: "<i class=on></i>".repeat(n) + "<i></i>".repeat(4 - n) });
    const cards = v.hm.map((h) => el("div", { class: "tea" + (h.out ? " out" : ""), style: { "--c": CAST[h.id].color } },
      el("img", { src: portrait(h.id, h.out ? "sad" : h.feel.b >= 3 ? "angry" : h.feel.r >= 3 ? "flirty" : h.feel.f >= 3 ? "happy" : "neutral"), alt: "" }),
      el("h4", { text: h.name }),
      h.out ? el("p", { class: "gone", text: h.out.toUpperCase() }) : el("div", { class: "feel" },
        el("div", {}, el("small", { text: "FRIEND" }), pips(h.feel.f, "mf")), el("div", {}, el("small", { text: "LOVE" }), pips(h.feel.r, "mr")),
        el("div", {}, el("small", { text: "TRUST" }), pips(h.feel.t, "mt")), el("div", {}, el("small", { text: "BEEF" }), pips(h.feel.b, "mb"))),
      el("div", { class: "tags" }, h.promised ? el("span", { class: "tag", text: "PROMISED" }) : null, h.squad ? el("span", { class: "tag", text: "SQUAD" }) : null, h.ship ? el("span", { class: "tag pink", text: h.ship === "official" ? "SHIP" : "SPARK" }) : null, h.role === "S" ? el("span", { class: "tag sab", text: "SABOTEUR" }) : null, ...h.badges.map((b) => el("span", { class: "tag", text: b })))));
    const ships = v.ships.map((s) => el("span", { class: "tag pink", text: `#${s.name}` }));
    const beefs = v.beefs.slice(-8).map(([a, b]) => el("span", { class: "tag red", text: `${this.nameOf(a)} vs ${this.nameOf(b)}` }));
    this.modal("TEA BOARD", el("div", {},
      el("p", { class: "muted", text: "How each housemate feels about YOU, plus what the whole house knows." }),
      el("div", { class: "teagrid" }, cards),
      el("div", { class: "pub" }, el("h4", { text: "SHIPS" }), ships.length ? ships : el("span", { class: "muted", text: "None yet" }), el("h4", { text: "BEEFS" }), beefs.length ? beefs : el("span", { class: "muted", text: "Peaceful... for now" })),
      v.squad ? el("p", {}, el("b", { text: v.squad.name + ": " }), v.squad.members.map((m) => this.nameOf(m)).join(", ")) : null), "wide");
  }

  // ------------------------------------------------------------------ banners & end
  banner(title, sub, size) {
    for (const old of this.root.querySelectorAll(".banner")) old.remove();
    const b = el("div", { class: "banner" + (size ? " " + size : "") }, el("h2", { text: title }), sub ? el("p", { text: sub }) : null);
    this.root.append(b);
    audio.sfx("s_whoosh", 0.5);
    setTimeout(() => b.classList.add("out"), 2600);
    setTimeout(() => b.remove(), 3200);
  }

  recap(res, onNew) {
    const nm = (id) => this.nameOf(id);
    const sab = res.sabs.map(nm).join(" and ");
    const board = res.fanBoard.map((f, i) => el("div", { class: "fanrow" + (f.id === "you" ? " me" : "") }, el("b", { text: `${i + 1}.` }), el("img", { src: this.pic(f.id, "neutral"), alt: "" }), el("span", { text: nm(f.id) }), el("i", { text: f.out ? f.out.toUpperCase() : "" }), el("em", { text: f.fans })));
    const s = el("div", { id: "recap", class: "screen" },
      el("div", { class: "menu-bg" }),
      el("div", { class: "panel recapp" },
        el("p", { class: "kicker", text: "WEEK ONE RECAP" }),
        el("h1", { text: res.headline }),
        el("div", { class: "grade" }, el("span", { text: res.grade }), el("small", { text: "YOUR GRADE" })),
        el("div", { class: "stats" },
          el("div", {}, el("b", { text: `#${res.rank}` }), el("small", { text: "FAN RANK" })),
          el("div", {}, el("b", { text: res.fans }), el("small", { text: "FANS" })),
          el("div", {}, el("b", { text: res.receipts }), el("small", { text: "RECEIPTS" })),
          el("div", {}, el("b", { text: `${res.exposedLies}/${res.lies}` }), el("small", { text: "LIES EXPOSED" })),
          el("div", {}, el("b", { text: naira(res.pot) }), el("small", { text: "PRIZE POT" }))),
        el("div", { class: "cols" },
          el("div", {}, el("h4", { text: "YOUR SHIPS" }), res.ships.length ? res.ships.map((x) => el("p", { text: `#${x.name} with ${nm(x.with)}${x.official ? "" : " (spark)"}` })) : el("p", { class: "muted", text: "Single and focused." }),
            el("h4", { text: "BESTIES" }), el("p", { text: res.besties.length ? res.besties.map(nm).join(", ") : "None" }),
            el("h4", { text: "BEEF" }), el("p", { text: res.beefs.length ? res.beefs.map(nm).join(", ") : "None" })),
          el("div", {}, el("h4", { text: "THE TRUTH" }),
            el("p", { html: `The Saboteurs were <b>${sab}</b>.` }),
            res.struck ? el("p", { text: `${nm(res.struck)} was struck by them on Friday night. ${res.sabs.includes(res.struck) ? "" : `${nm(res.struck)} was innocent.`}` }) : null,
            res.exposed.length ? el("p", { text: `${res.exposed.map(nm).join(", ")} got exposed at the Showdown.` }) : el("p", { text: "Nobody exposed them at the Showdown." }),
            el("h4", { text: "FAN LEADERBOARD" }), el("div", { class: "fanboard" }, board))),
        el("p", { class: "loadingw", text: "WEEK TWO LOADING..." }),
        el("button", { class: "btn big", type: "button", onclick: onNew }, "PLAY A NEW SEASON")));
    this.root.append(s);
  }
}
