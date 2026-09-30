// The three mini-games: JOLLOF RUSH (Head of House), BALOGUN HUSTLE (the wager
// task) and the OWAMBE DANCE-OFF (Saturday party). Each resolves with a score;
// the server checks it and decides what it means.
import { el, $, naira } from "./ui.js";
import { CAST, AI_IDS } from "./data.js";
import { audio } from "./audio.js";

export async function playGame(spec, ctx) {
  try {
    if (spec.g === "jollof") return await jollof(spec, ctx);
    if (spec.g === "hustle") return await hustle(spec, ctx);
    if (spec.g === "dance") return await dance(spec, ctx);
  } finally {
    const g = $("#game");
    if (g) g.remove();
  }
  return 0;
}

// ------------------------------------------------------------------ shared
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function shell(cls) {
  const old = $("#game");
  if (old) old.remove();
  const head = el("div", { class: "ghead" });
  const body = el("div", { class: "gbody" });
  const root = el("div", { id: "game", class: "screen " + cls }, head, body);
  $("#ui").append(root);
  return { root, head, body };
}

function onceKey(keys, fn) {
  const h = (e) => { if (keys.includes(e.key) || keys.includes(e.code)) { e.preventDefault(); e.stopPropagation(); fn(); } };
  window.addEventListener("keydown", h, true);
  return () => window.removeEventListener("keydown", h, true);
}

function card(g, { kicker, title, lines, btn, extra, cls }) {
  return new Promise((res) => {
    let off = null;
    const go = () => { if (off) off(); c.remove(); audio.sfx("s_whoosh", 0.4); res(); };
    const c = el("div", { class: "gcard panel " + (cls || "") },
      kicker ? el("p", { class: "kicker", text: kicker }) : null,
      el("h2", { text: title }),
      extra || null,
      lines && lines.length ? el("ul", {}, lines.map((l) => el("li", { text: l }))) : null,
      el("button", { class: "btn big", type: "button", onclick: go }, btn || "START"));
    g.root.append(c);
    setTimeout(() => { off = onceKey(["Enter", "Space"], go); }, 350);
  });
}

async function countdown(g) {
  const c = el("div", { class: "gcount" });
  g.root.append(c);
  for (const t of ["3", "2", "1", "GO!"]) {
    c.textContent = t;
    c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
    audio.sfx(t === "GO!" ? "s_chime" : "s_ping", 0.5);
    await wait(t === "GO!" ? 450 : 650);
  }
  c.remove();
}

function floater(parent, text, cls) {
  const f = el("div", { class: "floater " + (cls || ""), text });
  parent.append(f);
  setTimeout(() => f.remove(), 1100);
}

function faces(ctx) {
  const v = ctx.view;
  const ids = v && v.hm ? v.hm.filter((h) => !h.out).map((h) => h.id) : AI_IDS;
  return ids.length ? ids : AI_IDS;
}

/** requestAnimationFrame loop with dt in seconds. Returns stop(). */
function loop(fn) {
  let last = performance.now(), on = true;
  const f = (now) => {
    if (!on) return;
    const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
    last = now;
    fn(dt, now);
    if (on) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  return () => { on = false; };
}

// ------------------------------------------------------------------ JOLLOF RUSH
const FOOD = { rice: { icon: "🍛", name: "Jollof" }, dodo: { icon: "🍌", name: "Dodo" }, chicken: { icon: "🍗", name: "Chicken" } };
const DISHES = [
  { n: "JOLLOF", items: ["rice"], w: 38 },
  { n: "JOLLOF + DODO", items: ["rice", "dodo"], w: 26 },
  { n: "JOLLOF + CHICKEN", items: ["rice", "chicken"], w: 21 },
  { n: "PARTY PACK", items: ["rice", "dodo", "chicken"], w: 15 },
];
const STATIONS = [
  { k: "rice", label: "POT 1", icon: "🍲", cook: 7, win: 5 },
  { k: "rice", label: "POT 2", icon: "🍲", cook: 7, win: 5 },
  { k: "rice", label: "POT 3", icon: "🍲", cook: 7, win: 5 },
  { k: "dodo", label: "FRYING PAN", icon: "🍳", cook: 3.5, win: 4.5 },
  { k: "chicken", label: "GRILL", icon: "🔥", cook: 5, win: 5 },
];
const ORDER_LINES = ["Abeg, I'm hungry o!", "Party jollof, please!", "Make it smoky!", "I no get all day!", "Extra pepper!", "Na today?"];

function pickDish() {
  let x = Math.random() * DISHES.reduce((a, d) => a + d.w, 0);
  for (const d of DISHES) { x -= d.w; if (x <= 0) return d; }
  return DISHES[0];
}

async function jollof(spec, ctx) {
  audio.playMusic("m_game");
  const g = shell("jollof");
  const hard = !!spec.hard;
  await card(g, {
    kicker: "HEAD OF HOUSE GAME", title: "JOLLOF RUSH",
    lines: [
      "Tap a pot, the pan or the grill to start cooking.",
      "When it glows, tap it again to put it on your plate. Wait too long and it BURNS.",
      "Tap an order to serve your plate. The plate must match exactly.",
      "Fast service builds a combo. Angry customers cost you points.",
      hard ? "You're rattled today (low composure): food burns faster." : "Highest score becomes Head of House.",
    ],
    extra: el("div", { class: "gart" }, "🍲 🍛 🍌 🍗"),
  });

  const T = spec.secs || 90;
  let t = 0, score = 0, combo = 0, served = 0, missed = 0, nextOrder = 0.6, oid = 0, over = false;
  const plate = { rice: false, dodo: false, chicken: false };
  const orders = [];
  const who = faces(ctx);

  // Header.
  const hScore = el("div", { class: "gstat" }), hTime = el("div", { class: "gstat" }), hCombo = el("div", { class: "gstat" });
  g.head.append(el("div", { class: "gtitle", text: "JOLLOF RUSH" }), hScore, hCombo, hTime);
  const drawHead = () => {
    hScore.innerHTML = `<small>SCORE</small>${Math.max(0, Math.round(score))}`;
    hTime.innerHTML = `<small>TIME</small>${Math.max(0, Math.ceil(T - t))}`;
    hCombo.innerHTML = `<small>COMBO</small>x${combo}`;
    hTime.classList.toggle("urgent", T - t < 10);
  };

  // Orders.
  const orderBox = el("div", { class: "orders" });
  // Stations.
  const st = STATIONS.map((s) => ({ ...s, win: hard ? s.win * 0.7 : s.win, state: "empty", t0: 0 }));
  const kitchen = el("div", { class: "kitchen" });
  for (const s of st) {
    s.el = el("button", { class: "station empty", type: "button", onclick: () => tapStation(s) },
      el("span", { class: "sic", text: s.icon }), el("span", { class: "slb", text: s.label }), el("span", { class: "sst", text: "TAP TO COOK" }), el("span", { class: "sbar" }, el("i")));
    kitchen.append(s.el);
  }
  // Plate.
  const slots = {};
  const plateEl = el("div", { class: "plate" }, el("small", { text: "YOUR PLATE" }),
    el("div", { class: "pslots" }, ["rice", "dodo", "chicken"].map((k) => (slots[k] = el("span", { class: "pslot", text: FOOD[k].icon })))),
    el("button", { class: "btn ghost bin", type: "button", onclick: () => { if (plate.rice || plate.dodo || plate.chicken) { plate.rice = plate.dodo = plate.chicken = false; drawPlate(); audio.sfx("s_whoosh", 0.3); } } }, "🗑 BIN"));
  const drawPlate = () => { for (const k of Object.keys(slots)) slots[k].classList.toggle("on", plate[k]); };
  drawPlate();
  g.body.append(orderBox, kitchen, plateEl);
  drawHead();

  function tapStation(s) {
    if (over) return;
    if (s.state === "empty") { s.state = "cook"; s.t0 = t; audio.sfx("s_sizzle", 0.35); }
    else if (s.state === "cook") { floater(s.el, "Still cooking...", "meh"); }
    else if (s.state === "ready") {
      if (plate[s.k]) { floater(s.el, `Plate has ${FOOD[s.k].name}`, "meh"); return; }
      plate[s.k] = true; s.state = "empty"; drawPlate(); audio.sfx("s_whoosh", 0.3);
    } else if (s.state === "burnt") { s.state = "empty"; score -= 30; floater(s.el, "-30", "bad"); audio.sfx("s_whoosh", 0.3); }
    drawStation(s);
  }
  function drawStation(s) {
    s.el.className = "station " + s.state;
    const lab = { empty: "TAP TO COOK", cook: "COOKING...", ready: "READY! TAP", burnt: "BURNT! TAP TO CLEAR" }[s.state];
    const q = s.el.querySelector(".sst");
    if (q.textContent !== lab) q.textContent = lab;
    let p = 0;
    if (s.state === "cook") p = (t - s.t0) / s.cook;
    else if (s.state === "ready") p = 1 - (t - s.t0 - s.cook) / s.win;
    s.el.querySelector(".sbar i").style.width = clamp(p * 100, 0, 100) + "%";
  }

  function addOrder() {
    const d = pickDish();
    const id = pick(who);
    const o = { id: ++oid, d, who: id, t0: t, pat: (hard ? 15 : 20) + d.items.length * 3 };
    o.el = el("button", { class: "ticket", type: "button", onclick: () => serve(o), style: { "--c": CAST[id] ? CAST[id].color : "#f2b632" } },
      el("img", { src: ctx.portrait(id, "neutral"), alt: "" }),
      el("div", { class: "tk" }, el("b", { text: d.n }), el("span", { class: "ti", text: d.items.map((k) => FOOD[k].icon).join(" ") }), el("small", { text: `${ctx.nameOf(id)}: "${pick(ORDER_LINES)}"` })),
      el("span", { class: "pat" }, el("i")));
    orders.push(o);
    orderBox.append(o.el);
    audio.sfx("s_ping", 0.3);
  }
  function serve(o) {
    if (over) return;
    const need = new Set(o.d.items);
    const ok = ["rice", "dodo", "chicken"].every((k) => plate[k] === need.has(k));
    if (!ok) { o.el.classList.remove("shake"); void o.el.offsetWidth; o.el.classList.add("shake"); floater(o.el, "Wrong plate!", "bad"); audio.sfx("s_ooh", 0.3); combo = 0; drawHead(); return; }
    const left = 1 - (t - o.t0) / o.pat;
    combo += 1;
    const pts = Math.round((80 * o.d.items.length + 80 * left) * (1 + Math.min(10, combo) * 0.05));
    score += pts; served += 1;
    plate.rice = plate.dodo = plate.chicken = false; drawPlate();
    o.el.querySelector("img").src = ctx.portrait(o.who, "happy");
    o.el.classList.add("done");
    floater(o.el, `+${pts}`, "good");
    audio.sfx("s_cash", 0.45);
    orders.splice(orders.indexOf(o), 1);
    setTimeout(() => o.el.remove(), 450);
    drawHead();
  }

  await countdown(g);
  return new Promise((res) => {
    const stop = loop((dt) => {
      t += dt;
      if (t >= nextOrder && orders.length < 4) { addOrder(); nextOrder = t + Math.max(3.2, 7 - t / 20) * (hard ? 0.85 : 1); }
      for (const s of st) {
        if (s.state === "cook" && t - s.t0 >= s.cook) { s.state = "ready"; audio.sfx("s_chime", 0.25); }
        else if (s.state === "ready" && t - s.t0 >= s.cook + s.win) { s.state = "burnt"; combo = 0; audio.sfx("s_buzzer", 0.3); floater(s.el, "BURNT!", "bad"); }
        drawStation(s);
      }
      for (const o of orders.slice()) {
        const left = 1 - (t - o.t0) / o.pat;
        o.el.querySelector(".pat i").style.width = clamp(left * 100, 0, 100) + "%";
        o.el.classList.toggle("late", left < 0.3);
        if (left <= 0) {
          orders.splice(orders.indexOf(o), 1);
          score -= 60; combo = 0; missed += 1;
          o.el.querySelector("img").src = ctx.portrait(o.who, "angry");
          o.el.classList.add("gone");
          audio.sfx("s_ooh", 0.35);
          setTimeout(() => o.el.remove(), 450);
        }
      }
      drawHead();
      if (t >= T && !over) {
        over = true;
        stop();
        audio.sfx("s_buzzer", 0.5);
        const final = clamp(Math.round(score), 0, 6000);
        card(g, { kicker: "TIME!", title: `${final} POINTS`, lines: [`Orders served: ${served}`, `Customers who walked out: ${missed}`, "Mama Eye is tasting everyone's pots..."], btn: "SEE THE SCORES" }).then(() => res(final));
      }
    });
  });
}

// ------------------------------------------------------------------ BALOGUN HUSTLE
const GOODS = [
  { k: "ankara", name: "ANKARA BALE", icon: "🧵", cost: 60000, val: 104000 },
  { k: "gele", name: "GELE BOX", icon: "🎀", cost: 40000, val: 70000 },
  { k: "zobo", name: "ZOBO CRATE", icon: "🧃", cost: 15000, val: 29000 },
];
const BUYERS = ["Mama Nkechi", "Alhaji Sule", "Aunty Bisi", "Iya Basira", "Chief Okon", "Sister Blessing", "Bros Tunde", "Madam Kofo", "Uncle Jide", "Hajia Amina", "Oga Pius", "Aunty Ngozi"];
const AVATARS = ["👩🏾", "👨🏾", "👵🏾", "👴🏿", "👩🏿", "🧔🏾", "👳🏾‍♂️", "🧕🏾", "👨🏿‍🦲", "👩🏾‍🦱"];
const NEWS = { ankara: "Wedding season! Everybody wants ANKARA.", gele: "Owambe weekend! GELE is flying off the shelves.", zobo: "Heatwave in Lagos! ZOBO is selling like hot cake." };
const OPENERS = ["How much for {g}? I get {o}.", "Abeg, {q} {g}. {o}, final.", "My dear, {o} for {q} {g}.", "Oga, {o} dey my hand for {q} {g}."];
const DEALS = ["Deal! Wrap it for me.", "Ehen! Correct price.", "No wahala. Collect your money.", "You try. Bring am."];
const WALKS = ["Ah! You people too dey cost!", "Is it gold? I'm going!", "God forbid! Market no dey again?", "Thief! I'm going to the next stall."];
const COUNTERS = ["Hmm... {p}. Last last.", "Make we meet halfway: {p}.", "Ahn ahn! {p}. Take am or leave am."];
const MATE_LINES = ["just sold three crates!", "is shouting at customers!", "found a big spender!", "is haggling like a pro!", "dropped the change. Wahala!"];
const round1k = (n) => Math.max(1000, Math.round(n / 1000) * 1000);

async function hustle(spec, ctx) {
  audio.playMusic("m_market");
  const g = shell("hustle");
  const hard = !!spec.hard;
  const sab = !!spec.sab;
  const mates = (spec.mates || []).filter((id) => CAST[id]);
  await card(g, {
    kicker: `WAGER TASK · TEAM ${spec.team || ""}`, title: "BALOGUN HUSTLE",
    lines: [
      "Three market days. Each morning, buy stock with your cash.",
      "Customers come with an offer. SELL, ASK FOR MORE, or send them away. Push too hard and they walk.",
      "Watch the market news: the hot item sells for more.",
      "Unsold stock goes back to the wholesaler at a loss. Your profit goes to your team.",
      ...(sab ? ["You are a Saboteur. The till is right there... every naira you pocket drains the prize pot. Don't get seen."] : []),
    ],
    extra: el("div", { class: "gmates" }, mates.map((id) => el("img", { src: ctx.portrait(id, "happy"), alt: "", title: ctx.nameOf(id) }))),
  });

  const START = 600000;
  let cash = START, skim = 0, eyes = 0, sold = 0;
  const stock = { ankara: 0, gele: 0, zobo: 0 };
  const hRound = el("div", { class: "gstat" }), hCash = el("div", { class: "gstat" }), hProfit = el("div", { class: "gstat" }), hTime = el("div", { class: "gstat" });
  g.head.append(el("div", { class: "gtitle", text: "BALOGUN HUSTLE" }), hRound, hCash, hProfit, hTime);
  const stockVal = () => GOODS.reduce((a, gd) => a + stock[gd.k] * gd.cost, 0);
  const drawHead = (round, left) => {
    hRound.innerHTML = `<small>DAY</small>${round}/3`;
    hCash.innerHTML = `<small>CASH</small>${naira(cash)}`;
    const p = cash + stockVal() - START;
    hProfit.innerHTML = `<small>PROFIT</small><span class="${p < 0 ? "neg" : ""}">${naira(p)}</span>`;
    hTime.innerHTML = `<small>TIME</small>${left === undefined ? "-" : Math.max(0, Math.ceil(left))}`;
    hTime.classList.toggle("urgent", left !== undefined && left < 6);
  };

  for (let round = 1; round <= 3; round++) {
    const hot = pick(GOODS).k;
    await stockPhase(round, hot);
    await sellPhase(round, hot);
  }
  // Close the stalls: unsold stock back to the wholesaler at 60%.
  const wholesale = GOODS.reduce((a, gd) => a + stock[gd.k] * Math.round(gd.cost * 0.6), 0);
  const profit = clamp(Math.round(cash + wholesale - START), 0, 8000000);
  const sk = clamp(Math.round(skim), 0, 2000000);
  audio.sfx("s_cash", 0.6);
  await card(g, {
    kicker: "STALLS CLOSED", title: `PROFIT ${naira(profit)}`,
    lines: [`Sales made: ${sold}`, `Unsold stock returned for ${naira(wholesale)}`, ...(sab ? [sk ? `In your pocket: ${naira(sk)}. Nobody saw... you hope.` : "You kept your hands clean."] : []), "Mama Eye will count every box tomorrow."],
    btn: "HAND IN THE MONEY",
  });
  return { profit, skim: sk };

  // ---- phases
  function stockPhase(round, hot) {
    return new Promise((res) => {
      g.body.replaceChildren();
      drawHead(round);
      const rows = GOODS.map((gd) => {
        const n = el("b", { class: "qty", text: String(stock[gd.k]) });
        const buy = (d) => {
          if (d > 0 && cash < gd.cost) { audio.sfx("s_buzzer", 0.25); return; }
          if (d < 0 && stock[gd.k] <= 0) return;
          stock[gd.k] += d; cash -= d * gd.cost;
          n.textContent = String(stock[gd.k]);
          audio.sfx(d > 0 ? "s_cash" : "s_whoosh", 0.25);
          drawHead(round);
        };
        return el("div", { class: "srow" + (gd.k === hot ? " hot" : "") },
          el("span", { class: "gi", text: gd.icon }),
          el("div", { class: "gn" }, el("b", { text: gd.name }), el("small", { text: `Costs ${naira(gd.cost)} · sells around ${naira(gd.val * (gd.k === hot ? 1.3 : 1))}` })),
          el("button", { class: "btn ghost sm", type: "button", onclick: () => buy(-1) }, "−"), n,
          el("button", { class: "btn sm", type: "button", onclick: () => buy(1) }, "+"));
      });
      const bar = el("span", { class: "tbar" }, el("i"));
      let doneF = false;
      const done = () => { if (doneF) return; doneF = true; stop(); res(); };
      g.body.append(el("div", { class: "stockp panel" },
        el("p", { class: "kicker", text: `MARKET DAY ${round} · MORNING` }),
        el("div", { class: "news" }, el("b", { text: "MARKET NEWS: " }), NEWS[hot]),
        el("h3", { text: "BUY YOUR STOCK" }), ...rows, bar,
        el("button", { class: "btn big", type: "button", onclick: done }, "OPEN THE STALL")));
      let left = 18;
      const stop = loop((dt) => { left -= dt; bar.firstChild.style.width = clamp((left / 18) * 100, 0, 100) + "%"; if (left <= 0) done(); });
    });
  }

  async function sellPhase(round, hot) {
    const D = 36;
    let left = D;
    g.body.replaceChildren();
    const stall = el("div", { class: "stall" });
    const drawStall = () => stall.replaceChildren(el("small", { text: "YOUR STALL" }), ...GOODS.map((gd) => el("div", { class: "sg" + (stock[gd.k] ? "" : " empty") }, el("span", { text: gd.icon }), el("b", { text: `×${stock[gd.k]}` }))));
    drawStall();
    const cust = el("div", { class: "cust" });
    const mateBox = el("div", { class: "matefeed" });
    const side = el("div", { class: "side" }, stall);
    if (sab) {
      const eyeBar = el("span", { class: "eyes" }, el("i"));
      const btn = el("button", { class: "btn danger till", type: "button", onclick: () => {
        if (cash < 100000 || skim >= 2000000) { audio.sfx("s_buzzer", 0.25); return; }
        cash -= 100000; skim += 100000; eyes = Math.min(100, eyes + 9);
        eyeBar.firstChild.style.width = eyes + "%";
        audio.sfx("s_cash", 0.2);
        floater(btn, "+₦100,000 pocketed", "sab");
        if (eyes >= 40 && Math.random() < 0.35 && mates.length) mateSay(`${ctx.nameOf(pick(mates))}: "Wait... did the box just get lighter?"`, true);
        drawHead(round, left);
      } }, "🤫 POCKET ₦100,000");
      side.append(el("div", { class: "tillp" }, el("small", { text: "THE TILL" }), btn, el("small", { text: "TEAMMATES' EYES" }), eyeBar));
    }
    g.body.append(el("div", { class: "market" }, side, cust, mateBox));
    function mateSay(t, warn) {
      const m = el("div", { class: "mate" + (warn ? " warn" : "") }, t);
      mateBox.prepend(m);
      while (mateBox.children.length > 3) mateBox.lastChild.remove();
    }
    const stopClock = loop((dt) => { left -= dt; drawHead(round, left); });
    let mateT = setInterval(() => { if (mates.length && Math.random() < 0.5) { const id = pick(mates); mateSay(`${ctx.nameOf(id)} ${pick(MATE_LINES)}`); } }, 5200);
    try {
      while (left > 0.5) {
        await customer(round, hot, () => left, cust, drawStall);
        if (left > 0.5) await wait(350);
      }
    } finally { stopClock(); clearInterval(mateT); }
  }

  function customer(round, hot, timeLeft, box, drawStall) {
    return new Promise((res) => {
      const gd = Math.random() < 0.5 ? GOODS.find((x) => x.k === hot) : pick(GOODS);
      const q = Math.random() < 0.25 ? 2 : 1;
      const worth = gd.val * (gd.k === hot ? 1.3 : 1) * rnd(0.9, 1.12) * q;
      const offer = round1k(worth * rnd(0.62, 0.82));
      const max = round1k(worth * rnd(0.95, 1.4));
      const name = pick(BUYERS), av = pick(AVATARS);
      const pat = hard ? 4.5 : 6.5;
      let t = 0, finished = false;
      const say = el("p", { class: "bubble" });
      const btns = el("div", { class: "hbtns" });
      const pbar = el("span", { class: "tbar" }, el("i"));
      box.replaceChildren(el("div", { class: "buyer" }, el("span", { class: "av", text: av }), el("div", {}, el("b", { text: name }), el("small", { text: `wants ${q} ${gd.name}${q > 1 ? "S" : ""} ${gd.icon}` }))), say, btns, pbar);
      box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
      const fill = (s) => s.replace("{g}", gd.name.toLowerCase()).replace("{q}", String(q)).replace("{o}", naira(offer));
      say.textContent = fill(pick(OPENERS));
      const finish = (text, cls, wait2 = 900) => {
        if (finished) return;
        finished = true;
        stop();
        say.textContent = text;
        box.className = "cust " + (cls || "");
        btns.replaceChildren();
        setTimeout(res, wait2);
      };
      const sell = (price) => {
        stock[gd.k] -= q; cash += price; sold += 1;
        drawStall();
        audio.sfx("s_cash", 0.5);
        floater(box, `+${naira(price)}`, "good");
        finish(pick(DEALS), "deal");
      };
      const ask = (price) => {
        if (price <= max) { sell(price); return; }
        if (Math.random() < 0.55) {
          const last = round1k(max * rnd(0.92, 1));
          say.textContent = COUNTERS[Math.floor(Math.random() * COUNTERS.length)].replace("{p}", naira(last));
          t = pat * 0.45;
          btns.replaceChildren(
            el("button", { class: "btn", type: "button", onclick: () => sell(last) }, `TAKE ${naira(last)}`),
            el("button", { class: "btn ghost", type: "button", onclick: () => finish("Your loss!", "walk") }, "NO"));
          audio.sfx("s_ping", 0.3);
        } else { audio.sfx("s_ooh", 0.3); finish(pick(WALKS), "walk"); }
      };
      if (stock[gd.k] < q) {
        say.textContent = `You no get ${gd.name.toLowerCase()}? Ehn. I go buy for next stall.`;
        btns.replaceChildren(el("small", { class: "muted", text: "Out of stock!" }));
        finished = true;
        setTimeout(res, 1100);
        return;
      }
      const a1 = round1k(offer * 1.22), a2 = round1k(offer * 1.5);
      btns.replaceChildren(
        el("button", { class: "btn", type: "button", onclick: () => sell(offer) }, `SELL ${naira(offer)}`),
        el("button", { class: "btn gold", type: "button", onclick: () => ask(a1) }, `ASK ${naira(a1)}`),
        el("button", { class: "btn gold", type: "button", onclick: () => ask(a2) }, `ASK ${naira(a2)}`),
        el("button", { class: "btn ghost", type: "button", onclick: () => finish("Okay o. Bye bye.", "walk", 500) }, "NO"));
      const stop = loop((dt) => {
        t += dt;
        pbar.firstChild.style.width = clamp((1 - t / pat) * 100, 0, 100) + "%";
        if (t >= pat) finish("I don tire to wait. Bye!", "walk");
        else if (timeLeft() <= 0) finish("Market don close!", "walk", 400);
      });
    });
  }
}

// ------------------------------------------------------------------ OWAMBE DANCE-OFF
// The party track was produced at 112 BPM; notes land on its beats.
const BPM = 112, OFFSET = 0.0, SONG = 46;
const LANES = [
  { keys: ["ArrowLeft", "d", "D"], c: "#f2b632", g: "◀" },
  { keys: ["ArrowDown", "f", "F"], c: "#e2338a", g: "▼" },
  { keys: ["ArrowUp", "j", "J"], c: "#12a36b", g: "▲" },
  { keys: ["ArrowRight", "k", "K"], c: "#3b6fd8", g: "▶" },
];
const DANCE_MOVES = ["SHAKU SHAKU!", "ZANKU!", "GWARA GWARA!", "PALANCAR!", "BUGA!", "SKELEWU!", "AZONTO!", "ETIGHI!"];

function chart(hard) {
  const beat = 60 / BPM;
  const notes = [];
  let last = -1;
  const lane = () => { let l; do l = Math.floor(Math.random() * 4); while (l === last && Math.random() < 0.6); last = l; return l; };
  for (let b = 4; b * beat < SONG - 2; b++) {
    const time = OFFSET + b * beat;
    const busy = b >= 16;
    if (Math.random() < (hard ? 0.88 : 0.74)) {
      notes.push({ t: time, l: lane() });
      if (busy && Math.random() < (hard ? 0.14 : 0.08)) { let l2 = (last + 2) % 4; notes.push({ t: time, l: l2 }); }
    }
    if (busy && Math.random() < (hard ? 0.4 : 0.24)) notes.push({ t: time + beat / 2, l: lane() });
  }
  return notes.sort((a, b) => a.t - b.t);
}

async function dance(spec, ctx) {
  const g = shell("dance");
  const hard = !!spec.hard;
  const vs = spec.vs && CAST[spec.vs] ? spec.vs : null;
  const target = spec.mode === "battle" ? spec.rival : spec.mode === "crush" ? 55 : null;
  const goal = spec.mode === "battle" ? `Beat ${ctx.nameOf(vs)}: ${spec.rival}%` : spec.mode === "crush" ? `Impress ${ctx.nameOf(vs)}: 55% or more` : "Just vibe. Every step counts for the fans.";
  await card(g, {
    kicker: "SATURDAY NIGHT · OWAMBE", title: "DANCE-OFF",
    lines: [
      "Hit each arrow as it reaches the line: ← ↓ ↑ → or D F J K. On a phone, tap the lanes.",
      "PERFECT and GOOD hits keep your combo. Big combos unlock new moves.",
      goal,
      ...(hard ? ["You're rattled (low composure): the notes come faster."] : []),
    ],
    extra: vs ? el("div", { class: "gvs" }, el("img", { src: ctx.portrait("you", "happy"), alt: "" }), el("b", { text: "VS" }), el("img", { src: ctx.portrait(vs, spec.mode === "crush" ? "flirty" : "angry"), alt: "" })) : null,
    btn: "LET'S DANCE",
  });

  const notes = chart(hard);
  const speed = hard ? 560 : 440;
  let pts = 0, judged = 0, combo = 0, best = 0, perfects = 0, over = false;

  const hAcc = el("div", { class: "gstat" }), hCombo = el("div", { class: "gstat" }), hGoal = el("div", { class: "gstat goal" });
  g.head.append(el("div", { class: "gtitle", text: "OWAMBE DANCE-OFF" }), hAcc, hCombo, hGoal);
  const cv = el("canvas", { class: "lanes" });
  const judge = el("div", { class: "judge" });
  const moveName = el("div", { class: "movename" });
  g.body.append(el("div", { class: "lanewrap" }, cv, judge, moveName));
  const cx = cv.getContext("2d");
  const size = () => {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(200, r.width * dpr); cv.height = Math.max(200, r.height * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  };
  let box = size();
  const onResize = () => { box = size(); };
  window.addEventListener("resize", onResize);
  const acc = () => (judged ? Math.round((100 * pts) / judged) : 100);
  const finalAcc = () => Math.round((100 * pts) / Math.max(1, notes.length));
  const drawHead = () => {
    hAcc.innerHTML = `<small>ACCURACY</small>${acc()}%`;
    hCombo.innerHTML = `<small>COMBO</small>${combo}`;
    hGoal.innerHTML = `<small>${target !== null ? "TARGET" : "MODE"}</small>${target !== null ? target + "%" : "VIBE"}`;
    hGoal.classList.toggle("ok", target !== null && acc() >= target);
  };
  drawHead();

  // Music: a fresh copy of the party track so the notes line up with it.
  audio.playMusic(null);
  const track = new window.Audio("assets/audio/m_party.mp3");
  track.volume = audio.enabled ? 0.7 : 0;
  let t0 = 0, started = false;
  const clock = () => (started ? (performance.now() - t0) / 1000 : -1);

  await countdown(g);
  t0 = performance.now();
  started = true;
  track.play().then(() => { t0 = performance.now() - track.currentTime * 1000; }).catch(() => {});

  const flash = [0, 0, 0, 0];
  const show = (text, cls) => { judge.textContent = text; judge.className = "judge " + cls; void judge.offsetWidth; judge.classList.add("pop"); };
  const grade = (n, dtAbs) => {
    n.done = true;
    judged += 1;
    let gname, p;
    if (dtAbs <= 0.06) { gname = "perfect"; p = 1; perfects += 1; }
    else if (dtAbs <= 0.12) { gname = "good"; p = 0.7; }
    else { gname = "ok"; p = 0.4; }
    pts += p;
    combo += 1; best = Math.max(best, combo);
    show(gname === "perfect" ? "PERFECT!" : gname === "good" ? "GOOD" : "OK", gname);
    if (combo > 0 && combo % 12 === 0) {
      moveName.textContent = DANCE_MOVES[(combo / 12 - 1) % DANCE_MOVES.length];
      moveName.classList.remove("pop"); void moveName.offsetWidth; moveName.classList.add("pop");
      audio.sfx("s_cheer", 0.35);
      if (ctx.onHit) ctx.onHit("move");
    } else if (ctx.onHit) ctx.onHit(gname);
    drawHead();
  };
  const miss = (n) => {
    n.done = true; judged += 1; combo = 0;
    show("MISS", "miss");
    if (ctx.onHit) ctx.onHit("miss");
    drawHead();
  };
  const hit = (lane) => {
    if (over) return;
    flash[lane] = 0.12;
    const now = clock();
    let bestN = null, bd = 0.19;
    for (const n of notes) {
      if (n.done || n.l !== lane) continue;
      const d = Math.abs(n.t - now);
      if (d < bd) { bd = d; bestN = n; }
      if (n.t - now > 0.2) break;
    }
    if (bestN) grade(bestN, bd);
  };
  const onKey = (e) => {
    const lane = LANES.findIndex((L) => L.keys.includes(e.key));
    if (lane < 0 || e.repeat) return;
    e.preventDefault(); e.stopPropagation();
    hit(lane);
  };
  window.addEventListener("keydown", onKey, true);
  const onPtr = (e) => {
    const r = cv.getBoundingClientRect();
    const lane = Math.floor(((e.clientX - r.left) / r.width) * 4);
    if (lane >= 0 && lane < 4) { e.preventDefault(); hit(lane); }
  };
  cv.addEventListener("pointerdown", onPtr);

  return new Promise((res) => {
    const stop = loop((dt) => {
      const now = clock();
      // Keep the clock married to the music.
      if (!track.paused && track.currentTime > 0.2) { const drift = track.currentTime - now; if (Math.abs(drift) > 0.06) t0 -= drift * 1000 * 0.5; }
      for (const n of notes) { if (!n.done && now - n.t > 0.19) miss(n); }
      // Draw.
      const W = box.width, H = box.height, lw = W / 4, hitY = H - 70;
      cx.clearRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        const x = i * lw;
        cx.fillStyle = i % 2 ? "rgba(20,8,30,0.55)" : "rgba(30,12,44,0.55)";
        cx.fillRect(x, 0, lw, H);
        if (flash[i] > 0) { flash[i] -= dt; cx.fillStyle = LANES[i].c + "55"; cx.fillRect(x, 0, lw, H); }
        // Receptor.
        cx.strokeStyle = LANES[i].c; cx.lineWidth = 3;
        cx.beginPath(); cx.arc(x + lw / 2, hitY, Math.min(26, lw * 0.32), 0, Math.PI * 2); cx.stroke();
        cx.fillStyle = LANES[i].c; cx.font = `bold ${Math.min(22, lw * 0.26)}px Nunito, sans-serif`; cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.globalAlpha = 0.5; cx.fillText(LANES[i].g, x + lw / 2, hitY); cx.globalAlpha = 1;
      }
      // Beat pulse line.
      const beatPhase = ((now - OFFSET) * BPM / 60) % 1;
      cx.fillStyle = `rgba(245,207,29,${0.25 + (1 - beatPhase) * 0.45})`;
      cx.fillRect(0, hitY - 2, W, 4);
      for (const n of notes) {
        if (n.done) continue;
        const y = hitY - (n.t - now) * speed;
        if (y < -40) break;
        if (y > H + 40) continue;
        const x = n.l * lw + lw / 2, r = Math.min(24, lw * 0.3);
        cx.fillStyle = LANES[n.l].c;
        cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = "#1b1026"; cx.font = `bold ${r}px Nunito, sans-serif`; cx.fillText(LANES[n.l].g, x, y + 1);
      }
      if (!over && now > SONG - 0.5) {
        over = true;
        stop();
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("resize", onResize);
        const final = clamp(finalAcc(), 0, 100);
        const fade = setInterval(() => { track.volume = Math.max(0, track.volume - 0.07); if (track.volume <= 0) { clearInterval(fade); track.pause(); } }, 60);
        const verdict = target === null ? "The fans loved it." : final >= target ? (spec.mode === "battle" ? "You won the floor!" : "They're impressed...") : (spec.mode === "battle" ? `${ctx.nameOf(vs)} might have you beat.` : "Hmm. Maybe next party.");
        audio.sfx(target === null || final >= target ? "s_cheer" : "s_ooh", 0.6);
        card(g, { kicker: "THE MUSIC STOPS", title: `${final}% ACCURACY`, lines: [`Best combo: ${best}`, `Perfect steps: ${perfects}`, verdict], btn: "CONTINUE" }).then(() => res(final));
      }
    });
  });
}
