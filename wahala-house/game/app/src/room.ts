/**
 * `Room` — one multiplayer room, as a Durable Object. Customised for Wahala
 * House Party Mode: a real-time social deduction game for up to ten people.
 *
 * What changed from the template kernel, and why:
 *
 *   * TIME. The game advances on its own (timers, AI housemates walking), so the
 *     room ticks every TICK_MS through the alarm and feeds `logic.js` a
 *     `{t:"_tick", _now}` system action. Every client action also carries the
 *     server clock as `_now`. logic.js stays pure: time is an input.
 *   * PRESENCE. Joins and last-socket-closed become `_join` / `_leave` system
 *     actions, so the game knows who is here. A player who leaves the lobby
 *     frees their seat; a player who drops mid-game keeps it (an AI plays for
 *     them until they reconnect).
 *   * MOVEMENT. Position updates (`{t:"p"}`) arrive several times a second per
 *     player. They are validated and applied in memory but neither saved nor
 *     broadcast on their own; the next tick carries them to everyone.
 *   * FAN-OUT. A tick only broadcasts when the state's `ver` changed.
 *   * QUICK PLAY. The instance named MATCH_ROOM is a matchmaker: rooms report
 *     how full their lobby is, and `/api/quick` hands out a public room.
 *
 * Client-originated actions whose `t` starts with "_" are refused, so only the
 * room can send system actions.
 *
 * ── HIBERNATION ─────────────────────────────────────────────────────────
 * Storage stays the source of truth. The in-memory cache only saves re-reading
 * storage on every message while the room is awake (it always is while a game
 * is ticking); after an eviction the next message reloads from storage.
 */

import { DurableObject } from "cloudflare:workers";

import type { Env } from "./env";
import * as logic from "./logic.js";
import { parseClientMessage } from "./protocol";

/** Server-authoritative room state. Persisted; `view` is derived per player. */
interface Game {
  /** waiting = not enough players yet · playing · over */
  status: "waiting" | "playing" | "over";
  /** playerIds in join order; the first `maxPlayers` get seats, the rest spectate. */
  seats: string[];
  /** Whatever `logic.setup()` returned, advanced by `logic.applyAction()`. */
  state: unknown;
  /** Whatever `logic.isGameOver()` returned once it ended. */
  result: unknown;
}

/** connId -> playerId. Persisted: the sockets outlive this object's memory. */
type Conns = Record<string, string>;

/** One outbound message. `to` is a connId, a list of them, or "*" for everyone. */
interface Out {
  to: string | string[];
  data: unknown;
}

/** What a handler may return: messages, or messages plus an alarm request. */
type Dispatchable = Out[] | { out?: Out[]; wakeIn?: number | null } | void;

/** The parts of Party Mode state the room itself reads. */
interface PartyState {
  ver?: number;
  phase?: string;
  pub?: boolean;
  ps?: { id: string; bot?: boolean; on?: boolean; hello?: boolean }[];
}

/**
 * A brand-new room state.
 *
 * This MUST be a factory, never a shared constant: Durable Object instances of
 * the same class share one isolate, so a module-level `{...DEFAULT}` spread would
 * hand every room the SAME `seats` array (a spread is shallow) and one room's
 * `seats.push()` would leak into every other room that had not saved yet.
 */
export function freshGame(): Game {
  return { status: "waiting", seats: [], state: null, result: null };
}

/**
 * The meta the room can actually rely on.
 *
 * Seating consults `minPlayers`/`maxPlayers` on every join, and `undefined`
 * there fails silently in the worst way: `seats.length < undefined` is false, so
 * NOBODY is ever seated and the room waits forever. That makes trusting the
 * declared shape a bad bet.
 *
 * Games carried over from the previous engine were written against a looser
 * contract — many name the game with `name` (or `title`) rather than `game`, and
 * a few carry `players: [min, max]` instead of the two fields. They ran fine
 * there, so normalise once here rather than refusing to run them.
 */
export function resolveMeta(
  raw: unknown,
): { game: string; minPlayers: number; maxPlayers: number } {
  const meta = (raw ?? {}) as Record<string, unknown>;
  const players = Array.isArray(meta.players) ? (meta.players as unknown[]) : [];
  const seats = (value: unknown, fallback: number): number =>
    Number.isInteger(value) && (value as number) >= 1 ? (value as number) : fallback;

  const minPlayers = seats(meta.minPlayers, seats(players[0], 1));
  const maxPlayers = seats(meta.maxPlayers, seats(players[1], minPlayers));
  const named = [meta.game, meta.name, meta.title].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return {
    game: named ?? "Game",
    minPlayers,
    // A declared max below the min would wedge the room the same way.
    maxPlayers: Math.max(minPlayers, maxPlayers),
  };
}

const META = resolveMeta(logic.meta);

/**
 * Keepalive. Idle WebSockets get dropped by intermediaries after a few minutes;
 * the runtime answers these ping frames WITHOUT waking the room, so a quiet room
 * stays connected and still costs nothing.
 */
const PING = "__ping";
const PONG = "__pong";

/** How often the game advances while anyone is connected. */
const TICK_MS = 200;
/** A quiet tick still persists at least this often. */
const SAVE_EVERY_MS = 4000;
/** How often a room tells the matchmaker how full it is. */
const REPORT_EVERY_MS = 8000;
/** The Durable Object name of the matchmaker. Not reachable as a game room. */
export const MATCH_ROOM = "__match__";

interface MatchEntry {
  n: number;
  open: boolean;
  at: number;
  pub: boolean;
}

export class Room extends DurableObject<Env> {
  /** Storage mirror while awake (see HIBERNATION). */
  private cache: { game: Game; conns: Conns } | null = null;
  private lastVer: number | null = null;
  private lastSave = 0;
  private lastReport = 0;
  private roomName: string | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Registered on every construction (cheap, idempotent) rather than on first
    // connect, so a room revived from hibernation keeps answering pings.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  // ── persistence ────────────────────────────────────────────────────────

  private async load(): Promise<{ game: Game; conns: Conns }> {
    if (this.cache) return this.cache;
    const [game, conns] = await Promise.all([
      this.ctx.storage.get<Game>("game"),
      this.ctx.storage.get<Conns>("conns"),
    ]);
    this.cache = { game: game ?? freshGame(), conns: conns ?? {} };
    return this.cache;
  }

  private async save(game: Game, conns: Conns): Promise<void> {
    this.cache = { game, conns };
    this.lastSave = Date.now();
    await this.ctx.storage.put({ game, conns });
  }

  private async name(): Promise<string> {
    if (this.roomName === null) this.roomName = (await this.ctx.storage.get<string>("name")) ?? "";
    return this.roomName;
  }

  // ── protocol helpers ───────────────────────────────────────────────────

  /** Everyone's view of the room. Each player sees only `viewFor(state, them)`. */
  private broadcast(game: Game, conns: Conns): Out[] {
    const connected = Object.keys(conns).length;
    const state = game.state as PartyState | null;
    this.lastVer = state && typeof state.ver === "number" ? state.ver : null;
    return Object.entries(conns).map(([connId, playerId]) => ({
      to: connId,
      data: {
        type: "state",
        status: game.status,
        seats: game.seats,
        you: playerId,
        connected,
        view: game.state ? logic.viewFor(game.state, playerId) : null,
        result: game.result,
        meta: META,
      },
    }));
  }

  private error(connId: string, error: string): Out[] {
    return [{ to: connId, data: { type: "error", error } }];
  }

  /** Make sure the tick loop is running while anyone is connected. */
  private async ensureTick(game: Game, conns: Conns): Promise<void> {
    if (!game.state || Object.keys(conns).length === 0) return;
    const at = await this.ctx.storage.getAlarm();
    if (at === null) await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  // ── connection lifecycle ───────────────────────────────────────────────

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__match/")) return this.matchFetch(request, url);
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected a websocket upgrade", { status: 426 });
    }
    // Remember this room's public name (from /ws/<name>) for matchmaking reports.
    const name = decodeURIComponent(url.pathname.replace(/^\/ws\/?/, "")) || "main";
    if ((await this.name()) !== name) {
      this.roomName = name;
      await this.ctx.storage.put("name", name);
    }
    const pair = new WebSocketPair();
    const server = pair[1]!;
    // Hibernatable accept (NOT server.accept()): the room may be evicted while
    // this socket stays open.
    this.ctx.acceptWebSocket(server);
    const connId = crypto.randomUUID().slice(0, 8);
    // The connId must survive eviction — the socket carries it.
    server.serializeAttachment({ connId });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private connIdOf(ws: WebSocket): string | undefined {
    const att = ws.deserializeAttachment() as { connId?: string } | null;
    return att?.connId;
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const connId = this.connIdOf(ws);
    if (!connId) return;
    try {
      await this.dispatch(await this.onMessage(connId, raw));
    } catch (err) {
      // A throw here is almost always a bug in logic.js. Tell that one client
      // instead of killing the room for everybody. The reason stays server-side.
      console.error("room message failed:", err instanceof Error ? err.stack : String(err));
      try {
        ws.send(JSON.stringify({ type: "error", error: "server error" }));
      } catch {
        /* socket already gone */
      }
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const connId = this.connIdOf(ws);
    if (!connId) return;
    const { game, conns } = await this.load();
    const playerId = conns[connId];
    if (playerId === undefined) return;
    delete conns[connId];
    // The last tab for this player closed: tell the game.
    if (game.state && !Object.values(conns).includes(playerId)) {
      game.state = logic.applyAction(game.state, playerId, { t: "_leave", _now: Date.now() });
      const ps = (game.state as PartyState).ps ?? [];
      if (!ps.some((p) => p.id === playerId)) game.seats = game.seats.filter((id) => id !== playerId);
    }
    await this.save(game, conns);
    await this.dispatch(this.broadcast(game, conns));
    await this.report(game, true);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** The game clock. Re-arms itself while anyone is connected. */
  override async alarm(): Promise<void> {
    try {
      await this.dispatch(await this.onWake());
    } catch (err) {
      console.error("room alarm failed:", err instanceof Error ? err.stack : String(err));
      // Keep the clock running even if one tick failed.
      try {
        await this.ctx.storage.setAlarm(Date.now() + TICK_MS * 5);
      } catch {
        /* nothing more to do */
      }
    }
  }

  // ── game semantics ─────────────────────────────────────────────────────

  private async onMessage(connId: string, raw: string | ArrayBuffer): Promise<Dispatchable> {
    // Untrusted frame: validated before anything reads it (see ./protocol).
    const parsed = parseClientMessage(raw);
    if (!parsed.ok) return this.error(connId, parsed.error);
    const msg = parsed.msg;

    const { game, conns } = await this.load();

    // A client introduces itself before it may act. Re-joining with the same
    // playerId reclaims that seat (a reconnect after a dropped socket).
    if (msg.type === "join") {
      conns[connId] = msg.playerId;
      const fresh = !game.seats.includes(msg.playerId);
      if (fresh && game.seats.length < META.maxPlayers) game.seats.push(msg.playerId);
      if (game.status === "waiting" && game.seats.length >= META.minPlayers) {
        game.state = logic.setup(game.seats);
        game.status = "playing";
      }
      if (game.state && game.seats.includes(msg.playerId)) {
        game.state = logic.applyAction(game.state, msg.playerId, { t: "_join", _now: Date.now() });
      }
      await this.save(game, conns);
      await this.ensureTick(game, conns);
      await this.report(game, true);
      return this.broadcast(game, conns);
    }

    const playerId = conns[connId];
    if (!playerId) return this.error(connId, "join first");

    if (msg.type === "action") {
      if (game.status !== "playing") return this.error(connId, "game is not in progress");
      if (!game.seats.includes(playerId)) return this.error(connId, "spectators cannot act");
      const action = msg.action;
      if (!action || typeof action !== "object" || Array.isArray(action)) return this.error(connId, "bad action");
      const t = (action as Record<string, unknown>).t;
      if (typeof t === "string" && t.startsWith("_")) return this.error(connId, "not allowed");
      const stamped = { ...(action as Record<string, unknown>), _now: Date.now() };
      // logic.js is the authority on whether an action is legal, and it is
      // consulted BEFORE any state is written.
      const verdict = logic.validateAction(game.state, playerId, stamped);
      if (!verdict.ok) return this.error(connId, verdict.error ?? "invalid action");
      game.state = logic.applyAction(game.state, playerId, stamped);
      if (t === "p") {
        // Hot path: the next tick saves and fans this out.
        this.cache = { game, conns };
        return [];
      }
      await this.save(game, conns);
      await this.ensureTick(game, conns);
      return this.broadcast(game, conns);
    }

    // Rounds restart through the game's own "again" action.
    return this.error(connId, "use the Play again button");
  }

  private async onWake(): Promise<Dispatchable> {
    const { game, conns } = await this.load();
    if (!game.state || Object.keys(conns).length === 0) return { wakeIn: null };
    game.state = logic.applyAction(game.state, "", { t: "_tick", _now: Date.now() });
    const state = game.state as PartyState;
    const changed = state.ver !== this.lastVer;
    if (changed || Date.now() - this.lastSave > SAVE_EVERY_MS) await this.save(game, conns);
    else this.cache = { game, conns };
    await this.report(game, false);
    return { out: changed ? this.broadcast(game, conns) : [], wakeIn: TICK_MS };
  }

  // ── matchmaking ────────────────────────────────────────────────────────

  /** Tell the matchmaker how this room is doing (best effort, rate-limited). */
  private async report(game: Game, force: boolean): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastReport < REPORT_EVERY_MS) return;
    const name = await this.name();
    if (!name || name === MATCH_ROOM) return;
    this.lastReport = now;
    const state = game.state as PartyState | null;
    const humans = (state?.ps ?? []).filter((p) => !p.bot && p.on !== false && p.hello).length;
    const body = { room: name, n: humans, open: state?.phase === "LOBBY", pub: !!state?.pub || name.startsWith("q-") };
    try {
      const stub = this.env.ROOMS.get(this.env.ROOMS.idFromName(MATCH_ROOM));
      await stub.fetch("https://match/__match/report", { method: "POST", body: JSON.stringify(body) });
    } catch {
      /* matchmaking is a nicety; the game does not depend on it */
    }
  }

  private async matchFetch(request: Request, url: URL): Promise<Response> {
    const now = Date.now();
    const rooms = (await this.ctx.storage.get<Record<string, MatchEntry>>("rooms")) ?? {};
    for (const [k, v] of Object.entries(rooms)) if (now - v.at > 120_000) delete rooms[k];
    const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "cache-control": "no-store" } });

    if (url.pathname === "/__match/report" && request.method === "POST") {
      let body: { room?: unknown; n?: unknown; open?: unknown; pub?: unknown };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response("bad report", { status: 400 });
      }
      if (typeof body.room !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(body.room)) return new Response("bad report", { status: 400 });
      const n = Math.max(0, Math.min(10, Number(body.n) || 0));
      if (n === 0 && !body.open) delete rooms[body.room];
      else rooms[body.room] = { n, open: !!body.open, at: now, pub: !!body.pub };
      await this.ctx.storage.put("rooms", rooms);
      return json({ ok: true });
    }

    if (url.pathname === "/__match/quick") {
      // The fullest public lobby that still has room and reported recently.
      let best: string | null = null;
      for (const [k, v] of Object.entries(rooms)) {
        if (!v.pub || !v.open || v.n >= META.maxPlayers || now - v.at > 45_000) continue;
        if (!best || v.n > rooms[best]!.n) best = k;
      }
      if (!best) {
        best = "q-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
        rooms[best] = { n: 0, open: true, at: now, pub: true };
      }
      // Count the person we just sent there, so a burst of players lands together.
      rooms[best]!.n += 1;
      await this.ctx.storage.put("rooms", rooms);
      return json({ room: best });
    }

    if (url.pathname === "/__match/stats") {
      let players = 0, lobbies = 0;
      for (const v of Object.values(rooms)) {
        if (now - v.at > 45_000) continue;
        players += v.n;
        if (v.pub && v.open && v.n > 0) lobbies += 1;
      }
      return json({ players, lobbies });
    }

    return new Response("not found", { status: 404 });
  }

  // ── fan-out ────────────────────────────────────────────────────────────

  /**
   * Send a handler's messages to their target sockets and apply any `wakeIn`.
   * Sockets are matched by the connId on their attachment, because after
   * hibernation `ctx.getWebSockets()` is the only handle we have on them.
   */
  private async dispatch(res: Dispatchable): Promise<void> {
    if (!res) return;
    const msgs = Array.isArray(res) ? res : (res.out ?? []);
    const wakeIn = Array.isArray(res) ? undefined : res.wakeIn;

    if (msgs.length) {
      const sockets = this.ctx.getWebSockets();
      const byId = new Map<string, WebSocket>();
      for (const s of sockets) {
        const id = this.connIdOf(s);
        if (id) byId.set(id, s);
      }
      for (const m of msgs) {
        if (!m) continue;
        const data = typeof m.data === "string" ? m.data : JSON.stringify(m.data);
        const targets =
          m.to === "*"
            ? sockets
            : Array.isArray(m.to)
              ? m.to.map((id) => byId.get(id)).filter((s): s is WebSocket => Boolean(s))
              : [byId.get(m.to)].filter((s): s is WebSocket => Boolean(s));
        for (const t of targets) {
          try {
            t.send(data);
          } catch {
            /* socket closed mid-fan-out; its close handler will clean up */
          }
        }
      }
    }

    // null cancels a pending tick; a number (re)schedules one.
    if (wakeIn === null) await this.ctx.storage.deleteAlarm();
    else if (typeof wakeIn === "number") await this.ctx.storage.setAlarm(Date.now() + wakeIn);
  }
}
