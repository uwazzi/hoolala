import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AT_CAFE = { lat: 46.5222, lng: 6.63442 };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

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
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

const count = (env: Env, table: string) => (env.DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

/** Ana posts for `capacity`, accepts everyone in `accept`; Cleo stays around. */
async function scene(capacity = 1, acceptCleo = false) {
  const env = testEnv();
  env.DB.sqlite
    .prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café de la Palud', 'cafe', 'lausanne', 46.5222, 6.6339, 'active', ?)")
    .run(NOW);
  const ana = await person(env, "Ana");
  const ben = await person(env, "Ben");
  const cleo = await person(env, "Cleo");
  for (const p of [ana, ben, cleo]) await call(env, "POST", "/api/checkin", p, { placeId: "cafe", ...AT_CAFE });
  const signalId = (await (await call(env, "POST", "/api/here/signals", ana, { topic: "Chess?", when: "now", spot: "The big table", capacity })).json()).signal.id;
  for (const p of acceptCleo ? [ben, cleo] : [ben]) await call(env, "POST", `/api/here/signals/${signalId}/curious`, p);
  const requests = (await (await call(env, "GET", "/api/here", ana)).json()).mine[0].requests;
  for (const r of requests) await call(env, "POST", `/api/here/responses/${r.id}/accept`, ana);
  return { env, ana, ben, cleo, signalId };
}

async function start(env: Env, who: Person, signalId: string) {
  return (await call(env, "POST", "/api/meet/start", who, { signalId })).json();
}

describe("MEET", () => {
  it("confirms a meet when both agree: one interaction, a private moment each", async () => {
    const { env, ana, ben, signalId } = await scene();
    const started = await start(env, ana, signalId);
    expect(started.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(started.url).toBe(`${BASE}/meet?code=${started.code}`);

    const joined = await (await call(env, "POST", "/api/meet/join", ben, { code: started.code.toLowerCase() })).json();
    expect(joined).toMatchObject({ state: "joined", otherName: "Ana", youAgreed: false });
    expect((await (await call(env, "GET", `/api/meet/${started.id}`, ana)).json())).toMatchObject({ state: "joined", otherName: "Ben" });

    await call(env, "POST", `/api/meet/${started.id}/agree`, ana);
    expect(count(env, "interactions")).toBe(0);
    const done = await (await call(env, "POST", `/api/meet/${started.id}/agree`, ben)).json();
    expect(done.state).toBe("confirmed");
    expect(env.DB.sqlite.prepare("SELECT kind, place_id, signal_id, day FROM interactions").all()).toEqual([
      { kind: "here", place_id: "cafe", signal_id: signalId, day: "2026-10-28" },
    ]);
    expect(env.DB.sqlite.prepare("SELECT label FROM moments").all()).toEqual([
      { label: "You met an actual human." },
      { label: "You met an actual human." },
    ]);
  });

  it("counts a pair once per day", async () => {
    const { env, ana, ben, signalId } = await scene();
    for (let i = 0; i < 2; i++) {
      const s = await start(env, ana, signalId);
      await call(env, "POST", "/api/meet/join", ben, { code: s.code });
      await call(env, "POST", `/api/meet/${s.id}/agree`, ana);
      await call(env, "POST", `/api/meet/${s.id}/agree`, ben);
    }
    expect(count(env, "interactions")).toBe(1);
    expect(count(env, "moments")).toBe(2);
  });

  it("refuses scanning your own code, outsiders, and starting without an accepted pair", async () => {
    const { env, ana, ben, cleo, signalId } = await scene();
    const s = await start(env, ana, signalId);
    expect((await call(env, "POST", "/api/meet/join", ana, { code: s.code })).status).toBe(409);
    expect((await call(env, "POST", "/api/meet/join", cleo, { code: s.code })).status).toBe(404);
    expect((await call(env, "POST", "/api/meet/start", cleo, { signalId })).status).toBe(404);
    expect((await call(env, "GET", `/api/meet/${s.id}`, cleo)).status).toBe(404);
    expect((await call(env, "POST", `/api/meet/${s.id}/agree`, cleo)).status).toBe(404);
    // Once Ben has it, nobody else can take the seat.
    await call(env, "POST", "/api/meet/join", ben, { code: s.code });
    expect((await call(env, "POST", "/api/meet/join", cleo, { code: s.code })).status).toBe(404);
  });

  it("expires after 10 minutes", async () => {
    const { env, ana, ben, signalId } = await scene();
    const s = await start(env, ana, signalId);
    vi.setSystemTime(new Date("2026-10-28T14:10:01.000Z"));
    const res = await call(env, "POST", "/api/meet/join", ben, { code: s.code });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "expired" });
  });

  it("is refused after a block, looking like a wrong code", async () => {
    const { env, ana, ben, signalId } = await scene();
    const s = await start(env, ana, signalId);
    await call(env, "POST", "/api/block", ben, { signalId });
    const res = await call(env, "POST", "/api/meet/join", ben, { code: s.code });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("never lets two responders meet each other: they never saw each other's names", async () => {
    const { env, ben, cleo, signalId } = await scene(2, true);
    const s = await start(env, ben, signalId);
    expect((await call(env, "POST", "/api/meet/join", cleo, { code: s.code })).status).toBe(404);
  });
});

describe("STAY IN TOUCH", () => {
  async function met() {
    const sc = await scene();
    const s = await start(sc.env, sc.ana, sc.signalId);
    await call(sc.env, "POST", "/api/meet/join", sc.ben, { code: s.code });
    return { ...sc, meetId: s.id as string };
  }

  it("is only possible after both confirmed the meet", async () => {
    const { env, ana, meetId } = await met();
    expect((await call(env, "POST", `/api/meet/${meetId}/stay-in-touch`, ana)).status).toBe(409);
  });

  it("makes a friendship only when both chose it, and never reveals a one-sided choice", async () => {
    const { env, ana, ben, meetId } = await met();
    await call(env, "POST", `/api/meet/${meetId}/agree`, ana);
    await call(env, "POST", `/api/meet/${meetId}/agree`, ben);

    const first = await call(env, "POST", `/api/meet/${meetId}/stay-in-touch`, ana);
    expect(await first.json()).toEqual({ ok: true });
    expect(count(env, "friendships")).toBe(0);
    // Ben's view of the meet says nothing about Ana's choice.
    expect(JSON.stringify(await (await call(env, "GET", `/api/meet/${meetId}`, ben)).json())).not.toMatch(/stay|touch|chose/i);

    const second = await call(env, "POST", `/api/meet/${meetId}/stay-in-touch`, ben);
    expect(await second.json()).toEqual({ ok: true });
    expect(count(env, "friendships")).toBe(1);
  });
});

describe("GET /api/live", () => {
  it("is public, collective and nameless", async () => {
    const { env, ana, ben, signalId } = await scene();
    const s = await start(env, ana, signalId);
    await call(env, "POST", "/api/meet/join", ben, { code: s.code });
    await call(env, "POST", `/api/meet/${s.id}/agree`, ana);
    await call(env, "POST", `/api/meet/${s.id}/agree`, ben);

    const res = await call(env, "GET", "/api/live");
    expect(res.status).toBe(200);
    const live = await res.json();
    expect(live).toMatchObject({
      hellos: 1,
      connection: { met: 1, of: 1, percent: 100 },
      checkins: { ok: 3, of: 3, percent: 100 },
      places: [{ name: "Café de la Palud", hellos: 1 }],
    });
    const text = JSON.stringify(live);
    expect(text).not.toContain("Ana");
    expect(text).not.toContain("Ben");
    expect(text).not.toContain(ana.id);
  });

  it("counts accepted signals that never became a meet in the rate", async () => {
    const { env } = await scene();
    const live = await (await call(env, "GET", "/api/live")).json();
    expect(live.connection).toEqual({ met: 0, of: 1, percent: 0 });
    expect(live.hellos).toBe(0);
  });
});
