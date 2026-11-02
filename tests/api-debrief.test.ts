import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { createRoom, addMember } from "../src/db/rooms";
import { debriefAggregates } from "../src/db/debrief";
import { snapToCell } from "../src/rules/rooms";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-11-02T14:00:00.000Z";
const ENDS = "2026-11-02T15:00:00.000Z";
const CAFE = { lat: 46.519731, lng: 6.632911 };
const SECRET = "test-table-secret";

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

async function room(env: Env, starter: Person) {
  const cell = snapToCell(CAFE.lat, CAFE.lng);
  const id = crypto.randomUUID();
  await createRoom(env.DB, {
    id, starterId: starter.id, topic: "Teach me a two-player game?", placeText: "Café du Coin, window table",
    cellLat: cell.lat, cellLng: cell.lng, lang: "en", translation: null, opensAt: NOW, endsAt: ENDS, status: "open", createdAt: NOW,
  });
  await addMember(env.DB, { roomId: id, userId: starter.id, role: "starter", joinedAt: NOW, removeToken: crypto.randomUUID() });
  return id;
}

/** Hugo and Lea join, sit, and scan: a real table meeting. */
async function metAtTable(env: Env) {
  const hugo = await person(env, "Hugo");
  const lea = await person(env, "Lea");
  const id = await room(env, hugo);
  await call(env, "POST", `/api/rooms/${id}/join`, lea, CAFE);
  const token = (((await (await call(env, "GET", `/api/rooms/${id}/table`, hugo)).json()) as { token: string }).token);
  await call(env, "POST", "/api/rooms/scan-table", lea, { token });
  return { hugo, lea, id };
}

async function debrief(env: Env, id: string, who: Person) {
  const res = await call(env, "GET", `/api/rooms/${id}/debrief`, who);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function answer(env: Env, id: string, who: Person, body: Record<string, unknown>) {
  const res = await call(env, "POST", `/api/rooms/${id}/debrief`, who, body);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("how did it go", () => {
  it("opens after the table with the people met, and sends even empty", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { hugo, lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    const form = await debrief(env, id, lea);
    expect(form.status).toBe(200);
    expect((form.body.met as { name: string }[]).map((m) => m.name)).toEqual(["Hugo"]);
    const sent = await answer(env, id, lea, {});
    expect(sent.status).toBe(200);
    const again = await answer(env, id, lea, {});
    expect(again.status).toBe(409);
  });

  it("never opens without a recorded table meeting", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await call(env, "POST", `/api/rooms/${id}/join`, lea, CAFE);
    await call(env, "GET", `/api/rooms/${id}/table`, hugo);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, hugo);
    expect((await debrief(env, id, hugo)).status).toBe(404);
    expect((await answer(env, id, hugo, { battery: 5 })).status).toBe(404);
  });

  it("waits on Around after leaving, then disappears after 24 hours", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    const pending = (await (await call(env, "GET", "/api/rooms/debrief-pending", lea)).json()) as { room: { id: string; topic: string } | null };
    expect(pending.room?.id).toBe(id);
    await answer(env, id, lea, {});
    const gone = (await (await call(env, "GET", "/api/rooms/debrief-pending", lea)).json()) as { room: null };
    expect(gone.room).toBeNull();
  });

  it("validates battery and chat, and screens the feedback note", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    expect((await answer(env, id, lea, { battery: 9 })).status).toBe(400);
    expect((await answer(env, id, lea, { chat: "superb" })).status).toBe(400);
    expect((await answer(env, id, lea, { text: "You idiot" })).status).toBe(422);
    const ok = await answer(env, id, lea, { battery: 5, chat: "great", tag: "good", text: "More rooms like this please" });
    expect(ok.status).toBe(200);
  });
});

describe("stay in touch", () => {
  it("makes friends only when both say yes", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { hugo, lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, hugo);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    const leaForm = (await debrief(env, id, lea)).body as { met: { name: string; stayToken: string }[] };
    const hugoForm = (await debrief(env, id, hugo)).body as { met: { name: string; stayToken: string }[] };
    const leaSays = await answer(env, id, lea, { stay: { [leaForm.met[0].stayToken]: true } });
    expect(((leaSays.body.stay as { result: string }[])[0].result)).toBe("waiting");
    const hugoSays = await answer(env, id, hugo, { stay: { [hugoForm.met[0].stayToken]: true } });
    expect(((hugoSays.body.stay as { result: string }[])[0].result)).toBe("friends");
    const friends = await env.DB.prepare("SELECT * FROM friendships").all();
    expect(friends.results).toHaveLength(1);
  });

  it("never reveals a one-sided yes: the same text as both no", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { hugo, lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, hugo);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    const leaForm = (await debrief(env, id, lea)).body as { met: { name: string; stayToken: string }[] };
    const leaSays = await answer(env, id, lea, { stay: { [leaForm.met[0].stayToken]: true } });
    expect(((leaSays.body.stay as { result: string }[])[0].result)).toBe("waiting");
    const hugoSays = await answer(env, id, hugo, {});
    expect(((hugoSays.body.stay as { result: string }[])[0].result)).toBe("no");
    const friends = await env.DB.prepare("SELECT * FROM friendships").all();
    expect(friends.results).toHaveLength(0);
  });
});

describe("owner feedback inbox", () => {
  it("stores tag, text, time and version: no user id, no room id, no place", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { hugo, lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    await answer(env, id, lea, { tag: "idea", text: "A room for chess puzzles" });
    const { results } = await env.DB.prepare("SELECT * FROM owner_feedback").all<Record<string, unknown>>();
    expect(results).toHaveLength(1);
    expect(Object.keys(results[0]).sort()).toEqual(["app_version", "created_at", "id", "tag", "text"]);
    const raw = JSON.stringify(results[0]);
    expect(raw).not.toContain(hugo.id);
    expect(raw).not.toContain(lea.id);
    expect(raw).not.toContain(id);
  });

  it("returns the fixed help message on crisis words and stores nothing", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const { lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    const res = await answer(env, id, lea, { text: "I want to die" });
    expect(res.status).toBe(422);
    expect(String((res.body as { message: string }).message)).toContain("143");
    const { results } = await env.DB.prepare("SELECT * FROM owner_feedback").all();
    expect(results).toHaveLength(0);
  });
});

describe("debrief aggregates", () => {
  it("never returns a bucket with fewer than 5 answers", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    for (let i = 0; i < 4; i++) {
      const { lea, id } = await metAtTable(env);
      await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
      await answer(env, id, lea, { battery: 5 });
    }
    expect((await debriefAggregates(env.DB, "2026-11-02")).battery["5"]).toBeNull();
    const { lea, id } = await metAtTable(env);
    await call(env, "POST", `/api/rooms/${id}/table/leave`, lea);
    await answer(env, id, lea, { battery: 5 });
    expect((await debriefAggregates(env.DB, "2026-11-02")).battery["5"]).toBe(5);
  });
});
