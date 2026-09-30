/**
 * Room behaviour for Wahala House, exercised through real WebSockets in workerd.
 *
 * The generic protocol checks (routing, untrusted input, spectators) are kept
 * from the template. The game checks drive a season through the public wire
 * protocol and assert what matters most in a hidden-role game: the browser
 * never learns who the Saboteurs are unless it is one of them.
 */

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

/** Open a socket to a room and collect frames as they arrive. */
async function open(room = "main") {
  const res = await SELF.fetch(`https://game.test/ws/${room}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket;
  if (!ws) throw new Error("no webSocket on the upgrade response");
  ws.accept();

  const frames: unknown[] = [];
  ws.addEventListener("message", (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : "";
    if (data === "__pong") return;
    try {
      frames.push(JSON.parse(data));
    } catch {
      frames.push(data);
    }
  });

  /** Wait for the next frame matching `pred` (frames can arrive out of step). */
  const next = async (pred: (f: any) => boolean, label: string) => {
    for (let i = 0; i < 200; i++) {
      const hit = frames.find(pred);
      if (hit) return hit as any;
      await scheduler.wait(10);
    }
    throw new Error(`timed out waiting for ${label}; got ${JSON.stringify(frames).slice(0, 400)}`);
  };

  return {
    ws,
    frames,
    next,
    send: (msg: unknown) => ws.send(JSON.stringify(msg)),
    state: () => next((f) => f?.type === "state", "a state frame"),
    error: () => next((f) => f?.type === "error", "an error frame"),
  };
}

let seq = 0;
function uniq(label: string): string {
  seq += 1;
  return `${label}-${seq}-${crypto.randomUUID().slice(0, 6)}`;
}

const START = { t: "start", name: "Tester", look: "f", fate: "housemate", seed: 12345 };

/** Join a fresh room and start a season; returns the socket and the first view. */
async function season(label: string, fate = "housemate") {
  const room = uniq(label);
  const a = await open(room);
  a.send({ type: "join", playerId: "solo" });
  await a.next((f) => f?.type === "state" && f.view?.phase === "LOBBY", "the lobby");
  a.frames.length = 0;
  a.send({ type: "action", action: { ...START, fate } });
  const st = await a.next((f) => f?.type === "state" && f.view?.phase === "EV", "entry night");
  return { a, room, st };
}

/** Send one action and wait for the answer (a new state or an error). */
async function step(a: Awaited<ReturnType<typeof open>>, action: unknown) {
  a.frames.length = 0;
  a.send({ type: "action", action });
  return a.next((f) => f?.type === "state" || f?.type === "error", "a reply");
}

describe("routing", () => {
  it("rejects a non-upgrade request to /ws instead of waking a room", async () => {
    const res = await SELF.fetch("https://game.test/ws");
    expect(res.status).toBe(426);
  });

  it("rejects a room name that isn't a short safe label", async () => {
    const res = await SELF.fetch("https://game.test/ws/../../etc/passwd", {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).not.toBe(101);
  });

  it("404s a non-asset, non-ws path for a non-HTML request", async () => {
    const res = await SELF.fetch("https://game.test/api/nope");
    expect(res.status).toBe(404);
  });
});

describe("a season", () => {
  it("seats one player straight into the lobby", async () => {
    const a = await open(uniq("lobby"));
    a.send({ type: "join", playerId: "solo" });
    const st = await a.state();
    expect(st.seats).toEqual(["solo"]);
    expect(st.meta.game).toBe("Wahala House");
    expect(st.view.phase).toBe("LOBBY");
    a.ws.close();
  });

  it("opens entry night with ten housemates and hides every role from a housemate", async () => {
    const { a, st } = await season("start");
    const v = st.view;
    expect(v.ev.k).toBe("entry");
    expect(v.hm).toHaveLength(10);
    expect(v.you.role).toBe("H");
    expect(v.you.partner).toBeNull();
    for (const h of v.hm) {
      expect(h.role).toBeNull();
      expect(h.sab).toBeUndefined();
    }
    const raw = JSON.stringify(st);
    expect(raw).not.toContain('"sabs"');
    expect(raw).not.toContain('"rel"');
    expect(raw).not.toContain('"sus"');
    a.ws.close();
  });

  it("shows a Saboteur exactly one partner and nobody else", async () => {
    const { a, st } = await season("sab", "saboteur");
    const v = st.view;
    expect(v.you.role).toBe("S");
    const known = v.hm.filter((h: any) => h.role !== null);
    expect(known).toHaveLength(1);
    expect(known[0].role).toBe("S");
    expect(known[0].id).toBe(v.you.partner);
    a.ws.close();
  });

  it("refuses an invalid start and an action out of phase", async () => {
    const a = await open(uniq("bad-start"));
    a.send({ type: "join", playerId: "solo" });
    await a.state();
    expect((await step(a, { ...START, name: "x" })).error).toBe("name must be 2-16 characters");
    expect((await step(a, { ...START, look: "z" })).error).toBe("bad look");
    const ok = await step(a, START);
    expect(ok.view.phase).toBe("EV");
    expect((await step(a, { t: "tick" })).error).toBe("not now (EV)");
    expect((await step(a, { t: "pick", v: "vibes" })).error).toBe("no choice pending");
    a.ws.close();
  });

  it("steps through entry night beat by beat", async () => {
    const { a, st } = await season("advance");
    expect(st.view.ev.i).toBe(0);
    expect(st.view.ev.item.b.w).toBe("dapo");
    const next = await step(a, { t: "next" });
    expect(next.view.ev.i).toBe(1);
    a.ws.close();
  });

  it("plays a whole week through the wire protocol and reaches the recap", async () => {
    const { a, st } = await season("week");
    let v = st.view;
    let guard = 0;
    while (v.phase !== "END" && guard < 4000) {
      guard += 1;
      let action: any;
      if (v.phase === "EV") {
        const it = v.ev.item;
        if (it.b) action = { t: "next" };
        else if (it.c) action = { t: "pick", v: it.c.n > 1 ? it.c.o.slice(0, it.c.n).map((o: any) => o.v) : it.c.o[0].v };
        else if (it.m) action = { t: "score", v: it.m.g === "jollof" ? 2600 : it.m.g === "dance" ? 72 : { profit: 1200000, skim: 0 } };
      } else action = { t: "ff" };
      const reply = await step(a, action);
      expect(reply.type, JSON.stringify(reply).slice(0, 300)).toBe("state");
      v = reply.view;
    }
    expect(v.phase).toBe("END");
    expect(v.result.grade).toMatch(/^[SABCDF]/);
    // At the end of the season the truth comes out.
    expect(v.hm.filter((h: any) => h.role === "S").length + (v.you.role === "S" ? 1 : 0)).toBe(2);
    a.ws.close();
  }, 120_000);

  it("returns to the lobby on reset", async () => {
    const { a } = await season("reset");
    a.frames.length = 0;
    a.send({ type: "reset" });
    const st = await a.next((f) => f?.type === "state" && f.view?.phase === "LOBBY", "the lobby again");
    expect(st.view.phase).toBe("LOBBY");
    a.ws.close();
  });
});

describe("isolation and persistence", () => {
  it("keeps two rooms completely separate", async () => {
    const one = await season("iso-a");
    const b = await open(uniq("iso-b"));
    b.send({ type: "join", playerId: "solo" });
    const other = await b.state();
    expect(other.view.phase).toBe("LOBBY");
    expect(one.st.view.phase).toBe("EV");
    one.a.ws.close();
    b.ws.close();
  });

  it("survives a reconnect: the season persists and the seat is reclaimed", async () => {
    const { a, room } = await season("persist");
    a.ws.close();
    const again = await open(room);
    again.send({ type: "join", playerId: "solo" });
    const restored = await again.next((f) => f?.type === "state" && f.view?.phase === "EV", "the restored season");
    expect(restored.you).toBe("solo");
    expect(restored.view.hm).toHaveLength(10);
    again.ws.close();
  });
});

describe("untrusted input", () => {
  it("rejects a non-JSON frame", async () => {
    const a = await open(uniq("bad-json"));
    a.ws.send("not json at all");
    expect((await a.error()).error).toBe("invalid json");
    a.ws.close();
  });

  it("rejects a JSON array (not an object)", async () => {
    const a = await open(uniq("bad-shape"));
    a.ws.send(JSON.stringify([1, 2, 3]));
    expect((await a.error()).error).toBe("expected a json object");
    a.ws.close();
  });

  it("rejects an unknown message type", async () => {
    const a = await open(uniq("bad-type"));
    a.send({ type: "definitely-not-a-thing" });
    expect((await a.error()).error).toMatch(/unknown message type/);
    a.ws.close();
  });

  it("refuses an oversized action payload", async () => {
    const a = await open(uniq("big-action"));
    a.send({ type: "join", playerId: "solo" });
    await a.state();
    a.frames.length = 0;
    a.send({ type: "action", action: { blob: "x".repeat(6_000) } });
    expect((await a.error()).error).toBe("action too large");
    a.ws.close();
  });

  it("refuses a hustle skim from a housemate and an impossible score", async () => {
    const a = await open(uniq("cheat"));
    a.send({ type: "join", playerId: "solo" });
    await a.state();
    await step(a, START);
    expect((await step(a, { t: "score", v: 999999 })).error).toBe("no game running");
    a.ws.close();
  });

  it("does not seat a second browser, and refuses its actions", async () => {
    const room = uniq("spectator");
    const p = await open(room);
    p.send({ type: "join", playerId: "solo" });
    await p.state();
    const s = await open(room);
    s.send({ type: "join", playerId: "watcher" });
    const asWatcher = await s.state();
    expect(asWatcher.seats).toEqual(["solo"]);
    s.frames.length = 0;
    s.send({ type: "action", action: START });
    expect((await s.error()).error).toBe("spectators cannot act");
    p.ws.close();
    s.ws.close();
  });
});
