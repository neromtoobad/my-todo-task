// Every screen of Party Mode that is not the 3D house: home, lobby, the role
// reveal, the play HUD, the map, house meetings, results and the end screen.
// The 3D side (main.js) owns positions and the camera; this file only draws.
import { $, el, portrait, LOOK_COLOR, mmss } from "./dom.js";
import { STATIONS, QUICK, ROOM_LABEL, LOOKS, LOOK_NAME } from "./stations.js";
import { audio } from "./audio.js";

const ROLE = {
  H: { name: "HOUSEMATE", color: "var(--emerald)", line: "Do your chores. Find the Saboteurs. Vote them out." },
  S: { name: "SABOTEUR", color: "var(--sab)", line: "Strike housemates when nobody is watching. Sabotage the house. Blend in." },
};
const OPT_LABEL = {
  fill: ["Players (AI fills)", (v) => String(v)],
  sabs: ["Saboteurs", (v) => (v ? String(v) : "Auto")],
  kill: ["Strike cooldown", (v) => v + "s"],
  discuss: ["Discussion", (v) => v + "s"],
  vote: ["Voting", (v) => v + "s"],
  reveal: ["Reveal role on eviction", (v) => (v ? "On" : "Off")],
};
const OPT_VALUES = { fill: [5, 6, 7, 8, 9, 10], sabs: [0, 1, 2, 3], kill: [20, 25, 30, 35, 40, 50], discuss: [20, 30, 40, 60, 90], vote: [15, 20, 25, 30, 45], reveal: [true, false] };

function key(o) { return JSON.stringify(o); }

export class Hud {
  constructor(app) {
    this.app = app;
    this.root = $("#ui");
    this.muted = new Set();
    this.k = {};
    this.lastFeed = 0;
    this.lastChat = 0;
  }
  clear(except = []) {
    for (const c of [...this.root.children]) if (!except.includes(c.id)) c.remove();
    this.k = {};
  }
  now() { return this.app.serverNow(); }
  nameOf(id) { const v = this.app.view; const p = v && v.ps && v.ps.find((q) => q.id === id); return p ? p.name : "someone"; }
  lookOf(id) { const v = this.app.view; const p = v && v.ps && v.ps.find((q) => q.id === id); return p ? p.look : "pf"; }

  // ------------------------------------------------------------------ loading
  loading(pct, label) {
    let l = $("#loading");
    if (pct >= 1) { if (l) { l.classList.add("done"); setTimeout(() => l.remove(), 500); } return; }
    if (!l) {
      l = el("div", { id: "loading", class: "screen" }, el("h1", { class: "logo", html: "WAHALA<br>HOUSE" }), el("p", { class: "lsub", text: "Party Mode" }), el("div", { class: "lbar" }, el("i")), el("p", { class: "ltext" }));
      document.body.append(l);
    }
    l.querySelector(".lbar i").style.width = Math.round(pct * 100) + "%";
    if (label) l.querySelector(".ltext").textContent = label;
  }

  // ------------------------------------------------------------------ toasts
  toast(text, kind = "info") {
    let box = $("#toasts");
    if (!box) { box = el("div", { id: "toasts" }); document.body.append(box); }
    const t = el("div", { class: "toast " + kind, text });
    box.append(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3600);
  }
  feed(v) {
    for (const f of v.feed || []) {
      if (f.i <= this.lastFeed) continue;
      this.lastFeed = f.i;
      if (f.k === "sab") continue; // the alarm banner says it louder
      this.toast(f.t, f.k === "end" ? "good" : f.k === "evict" || f.k === "meet" ? "bad" : "info");
    }
  }

  // ------------------------------------------------------------------ home
  home(opts, on) {
    this.clear();
    const { name, look, invite, stats } = opts;
    let pick = look || "pf";
    const input = el("input", { type: "text", maxlength: "14", placeholder: "Your name", autocomplete: "off", spellcheck: "false", value: name || "" });
    const looks = el("div", { class: "looks" }, LOOKS.map((l) => el("button", {
      class: "lk" + (l === pick ? " on" : ""), type: "button", title: LOOK_NAME[l], "data-l": l, style: { "--c": LOOK_COLOR[l] },
      onclick: () => { pick = l; for (const b of looks.children) b.classList.toggle("on", b.dataset.l === l); audio.sfx("s_whoosh", 0.3); },
    }, el("img", { src: portrait(l, "happy"), alt: LOOK_NAME[l], loading: "lazy" }))));
    const err = el("p", { class: "err" });
    const valid = () => {
      const n = input.value.trim();
      if (n.length < 2) { err.textContent = "Type a name first (2 to 14 letters)."; input.focus(); return null; }
      err.textContent = "";
      return n;
    };
    const code = el("input", { type: "text", maxlength: "6", placeholder: "CODE", autocomplete: "off", spellcheck: "false", class: "code" });
    code.addEventListener("input", () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
    const go = (fn) => () => { const n = valid(); if (!n) return; audio.unlock(); fn(n, pick); };
    const live = el("p", { class: "live", text: stats && stats.players ? `🟢 ${stats.players} ${stats.players === 1 ? "person" : "people"} in the house right now` : "🟢 Games start in seconds. AI housemates fill empty seats." });
    const box = el("div", { id: "home", class: "screen" },
      el("div", { class: "hcard" },
        el("h1", { class: "logo", html: "WAHALA<br>HOUSE" }),
        el("p", { class: "tag", text: "Two of the housemates are Saboteurs. Do your chores, catch them, vote them out. Or be one." }),
        live,
        el("label", { class: "lbl", text: "Your name" }), input,
        el("label", { class: "lbl", text: "Your look" }), looks,
        err,
        invite
          ? el("button", { class: "btn big", type: "button", onclick: go((n, l) => on.join(n, l, invite)) }, `JOIN ROOM ${invite}`)
          : el("button", { class: "btn big", type: "button", onclick: go(on.quick) }, "QUICK PLAY"),
        el("div", { class: "row2" },
          el("button", { class: "btn ghost", type: "button", onclick: go(on.create) }, "CREATE PRIVATE ROOM"),
          el("div", { class: "joinrow" }, code, el("button", { class: "btn ghost", type: "button", onclick: go((n, l) => { const c = code.value.trim(); if (c.length < 4) { err.textContent = "Type the room code your friend sent."; return; } on.join(n, l, c); }) }, "JOIN"))),
        el("div", { class: "links" },
          el("button", { class: "link", type: "button", text: "How to play", onclick: () => this.howTo() }),
          el("button", { class: "link", type: "button", text: audio.enabled ? "Sound: on" : "Sound: off", onclick: (e) => { e.target.textContent = audio.toggle() ? "Sound: on" : "Sound: off"; } }))));
    this.root.append(box);
    setTimeout(() => { if (!input.value) input.focus(); }, 300);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") (invite ? go((n, l) => on.join(n, l, invite)) : go(on.quick))(); });
  }
  setStats(stats) {
    const l = $("#home .live");
    if (l && stats && stats.players) l.textContent = `🟢 ${stats.players} ${stats.players === 1 ? "person" : "people"} in the house right now`;
  }

  howTo() {
    const m = el("div", { id: "modal", class: "screen dim", onclick: (e) => { if (e.target === m) m.remove(); } },
      el("div", { class: "mcard" },
        el("h2", { text: "How to play" }),
        el("ul", { class: "rules" },
          el("li", { html: "<b>Housemates</b> do chores around the house. When the chore bar fills up, the house wins." }),
          el("li", { html: "<b>Saboteurs</b> (one or two of you) fake chores, <b>strike</b> housemates who are alone with them, and sabotage: NEPA takes light, or a gas leak that must be closed in time." }),
          el("li", { html: "Find a body? <b>Report</b> it. Something off? Ring <b>Mama Eye's bell</b> in the lounge. Everyone meets, talks, and votes someone out." }),
          el("li", { html: "Some chores (jollof, weights, sweeping, the pool, the plantain) show a ✅ to anyone watching. Saboteurs can't make that happen." }),
          el("li", { html: "Struck housemates become ghosts. Keep doing chores; the living can't hear you." }),
          el("li", { html: "Move with <b>WASD</b>/arrows or the joystick. <b>E</b> uses, <b>R</b> reports, <b>Q</b> strikes, <b>M</b> map." }),
        ),
        el("button", { class: "btn", type: "button", text: "Got it", onclick: () => m.remove() })));
    document.body.append(m);
  }

  // ------------------------------------------------------------------ lobby
  lobby(v, on) {
    let box = $("#lobby");
    if (!box) {
      this.clear();
      box = el("div", { id: "lobby", class: "screen side" },
        el("div", { class: "lhead" }), el("div", { class: "lplayers" }), el("div", { class: "llook" }), el("div", { class: "lopts" }), el("div", { class: "lfoot" }));
      this.root.append(box);
    }
    const me = v.me;
    const isHost = v.host === me.id;
    const code = this.app.room;
    const pubCode = code && code.startsWith("q-");
    const hk = key([code, v.pub, isHost]);
    if (this.k.lhead !== hk) {
      this.k.lhead = hk;
      const head = box.querySelector(".lhead");
      head.innerHTML = "";
      if (pubCode || v.pub) head.append(el("h2", { text: "QUICK PLAY" }), el("p", { class: "sub", text: "You're in a public lobby. Strangers and AI housemates fill the seats." }));
      else {
        const link = `${location.origin}/?room=${encodeURIComponent(code)}`;
        head.append(el("p", { class: "sub", text: "ROOM CODE" }), el("h2", { class: "bigcode", text: code }),
          el("div", { class: "share" },
            el("button", { class: "btn small", type: "button", text: "Copy link", onclick: () => { navigator.clipboard && navigator.clipboard.writeText(link).then(() => this.toast("Link copied. Send it to your people.", "good")).catch(() => this.toast(link)); } }),
            el("a", { class: "btn small wa", href: `https://wa.me/?text=${encodeURIComponent(`Enter the Wahala House with me. Who's the Saboteur? ${link}`)}`, target: "_blank", rel: "noopener", text: "Share on WhatsApp" })));
      }
    }
    const humans = v.ps;
    const fill = Math.max(v.opts.fill, humans.length);
    const pk = key([humans.map((p) => [p.id, p.name, p.look]), fill, v.host]);
    if (this.k.lplayers !== pk) {
      this.k.lplayers = pk;
      const grid = box.querySelector(".lplayers");
      grid.innerHTML = "";
      for (const p of humans) grid.append(el("div", { class: "pcard" + (p.id === me.id ? " me" : ""), style: { "--c": LOOK_COLOR[p.look] } },
        el("img", { src: portrait(p.look, "happy"), alt: "" }), el("b", { text: p.name }), p.id === v.host ? el("i", { class: "crown", text: "👑" }) : null));
      for (let i = humans.length; i < fill; i++) grid.append(el("div", { class: "pcard ai" }, el("span", { text: "🤖" }), el("b", { text: "AI housemate" })));
    }
    const taken = new Set(humans.filter((p) => p.id !== me.id).map((p) => p.look));
    const lk = key([me.look, [...taken]]);
    if (this.k.llook !== lk) {
      this.k.llook = lk;
      const row = box.querySelector(".llook");
      row.innerHTML = "";
      row.append(el("p", { class: "sub", text: "Your look" }), el("div", { class: "looks small" }, LOOKS.map((l) => el("button", {
        class: "lk" + (l === me.look ? " on" : "") + (taken.has(l) ? " taken" : ""), type: "button", title: LOOK_NAME[l], style: { "--c": LOOK_COLOR[l] }, disabled: taken.has(l) || undefined,
        onclick: () => on.look(l),
      }, el("img", { src: portrait(l, "happy"), alt: "" })))));
    }
    const ok = key([v.opts, isHost]);
    if (this.k.lopts !== ok) {
      this.k.lopts = ok;
      const opts = box.querySelector(".lopts");
      opts.innerHTML = "";
      opts.append(el("p", { class: "sub", text: isHost ? "House rules (you're the host)" : "House rules" }),
        el("div", { class: "optgrid" }, Object.keys(OPT_LABEL).map((k) => {
          const [label, fmt] = OPT_LABEL[k];
          const vals = OPT_VALUES[k];
          const cur = v.opts[k];
          return el("div", { class: "opt" }, el("span", { text: label }),
            isHost
              ? el("button", { class: "chip", type: "button", text: fmt(cur), onclick: () => { const i = vals.indexOf(cur); on.opts({ [k]: vals[(i + 1) % vals.length] }); } })
              : el("b", { text: fmt(cur) }));
        })));
    }
    const left = v.fillAt ? v.fillAt - this.now() : 0;
    const fk = key([isHost, v.pub, Math.ceil(left / 1000), humans.length, fill]);
    if (this.k.lfoot !== fk) {
      this.k.lfoot = fk;
      const foot = box.querySelector(".lfoot");
      foot.innerHTML = "";
      const bots = Math.max(0, fill - humans.length);
      if (v.pub && v.fillAt) foot.append(el("p", { class: "count", text: `Starting in ${mmss(left)}` }), el("p", { class: "sub", text: bots ? `${bots} AI housemate${bots > 1 ? "s" : ""} will fill the empty seats.` : "Full house!" }));
      if (isHost) foot.append(el("button", { class: "btn big", type: "button", onclick: on.start }, bots ? `START (+${bots} AI)` : "START"));
      else if (!v.pub) foot.append(el("p", { class: "sub", text: `Waiting for ${this.nameOf(v.host)} to start...` }));
      foot.append(el("button", { class: "btn ghost small", type: "button", text: "Leave", onclick: on.leave }));
    }
  }

  // ------------------------------------------------------------------ intro
  intro(v) {
    if ($("#intro")) return;
    this.clear(["hud"]);
    const r = ROLE[v.me.role] || ROLE.H;
    const partners = v.ps.filter((p) => p.role === "S" && p.id !== v.me.id);
    const n = v.ps.filter((p) => !p.spec).length;
    const box = el("div", { id: "intro", class: "screen dim", style: { "--rc": r.color } },
      el("div", { class: "icard" },
        el("p", { class: "sub", text: v.me.spec ? "You're watching this round" : "You are a" }),
        el("h1", { class: "role", text: v.me.spec ? "SPECTATOR" : r.name }),
        el("img", { class: "rimg", src: portrait(v.me.look, v.me.role === "S" ? "angry" : "happy"), alt: "" }),
        el("p", { class: "rline", text: v.me.spec ? "You'll join the next round." : r.line }),
        partners.length ? el("p", { class: "partner", text: `Your partner${partners.length > 1 ? "s" : ""}: ${partners.map((p) => p.name).join(", ")}` }) : null,
        el("p", { class: "sub", text: `${n} in the house · ${v.opts.sabs || (n <= 6 ? 1 : 2)} Saboteur${(v.opts.sabs || (n <= 6 ? 1 : 2)) > 1 ? "s" : ""}` })));
    this.root.append(box);
  }

  // ------------------------------------------------------------------ play HUD
  play(v, on) {
    let box = $("#hud");
    if (!box) {
      for (const id of ["intro", "lobby", "meet", "end", "home"]) { const n = $("#" + id); if (n) n.remove(); }
      box = el("div", { id: "hud" },
        el("div", { class: "bar" }, el("span", { text: "HOUSE CHORES" }), el("div", { class: "track" }, el("i")), el("b")),
        el("div", { class: "tasks" }),
        el("div", { class: "topr" },
          el("div", { class: "rolechip" }),
          el("button", { class: "ib", type: "button", title: "Map (M)", text: "🗺️", onclick: on.map }),
          el("button", { class: "ib", type: "button", title: "Menu", text: "☰", onclick: on.menu })),
        el("div", { class: "alarm", hidden: true }),
        el("div", { class: "ghostnote", hidden: true }),
        el("div", { class: "acts" },
          el("button", { class: "act use", type: "button", hidden: true, "data-a": "use", onclick: () => on.act("use") }, el("i", { text: "✋" }), el("b", { text: "USE" })),
          el("button", { class: "act report", type: "button", hidden: true, "data-a": "report", onclick: () => on.act("report") }, el("i", { text: "📢" }), el("b", { text: "REPORT" })),
          el("button", { class: "act bell", type: "button", hidden: true, "data-a": "bell", onclick: () => on.act("bell") }, el("i", { text: "🔔" }), el("b", { text: "BELL" })),
          el("button", { class: "act sab", type: "button", hidden: true, "data-a": "sab", onclick: () => on.act("sab") }, el("i", { text: "💥" }), el("b", { text: "SABOTAGE" }), el("em")),
          el("button", { class: "act strike", type: "button", hidden: true, "data-a": "strike", onclick: () => on.act("strike") }, el("i", { text: "🔪" }), el("b", { text: "STRIKE" }), el("em"))));
      this.root.append(box);
      // A fresh HUD (after a meeting) must redraw everything it caches.
      this.k = {};
    }
    const me = v.me;
    box.querySelector(".bar i").style.width = Math.round(v.bar * 100) + "%";
    box.querySelector(".bar b").textContent = Math.round(v.bar * 100) + "%";
    const tk = key([me.tasks, me.role, me.alive]);
    if (this.k.tasks !== tk) {
      this.k.tasks = tk;
      const t = box.querySelector(".tasks");
      t.innerHTML = "";
      const left = me.tasks.filter((x) => !x.done).length;
      t.append(el("h4", { text: `${me.role === "S" ? "FAKE CHORES" : me.alive ? "YOUR CHORES" : "GHOST CHORES"} · ${left} left`, onclick: () => t.classList.toggle("min") }),
        ...me.tasks.map((x) => el("div", { class: "tk" + (x.done ? " done" : "") }, el("span", { text: STATIONS[x.id].icon }), el("b", { text: STATIONS[x.id].label }), el("em", { text: ROOM_LABEL[STATIONS[x.id].room] }))));
    }
    const rk = key([me.role, me.alive, v.ps.filter((p) => p.role === "S").map((p) => p.id)]);
    if (this.k.role !== rk) {
      this.k.role = rk;
      const chip = box.querySelector(".rolechip");
      const partners = v.ps.filter((p) => p.role === "S" && p.id !== me.id).map((p) => p.name);
      chip.className = "rolechip " + (me.role === "S" ? "s" : "h");
      chip.textContent = (me.alive ? "" : "👻 ") + (me.role === "S" ? `SABOTEUR${partners.length ? " · with " + partners.join(", ") : ""}` : "HOUSEMATE");
    }
    // Sabotage alarm.
    const alarm = box.querySelector(".alarm");
    if (v.sab) {
      const left = v.sab.ends ? v.sab.ends - this.now() : 0;
      alarm.hidden = false;
      alarm.className = "alarm " + v.sab.k;
      alarm.textContent = v.sab.k === "nepa" ? "⚡ NEPA HAS TAKEN LIGHT! Fix the gen in the garden." : `☠️ GAS LEAK! Close both valves (kitchen and garden) ${mmss(left)} · ${v.sab.fixed.length}/2`;
    } else alarm.hidden = true;
    const gn = box.querySelector(".ghostnote");
    if (!me.alive && !me.spec) {
      gn.hidden = false;
      const by = me.by ? ` ${this.nameOf(me.by)} struck you.` : me.ej ? " The house voted you out." : "";
      gn.textContent = `👻 You're a ghost.${by} ${me.role === "S" ? "You can still watch." : "Keep doing chores to help the house."}`;
    } else if (me.spec) { gn.hidden = false; gn.textContent = "👀 You're watching. You'll join the next round."; }
    else gn.hidden = true;
  }

  /** Light up the buttons that do something right now. Called every frame by main.js. */
  actions(st) {
    const box = $("#hud");
    if (!box) return;
    for (const b of box.querySelectorAll(".act")) {
      const a = st[b.dataset.a];
      b.hidden = !a || a.hidden;
      if (b.hidden) continue;
      // Out-of-range buttons keep their slot so the others never jump under a thumb.
      b.classList.toggle("away", !!a.away);
      b.disabled = !a.on;
      const em = b.querySelector("em");
      if (em) em.textContent = a.secs ? String(a.secs) : "";
      if (a.label) b.querySelector("b").textContent = a.label;
    }
  }

  sabMenu(v, onPick) {
    if ($("#sabmenu")) { $("#sabmenu").remove(); return; }
    const m = el("div", { id: "sabmenu", class: "pop" },
      el("button", { class: "btn small", type: "button", onclick: () => { m.remove(); onPick("nepa"); } }, "⚡ NEPA blackout"),
      el("button", { class: "btn small danger", type: "button", onclick: () => { m.remove(); onPick("gas"); } }, "☠️ Gas leak (40s)"),
      el("button", { class: "btn ghost small", type: "button", text: "Cancel", onclick: () => m.remove() }));
    this.root.append(m);
  }

  menu(on) {
    if ($("#modal")) return;
    const m = el("div", { id: "modal", class: "screen dim", onclick: (e) => { if (e.target === m) m.remove(); } },
      el("div", { class: "mcard" },
        el("h2", { text: "Menu" }),
        el("button", { class: "btn", type: "button", text: audio.enabled ? "Sound: on" : "Sound: off", onclick: (e) => { e.target.textContent = audio.toggle() ? "Sound: on" : "Sound: off"; } }),
        el("button", { class: "btn", type: "button", text: "How to play", onclick: () => { m.remove(); this.howTo(); } }),
        el("button", { class: "btn ghost", type: "button", text: "Leave the house", onclick: () => { m.remove(); on.leave(); } }),
        el("button", { class: "btn ghost", type: "button", text: "Back", onclick: () => m.remove() })));
    document.body.append(m);
  }

  // ------------------------------------------------------------------ map
  map(v, myPos) {
    if ($("#map")) { $("#map").remove(); return; }
    const W = 36, D = 26;
    const pct = (x, z) => ({ left: (x / W) * 100 + "%", top: (z / D) * 100 + "%" });
    const rooms = [["kitchen", 0, 0, 11, 10], ["lounge", 11, 0, 23, 10], ["hoh", 23, 0, 30, 8], ["bedroom", 0, 10, 11, 22], ["gym", 11, 10, 16, 15], ["garden", 16, 10, 36, 26]];
    const area = el("div", { class: "mapbox" },
      rooms.map(([id, x0, z0, x1, z1]) => el("div", { class: "mroom " + id, style: { left: (x0 / W) * 100 + "%", top: (z0 / D) * 100 + "%", width: ((x1 - x0) / W) * 100 + "%", height: ((z1 - z0) / D) * 100 + "%" } }, el("span", { text: ROOM_LABEL[id] }))),
      v.me.tasks.filter((t) => !t.done).map((t) => el("i", { class: "mdot task", style: pct(STATIONS[t.id].x, STATIONS[t.id].z), title: STATIONS[t.id].label, text: STATIONS[t.id].icon })),
      v.sab ? (v.sab.k === "nepa" ? ["gen"] : ["gas1", "gas2"].filter((g) => !v.sab.fixed.includes(g))).map((id) => el("i", { class: "mdot fix", style: pct(STATIONS[id].x, STATIONS[id].z), text: STATIONS[id].icon })) : null,
      el("i", { class: "mdot bellm", style: pct(STATIONS.bell.x, STATIONS.bell.z), text: "🔔" }),
      myPos ? el("i", { class: "mdot me", style: pct(myPos[0], myPos[1]) }) : null);
    const m = el("div", { id: "map", class: "screen dim", onclick: () => m.remove() }, el("div", { class: "mapcard" }, el("h3", { text: "THE HOUSE" }), area, el("p", { class: "sub", text: "Tap anywhere to close" })));
    this.root.append(m);
  }

  // ------------------------------------------------------------------ meetings
  meeting(v, on) {
    let box = $("#meet");
    if (!box) {
      for (const id of ["hud", "intro", "map", "sabmenu", "chore"]) { const n = $("#" + id); if (n) n.remove(); }
      box = el("div", { id: "meet", class: "screen" },
        el("div", { class: "mpanel" },
          el("div", { class: "mhead" }, el("span", { class: "micon" }), el("div", {}, el("h2"), el("p", { class: "sub" })), el("b", { class: "timer" })),
          el("div", { class: "cards" }),
          el("div", { class: "votebar" }),
          el("div", { class: "chat" }),
          el("div", { class: "say" },
            el("button", { class: "btn small", type: "button", text: "Quick ▾", onclick: () => this.quick(this.app.view, on) }),
            el("input", { type: "text", maxlength: "100", placeholder: "Say something...", autocomplete: "off", enterkeyhint: "send" }),
            el("button", { class: "btn small", type: "button", text: "Send", onclick: () => send() })),
          el("div", { class: "result", hidden: true })));
      this.root.append(box);
      const input = box.querySelector(".say input");
      const send = () => { const t = input.value.trim(); if (!t) return; on.chat({ text: t }); input.value = ""; };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); e.stopPropagation(); });
      this.lastChat = 0;
      this.pick = null;
      // A second meeting can look identical to the last one; redraw it all.
      this.k = {};
      audio.sfx("s_gasp", 0.6);
    }
    const m = v.meet || {};
    const me = v.me;
    // Header.
    const hk = key([m.kind, m.by, m.body, m.room, v.phase]);
    if (this.k.mhead !== hk) {
      this.k.mhead = hk;
      box.querySelector(".micon").textContent = m.kind === "body" ? "💀" : "🔔";
      box.querySelector(".mhead h2").textContent = v.phase === "RESULT" ? "THE HOUSE HAS VOTED" : m.kind === "body" ? "BODY REPORTED" : "HOUSE MEETING";
      box.querySelector(".mhead .sub").textContent = m.kind === "body"
        ? `${this.nameOf(m.by)} found ${this.nameOf(m.body)}${m.room ? " in the " + (ROOM_LABEL[m.room] || m.room).toLowerCase() : ""}.`
        : `${this.nameOf(m.by)} rang Mama Eye's bell.`;
    }
    const left = v.ends - this.now();
    box.querySelector(".timer").textContent = v.phase === "MEET" ? `Talk ${mmss(left)}` : v.phase === "VOTE" ? `Vote ${mmss(left)}` : "";
    // Player cards.
    const voting = v.phase === "VOTE" && me.alive && !me.spec && !m.myVote;
    const ck = key([v.ps.map((p) => [p.id, p.alive, p.voted, p.ej]), voting, this.pick, m.myVote, [...this.muted], v.phase]);
    if (this.k.cards !== ck) {
      this.k.cards = ck;
      const cards = box.querySelector(".cards");
      cards.innerHTML = "";
      for (const p of v.ps.filter((q) => !q.spec)) {
        const dead = p.alive === false;
        const c = el("button", {
          class: "vcard" + (dead ? " dead" : "") + (p.id === me.id ? " me" : "") + (this.pick === p.id ? " pick" : "") + (m.myVote === p.id ? " myvote" : ""),
          type: "button", style: { "--c": LOOK_COLOR[p.look] }, disabled: !voting || dead || undefined,
          onclick: () => { this.pick = this.pick === p.id ? null : p.id; this.k.cards = null; this.meeting(this.app.view, on); },
        },
          el("img", { src: portrait(p.look, dead ? "sad" : "neutral"), alt: "" }),
          el("b", { text: p.name }),
          p.role === "S" ? el("i", { class: "sabtag", text: "S" }) : null,
          p.voted ? el("i", { class: "voted", text: "✓" }) : null,
          dead ? el("i", { class: "x", text: "✕" }) : null,
          p.id !== me.id ? el("span", { class: "mute", title: "Mute", text: this.muted.has(p.id) ? "🔇" : "", onclick: (e) => { e.stopPropagation(); this.muted.has(p.id) ? this.muted.delete(p.id) : this.muted.add(p.id); this.k.cards = null; this.k.chat = null; this.meeting(this.app.view, on); } }) : null);
        cards.append(c);
      }
    }
    const vb = box.querySelector(".votebar");
    const vk = key([voting, this.pick, m.myVote, v.phase]);
    if (this.k.vb !== vk) {
      this.k.vb = vk;
      vb.innerHTML = "";
      if (voting) {
        vb.append(this.pick
          ? el("button", { class: "btn danger", type: "button", text: `VOTE ${this.nameOf(this.pick).toUpperCase()}`, onclick: () => { on.vote(this.pick); this.pick = null; } })
          : el("p", { class: "sub", text: "Tap a housemate to vote them out." }),
        el("button", { class: "btn ghost", type: "button", text: "SKIP VOTE", onclick: () => on.vote("skip") }));
      } else if (v.phase === "VOTE") vb.append(el("p", { class: "sub", text: m.myVote ? `You voted ${m.myVote === "skip" ? "to skip" : this.nameOf(m.myVote)}. Waiting for the house...` : me.alive ? "" : "Ghosts don't vote." }));
      else if (v.phase === "MEET") vb.append(el("p", { class: "sub", text: "Talk first. Voting opens when the timer runs out." }));
    }
    // Chat.
    const chat = box.querySelector(".chat");
    const lines = (m.chat || []).filter((c) => !this.muted.has(c.w));
    const lk = key([lines.length ? lines[lines.length - 1].i : 0, lines.length, [...this.muted]]);
    if (this.k.chat !== lk) {
      this.k.chat = lk;
      const stick = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
      chat.innerHTML = "";
      if (!lines.length) chat.append(el("p", { class: "sub empty", text: "Nobody has talked yet. Say where you were." }));
      for (const c of lines) chat.append(el("div", { class: "msg" + (c.g ? " ghost" : "") + (c.w === me.id ? " mine" : ""), style: { "--c": LOOK_COLOR[this.lookOf(c.w)] } },
        el("img", { src: portrait(this.lookOf(c.w), "neutral"), alt: "" }), el("div", {}, el("b", { text: (c.g ? "👻 " : "") + this.nameOf(c.w) }), el("span", { text: c.t }))));
      if (stick || lines.length && lines[lines.length - 1].w === me.id) chat.scrollTop = chat.scrollHeight;
      const newest = lines.length ? lines[lines.length - 1].i : 0;
      if (newest > this.lastChat && this.lastChat) audio.sfx("s_ping", 0.25);
      this.lastChat = newest;
    }
    const say = box.querySelector(".say");
    say.hidden = v.phase === "RESULT" || me.spec;
    // Result.
    const res = box.querySelector(".result");
    if (v.phase === "RESULT" && v.res) {
      const rk = key(v.res);
      if (this.k.res !== rk) {
        this.k.res = rk;
        res.hidden = false;
        res.innerHTML = "";
        const r = v.res;
        const rows = Object.entries(r.tally || {}).sort((a, b) => b[1].length - a[1].length);
        res.append(el("div", { class: "tally" },
          rows.map(([id, voters]) => el("div", { class: "trow" }, el("b", { text: this.nameOf(id) }), el("span", {}, voters.map((w) => el("img", { src: portrait(this.lookOf(w), "neutral"), title: this.nameOf(w), alt: "" }))))),
          el("div", { class: "trow skip" }, el("b", { text: "Skipped" }), el("span", { text: String(r.skips || 0) }))));
        const out = r.out;
        res.append(el("h2", { class: "verdict", text: out ? `${this.nameOf(out)} has been evicted.` : r.tie ? "It's a tie. Nobody leaves." : "The house skipped. Nobody leaves." }));
        if (out) res.append(el("p", { class: "reveal " + (r.role === "S" ? "s" : r.role === "H" ? "h" : ""), text: r.role === "S" ? `${this.nameOf(out)} WAS A SABOTEUR.` : r.role === "H" ? `${this.nameOf(out)} was not a Saboteur.` : "Their role stays secret." }));
        audio.sfx(out ? "s_ooh" : "s_buzzer", 0.6);
      }
    } else res.hidden = true;
  }

  quick(v, on) {
    if ($("#quick")) { $("#quick").remove(); return; }
    const box = el("div", { id: "quick", class: "pop" });
    const close = () => box.remove();
    const living = v.ps.filter((p) => p.alive !== false && !p.spec && p.id !== v.me.id);
    const people = (cb) => { box.innerHTML = ""; box.append(el("p", { class: "sub", text: "Who?" }), el("div", { class: "qgrid" }, living.map((p) => el("button", { class: "qp", type: "button", style: { "--c": LOOK_COLOR[p.look] }, onclick: () => cb(p.id) }, el("img", { src: portrait(p.look, "neutral"), alt: "" }), el("b", { text: p.name })))), el("button", { class: "btn ghost small", type: "button", text: "Back", onclick: () => list() })); };
    const rooms = (cb) => { box.innerHTML = ""; box.append(el("p", { class: "sub", text: "Where?" }), el("div", { class: "qgrid rooms" }, Object.keys(ROOM_LABEL).map((r) => el("button", { class: "btn small", type: "button", text: ROOM_LABEL[r], onclick: () => cb(r) }))), el("button", { class: "btn ghost small", type: "button", text: "Back", onclick: () => list() })); };
    const list = () => {
      box.innerHTML = "";
      box.append(el("div", { class: "qlist" }, QUICK.map((q, i) => el("button", { class: "ql", type: "button", text: q.replace("{name}", "...").replace("{room}", "..."), onclick: () => {
        const needName = q.includes("{name}"), needRoom = q.includes("{room}");
        const done = (who, room) => { close(); on.chat({ q: i, who, room }); };
        if (needName && needRoom) people((who) => rooms((room) => done(who, room)));
        else if (needName) people((who) => done(who));
        else if (needRoom) rooms((room) => done(undefined, room));
        else done();
      } }))), el("button", { class: "btn ghost small", type: "button", text: "Close", onclick: close }));
    };
    list();
    this.root.append(box);
  }

  // ------------------------------------------------------------------ end
  end(v, on) {
    if ($("#end")) { this.endTimer(v); return; }
    this.clear();
    const e = v.end;
    const myWin = (e.win === "S") === (v.me.role === "S") && !v.me.spec;
    const st = e.stats || {};
    const box = el("div", { id: "end", class: "screen dim " + (e.win === "S" ? "s" : "h") },
      el("div", { class: "ecard" },
        el("p", { class: "sub", text: v.me.spec ? "Round over" : myWin ? "YOU WIN" : "YOU LOSE" }),
        el("h1", { class: "who", text: e.win === "S" ? "SABOTEURS WIN" : "HOUSEMATES WIN" }),
        el("p", { class: "why", text: e.why }),
        el("div", { class: "roles" }, v.ps.filter((p) => !p.spec).map((p) => el("div", { class: "rcard " + (p.role === "S" ? "s" : "h") + (p.alive === false ? " dead" : ""), style: { "--c": LOOK_COLOR[p.look] } },
          el("img", { src: portrait(p.look, p.role === "S" ? "angry" : "happy"), alt: "" }),
          el("b", { text: p.name }),
          el("em", { text: p.role === "S" ? `Saboteur${st.strikes && st.strikes[p.id] ? ` · ${st.strikes[p.id]} strike${st.strikes[p.id] > 1 ? "s" : ""}` : ""}` : `${st.tasks && st.tasks[p.id] ? st.tasks[p.id] : 0} chores` })))),
        el("p", { class: "count" }),
        el("div", { class: "row2" },
          el("button", { class: "btn big again", type: "button", text: "PLAY AGAIN", onclick: on.again }),
          el("a", { class: "btn ghost wa", target: "_blank", rel: "noopener", href: `https://wa.me/?text=${encodeURIComponent(`${myWin ? "I just won" : "Wahala!"} in Wahala House as a ${v.me.role === "S" ? "Saboteur" : "Housemate"}. Come play: ${location.origin}/`)}`, text: "Share" }),
          el("button", { class: "btn ghost", type: "button", text: "Leave", onclick: on.leave }))));
    this.root.append(box);
    audio.sfx(myWin ? "s_cheer" : "s_ooh", 0.7);
    this.endTimer(v);
  }
  endTimer(v) {
    const c = $("#end .count");
    const again = $("#end .again");
    if (!c || !again) return;
    const isHost = v.host === v.me.id;
    if (v.pub) { c.textContent = `Back to the lobby in ${mmss(v.ends - this.now())}`; again.hidden = !isHost; }
    else { c.textContent = isHost ? "" : `Waiting for ${this.nameOf(v.host)} to start another round...`; again.hidden = !isHost; }
  }

  // ------------------------------------------------------------------ misc
  banner(text, kind) {
    const b = el("div", { class: "banner " + (kind || ""), text });
    this.root.append(b);
    setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 500); }, 2600);
  }
  full(onQuick) {
    this.clear();
    this.root.append(el("div", { id: "home", class: "screen" }, el("div", { class: "hcard" },
      el("h2", { text: "This house is full" }), el("p", { class: "tag", text: "Ten people are already inside. Jump into another game." }),
      el("button", { class: "btn big", type: "button", text: "QUICK PLAY", onclick: onQuick }))));
  }
}
