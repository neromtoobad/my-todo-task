// Plays Wahala House like a person: Quick Play, walk with the keys, E to use,
// the mouse for mini-games, chat and vote in meetings. Saves a frame every
// couple of seconds and logs anything that looks wrong.
// usage: node play_live.mjs <baseUrl> <outDir> [mobile] [minutes]
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "https://wahala-house.higgsfield.app";
const OUT = process.argv[3] || "./out";
const MOBILE = process.argv[4] === "mobile";
const MINUTES = Number(process.argv[5] || 6);
fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8").replace(/^export /gm, "");
const E = new Function(src + "; return { findPath, STATIONS, RANGE };")();
const log = (...a) => { const s = `[${((Date.now() - T0) / 1000).toFixed(1)}] ` + a.join(" "); console.log(s); fs.appendFileSync(OUT + "/log.txt", s + "\n"); };
const T0 = Date.now();
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => log("PAGEERROR", e.message));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log("CONSOLE", m.type(), m.text().slice(0, 200)); });
p.on("response", (r) => { if (r.status() >= 400) log("HTTP", r.status(), r.url()); });
p.on("websocket", (ws) => ws.on("framereceived", (f) => { const s = String(f.payload); if (s.includes('"type":"error"')) log("SERVER-ERROR", s.slice(0, 160)); }));
let shotN = 0;
const shot = async (tag) => { const n = String(++shotN).padStart(3, "0"); await p.screenshot({ path: `${OUT}/${n}-${tag}.jpg`, type: "jpeg", quality: 50 }).catch(() => {}); return n; };
const V = () => p.evaluate(() => { const v = window.__wh.view; return v && { phase: v.phase, me: v.me, ps: v.ps, bodies: v.bodies, meet: v.meet, sab: v.sab, bar: v.bar, res: v.res, end: v.end, bellAt: v.bellAt, now: window.__wh.serverNow() }; });

await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForSelector("#home input", { timeout: 90000 });
await p.waitForTimeout(2500);
await shot("home");
await p.fill("#home input", "Dimeji");
await p.click("text=QUICK PLAY");
log("clicked quick play");
let last = "", lastShot = 0, keysDown = new Set();
const setKeys = async (want) => {
  for (const k of keysDown) if (!want.has(k)) { await p.keyboard.up(k); keysDown.delete(k); }
  for (const k of want) if (!keysDown.has(k)) { await p.keyboard.down(k); keysDown.add(k); }
};
// FPS probe.
await p.evaluate(() => { window.__fps = 0; let n = 0, t = performance.now(); const f = () => { n++; const now = performance.now(); if (now - t > 1000) { window.__fps = n; n = 0; t = now; } requestAnimationFrame(f); }; requestAnimationFrame(f); });
let target = null, stuck = 0, lastPos = null, choresDone = 0, saidSomething = false;
async function playChore() {
  const game = await p.evaluate(() => document.querySelector("#chore .carea")?.className.replace("carea ", ""));
  if (!game) return false;
  const box = async (sel) => { const r = await p.locator(sel).first().boundingBox(); return r && [r.x + r.width / 2, r.y + r.height / 2, r]; };
  log("playing chore game", game);
  await shot("chore-" + game);
  if (game === "stir") { const [cx, cy] = await box("#chore .carea"); await p.mouse.move(cx + 60, cy); await p.mouse.down(); for (let i = 0; i < 70; i++) { const a = i / 3.5; await p.mouse.move(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); } await p.mouse.up(); }
  else if (game === "scrub") { const [cx, cy] = await box("#chore .carea"); await p.mouse.move(cx - 80, cy); await p.mouse.down(); for (let i = 0; i < 18; i++) { await p.mouse.move(cx + 80, cy + 8, { steps: 3 }); await p.mouse.move(cx - 80, cy - 8, { steps: 3 }); } await p.mouse.up(); }
  else if (game === "tapall") { for (const h of await p.$$("#chore .tapme")) { const r = await h.boundingBox(); if (r) await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); } }
  else if (game === "order") { for (let i = 0; i < 6; i++) { const c = await box(`#chore .num[data-i="${i}"]`); if (c) await p.mouse.click(c[0], c[1]); } }
  else if (game === "dial") { const [, cy, r] = await box("#chore .track"); await p.mouse.move(r.x + 2, cy); await p.mouse.down(); for (let x = r.x + 2; x < r.x + r.width; x += 4) { await p.mouse.move(x, cy); if (await p.locator("#chore .signal i.on").count() === 5) { await p.waitForTimeout(1800); break; } } await p.mouse.up(); }
  else if (game === "rhythm") { await p.evaluate(() => new Promise((res) => { const area = document.querySelector("#chore .carea"); let n = 0; const iv = setInterval(() => { const s = 2.4 - (((performance.now() - Number(area.dataset.t0)) % 1300) / 1300) * 1.9; if (Math.abs(s - 1) < 0.06) { area.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true })); n++; } if (!document.querySelector("#chore") || n > 10) { clearInterval(iv); res(); } }, 4); })); }
  else if (game === "hold") { const [x, y] = await box("#chore .holdbtn"); await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(1420); await p.mouse.up(); }
  else if (game === "pull") { for (let k = 0; k < 3; k++) { const [x, y] = await box("#chore .cord b"); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y + 140, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); } }
  await p.waitForFunction(() => !document.querySelector("#chore"), null, { timeout: 9000 }).catch(() => log("chore panel still open after playing", game));
  return true;
}
const end = Date.now() + MINUTES * 60000;
while (Date.now() < end) {
  const v = await V().catch(() => null);
  if (!v) { await p.waitForTimeout(500); continue; }
  if (v.phase !== last) {
    log("PHASE", last, "->", v.phase, v.me ? `role=${v.me.role} alive=${v.me.alive}` : "", "players", v.ps.length);
    last = v.phase; await p.waitForTimeout(v.phase === "PLAY" ? 1200 : 900); await shot("phase-" + v.phase); lastShot = Date.now();
    if (v.phase === "RESULT") log("RESULT", JSON.stringify(v.res));
    if (v.phase === "END") { log("END", JSON.stringify({ win: v.end.win, why: v.end.why })); await p.waitForTimeout(3000); await shot("end"); break; }
    continue;
  }
  if (Date.now() - lastShot > 2500) { await shot(v.phase.toLowerCase()); lastShot = Date.now(); const fps = await p.evaluate(() => window.__fps); if (v.phase === "PLAY") log("fps", fps, "me", v.me.x?.toFixed(2), v.me.z?.toFixed(2), "bar", v.bar?.toFixed(2)); }
  if (v.phase === "PLAY" && v.me.alive !== false && !v.me.spec) {
    // Report a body if we're close.
    const body = (v.bodies || []).find((bd) => Math.hypot(bd.x - v.me.x, bd.z - v.me.z) < 2.2);
    if (body) { await setKeys(new Set()); log("body seen, pressing R"); await shot("body"); await p.keyboard.press("r"); await p.waitForTimeout(800); continue; }
    if (!target || v.me.tasks.find((t) => t.id === target)?.done) {
      const left = v.me.tasks.filter((t) => !t.done).map((t) => t.id);
      left.sort((a, c) => Math.hypot(E.STATIONS[a].x - v.me.x, E.STATIONS[a].z - v.me.z) - Math.hypot(E.STATIONS[c].x - v.me.x, E.STATIONS[c].z - v.me.z));
      target = left[0] || null; if (target) log("heading to chore", target, E.STATIONS[target].label);
    }
    if (target) {
      const st = E.STATIONS[target];
      const d = Math.hypot(st.x - v.me.x, st.z - v.me.z);
      if (d < E.RANGE.use - 0.4) {
        await setKeys(new Set()); await p.waitForTimeout(400);
        const use = await p.evaluate(() => { const b = document.querySelector("#hud .act.use"); return b && { hidden: b.hidden, dis: b.disabled, away: b.classList.contains("away") }; });
        log("at chore", target, "use button", JSON.stringify(use));
        await p.keyboard.press("e"); await p.waitForTimeout(700);
        if (await playChore()) { await p.waitForTimeout(800); const v2 = await V(); log("chore", target, "done?", !!v2.me.tasks.find((t) => t.id === target)?.done); choresDone++; }
        else { log("E did not open a chore at", target); target = null; }
        continue;
      }
      const path = E.findPath([v.me.x, v.me.z], [st.x, st.z]) || [];
      let wp = path[0]; if (wp && Math.hypot(wp[0] - v.me.x, wp[1] - v.me.z) < 0.35 && path[1]) wp = path[1];
      if (!wp) wp = [st.x, st.z];
      const dx = wp[0] - v.me.x, dz = wp[1] - v.me.z;
      const u = (dx + dz) / 2, w = (dx - dz) / 2, m = Math.max(Math.abs(u), Math.abs(w));
      const want = new Set();
      if (Math.abs(u) > m * 0.4) want.add(u > 0 ? "s" : "w");
      if (Math.abs(w) > m * 0.4) want.add(w > 0 ? "d" : "a");
      await setKeys(want);
      if (lastPos && Math.hypot(lastPos[0] - v.me.x, lastPos[1] - v.me.z) < 0.05) { if (++stuck === 12) { log("STUCK at", v.me.x.toFixed(2), v.me.z.toFixed(2), "going to", target); await shot("stuck"); } if (stuck > 25) { target = null; stuck = 0; } } else stuck = 0;
      lastPos = [v.me.x, v.me.z];
    }
    await p.waitForTimeout(120);
    continue;
  }
  await setKeys(new Set());
  if (v.phase === "MEET" && !saidSomething && v.me.alive) { saidSomething = true; await p.waitForTimeout(1500); await p.fill("#meet .say input", "I was doing my chores in the kitchen o").catch(() => log("no chat input")); await p.press("#meet .say input", "Enter").catch(() => {}); log("said something"); }
  if (v.phase === "VOTE" && v.me.alive && !v.meet.myVote) { await p.waitForTimeout(1500); const ok = await p.click("text=SKIP VOTE", { timeout: 3000 }).then(() => true).catch(() => false); log("voted skip via button:", ok); }
  if (v.phase === "PLAY" && v.me.alive === false) { await p.waitForTimeout(1000); }
  await p.waitForTimeout(400);
}
await setKeys(new Set());
log("done; chores played", choresDone);
await b.close();
