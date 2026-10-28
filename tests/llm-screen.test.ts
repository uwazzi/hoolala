import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { validateScreen } from "../src/llm/screen";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

/** Fake Meta API: answers chat completions with `answer`, or fails as told. */
let answer: Record<string, unknown> | "timeout" | "garbage" = {};
let metaCalls: { url: string; headers: Headers; body: string }[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  metaCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      metaCalls.push({ url: String(url), headers: new Headers(init.headers), body: String(init.body) });
      if (answer === "timeout") throw new DOMException("The operation timed out.", "TimeoutError");
      const content = answer === "garbage" ? "not json at all" : JSON.stringify(answer);
      return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 173, completion_tokens: 62 } });
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

async function poster(env: Env): Promise<Person> {
  env.DB.sqlite
    .prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café', 'cafe', 'Lausanne', 46.5222, 6.6339, 'active', ?)")
    .run(NOW);
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, 'a@example.com', 'Ana', 1, ?)").run(id, NOW);
  const who = { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
  await call(env, "POST", "/api/checkin", who, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
  return who;
}

const post = (env: Env, who: Person, topic: string) =>
  call(env, "POST", "/api/here/signals", who, { topic, when: "now", spot: "The big table", capacity: 1 });
const rows = (env: Env, sql: string) => env.DB.sqlite.prepare(sql).all() as Record<string, unknown>[];
const FR = "Première fois ici. Qu'est-ce qui est bon ?";

describe("validateScreen", () => {
  const ok = { verdict: "approve", category: "ok", lang: "fr", en: "First time here. What's good?", fr: FR };

  it("accepts a well-formed answer", () => {
    expect(validateScreen(ok, FR)).toEqual(ok);
  });

  it("refuses contradictions, essays, line breaks and unknown values", () => {
    expect(validateScreen({ ...ok, category: "dating" }, FR)).toBeNull();
    expect(validateScreen({ ...ok, verdict: "reject" }, FR)).toBeNull();
    expect(validateScreen({ ...ok, en: "x".repeat(500) }, FR)).toBeNull();
    expect(validateScreen({ ...ok, en: "line one\nline two" }, FR)).toBeNull();
    expect(validateScreen({ ...ok, lang: "klingon" }, FR)).toBeNull();
    expect(validateScreen(null, FR)).toBeNull();
  });
});

describe("SCREEN IT on posting", () => {
  it("approves, stores the words exactly as typed, plus the translation", async () => {
    const env = testEnv(AI);
    const ana = await poster(env);
    // The model "improves" the French; it must not matter.
    answer = { verdict: "approve", category: "ok", lang: "fr", en: "First time here. What's good?", fr: "Première fois ici ! Qu'y a-t-il de bon ?" };
    expect((await post(env, ana, FR)).status).toBe(200);
    expect(rows(env, "SELECT topic, lang, translation, screening_verdict, screening_category FROM signals")[0]).toEqual({
      topic: FR,
      lang: "fr",
      translation: "First time here. What's good?",
      screening_verdict: "approved_by_model",
      screening_category: "ok",
    });
    expect(rows(env, "SELECT function, verdict, reasoning_effort FROM workings")).toEqual([{ function: "screen", verdict: "approved", reasoning_effort: "minimal" }]);
  });

  it("adds a refusal the code rules missed, with the reason in Hoolala! voice", async () => {
    const env = testEnv(AI);
    const ana = await poster(env);
    answer = { verdict: "reject", category: "dating", lang: "en", en: "Looking for someone special to share a drink", fr: "x" };
    const res = await post(env, ana, "Looking for someone special to share a drink");
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "screened", category: "dating", message: "That sounds more like a date than a coffee break. Try again?" });
    expect(rows(env, "SELECT COUNT(*) AS n FROM signals")[0].n).toBe(0);
  });

  it("never calls the model when the code rules already refused", async () => {
    const env = testEnv(AI);
    const ana = await poster(env);
    expect((await post(env, ana, "call me 079 123 45 67")).status).toBe(422);
    expect(metaCalls).toHaveLength(0);
  });

  it("falls back to the code rules on a timeout or a bad answer", async () => {
    for (const failure of ["timeout", "garbage"] as const) {
      const env = testEnv(AI);
      const ana = await poster(env);
      answer = failure;
      expect((await post(env, ana, "Coffee break now?")).status).toBe(200);
      expect(rows(env, "SELECT screening_verdict, translation FROM signals")[0]).toEqual({ screening_verdict: "approved_by_rules", translation: null });
      expect(rows(env, "SELECT validated, fallback_used FROM llm_calls")[0]).toEqual({ validated: 0, fallback_used: 1 });
    }
  });

  it("makes no call at all with LLM_ENABLED off", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await poster(env);
    expect((await post(env, ana, "Coffee break now?")).status).toBe(200);
    expect(metaCalls).toHaveLength(0);
    expect(rows(env, "SELECT COUNT(*) AS n FROM llm_calls")[0].n).toBe(0);
  });

  it("logs token counts only: no text in llm_calls, the key only in a header", async () => {
    const env = testEnv(AI);
    const ana = await poster(env);
    const log = vi.spyOn(console, "log");
    answer = { verdict: "approve", category: "ok", lang: "en", en: "Board games at the big table?", fr: "Jeux de société à la grande table ?" };
    await post(env, ana, "Board games at the big table?");
    const call = rows(env, "SELECT * FROM llm_calls")[0];
    expect(call).toMatchObject({ purpose: "screen", model: "muse-spark-1.3", validated: 1, fallback_used: 0, prompt_tokens: 173, completion_tokens: 62 });
    expect(JSON.stringify(rows(env, "SELECT * FROM llm_calls"))).not.toContain("Board games");
    expect(JSON.stringify(rows(env, "SELECT * FROM workings"))).not.toContain("Board games");
    expect(metaCalls[0].url).toBe("https://api.meta.test/v1/chat/completions");
    expect(metaCalls[0].url).not.toContain("test-meta-key");
    expect(metaCalls[0].headers.get("authorization")).toBe("Bearer test-meta-key");
    expect(JSON.parse(metaCalls[0].body)).toMatchObject({ model: "muse-spark-1.3", reasoning_effort: "minimal", response_format: { type: "json_schema" } });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("shows the translation to people discovering the signal", async () => {
    const env = testEnv(AI);
    const ana = await poster(env);
    answer = { verdict: "approve", category: "ok", lang: "fr", en: "First time here. What's good?", fr: FR };
    await post(env, ana, FR);
    const benId = crypto.randomUUID();
    env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, 'b@example.com', 'Ben', 1, ?)").run(benId, NOW);
    const ben = { id: benId, cookie: `hoolala_session=${await createSession(env, benId, new Date(NOW))}` };
    await call(env, "POST", "/api/checkin", ben, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
    const found = (await (await call(env, "GET", "/api/here", ben)).json()).discover[0];
    expect(found).toMatchObject({ topic: FR, translation: "First time here. What's good?" });
  });
});
