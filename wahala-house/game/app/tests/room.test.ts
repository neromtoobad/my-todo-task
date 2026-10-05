/**
 * Party Mode over the wire: real WebSockets against the real Workers runtime.
 *
 * The rules themselves are covered in party.test.ts with a fake clock. These
 * check what only the room can get wrong: routing, seating several browsers,
 * presence, refusing system actions, the tick loop, and Quick Play.
 */

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

async function open(room: string) {
  const res = await SELF.fetch(`https://game.test/ws/${room}`, { headers: { Upgrade: "websocket" } });
  expect(res.status).toBe(101);
  const ws = res.webSocket;
  if (!ws) throw new Error("no webSocket on the upgrade response");
  ws.accept();
  const frames: any[] = [];
  ws.addEventListener("message", (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : "";
    if (data === "__pong") return;
    try { frames.push(JSON.parse(data)); } catch { frames.push(data); }
  });
  const next = async (pred: (f: any) => boolean, label: string, tries = 300) => {
    for (let i = 0; i < tries; i++) {
      const hit = frames.find(pred);
      if (hit) return hit;
      await scheduler.wait(10);
    }
    throw new Error(`timed out waiting for ${label}; got ${JSON.stringify(frames.slice(-3)).slice(0, 400)}`);
  };
  return {
    ws, frames, next,
    send: (msg: unknown) => ws.send(JSON.stringify(msg)),
    act: (action: unknown) => ws.send(JSON.stringify({ type: "action", action })),
    clear: () => { frames.length = 0; },
  };
}

let seq = 0;
const uniq = (label: string) => `${label}-${++seq}-${crypto.randomUUID().slice(0, 6)}`;

async function joinAs(room: string, id: string, name: string) {
  const c = await open(room);
  c.send({ type: "join", playerId: id });
  await c.next((f) => f?.type === "state" && f.view, "first state");
  c.clear();
  c.act({ t: "hello", name, look: "pf", room });
  await c.next((f) => f?.type === "state" && f.view?.me?.hello, "hello acknowledged");
  return c;
}

describe("routing", () => {
  it("rejects a non-upgrade request to /ws instead of waking a room", async () => {
    expect((await SELF.fetch("https://game.test/ws")).status).toBe(426);
  });

  it("rejects room names that are not short safe labels, and reserved ones", async () => {
    const bad = await SELF.fetch("https://game.test/ws/../../etc/passwd", { headers: { Upgrade: "websocket" } });
    expect(bad.status).not.toBe(101);
    const reserved = await SELF.fetch("https://game.test/ws/__match__", { headers: { Upgrade: "websocket" } });
    expect(reserved.status).toBe(400);
  });

  it("404s a non-asset, non-ws path for a non-HTML request", async () => {
    expect((await SELF.fetch("https://game.test/api/nope")).status).toBe(404);
  });
});

describe("the lobby", () => {
  it("seats several browsers in one room and keeps them in sync", async () => {
    const room = uniq("lobby");
    const a = await joinAs(room, "pa", "Ada");
    const b = await joinAs(room, "pb", "Bayo");
    const seen = await a.next((f) => f?.type === "state" && f.view?.ps?.length === 2, "the second player");
    expect(seen.view.ps.map((p: any) => p.name).sort()).toEqual(["Ada", "Bayo"]);
    expect(seen.view.host).toBe("pa");
    b.clear();
    b.act({ t: "start" });
    expect((await b.next((f) => f?.type === "error", "an error")).error).toBe("Only the host can start.");
    a.ws.close(); b.ws.close();
  });

  it("frees the seat when someone leaves the lobby", async () => {
    const room = uniq("leave");
    const a = await joinAs(room, "la", "Ada");
    const b = await joinAs(room, "lb", "Bayo");
    await a.next((f) => f?.view?.ps?.length === 2, "two players");
    a.clear();
    b.ws.close();
    const after = await a.next((f) => f?.type === "state" && f.view?.ps?.length === 1, "one player left");
    expect(after.view.ps[0].name).toBe("Ada");
    a.ws.close();
  });

  it("refuses system actions sent by a browser", async () => {
    const a = await joinAs(uniq("sys"), "sa", "Ada");
    a.act({ t: "_tick" });
    expect((await a.next((f) => f?.type === "error", "an error")).error).toBe("not allowed");
    a.ws.close();
  });
});

describe("a round", () => {
  it("starts with AI housemates, hides roles, and the clock moves the round on", async () => {
    const room = uniq("round");
    const a = await joinAs(room, "ra", "Ada");
    a.clear();
    a.act({ t: "start" });
    const intro = await a.next((f) => f?.type === "state" && f.view?.phase === "INTRO", "the intro");
    expect(intro.view.ps).toHaveLength(8);
    expect(intro.view.me.role).toMatch(/^[HS]$/);
    if (intro.view.me.role === "H") expect(intro.view.ps.filter((p: any) => p.role)).toHaveLength(0);
    const raw = JSON.stringify(intro);
    expect(raw).not.toContain('"sus"');
    expect(raw).not.toContain('"saw"');
    // Nothing but the server clock moves INTRO to PLAY.
    const play = await a.next((f) => f?.type === "state" && f.view?.phase === "PLAY", "play", 1200);
    expect(play.view.phase).toBe("PLAY");
    a.ws.close();
  }, 30_000);

  it("carries your walking to everyone on the next tick", async () => {
    const room = uniq("walk");
    const a = await joinAs(room, "wa", "Ada");
    a.act({ t: "start" });
    const play = await a.next((f) => f?.type === "state" && f.view?.phase === "PLAY", "play", 1200);
    const me = play.view.me;
    a.clear();
    a.act({ t: "p", x: me.x + 0.4, z: me.z, f: 0 });
    const moved = await a.next((f) => f?.type === "state" && Math.abs(f.view?.me?.x - (me.x + 0.4)) < 0.01, "my move echoed");
    expect(moved.view.me.x).toBeCloseTo(me.x + 0.4, 2);
    a.act({ t: "p", x: me.x + 20, z: me.z, f: 0 });
    expect((await a.next((f) => f?.type === "error", "a refused teleport")).error).toBe("bad move");
    a.ws.close();
  }, 30_000);
});

describe("quick play", () => {
  it("hands out a public room and sends a burst of players to the same one", async () => {
    const one = await (await SELF.fetch("https://game.test/api/quick")).json() as { room: string };
    const two = await (await SELF.fetch("https://game.test/api/quick")).json() as { room: string };
    expect(one.room).toMatch(/^q-/);
    expect(two.room).toBe(one.room);
    const stats = await (await SELF.fetch("https://game.test/api/stats")).json() as { players: number };
    expect(typeof stats.players).toBe("number");
  });
});
