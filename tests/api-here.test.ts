import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const CAFE = { lat: 46.5222, lng: 6.6339 };
const AT_CAFE = { lat: 46.5222, lng: 6.63442 };

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
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${name}@example.com`, name, NOW);
  return { id, name, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

function place(env: Env, id: string, lat = CAFE.lat, lng = CAFE.lng) {
  env.DB.sqlite
    .prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES (?, ?, ?, 'cafe', 'lausanne', ?, ?, 'active', ?)")
    .run(id, id, `Place ${id}`, lat, lng, NOW);
}

async function checkIn(env: Env, who: Person, placeId = "cafe") {
  const where = placeId === "cafe" ? AT_CAFE : { lat: 46.5300, lng: 6.6400 };
  const res = await call(env, "POST", "/api/checkin", who, { placeId, ...where });
  expect(res.status).toBe(200);
}

async function post(env: Env, who: Person, extra: Record<string, unknown> = {}) {
  return call(env, "POST", "/api/here/signals", who, { topic: "Chess at the big table?", when: "now", spot: "The big table", capacity: 1, ...extra });
}

async function view(env: Env, who: Person) {
  return (await call(env, "GET", "/api/here", who)).json();
}

/** Three people at the café: Ana posts, Ben and Cleo are around. */
async function scene() {
  const env = testEnv();
  place(env, "cafe");
  place(env, "bar", 46.53, 6.64);
  const ana = await person(env, "Ana");
  const ben = await person(env, "Ben");
  const cleo = await person(env, "Cleo");
  for (const p of [ana, ben, cleo]) await checkIn(env, p);
  const res = await post(env, ana);
  const signalId = (await res.json()).signal.id as string;
  return { env, ana, ben, cleo, signalId };
}

describe("posting", () => {
  it("needs a check-in", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    expect((await post(env, ana)).status).toBe(403);
  });

  it("refuses screened topics with the reason, never rewriting them", async () => {
    const env = testEnv();
    place(env, "cafe");
    const ana = await person(env, "Ana");
    await checkIn(env, ana);
    const res = await post(env, ana, { topic: "Any cute girls want a drink?" });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "screened", category: "dating", message: "That sounds more like a date than a coffee break. Try again?" });
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM signals").get()).toEqual({ n: 0 });
  });

  it("allows 2 open signals per person, validates spot, size and time", async () => {
    const env = testEnv();
    place(env, "cafe");
    const ana = await person(env, "Ana");
    await checkIn(env, ana);
    expect((await post(env, ana, { spot: "My flat" })).status).toBe(400);
    expect((await post(env, ana, { capacity: 4 })).status).toBe(400);
    expect((await post(env, ana, { when: "2026-10-28T20:00:00.000Z" })).status).toBe(400);
    expect((await post(env, ana)).status).toBe(200);
    expect((await post(env, ana, { topic: "Second one" })).status).toBe(200);
    expect((await post(env, ana, { topic: "Third one" })).status).toBe(429);
  });
});

describe("who sees a signal", () => {
  it("shows it to people at the same place as 'Someone here', with no ids or names", async () => {
    const { env, ben, signalId } = await scene();
    const v = await view(env, ben);
    expect(v.discover).toHaveLength(1);
    expect(v.discover[0]).toEqual({
      id: signalId,
      topic: "Chess at the big table?",
      translation: null,
      whenAt: NOW,
      spot: "The big table",
      capacity: 1,
      expiresAt: "2026-10-28T14:30:00.000Z",
      fitsYou: false,
    });
    const text = JSON.stringify(v);
    expect(text).not.toContain("Ana");
    expect(text).not.toContain("owner");
  });

  it("never shows it at another place, or to its owner in discovery", async () => {
    const { env, ana, cleo } = await scene();
    await checkIn(env, cleo, "bar");
    expect((await view(env, cleo)).discover).toEqual([]);
    expect((await view(env, ana)).discover).toEqual([]);
    expect((await view(env, ana)).mine).toHaveLength(1);
  });

  it("hides it when the owner leaves", async () => {
    const { env, ana, ben } = await scene();
    await call(env, "POST", "/api/checkin/leave", ana);
    expect((await view(env, ben)).discover).toEqual([]);
  });

  it("hides it both ways after a block, at every place", async () => {
    const { env, ana, ben, signalId } = await scene();
    expect((await call(env, "POST", "/api/block", ben, { signalId })).status).toBe(200);
    expect((await view(env, ben)).discover).toEqual([]);
    // Ben's own signal is hidden from Ana too.
    await post(env, ben, { topic: "Running club?" });
    expect((await view(env, ana)).discover).toEqual([]);
  });

  it("shows three at a time", async () => {
    const env = testEnv();
    place(env, "cafe");
    const viewer = await person(env, "Viewer");
    await checkIn(env, viewer);
    for (const name of ["A", "B", "C", "D"]) {
      const p = await person(env, `P${name}`);
      await checkIn(env, p);
      await post(env, p, { topic: `Topic ${name}` });
    }
    expect((await view(env, viewer)).discover).toHaveLength(3);
  });
});

describe("I'M CURIOUS and accept", () => {
  it("stays anonymous until the owner accepts, then shows first names to the two of them only", async () => {
    const { env, ana, ben, cleo, signalId } = await scene();
    const curious = await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben, { line: "I know the Sicilian" });
    expect(curious.status).toBe(200);

    let mine = (await view(env, ana)).mine[0];
    expect(mine.requests).toEqual([{ id: expect.any(String), line: "I know the Sicilian", state: "requested", name: null }]);
    expect((await view(env, ben)).joined[0]).toMatchObject({ state: "requested", ownerName: null });

    expect((await call(env, "POST", `/api/here/responses/${mine.requests[0].id}/accept`, ana)).status).toBe(200);
    mine = (await view(env, ana)).mine[0];
    expect(mine.requests[0]).toMatchObject({ state: "accepted", name: "Ben" });
    expect(mine.state).toBe("full");
    expect((await view(env, ben)).joined[0]).toMatchObject({ state: "accepted", ownerName: "Ana", spot: "The big table" });

    // Cleo never learns who either of them is, and the full signal leaves her list.
    const cleoView = JSON.stringify(await view(env, cleo));
    expect(cleoView).not.toContain("Ana");
    expect(cleoView).not.toContain("Ben");
    expect((await view(env, cleo)).discover).toEqual([]);
  });

  it("refuses curious on signals you can't see, your own, twice, and over 5 an hour", async () => {
    const { env, ana, ben, cleo, signalId } = await scene();
    await checkIn(env, cleo, "bar");
    expect((await call(env, "POST", `/api/here/signals/${signalId}/curious`, cleo)).status).toBe(404);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/curious`, ana)).status).toBe(404);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben)).status).toBe(200);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben)).status).toBe(409);

    const busy = await person(env, "Busy");
    await checkIn(env, busy);
    for (let i = 0; i < 6; i++) {
      const p = await person(env, `Poster${i}`);
      await checkIn(env, p);
      const id = (await (await post(env, p, { topic: `Topic ${i}` })).json()).signal.id;
      const res = await call(env, "POST", `/api/here/signals/${id}/curious`, busy);
      expect(res.status).toBe(i < 5 ? 200 : 429);
    }
  });

  it("screens the curious line", async () => {
    const { env, ben, signalId } = await scene();
    const res = await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben, { line: "text me 079 123 45 67" });
    expect(res.status).toBe(422);
    expect((await res.json()).category).toBe("contact");
  });

  it("lets only the owner decide, and never over capacity", async () => {
    const { env, ana, ben, cleo, signalId } = await scene();
    await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben);
    await call(env, "POST", `/api/here/signals/${signalId}/curious`, cleo);
    const [first, second] = (await view(env, ana)).mine[0].requests;
    expect((await call(env, "POST", `/api/here/responses/${first.id}/accept`, ben)).status).toBe(404);
    expect((await call(env, "POST", `/api/here/responses/${first.id}/accept`, ana)).status).toBe(200);
    expect((await call(env, "POST", `/api/here/responses/${second.id}/accept`, ana)).status).toBe(409);
  });

  it("declining keeps both anonymous", async () => {
    const { env, ana, ben, signalId } = await scene();
    await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben);
    const req = (await view(env, ana)).mine[0].requests[0];
    await call(env, "POST", `/api/here/responses/${req.id}/decline`, ana);
    expect((await view(env, ben)).joined[0]).toMatchObject({ state: "declined", ownerName: null });
    expect((await view(env, ana)).mine[0].requests[0]).toMatchObject({ state: "declined", name: null });
  });
});

describe("quick replies", () => {
  it("only between the owner and accepted people, in set phrases", async () => {
    const { env, ana, ben, cleo, signalId } = await scene();
    expect((await call(env, "POST", `/api/here/signals/${signalId}/quick`, ana, { kind: "on_my_way" })).status).toBe(404);
    await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben);
    const req = (await view(env, ana)).mine[0].requests[0];
    await call(env, "POST", `/api/here/responses/${req.id}/accept`, ana);

    expect((await call(env, "POST", `/api/here/signals/${signalId}/quick`, ben, { kind: "on_my_way" })).status).toBe(200);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/quick`, ana, { kind: "at_spot" })).status).toBe(200);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/quick`, cleo, { kind: "on_my_way" })).status).toBe(404);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/quick`, ben, { kind: "hey whats your number" })).status).toBe(400);

    expect((await view(env, ana)).mine[0].replies.map((r: { from: string; text: string }) => `${r.from}: ${r.text}`)).toEqual([
      "Ben: On my way.",
      "You: We're at: the big table.",
    ]);
    expect((await view(env, ben)).joined[0].replies.map((r: { from: string }) => r.from)).toEqual(["You", "Ana"]);
  });
});

describe("report and cancel", () => {
  it("report hides a signal for everyone at once and logs it", async () => {
    const { env, ben, cleo, signalId } = await scene();
    expect((await call(env, "POST", "/api/report", ben, { signalId, reason: "Felt like a date" })).status).toBe(200);
    expect((await view(env, cleo)).discover).toEqual([]);
    expect(env.DB.sqlite.prepare("SELECT reason, status FROM reports").all()).toEqual([{ reason: "Felt like a date", status: "open" }]);
  });

  it("only the owner can cancel", async () => {
    const { env, ana, ben, signalId } = await scene();
    expect((await call(env, "POST", `/api/here/signals/${signalId}/cancel`, ben)).status).toBe(404);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/cancel`, ana)).status).toBe(200);
    expect((await view(env, ben)).discover).toEqual([]);
  });

  it("signed out gets nothing", async () => {
    const { env, signalId } = await scene();
    expect((await call(env, "GET", "/api/here")).status).toBe(401);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/curious`, undefined, {})).status).toBe(401);
  });
});
