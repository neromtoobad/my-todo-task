/**
 * Party Mode rules, driven directly through logic.js with a fake clock.
 *
 * The room feeds time in as `_now`; here we do the same by hand, which makes
 * every rule (cooldowns, ranges, timers, votes) testable in milliseconds and
 * deterministically.
 */

import { describe, expect, it } from "vitest";

import * as L from "../src/logic.js";

type S = any;

function game(humans = ["h1"], opts: Record<string, unknown> = {}) {
  let now = 1_000_000;
  let s: S = L.setup([humans[0]!]);
  const sys = (pid: string, t: string) => { s = L.applyAction(s, pid, { t, _now: now }); };
  const act = (pid: string, a: Record<string, unknown>) => {
    const full = { ...a, _now: now };
    const v = L.validateAction(s, pid, full);
    if (!v.ok) return v.error as string;
    s = L.applyAction(s, pid, full);
    return null;
  };
  const tick = (ms: number) => { const end = now + ms; while (now < end) { now += 200; s = L.applyAction(s, "", { t: "_tick", _now: now }); } };
  for (const [i, id] of humans.entries()) {
    if (i > 0) sys(id, "_join");
    act(id, { t: "hello", name: `Player${i + 1}`, look: i === 0 ? "pf" : "pm", room: "r-TEST" });
  }
  if (Object.keys(opts).length) act(humans[0]!, { t: "opts", ...opts });
  return {
    get s() { return s; }, set s(v) { s = v; },
    get now() { return now; }, set now(v) { now = v; },
    act, sys, tick,
    p: (id: string) => s.ps.find((q: S) => q.id === id),
    view: (id: string) => L.viewFor(s, id) as S,
  };
}

/** Start a round and get to PLAY. */
function started(humans = ["h1"], opts: Record<string, unknown> = {}) {
  const g = game(humans, opts);
  expect(g.act(humans[0]!, { t: "start" })).toBeNull();
  g.tick(7000);
  expect(g.s.phase).toBe("PLAY");
  return g;
}

/** Put a player somewhere directly (tests only: the real client walks). */
function place(g: ReturnType<typeof game>, id: string, x: number, z: number) {
  const p = g.p(id); p.x = x; p.z = z; p.at = g.now;
}

describe("lobby", () => {
  it("seats people, names them, and makes the first one host", () => {
    const g = game(["h1", "h2"]);
    const v = g.view("h2");
    expect(v.phase).toBe("LOBBY");
    expect(v.ps.map((p: S) => p.name)).toEqual(["Player1", "Player2"]);
    expect(v.host).toBe("h1");
    expect(g.act("h2", { t: "start" })).toBe("Only the host can start.");
  });

  it("refuses bad names and keeps names unique", () => {
    const g = game(["h1"]);
    g.sys("h2", "_join");
    expect(g.act("h2", { t: "hello", name: "x", look: "pf" })).toMatch(/name/);
    expect(g.act("h2", { t: "hello", name: "Player1", look: "pf" })).toBeNull();
    expect(g.p("h2").name).toBe("Player1 2");
    expect(g.p("h2").look).not.toBe("pf");
  });

  it("fills empty seats with AI housemates and deals hidden roles", () => {
    const g = started(["h1", "h2"]);
    expect(g.s.ps).toHaveLength(8);
    expect(g.s.ps.filter((p: S) => p.bot)).toHaveLength(6);
    expect(g.s.ps.filter((p: S) => p.role === "S")).toHaveLength(2);
    for (const p of g.s.ps) {
      const v = g.view(p.id);
      const seen = v.ps.filter((o: S) => o.role).map((o: S) => o.id);
      if (p.role === "H") expect(seen).toEqual([]);
      else expect(seen.sort()).toEqual(g.s.ps.filter((q: S) => q.role === "S").map((q: S) => q.id).sort());
    }
  });

  it("auto-starts a public room 30 seconds after the first player", () => {
    const g = game(["h1"]);
    g.s.pub = true; g.s.fillAt = g.now + 30_000;
    g.tick(29_000);
    expect(g.s.phase).toBe("LOBBY");
    g.tick(1_400);
    expect(g.s.phase).toBe("INTRO");
  });

  it("refuses system actions from clients", () => {
    const g = game(["h1"]);
    expect(L.validateAction(g.s, "h1", { t: "_tick", _now: 1 })).toEqual({ ok: false, error: "not allowed" });
  });

  it("frees a lobby seat when someone leaves", () => {
    const g = game(["h1", "h2"]);
    g.sys("h2", "_leave");
    expect(g.view("h1").ps).toHaveLength(1);
  });
});

describe("moving", () => {
  it("accepts walking, refuses teleports and walls", () => {
    const g = started();
    const me = g.p("h1");
    g.now += 300;
    expect(g.act("h1", { t: "p", x: me.x + 0.5, z: me.z, f: 1 })).toBeNull();
    g.now += 100;
    expect(g.act("h1", { t: "p", x: me.x + 9, z: me.z })).toBe("bad move");
    expect(g.act("h1", { t: "p", x: 0.1, z: 0.1 })).toBe("bad move");
  });
});

describe("chores", () => {
  it("needs you at the station for the chore's full length", () => {
    const g = started();
    const me = g.p("h1");
    me.role = "H";
    const id = me.tasks[0].id;
    expect(g.act("h1", { t: "use", id })).toBe("Get closer.");
    const at = stationXZ(id);
    place(g, "h1", at[0], at[1]);
    expect(g.act("h1", { t: "use", id })).toBeNull();
    g.now += 500;
    expect(g.act("h1", { t: "done", id })).toBe("Too fast.");
    g.now += 6000;
    const before = g.view("h1").bar;
    expect(g.act("h1", { t: "done", id })).toBeNull();
    expect(g.view("h1").bar).toBeGreaterThan(before);
  });
});

describe("strikes, bodies and meetings", () => {
  it("lets a Saboteur strike only up close and off cooldown, then a report calls a meeting", () => {
    const g = started(["h1", "h2"], { fill: 6 });
    const sab = g.s.ps.find((p: S) => p.role === "S");
    const vic = g.s.ps.find((p: S) => p.role === "H" && !p.bot) || g.s.ps.find((p: S) => p.role === "H");
    for (const p of g.s.ps) p.ctl = p.bot ? "h" : p.ctl; // freeze the AI for a clean test
    place(g, sab.id, 16, 8); place(g, vic.id, 19, 8);
    sab.cd = g.now + 5000;
    expect(L.validateAction(g.s, sab.id, { t: "strike", who: vic.id, _now: g.now }).ok).toBe(false);
    g.now += 6000;
    expect((L.validateAction(g.s, sab.id, { t: "strike", who: vic.id, _now: g.now }) as S).error).toBe("Too far.");
    place(g, vic.id, 17, 8);
    g.s = L.applyAction(g.s, sab.id, { t: "strike", who: vic.id, _now: g.now });
    expect(g.p(vic.id).alive).toBe(false);
    expect(g.s.bodies).toHaveLength(1);
    // A different living housemate finds the body.
    const finder = g.s.ps.find((p: S) => p.alive && p.role === "H");
    place(g, finder.id, 17.5, 8.5);
    g.s = L.applyAction(g.s, finder.id, { t: "report", _now: g.now });
    expect(g.s.phase).toBe("MEET");
    expect(g.view(finder.id).meet.body).toBe(vic.id);
  });

  it("filters swears and links but keeps real names", () => {
    const g = started(["h1"]);
    for (const p of g.s.ps) if (p.bot) p.ctl = "h";
    g.s.phase = "MEET"; g.s.meet = { by: "h1", kind: "bell", chat: [], seats: [] }; g.s.ends = g.now + 30000;
    expect(g.act("h1", { t: "chat", text: "Dickson ate at Amala Shitta, you f*ck1ng idiot, see www.scam.com" })).toBeNull();
    const t = g.view("h1").meet.chat.at(-1).t;
    expect(t).toContain("Dickson");
    expect(t).toContain("Shitta");
    expect(t).not.toMatch(/f\*ck1ng/i);
    expect(t).toContain("[link]");
    g.now += 300;
    expect(g.act("h1", { t: "chat", text: "again" })).toBe("Slow down small.");
  });

  it("votes someone out and reveals their role", () => {
    const g = started(["h1", "h2", "h3"], { fill: 5 });
    for (const p of g.s.ps) if (p.bot) p.ctl = "h";
    g.s = L.applyAction(g.s, "h1", { t: "_tick", _now: g.now });
    place(g, "h1", 18.6, 6.5);
    g.now += 20_000;
    expect(g.act("h1", { t: "bell" })).toBeNull();
    expect(g.s.phase).toBe("MEET");
    g.tick(41_000);
    expect(g.s.phase).toBe("VOTE");
    const target = g.s.ps.find((p: S) => p.bot && p.alive);
    for (const p of g.s.ps) if (p.alive) { g.s = L.applyAction(g.s, p.id, { t: "vote", who: p.id === target.id ? "skip" : target.id, _now: g.now }); }
    g.tick(2_000);
    expect(g.s.phase).toBe("RESULT");
    const v = g.view("h1");
    expect(v.res.out).toBe(target.id);
    expect(v.res.role).toBe(target.role);
  });
});

describe("sabotage and dropping out", () => {
  it("loses the house to an unfixed gas leak", () => {
    const g = started(["h1"], { fill: 6 });
    for (const p of g.s.ps) if (p.bot) p.ctl = "h";
    const sab = g.s.ps.find((p: S) => p.role === "S");
    g.now += 20_000;
    g.s = L.applyAction(g.s, sab.id, { t: "sab", k: "gas", _now: g.now });
    expect(g.view("h1").sab.k).toBe("gas");
    g.tick(41_000);
    expect(g.s.phase).toBe("END");
    expect(g.view("h1").end.win).toBe("S");
  });

  it("lets the AI play for someone whose network drops, and hands back on return", () => {
    const g = started(["h1", "h2"]);
    g.sys("h2", "_leave");
    g.tick(16_000);
    expect(g.p("h2").ctl).toBe("b");
    g.sys("h2", "_join");
    expect(g.p("h2").ctl).toBe("h");
  });
});

// Station coordinates, read from the engine the same way the client does.
function stationXZ(id: string): [number, number] {
  const S: Record<string, [number, number]> = {
    jollof: [3.6, 1.45], plates: [7.4, 1.45], fridge: [10.1, 1.5], money: [16, 4.6], aerial: [21.7, 1.9], cushions: [13.3, 3.6],
    crown: [26.5, 3.3], jacuzzi: [27, 7.2], weights: [15.2, 11.5], laundry: [5.5, 11.4], beds: [3.1, 15.4], pool: [20, 15.6],
    plantain: [14.6, 23.8], sweep: [24.5, 12.6],
  };
  return S[id]!;
}
