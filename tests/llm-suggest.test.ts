import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { localTime } from "../src/llm/suggest";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T18:50:00.000Z"; // 19:50 in Zurich
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };
const EVENT_URL = "https://www.eventbrite.com/e/weekly-wednesday-open-mic-standup-comedy-in-english-tickets-2001877712126";

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

/** Shaped like the real Responses API answer seen on 28 Oct: preamble, search, JSON. */
let ideas: unknown[] = [];
let mode: "ok" | "timeout" = "ok";
let rejectTopic: string | null = null;
let calls: { url: string; body: string }[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  calls = [];
  mode = "ok";
  rejectTopic = null;
  ideas = [
    { topic: "Anyone off to the English open mic at 20:30?", why: "Open mic nearby tonight.", kind: "event", citation_url: EVENT_URL },
    { topic: "Big gala at the cathedral tonight?", why: "Cited a homepage.", kind: "event", citation_url: "https://www.eventbrite.com" },
    { topic: "Coffee and an autumn chat at the big table?", why: "Fits the evening.", kind: "general", citation_url: null },
    { topic: "By the window: hot drink and a chat?", why: "Fits the spot.", kind: "general", citation_url: null },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      calls.push({ url: String(url), body: String(init.body) });
      if (mode === "timeout") throw new DOMException("timed out", "TimeoutError");
      if (String(url).endsWith("/responses")) {
        return Response.json({
          status: "completed",
          output: [
            { type: "reasoning" },
            { type: "message", content: [{ type: "output_text", text: "I'll search for local events first." }] },
            { type: "web_search_call", results: [{ type: "text_result", url: EVENT_URL, title: "Open mic", snippet: "" }] },
            { type: "message", content: [{ type: "output_text", text: JSON.stringify({ ideas }) }] },
          ],
          usage: { input_tokens: 3794, output_tokens: 1370 },
        });
      }
      // SCREEN IT on each idea.
      const text = JSON.parse(String(init.body)).messages[1].content as string;
      const reject = text === rejectTopic;
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ verdict: reject ? "reject" : "approve", category: reject ? "other" : "ok", lang: "en", en: text, fr: text }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 40 },
      });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function call(env: Env, path: string, who?: Person) {
  return worker.fetch(new Request(`${BASE}${path}`, { method: "POST", headers: who ? { cookie: who.cookie } : {} }), env, ctx);
}

async function checkedIn(env: Env): Promise<Person> {
  env.DB.sqlite
    .prepare("INSERT INTO places (id, slug, name, kind, city, city_key, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café de la Palud', 'cafe', 'Lausanne', 'lausanne', 46.5222, 6.6339, 'active', ?)")
    .run(NOW);
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, 'ana.private@example.com', 'Anastasia', 1, ?)").run(id, NOW);
  const who = { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
  await worker.fetch(
    new Request(`${BASE}/api/checkin`, { method: "POST", headers: { cookie: who.cookie, "content-type": "application/json" }, body: JSON.stringify({ placeId: "cafe", lat: 46.5222, lng: 6.63442 }) }),
    env,
    ctx,
  );
  return who;
}

const rows = (env: Env, sql: string) => env.DB.sqlite.prepare(sql).all() as Record<string, unknown>[];
const responsesCalls = () => calls.filter((c) => c.url.endsWith("/responses"));

describe("SUGGEST IT", () => {
  it("gives up to 3 ideas; an event only with a citation the search returned", async () => {
    const env = testEnv(AI);
    const ana = await checkedIn(env);
    const res = await (await call(env, "/api/here/suggest", ana)).json();
    expect(res.source).toBe("ai");
    expect(res.ideas.map((i: { topic: string }) => i.topic)).toEqual([
      "Anyone off to the English open mic at 20:30?",
      "Coffee and an autumn chat at the big table?",
      "By the window: hot drink and a chat?",
    ]);
    expect(res.ideas[0]).toMatchObject({ citationUrl: EVENT_URL, sourceDomain: "eventbrite.com" });
    expect(res.ideas[1].citationUrl).toBeNull();
    // The "gala" citing only a homepage was dropped.
    expect(JSON.stringify(res)).not.toContain("gala");
  });

  it("sends only place information: never the person's name or email", async () => {
    const env = testEnv(AI);
    const ana = await checkedIn(env);
    await call(env, "/api/here/suggest", ana);
    const body = JSON.parse(responsesCalls()[0].body);
    expect(body.input).toBe("Place: Café de la Palud (cafe) in Lausanne. Time: Wednesday 28 October 2026, 19:50. Spots: At the counter, The big table, By the window, Outside, By the entrance.");
    expect(body).toMatchObject({ max_tool_calls: 1, include: ["web_search_call.results"], tools: [{ type: "web_search" }] });
    const all = calls.map((c) => c.body).join(" ");
    expect(all).not.toContain("Anastasia");
    expect(all).not.toContain("ana.private");
  });

  it("records the workings and token counts, never the ideas' text", async () => {
    const env = testEnv(AI);
    const ana = await checkedIn(env);
    const res = await (await call(env, "/api/here/suggest", ana)).json();
    expect(res.workingsId).toEqual(expect.any(String));
    const working = rows(env, "SELECT function, tools_json, citations_json, grounded_count, total_count, reasoning_effort FROM workings WHERE function = 'suggest'")[0];
    expect(working).toEqual({ function: "suggest", tools_json: '["web_search"]', citations_json: JSON.stringify([EVENT_URL]), grounded_count: 1, total_count: 4, reasoning_effort: "low" });
    expect(rows(env, "SELECT tool_calls, prompt_tokens, completion_tokens FROM llm_calls WHERE purpose = 'suggest'")[0]).toEqual({ tool_calls: 1, prompt_tokens: 3794, completion_tokens: 1370 });
    expect(JSON.stringify(rows(env, "SELECT * FROM llm_calls"))).not.toContain("open mic");
  });

  it("drops an idea SCREEN IT refuses", async () => {
    const env = testEnv(AI);
    const ana = await checkedIn(env);
    rejectTopic = "By the window: hot drink and a chat?";
    const res = await (await call(env, "/api/here/suggest", ana)).json();
    expect(res.ideas.map((i: { topic: string }) => i.topic)).not.toContain(rejectTopic);
  });

  it("caches per place for an hour: one search, many people", async () => {
    const env = testEnv(AI);
    const ana = await checkedIn(env);
    await call(env, "/api/here/suggest", ana);
    await call(env, "/api/here/suggest", ana);
    expect(responsesCalls()).toHaveLength(1);
  });

  it("falls back to fixed ideas, labelled as rules, when the model is off or late", async () => {
    for (const env of [testEnv({ ...AI, LLM_ENABLED: "false" }), testEnv(AI)]) {
      if (env.LLM_ENABLED === "true") mode = "timeout";
      const ana = await checkedIn(env);
      const res = await (await call(env, "/api/here/suggest", ana)).json();
      expect(res.source).toBe("rules");
      expect(res.workingsId).toBeNull();
      expect(res.ideas).toHaveLength(3);
      expect(res.ideas[0].topic).toBe("Wrapping up the day. One drink and a chat?");
    }
  });

  it("never posts anything, and needs a check-in", async () => {
    const env = testEnv(AI);
    const ana = await checkedIn(env);
    await call(env, "/api/here/suggest", ana);
    expect(rows(env, "SELECT COUNT(*) AS n FROM signals")[0].n).toBe(0);
    await worker.fetch(new Request(`${BASE}/api/checkin/leave`, { method: "POST", headers: { cookie: ana.cookie } }), env, ctx);
    expect((await call(env, "/api/here/suggest", ana)).status).toBe(403);
    expect((await call(env, "/api/here/suggest")).status).toBe(401);
  });
});

describe("localTime", () => {
  it("reads Zurich time, across the clock change", () => {
    expect(localTime(new Date("2026-10-28T18:50:00.000Z"))).toEqual({ label: "Wednesday 28 October 2026, 19:50", hour: 19 });
    expect(localTime(new Date("2026-07-01T18:50:00.000Z")).hour).toBe(20);
  });
});
