import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { createRoom, addMember } from "../src/db/rooms";
import { snapToCell } from "../src/rules/rooms";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-11-02T14:00:00.000Z";
const ENDS = "2026-11-02T15:00:00.000Z";
// A Lausanne café; raw points are never round numbers, so leaks are findable.
const CAFE = { lat: 46.519731, lng: 6.632911 };
const FAR = { lat: 46.529731, lng: 6.642911 };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string; name: string };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ elements: [] })));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function call(env: Env, method: string, path: string, who?: Person, body?: unknown) {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method,
      headers: { ...(who ? { cookie: who.cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    ctx,
  );
}

async function person(env: Env, name: string): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${name}-${id}@example.com`, name, NOW);
  return { id, name, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

/** A room with its starter in it, centred on the snapped cell of `at`. */
async function room(env: Env, starter: Person, over: { at?: { lat: number; lng: number }; topic?: string; endsAt?: string; status?: "open" | "closed" | "expired" } = {}) {
  const cell = snapToCell((over.at ?? CAFE).lat, (over.at ?? CAFE).lng);
  const id = crypto.randomUUID();
  await createRoom(env.DB, {
    id,
    starterId: starter.id,
    topic: over.topic ?? "Teach me a two-player game?",
    placeText: "Café du Coin, window table",
    cellLat: cell.lat,
    cellLng: cell.lng,
    lang: "en",
    translation: null,
    opensAt: NOW,
    endsAt: over.endsAt ?? ENDS,
    status: over.status ?? "open",
    createdAt: NOW,
  });
  await addMember(env.DB, { roomId: id, userId: starter.id, role: "starter", joinedAt: NOW });
  return id;
}

async function scan(env: Env, who: Person | undefined, at: { lat: number; lng: number } = CAFE) {
  const res = await call(env, "POST", "/api/rooms/scan", who, at);
  return { status: res.status, body: (await res.json()) as { rooms: RoomCard[]; error?: string } };
}

interface RoomCard {
  id: string;
  topic: string;
  placeText: string;
  endsAt: string;
  distance: string;
  size: string;
  fitsYou: boolean;
  translation: string | null;
  member: boolean;
  names: string[] | null;
}

describe("rooms scan", () => {
  it("needs a signed-in person and a real point", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    expect((await scan(env, undefined)).status).toBe(401);
    expect((await call(env, "POST", "/api/rooms/scan", ana, { lat: "here", lng: 6.6 })).status).toBe(400);
    expect((await call(env, "POST", "/api/rooms/scan", ana, { lat: 46.5 })).status).toBe(400);
  });

  it("never returns names, user ids or exact distances to non-members", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await addMember(env.DB, { roomId: id, userId: lea.id, role: "member", joinedAt: NOW });
    const outsider = await person(env, "Marc");
    const { status, body } = await scan(env, outsider);
    expect(status).toBe(200);
    expect(body.rooms).toHaveLength(1);
    const card = body.rooms[0];
    expect(card.names).toBeNull();
    expect(card.member).toBe(false);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("Hugo");
    expect(raw).not.toContain("Lea");
    expect(raw).not.toContain(hugo.id);
    expect(raw).not.toContain(lea.id);
    expect(raw).not.toContain(String(CAFE.lat));
    expect(raw).not.toContain(String(CAFE.lng));
    expect(card.distance).toMatch(/^ABOUT \d+ M AWAY$/);
    expect(card.size).toBe("2 IN · UP TO 6");
  });

  it("shows members their own rooms with first names", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await addMember(env.DB, { roomId: id, userId: lea.id, role: "member", joinedAt: NOW });
    const { body } = await scan(env, lea);
    expect(body.rooms[0].member).toBe(true);
    expect(body.rooms[0].names).toEqual(["Hugo", "Lea"]);
  });

  it("finds rooms within 500 m only, at most 3, FITS YOU first", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const viewer = await person(env, "Viewer");
    await env.DB.prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, 'interest', 'cardamom buns', 'questions', 1, ?)")
      .bind(crypto.randomUUID(), viewer.id, NOW)
      .run();
    const topics = ["Teach me a two-player game?", "Best cardamom buns in town?", "Spare ping-pong bat?", "One more icebreaker?", "And another?"];
    for (const topic of topics) await room(env, hugo, { topic });
    await room(env, hugo, { at: FAR, topic: "Far away room" });
    const { body } = await scan(env, viewer);
    expect(body.rooms).toHaveLength(3);
    expect(body.rooms[0].topic).toBe("Best cardamom buns in town?");
    expect(body.rooms[0].fitsYou).toBe(true);
    expect(body.rooms.map((r) => r.topic)).not.toContain("Far away room");
  });

  it("hides closed, expired, full and removed rooms", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const viewer = await person(env, "Viewer");
    await room(env, hugo, { status: "closed", topic: "closed" });
    await room(env, hugo, { endsAt: NOW, topic: "expired" });
    const full = await room(env, hugo, { topic: "full" });
    for (let i = 0; i < 5; i++) {
      const m = await person(env, `M${i}`);
      await addMember(env.DB, { roomId: full, userId: m.id, role: "member", joinedAt: NOW });
    }
    const gone = await room(env, hugo, { topic: "removed" });
    await addMember(env.DB, { roomId: gone, userId: viewer.id, role: "member", joinedAt: NOW });
    await env.DB.prepare("UPDATE room_members SET removed = 1 WHERE room_id = ? AND user_id = ?").bind(gone, viewer.id).run();
    const { body } = await scan(env, viewer);
    expect(body.rooms).toEqual([]);
  });

  it("hides rooms both ways after a block", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const viewer = await person(env, "Viewer");
    await room(env, hugo);
    await env.DB.prepare("INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)").bind(viewer.id, hugo.id, NOW).run();
    expect((await scan(env, viewer)).body.rooms).toEqual([]);
    expect((await scan(env, hugo)).body.rooms).toHaveLength(1);
  });

  it("rate-limits scans", async () => {
    const env = testEnv();
    const viewer = await person(env, "Viewer");
    for (let i = 0; i < 20; i++) expect((await scan(env, viewer)).status).toBe(200);
    expect((await scan(env, viewer)).status).toBe(429);
  });

  it("stores and logs no raw coordinates anywhere", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await scan(env, lea);
    await call(env, "POST", `/api/rooms/${id}/join`, lea, { ...CAFE, line: "I know a quick one" });
    await call(env, "POST", `/api/rooms/${id}/leave`, lea);
    const dump: string[] = [];
    for (const table of ["rooms", "room_members", "room_replies"]) {
      const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all<Record<string, unknown>>();
      dump.push(JSON.stringify(results));
    }
    for (const [k, v] of env.SESSIONS.store) dump.push(`${k}=${v}`);
    const raw = dump.join("\n");
    expect(raw).not.toContain(String(CAFE.lat));
    expect(raw).not.toContain(String(CAFE.lng));
  });
});

describe("rooms join and leave", () => {
  it("joins with a screened line and shows the room with names", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    const res = await call(env, "POST", `/api/rooms/${id}/join`, lea, { ...CAFE, line: "I know a quick one" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { names: string[]; size: string };
    expect(body.names).toEqual(["Hugo", "Lea"]);
    expect(body.size).toBe("2 IN · UP TO 6");
  });

  it("refuses joins far away, when full, removed, blocked or closed, without saying why", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const strangers = [await person(env, "S1"), await person(env, "S2"), await person(env, "S3"), await person(env, "S4"), await person(env, "S5")];
    for (const s of strangers) await addMember(env.DB, { roomId: id, userId: s.id, role: "member", joinedAt: NOW });
    const sixth = await person(env, "Sixth");
    expect((await call(env, "POST", `/api/rooms/${id}/join`, sixth, CAFE)).status).toBe(409);

    const open = await room(env, hugo, { topic: "open room" });
    expect((await call(env, "POST", `/api/rooms/${open}/join`, sixth, FAR)).status).toBe(404);
    const blocked = await person(env, "Blocked");
    await env.DB.prepare("INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)").bind(hugo.id, blocked.id, NOW).run();
    expect((await call(env, "POST", `/api/rooms/${open}/join`, blocked, CAFE)).status).toBe(404);
    const removed = await person(env, "Removed");
    await addMember(env.DB, { roomId: open, userId: removed.id, role: "member", joinedAt: NOW });
    await env.DB.prepare("UPDATE room_members SET removed = 1 WHERE room_id = ? AND user_id = ?").bind(open, removed.id).run();
    expect((await call(env, "POST", `/api/rooms/${open}/join`, removed, CAFE)).status).toBe(404);
    const closed = await room(env, hugo, { status: "closed", topic: "closed room" });
    expect((await call(env, "POST", `/api/rooms/${closed}/join`, sixth, CAFE)).status).toBe(404);
  });

  it("refuses rude and overlong joining lines", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    expect((await call(env, "POST", `/api/rooms/${id}/join`, lea, { ...CAFE, line: "You idiot" })).status).toBe(422);
    expect((await call(env, "POST", `/api/rooms/${id}/join`, lea, { ...CAFE, line: "x".repeat(81) })).status).toBe(422);
  });

  it("lets someone back after leaving, and leaving always works", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await call(env, "POST", `/api/rooms/${id}/join`, lea, CAFE);
    expect((await call(env, "POST", `/api/rooms/${id}/leave`, lea)).status).toBe(200);
    expect((await call(env, "POST", `/api/rooms/${id}/leave`, lea)).status).toBe(200);
    expect((await call(env, "POST", `/api/rooms/${id}/join`, lea, CAFE)).status).toBe(200);
  });

  it("limits joins to 2 rooms at once", async () => {
    const env = testEnv();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const ids = [await room(env, hugo, { topic: "one" }), await room(env, hugo, { topic: "two" }), await room(env, hugo, { topic: "three" })];
    expect((await call(env, "POST", `/api/rooms/${ids[0]}/join`, lea, CAFE)).status).toBe(200);
    expect((await call(env, "POST", `/api/rooms/${ids[1]}/join`, lea, CAFE)).status).toBe(200);
    expect((await call(env, "POST", `/api/rooms/${ids[2]}/join`, lea, CAFE)).status).toBe(429);
  });
});
