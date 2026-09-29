/**
 * Room behaviour for Oathbreakers, exercised through real WebSockets in workerd.
 *
 * The generic protocol checks (routing, untrusted input, spectators) are kept
 * from the template; the game checks drive a season through the public wire
 * protocol and assert the thing that matters most in a hidden-role game: the
 * browser never receives another contestant's secret role.
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
    for (let i = 0; i < 100; i++) {
      const hit = frames.find(pred);
      if (hit) return hit as any;
      await scheduler.wait(10);
    }
    throw new Error(`timed out waiting for ${label}; got ${JSON.stringify(frames)}`);
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

const START = { t: "start", name: "Tester", av: 0, fame: "CHEF", fate: "sworn", seed: 12345 };

/** Join a fresh room and start a season; returns the socket and the first view. */
async function season(label: string, fate = "sworn") {
  const room = uniq(label);
  const a = await open(room);
  a.send({ type: "join", playerId: "solo" });
  await a.next((f) => f?.type === "state" && f.view?.phase === "LOBBY", "the lobby");
  a.frames.length = 0;
  a.send({ type: "action", action: { ...START, fate } });
  const st = await a.next((f) => f?.type === "state" && f.view?.phase === "INTRO", "the intro");
  return { a, room, st };
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
    expect(st.status).toBe("playing");
    expect(st.seats).toEqual(["solo"]);
    expect(st.meta.game).toBe("Oathbreakers");
    expect(st.view.phase).toBe("LOBBY");
    a.ws.close();
  });

  it("starts a season with twelve contestants and hides every AI role", async () => {
    const { a, st } = await season("start");
    expect(st.view.roster).toHaveLength(12);
    expect(st.view.you.role).toBe("S");
    for (const p of st.view.roster) {
      if (!p.human) expect(p.role).toBeNull();
    }
    const raw = JSON.stringify(st);
    expect(raw).not.toContain('"sus"');
    a.ws.close();
  });

  it("shows an Oathbreaker only their fellow Oathbreakers", async () => {
    const { a, st } = await season("oath", "oath");
    expect(st.view.you.role).toBe("O");
    const known = st.view.roster.filter((p: any) => !p.human && p.role !== null);
    expect(known).toHaveLength(2);
    for (const p of known) expect(p.role).toBe("O");
    a.ws.close();
  });

  it("refuses an invalid start and an action out of phase", async () => {
    const a = await open(uniq("bad-start"));
    a.send({ type: "join", playerId: "solo" });
    await a.state();
    a.frames.length = 0;
    a.send({ type: "action", action: { ...START, name: "x" } });
    expect((await a.error()).error).toBe("name must be 2-16 characters");

    a.frames.length = 0;
    a.send({ type: "action", action: START });
    await a.next((f) => f?.type === "state" && f.view?.phase === "INTRO", "the intro");
    a.frames.length = 0;
    a.send({ type: "action", action: { t: "vote", target: "ada" } });
    expect((await a.error()).error).toBe("not now (INTRO)");
    a.ws.close();
  });

  it("advances from the intro to the role reveal and into day one", async () => {
    const { a } = await season("advance");
    a.frames.length = 0;
    a.send({ type: "action", action: { t: "next" } });
    const role = await a.next((f) => f?.type === "state" && f.view?.phase === "ROLE", "the role reveal");
    expect(role.view.sc.role).toBe("S");
    a.frames.length = 0;
    a.send({ type: "action", action: { t: "next" } });
    const day1 = await a.next((f) => f?.type === "state" && f.view?.phase === "M_INTRO", "the first mission");
    expect(day1.view.day).toBe(1);
    expect(day1.view.sc.title).toBe("THE SEALED VAULT");
    a.ws.close();
  });

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
    expect(one.st.view.phase).toBe("INTRO");
    one.a.ws.close();
    b.ws.close();
  });

  it("survives a reconnect: the season persists and the seat is reclaimed", async () => {
    const { a, room } = await season("persist");
    a.ws.close();
    const again = await open(room);
    again.send({ type: "join", playerId: "solo" });
    const restored = await again.next((f) => f?.type === "state" && f.view?.phase === "INTRO", "the restored season");
    expect(restored.you).toBe("solo");
    expect(restored.view.roster).toHaveLength(12);
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
