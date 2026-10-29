import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { QUESTIONS } from "../src/rules/surprise";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (String(url).endsWith("/asr/transcribe")) {
        expect(init.body).toBeInstanceOf(FormData);
        return Response.json({ transcript: " Chess,  mostly. ", turns: [] });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function person(env: Env) {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, 'Ana', 1, ?)").run(id, `${id}@example.com`, NOW);
  return `hoolala_session=${await createSession(env, id, new Date(NOW))}`;
}

function post(env: Env, path: string, cookie: string | null, body: unknown, type = "application/json") {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method: "POST",
      headers: { ...(cookie ? { cookie } : {}), "content-type": type },
      body: body instanceof Uint8Array ? (body as Uint8Array<ArrayBuffer>) : JSON.stringify(body),
    }),
    env,
    ctx,
  );
}

function wav(rate = 16000, samples = 1600): Uint8Array {
  const bytes = new Uint8Array(44 + samples * 2);
  const v = new DataView(bytes.buffer);
  const put = (at: number, s: string) => [...s].forEach((c, i) => (bytes[at + i] = c.charCodeAt(0)));
  put(0, "RIFF");
  put(8, "WAVE");
  put(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint16(34, 16, true);
  put(36, "data");
  v.setUint32(40, samples * 2, true);
  return bytes;
}

describe("Surprise Me voice", () => {
  it("needs a signed-in person", async () => {
    const env = testEnv(AI);
    expect((await post(env, "/api/me/surprise/next", null, { turns: [] })).status).toBe(401);
    expect((await post(env, "/api/me/surprise/hear", null, wav(), "audio/wav")).status).toBe(401);
  });

  it("asks the five fixed questions in order, each with its direction", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    const turns: { q: string; a: string }[] = [];
    for (const [i, want] of QUESTIONS.entries()) {
      const res = await (await post(env, "/api/me/surprise/next", ana, { turns })).json();
      expect(res).toEqual({ question: want.q, part: want.part });
      turns.push(i === 2 ? { q: want.q, a: "" } : { q: want.q, a: "something I said" });
    }
    expect(await (await post(env, "/api/me/surprise/next", ana, { turns })).json()).toEqual({ question: null, part: null });
  });

  it("hears a spoken answer and forgets it", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    const res = await post(env, "/api/me/surprise/hear", ana, wav(), "audio/wav");
    expect(await res.json()).toEqual({ text: "Chess, mostly." });
    expect((await post(env, "/api/me/surprise/hear", ana, wav(44100), "audio/wav")).status).toBe(400);
    expect((await post(env, "/api/me/surprise/hear", ana, wav(16000, 1_100_000), "audio/wav")).status).toBe(413);
    // The call is counted under the voice model, with no text at all.
    const rows = env.DB.sqlite.prepare("SELECT * FROM llm_calls").all() as Record<string, unknown>[];
    expect(rows.map((r) => [r.purpose, r.model])).toEqual([["hear", "muse-voice-transcribe-1.0"]]);
    expect(JSON.stringify(rows)).not.toMatch(/chess/i);
  });

  it("stores nothing from the questions: no transcripts in any table", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    const said = "bananas about ballroom zebras";
    await post(env, "/api/me/surprise/next", ana, { turns: [{ q: QUESTIONS[0].q, a: said }] });
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM compass_items").get()).toEqual({ n: 0 });
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM compass_changes").get()).toEqual({ n: 0 });
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM llm_calls").get()).toEqual({ n: 0 });
    for (const table of ["compass_items", "compass_changes", "llm_calls"]) {
      const dump = JSON.stringify(env.DB.sqlite.prepare(`SELECT * FROM ${table}`).all());
      expect(dump).not.toMatch(/zebras/);
    }
  });

  it("works without the model: the fixed questions, typing instead of voice", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env);
    expect(await (await post(env, "/api/me/surprise/next", ana, { turns: [{ q: QUESTIONS[0].q, a: "chess" }] })).json()).toEqual({
      question: QUESTIONS[1].q,
      part: QUESTIONS[1].part,
    });
    expect((await post(env, "/api/me/surprise/hear", ana, wav(), "audio/wav")).status).toBe(503);
  });

  it("stops with the fixed help message at crisis words, never model text", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    const hard = [{ q: QUESTIONS[0].q, a: "nothing, I want to die" }];
    expect((await (await post(env, "/api/me/surprise/next", ana, { turns: hard })).json()).help).toMatch(/143/);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("refuses malformed conversations", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    expect((await post(env, "/api/me/surprise/next", ana, { turns: "hi" })).status).toBe(400);
  });
});
