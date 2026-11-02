import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { FALLBACK_IDEAS, roomIdeasFor } from "../src/llm/roomideas";
import { screenText } from "../src/rules/screening";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-11-02T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;

/** The model's ideas for the next call; screen rejects `rejectText`. */
let ideas: { text: string }[] = [];
let rejectText: string | null = null;
let suggestBodies: string[] = [];

function mockMeta() {
  suggestBodies = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      const body = String(init.body);
      if (body.includes('"room_ideas"')) {
        suggestBodies.push(body);
        return Response.json({
          choices: [{ message: { content: JSON.stringify({ ideas }) } }],
          usage: { prompt_tokens: 200, completion_tokens: 60 },
        });
      }
      // SCREEN IT on each idea.
      const text = JSON.parse(body).messages[1].content as string;
      const reject = text === rejectText;
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ verdict: reject ? "reject" : "approve", category: reject ? "other" : "ok", lang: "en", en: text, fr: text }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 40 },
      });
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  ideas = [{ text: "Teach me a board game in ten minutes?" }, { text: "Slow coffee, one recipe swap?" }, { text: "Best cardamom bun in town?" }];
  rejectText = null;
  mockMeta();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function who(env: Env, compass: string[] = []) {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, 'Ana', 1, ?)").run(id, `${id}@example.com`, NOW);
  for (const [i, text] of compass.entries()) {
    await env.DB.prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, 'interest', ?, 'questions', 1, ?)")
      .bind(crypto.randomUUID(), id, text, NOW)
      .run();
  }
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

describe("room ideas without the model", () => {
  it("falls back to 3 fixed, pre-screened ideas", async () => {
    const env = testEnv();
    const res = await roomIdeasFor(env, "user-1", ["board games", "slow coffee"], new Date(NOW), "en");
    expect(res.source).toBe("rules");
    expect(res.ideas).toHaveLength(3);
    expect(res.fromCompass).toBe(true);
  });

  it("says plainly when there is no compass", async () => {
    const env = testEnv();
    const res = await roomIdeasFor(env, "user-1", [], new Date(NOW), "en");
    expect(res.fromCompass).toBe(false);
    expect(res.workings).toBe("no compass: general ideas");
  });

  it("keeps every fallback idea short and clean", () => {
    expect(FALLBACK_IDEAS.length).toBeGreaterThanOrEqual(3);
    for (const idea of FALLBACK_IDEAS) {
      expect(idea.text.length).toBeLessThanOrEqual(60);
      expect(screenText(idea.text, 60)).toEqual({ ok: true, category: null });
    }
  });
});

describe("room ideas with the model", () => {
  it("asks with the compass lines and the time, and shows checked ideas", async () => {
    const env = testEnv(AI);
    const me = await who(env, ["board games"]);
    const res = await worker.fetch(
      new Request(`${BASE}/api/rooms/suggest`, { method: "POST", headers: { cookie: me.cookie, "content-type": "application/json" }, body: JSON.stringify({}) }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ideas: { text: string }[]; source: string; fromCompass: boolean; label: string };
    expect(body.source).toBe("ai");
    expect(body.fromCompass).toBe(true);
    expect(body.ideas).toHaveLength(3);
    expect(body.label).toContain("FROM YOUR COMPASS");
    expect(suggestBodies).toHaveLength(1);
    expect(suggestBodies[0]).toContain("board games");
  });

  it("sends no compass input without a compass", async () => {
    const env = testEnv(AI);
    const me = await who(env, []);
    const res = await worker.fetch(
      new Request(`${BASE}/api/rooms/suggest`, { method: "POST", headers: { cookie: me.cookie, "content-type": "application/json" }, body: JSON.stringify({}) }),
      env,
      ctx,
    );
    const body = (await res.json()) as { fromCompass: boolean; label: string };
    expect(body.fromCompass).toBe(false);
    expect(body.label).not.toContain("COMPASS");
    expect(suggestBodies).toHaveLength(1);
    expect(suggestBodies[0]).not.toContain("board games");
  });

  it("never sends a suggestion that fails screening", async () => {
    ideas = [{ text: "You idiot, play chess?" }, { text: "Slow coffee, one recipe swap?" }, { text: "Looking for a date tonight?" }];
    rejectText = "Looking for a date tonight?";
    const env = testEnv(AI);
    const me = await who(env, []);
    const res = await worker.fetch(
      new Request(`${BASE}/api/rooms/suggest`, { method: "POST", headers: { cookie: me.cookie, "content-type": "application/json" }, body: JSON.stringify({}) }),
      env,
      ctx,
    );
    const body = (await res.json()) as { ideas: { text: string }[] };
    // The code rules drop the insult, SCREEN IT drops the date; one survives.
    expect(body.ideas).toEqual([{ text: "Slow coffee, one recipe swap?" }]);
  });

  it("falls back when every idea fails screening", async () => {
    ideas = [{ text: "You idiot" }, { text: "Call 079 123 45 67" }];
    const env = testEnv(AI);
    const me = await who(env, []);
    const res = await worker.fetch(
      new Request(`${BASE}/api/rooms/suggest`, { method: "POST", headers: { cookie: me.cookie, "content-type": "application/json" }, body: JSON.stringify({}) }),
      env,
      ctx,
    );
    const body = (await res.json()) as { ideas: { text: string }[]; source: string };
    expect(body.source).toBe("rules");
    expect(body.ideas).toHaveLength(3);
  });
});
