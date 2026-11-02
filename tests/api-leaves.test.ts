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

async function leaves(env: Env, who: Person) {
  return ((await (await call(env, "GET", "/api/me/plant", who)).json()) as { leaves: number }).leaves;
}

describe("+5 leaves", () => {
  it("grows 5 leaves per person per room, even with several pairs", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const marc = await person(env, "Marc");
    const id = await room(env, hugo);
    await call(env, "POST", `/api/rooms/${id}/join`, lea, CAFE);
    await call(env, "POST", `/api/rooms/${id}/join`, marc, CAFE);
    const hugoCode = (((await (await call(env, "GET", `/api/rooms/${id}/table`, hugo)).json()) as { token: string }).token);
    await call(env, "POST", "/api/rooms/scan-table", lea, { token: hugoCode });
    const leaCode = (((await (await call(env, "GET", `/api/rooms/${id}/table`, lea)).json()) as { token: string }).token);
    await call(env, "POST", "/api/rooms/scan-table", marc, { token: leaCode });
    expect(await leaves(env, hugo)).toBe(5);
    expect(await leaves(env, lea)).toBe(5);
    expect(await leaves(env, marc)).toBe(5);
    // Scanning again grows nothing more.
    await call(env, "POST", "/api/rooms/scan-table", marc, { token: leaCode });
    expect(await leaves(env, marc)).toBe(5);
  });

  it("grows nothing without a recorded table meeting", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await call(env, "POST", `/api/rooms/${id}/join`, lea, CAFE);
    await call(env, "GET", `/api/rooms/${id}/table`, hugo);
    expect(await leaves(env, hugo)).toBe(0);
    expect(await leaves(env, lea)).toBe(0);
  });

  it("grows 5 more in the next room, but never twice for one pair in one day", async () => {
    const env = testEnv({ TABLE_QR_SECRET: SECRET });
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const marc = await person(env, "Marc");
    const first = await room(env, hugo);
    await call(env, "POST", `/api/rooms/${first}/join`, lea, CAFE);
    const firstCode = (((await (await call(env, "GET", `/api/rooms/${first}/table`, hugo)).json()) as { token: string }).token);
    await call(env, "POST", "/api/rooms/scan-table", lea, { token: firstCode });
    const second = await room(env, marc);
    await call(env, "POST", `/api/rooms/${second}/join`, hugo, CAFE);
    const secondCode = (((await (await call(env, "GET", `/api/rooms/${second}/table`, marc)).json()) as { token: string }).token);
    await call(env, "POST", "/api/rooms/scan-table", hugo, { token: secondCode });
    expect(await leaves(env, hugo)).toBe(10);
    expect(await leaves(env, lea)).toBe(5);
    expect(await leaves(env, marc)).toBe(5);
  });
});
