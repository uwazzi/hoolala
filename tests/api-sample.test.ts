import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker, { runScheduled } from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => vi.useRealTimers());

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

async function judge(env: Env): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, 'judge@example.com', 'Jude', 1, ?)").run(id, NOW);
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

const view = async (env: Env, who: Person) => (await call(env, "GET", "/api/here", who)).json();

describe("the SAMPLE place", () => {
  it("lets a judge alone do the whole loop: check in, curious, accepted, meet", async () => {
    const env = testEnv();
    const jude = await judge(env);

    // Check in from anywhere with the code on the screen.
    const checkin = await (await call(env, "POST", "/api/checkin", jude, { code: "demo" })).json();
    expect(checkin.checkin.place).toMatchObject({ slug: "sample-cafe", name: "SAMPLE: The Demo Café" });

    // Sophie's signal is there, anonymous like any other.
    const v = await view(env, jude);
    expect(v.discover).toHaveLength(1);
    expect(JSON.stringify(v.discover)).not.toContain("Sophie");

    // I'M CURIOUS: she says yes straight away and heads to the spot.
    const curious = await (await call(env, "POST", `/api/here/signals/${v.discover[0].id}/curious`, jude, {})).json();
    expect(curious.response.state).toBe("accepted");
    const joined = (await view(env, jude)).joined[0];
    expect(joined).toMatchObject({ state: "accepted", ownerName: "Sample Sophie", sample: true });
    expect(joined.replies.map((r: { from: string; text: string }) => `${r.from}: ${r.text}`)).toEqual(["Sample Sophie: We're at: the big table."]);

    // MEET: her side joins and agrees, so the judge only taps WE MET.
    const started = await (await call(env, "POST", "/api/meet/start", jude, { signalId: joined.signalId })).json();
    expect(await (await call(env, "GET", `/api/meet/${started.id}`, jude)).json()).toMatchObject({ state: "joined", otherName: "Sample Sophie", theyAgreed: true });
    const done = await (await call(env, "POST", `/api/meet/${started.id}/agree`, jude)).json();
    expect(done.state).toBe("confirmed");
  });

  it("never counts on the Live page", async () => {
    const env = testEnv();
    const jude = await judge(env);
    await call(env, "POST", "/api/checkin", jude, { code: "DEMO" });
    const signalId = (await view(env, jude)).discover[0].id;
    await call(env, "POST", `/api/here/signals/${signalId}/curious`, jude, {});
    const started = await (await call(env, "POST", "/api/meet/start", jude, { signalId })).json();
    await call(env, "POST", `/api/meet/${started.id}/agree`, jude);
    expect((env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM interactions").get() as { n: number }).n).toBe(1);

    const live = await (await call(env, "GET", "/api/live")).json();
    expect(live).toMatchObject({ hellos: 0, connection: { met: 0, of: 0 }, checkins: { ok: 0, of: 0 }, places: [] });
  });

  it("keeps Sophie checked in with a fresh signal, from the cron and on every visit", async () => {
    const env = testEnv();
    await runScheduled(env, new Date(NOW));
    const signals = () => env.DB.sqlite.prepare("SELECT expires_at FROM signals WHERE state = 'open' ORDER BY expires_at").all() as { expires_at: string }[];
    expect(signals()).toHaveLength(1);

    // Two hours later the first has expired; the next run tops it up.
    vi.setSystemTime(new Date("2026-10-28T16:00:00.000Z"));
    await runScheduled(env, new Date("2026-10-28T16:00:00.000Z"));
    const open = signals().filter((s) => s.expires_at > "2026-10-28T16:00:00.000Z");
    expect(open).toHaveLength(1);
    // Running again changes nothing: it's idempotent.
    await runScheduled(env, new Date("2026-10-28T16:00:00.000Z"));
    expect(signals().filter((s) => s.expires_at > "2026-10-28T16:00:00.000Z")).toHaveLength(1);
    expect((env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM places WHERE is_sample = 1").get() as { n: number }).n).toBe(1);
  });

  it("is invisible to nearby, so nobody stumbles on it by location", async () => {
    const env = testEnv();
    await runScheduled(env, new Date(NOW));
    const jude = await judge(env);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ elements: [] })));
    const nearby = await (await call(env, "POST", "/api/places/nearby", jude, { lat: 46.5222, lng: 6.6339 })).json();
    expect(nearby.places).toEqual([]);
    vi.unstubAllGlobals();
  });
});
