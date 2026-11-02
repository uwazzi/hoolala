import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { SCREEN_MESSAGES } from "../src/rules/screening";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-11-02T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

let answer: Record<string, unknown> = {};
let metaCalls = 0;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  metaCalls = 0;
  answer = { verdict: "approve", category: "ok", lang: "en", en: "Fine.", fr: "Bien." };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("api.meta.test")) {
        metaCalls += 1;
        return Response.json({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
      }
      return Response.json({});
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function call(env: Env, method: string, path: string, body?: unknown, headers: Record<string, string> = {}, who?: Person) {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method,
      headers: { ...(who ? { cookie: who.cookie } : {}), ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    ctx,
  );
}

async function person(env: Env): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, 'Ana', 1, ?)").run(id, `${id}@example.com`, NOW);
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

type Check = { ok: boolean; field?: string; reason?: string };
const check = async (env: Env, body: unknown, headers: Record<string, string> = {}, who?: Person) => {
  const res = await call(env, "POST", "/api/poster/check", body, headers, who);
  return { status: res.status, body: (await res.json()) as Check };
};

describe("POST /api/poster/check", () => {
  it("code rules refuse contacts before any model call", async () => {
    const env = testEnv(AI);
    for (const hook of ["Call me on 079 123 45 67", "See example.com/now", "Mail me at a@b.com", "Follow @someone"]) {
      const res = await check(env, { hook });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.field).toBe("hook");
    }
    expect(metaCalls).toBe(0);
  });

  it("passes a clean hook with the model off, and empty bodies pass", async () => {
    const env = testEnv();
    expect((await check(env, { hook: "What if you said hi today?" })).body).toEqual({ ok: true });
    expect((await check(env, {})).body).toEqual({ ok: true });
    expect(metaCalls).toBe(0);
  });

  it("refused hooks come back with a field and a fixed reason, never rewritten", async () => {
    const env = testEnv();
    const hook = "Call me on 079 123 45 67 tonight";
    const res = await check(env, { hook });
    expect(res.body).toEqual({ ok: false, field: "hook", reason: SCREEN_MESSAGES.contact });
    expect(JSON.stringify(res.body)).not.toContain("079 123 45 67");
  });

  it("refuses long or homeless places by code, hook first when both fail", async () => {
    const env = testEnv();
    const long = await check(env, { place: "A very long café name that runs past forty characters" });
    expect(long.body.field).toBe("place");
    expect(long.body.ok).toBe(false);
    const home = await check(env, { place: "My place, come over" });
    expect(home.body).toEqual({ ok: false, field: "place", reason: SCREEN_MESSAGES.home });
    const both = await check(env, { hook: "See example.com/now", place: "My place, come over" });
    expect(both.body.field).toBe("hook");
  });

  it("crisis words get the fixed help message", async () => {
    const env = testEnv(AI);
    const res = await check(env, { hook: "I want to kill myself" });
    expect(res.body).toEqual({ ok: false, field: "hook", reason: SCREEN_MESSAGES.crisis });
    expect(metaCalls).toBe(0);
  });

  it("stores nothing but the text-free model rows", async () => {
    const env = testEnv(AI);
    const hook = "What if you said hi today?";
    const usersBefore = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect((await check(env, { hook })).body).toEqual({ ok: true });
    expect((await check(env, { hook }, {}, await person(env))).body).toEqual({ ok: true });
    expect(metaCalls).toBe(2);
    const calls = env.DB.sqlite.prepare("SELECT * FROM llm_calls").all() as Record<string, unknown>[];
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls)).not.toContain("What if you said hi");
    const workings = env.DB.sqlite.prepare("SELECT * FROM workings").all() as Record<string, unknown>[];
    expect(workings).toHaveLength(1);
    expect(JSON.stringify(workings[0])).not.toContain("What if you said hi");
    const usersAfter = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect(usersAfter.n).toBe(usersBefore.n + 1);
  });

  it("rate-limits to 10 checks a minute per IP or session", async () => {
    const env = testEnv();
    for (let i = 0; i < 10; i++) {
      expect((await check(env, { hook: "What if you said hi today?" }, { "cf-connecting-ip": "203.0.113.9" })).status).toBe(200);
    }
    expect((await check(env, { hook: "What if you said hi today?" }, { "cf-connecting-ip": "203.0.113.9" })).status).toBe(429);
    const who = await person(env);
    for (let i = 0; i < 10; i++) {
      expect((await check(env, { hook: "What if you said hi today?" }, { "cf-connecting-ip": `203.0.113.${100 + i}` }, who)).status).toBe(200);
    }
    expect((await check(env, { hook: "What if you said hi today?" }, { "cf-connecting-ip": "203.0.113.200" }, who)).status).toBe(429);
  });
});
