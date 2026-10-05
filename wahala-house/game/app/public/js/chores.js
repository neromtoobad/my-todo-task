// Chore mini-games: a few seconds each, touch-first. The server only accepts a
// chore after its full length, so finishing early waits out the clock.
import { el } from "./dom.js";
import { audio } from "./audio.js";

const ITEMS = {
  fridge: ["🥤", "🧃", "🍾", "🥫", "🧈", "🥚"],
  cushions: ["🟥", "🟨", "🟩", "🟦", "🟪"],
  jacuzzi: ["🍃", "🍂", "🫧", "🍃", "🍂"],
  laundry: ["👕", "👖", "👗", "🧦", "👚", "🩳"],
  pool: ["🍃", "🍂", "🍃", "🪲", "🍂", "🍃"],
};
const ORDER = {
  money: ["₦50", "₦100", "₦200", "₦500", "₦1000"],
  beds: ["1", "2", "3", "4", "5"],
};
const HINT = {
  stir: "Stir in circles. Don't let it burn!",
  scrub: "Scrub back and forth until it shines.",
  tapall: "Tap every one.",
  order: "Tap them in order, smallest first.",
  dial: "Slide until the signal is full, then hold it there.",
  rhythm: "Tap when the ring hits the circle.",
  hold: "Hold, and let go in the green.",
  pull: "Pull the cord all the way down. Three good pulls.",
};

/**
 * Open a chore. onDone fires once the game is won and the minimum time has
 * passed; onCancel when the player closes it. Returns { close }.
 */
export function openChore(id, st, { onDone, onCancel, minMs = 0, fake = false }) {
  const opened = performance.now();
  let finished = false, closed = false;
  const bar = el("i");
  const status = el("p", { class: "chint", text: HINT[st.game] || "" });
  const area = el("div", { class: "carea " + st.game });
  const box = el("div", { id: "chore", class: "screen dim" },
    el("div", { class: "cpanel" },
      el("div", { class: "chead" }, el("span", { class: "cico", text: st.icon }), el("b", { text: st.label }),
        el("button", { class: "cx", type: "button", "aria-label": "Close", text: "✕", onclick: () => cancel() })),
      fake ? el("p", { class: "cfake", text: "You're a Saboteur: this chore won't count. Fake it well." }) : null,
      area, el("div", { class: "cbar" }, bar), status));
  document.body.append(box);
  const progress = (p) => { bar.style.width = Math.max(0, Math.min(100, p * 100)) + "%"; };

  function win() {
    if (finished || closed) return;
    finished = true;
    progress(1);
    audio.sfx("s_ping", 0.6);
    const wait = Math.max(0, minMs - (performance.now() - opened));
    status.textContent = wait > 150 ? "Finishing..." : "Done!";
    box.classList.add("won");
    setTimeout(() => { if (closed) return; close(); onDone && onDone(); }, wait + 350);
  }
  function cancel() { if (closed) return; close(); onCancel && onCancel(); }
  function close() { if (closed) return; closed = true; stop(); box.remove(); }

  const stop = (GAMES[st.game] || GAMES.tapall)(area, { id, st, win, progress });
  return { close, cancel, get open() { return !closed; } };
}

const rect = (n) => n.getBoundingClientRect();
const rnd = (a, b) => a + Math.random() * (b - a);

const GAMES = {
  stir(area, { st, win, progress }) {
    const pot = el("div", { class: "pot", text: st.icon });
    const spoon = el("div", { class: "spoon", text: "🥄" });
    area.append(pot, spoon);
    let last = null, turned = 0, down = false;
    const move = (e) => {
      const r = rect(area), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      spoon.style.transform = `translate(${e.clientX - r.left - 18}px, ${e.clientY - r.top - 18}px)`;
      if (!down) return;
      const a = Math.atan2(e.clientY - cy, e.clientX - cx);
      if (last !== null) { let d = a - last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; turned += Math.abs(d); }
      last = a;
      pot.style.transform = `rotate(${turned * 20}deg)`;
      progress(turned / (Math.PI * 6));
      if (turned >= Math.PI * 6) win();
    };
    area.addEventListener("pointerdown", (e) => { down = true; last = null; area.setPointerCapture(e.pointerId); move(e); });
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerup", () => { down = false; });
    return () => {};
  },

  scrub(area, { st, win, progress }) {
    const item = el("div", { class: "item", text: st.icon });
    const dirt = el("div", { class: "dirt" });
    area.append(item, dirt);
    let dirty = 1, lx = null, ly = null, down = false;
    const move = (e) => {
      if (!down) return;
      if (lx !== null) dirty -= Math.hypot(e.clientX - lx, e.clientY - ly) / 2600;
      lx = e.clientX; ly = e.clientY;
      dirt.style.opacity = Math.max(0, dirty);
      progress(1 - dirty);
      if (dirty <= 0) win();
    };
    area.addEventListener("pointerdown", (e) => { down = true; lx = null; area.setPointerCapture(e.pointerId); });
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerup", () => { down = false; });
    return () => {};
  },

  tapall(area, { id, st, win, progress }) {
    const pool = ITEMS[id] || [st.icon];
    const n = 6;
    let left = n;
    for (let i = 0; i < n; i++) {
      const b = el("button", { class: "tapme", type: "button", text: pool[i % pool.length], style: { left: rnd(8, 78) + "%", top: rnd(8, 74) + "%" } });
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.classList.add("gone"); b.disabled = true;
        audio.sfx("s_whoosh", 0.25);
        left -= 1; progress(1 - left / n);
        if (!left) win();
      });
      area.append(b);
    }
    return () => {};
  },

  order(area, { id, win, progress }) {
    const labels = ORDER[id] || ["1", "2", "3", "4", "5"];
    let next = 0;
    const btns = labels.map((t, i) => el("button", { class: "num", type: "button", text: t, "data-i": i }));
    const spots = labels.map((_, i) => i).sort(() => Math.random() - 0.5);
    btns.forEach((b, i) => {
      b.style.left = 6 + (spots[i] % 3) * 31 + rnd(-2, 2) + "%";
      b.style.top = 12 + Math.floor(spots[i] / 3) * 44 + rnd(-4, 4) + "%";
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (Number(b.dataset.i) === next) { b.classList.add("ok"); b.disabled = true; next += 1; progress(next / labels.length); audio.sfx("s_whoosh", 0.25); if (next === labels.length) win(); }
        else { area.classList.remove("shake"); void area.offsetWidth; area.classList.add("shake"); }
      });
      area.append(b);
    });
    return () => {};
  },

  dial(area, { win, progress }) {
    const target = rnd(0.15, 0.85);
    const meter = el("div", { class: "signal" }, ...[0, 1, 2, 3, 4].map(() => el("i")));
    const track = el("div", { class: "track" });
    const knob = el("div", { class: "knob", text: "📡" });
    track.append(knob);
    area.append(meter, track);
    let v = target > 0.5 ? 0.05 : 0.95, held = 0, raf = 0, lastT = performance.now();
    const set = (x) => { v = Math.max(0, Math.min(1, x)); knob.style.left = v * 100 + "%"; };
    set(v);
    const drag = (e) => { const r = rect(track); set((e.clientX - r.left) / r.width); };
    track.addEventListener("pointerdown", (e) => { track.setPointerCapture(e.pointerId); drag(e); });
    track.addEventListener("pointermove", (e) => { if (e.buttons) drag(e); });
    const loop = (t) => {
      const dt = (t - lastT) / 1000; lastT = t;
      const q = Math.max(0, 1 - Math.abs(v - target) * 4);
      [...meter.children].forEach((b, i) => b.classList.toggle("on", q > i / 5));
      held = q > 0.8 ? held + dt : Math.max(0, held - dt * 2);
      progress(held / 1.2);
      if (held >= 1.2) { win(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  },

  rhythm(area, { st, win, progress }) {
    const core = el("div", { class: "core", text: st.icon });
    const ring = el("div", { class: "ring" });
    area.append(core, ring);
    let hits = 0, t0 = performance.now(), raf = 0;
    // Timed by the clock, so a slow phone judges the tap fairly.
    const scaleAt = (t) => 2.4 - (((t - t0) % 1300) / 1300) * 1.9;
    area.dataset.t0 = t0;
    const loop = (t) => {
      ring.style.transform = `translate(-50%, -50%) scale(${scaleAt(t)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    area.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (Math.abs(scaleAt(performance.now()) - 1) < 0.22) { hits += 1; core.classList.remove("hit"); void core.offsetWidth; core.classList.add("hit"); audio.sfx("s_whoosh", 0.3); progress(hits / 4); t0 = performance.now(); area.dataset.t0 = t0; if (hits >= 4) win(); }
      else { area.classList.remove("shake"); void area.offsetWidth; area.classList.add("shake"); }
    });
    return () => cancelAnimationFrame(raf);
  },

  hold(area, { st, win, progress }) {
    const gauge = el("div", { class: "gauge" }, el("i", { class: "zone" }), el("i", { class: "fill" }));
    const btn = el("button", { class: "holdbtn", type: "button", text: `HOLD ${st.icon}` });
    area.append(gauge, btn);
    const fill = gauge.querySelector(".fill");
    // The gauge is the time held, read from the clock, so a slow phone is still fair.
    let v = 0, holding = false, since = 0, raf = 0;
    const level = () => (holding ? (performance.now() - since) / 1700 : v);
    const loop = () => {
      if (holding && level() > 1) { holding = false; v = 0; area.classList.remove("shake"); void area.offsetWidth; area.classList.add("shake"); }
      fill.style.height = Math.min(1, level()) * 100 + "%";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); holding = true; since = performance.now(); btn.setPointerCapture(e.pointerId); });
    const release = () => {
      if (!holding) return;
      v = level();
      holding = false;
      if (v >= 0.72 && v <= 0.95) { progress(1); win(); } else { v = 0; progress(0); }
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    return () => cancelAnimationFrame(raf);
  },

  pull(area, { win, progress }) {
    const gen = el("div", { class: "genbox", text: "⚡" });
    const cord = el("div", { class: "cord" }, el("b", { text: "◉" }));
    area.append(gen, cord);
    let pulls = 0, startY = null, max = 0;
    const handle = cord.querySelector("b");
    handle.addEventListener("pointerdown", (e) => { startY = e.clientY; max = 0; handle.setPointerCapture(e.pointerId); });
    handle.addEventListener("pointermove", (e) => {
      if (startY === null) return;
      const d = Math.max(0, Math.min(150, e.clientY - startY));
      max = Math.max(max, d);
      handle.style.transform = `translateY(${d}px)`;
    });
    const up = () => {
      if (startY === null) return;
      startY = null;
      handle.style.transform = "";
      if (max > 110) { pulls += 1; gen.classList.remove("hit"); void gen.offsetWidth; gen.classList.add("hit"); audio.sfx("s_sizzle", 0.3); progress(pulls / 3); if (pulls >= 3) win(); }
    };
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    return () => {};
  },
};
