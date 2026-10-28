import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      const text = JSON.parse(String(init.body)).messages[1].content as string;
      return Response.json({ choices: [{ message: { content: JSON.stringify({ verdict: "approve", category: "ok", lang: "en", en: text, fr: "Échecs à la grande table ?" }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
    }),
  );
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

describe("CHECK IT: GET /api/workings/:id", () => {
  it("shows the poster how their topic was screened, without their words", async () => {
    const env = testEnv(AI);
    env.DB.sqlite.prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café', 'cafe', 'Lausanne', 46.5222, 6.6339, 'active', ?)").run(NOW);
    const ana = await person(env, "Ana");
    await call(env, "POST", "/api/checkin", ana, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
    const posted = await (await call(env, "POST", "/api/here/signals", ana, { topic: "Chess at the big table?", when: "now", spot: "The big table", capacity: 1 })).json();
    expect(posted.workingsId).toEqual(expect.any(String));

    const w = await (await call(env, "GET", `/api/workings/${posted.workingsId}`, ana)).json();
    expect(w).toEqual({
      id: posted.workingsId,
      function: "SCREEN IT",
      capability: "Screening (structured output)",
      model: "muse-spark-1.3",
      tools: [],
      citations: [],
      verdict: "approved",
      grounded: null,
      reasoningEffort: "minimal",
      createdAt: NOW,
    });
    expect(JSON.stringify(w)).not.toContain("Chess");
  });

  it("shows grounding and sources for a search answer", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    env.DB.sqlite
      .prepare("INSERT INTO workings (id, user_id, function, tools_json, citations_json, verdict, grounded_count, total_count, reasoning_effort, created_at) VALUES ('11111111-1111-4111-8111-111111111111', ?, 'suggest', '[\"web_search\"]', ?, NULL, 1, 4, 'low', ?)")
      .run(ana.id, JSON.stringify(["https://www.eventbrite.com/e/open-mic-123"]), NOW);
    const w = await (await call(env, "GET", "/api/workings/11111111-1111-4111-8111-111111111111", ana)).json();
    expect(w).toMatchObject({
      function: "SUGGEST IT",
      capability: "Web search (grounded)",
      tools: ["web_search"],
      citations: [{ url: "https://www.eventbrite.com/e/open-mic-123", source: "eventbrite.com" }],
      grounded: { count: 1, of: 4 },
    });
  });

  it("is only for its owner: anyone else gets the same answer as a missing one", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    env.DB.sqlite
      .prepare("INSERT INTO workings (id, user_id, function, tools_json, citations_json, reasoning_effort, created_at) VALUES ('22222222-2222-4222-8222-222222222222', ?, 'screen', '[]', '[]', 'minimal', ?)")
      .run(ana.id, NOW);
    const other = await call(env, "GET", "/api/workings/22222222-2222-4222-8222-222222222222", ben);
    expect(other.status).toBe(404);
    expect(await other.json()).toEqual({ error: "not_found" });
    expect((await call(env, "GET", "/api/workings/33333333-3333-4333-8333-333333333333", ben)).status).toBe(404);
    expect((await call(env, "GET", "/api/workings/22222222-2222-4222-8222-222222222222")).status).toBe(401);
  });
});
