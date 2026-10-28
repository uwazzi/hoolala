import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { OPENING, SCRIPTED } from "../src/rules/surprise";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;

let calls: string[] = [];
let draftReply: unknown;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  calls = [];
  draftReply = {
    compass: [
      { part: "interest", text: "Chess" },
      { part: "talk_about", text: "A café app" },
      { part: "interest", text: "Jazz piano" },
    ],
    observation: "Chess and cafés: a slow game and a good cup.",
    ideas: ["Best café for a chess game?", "Single and ready to flirt?"],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (String(url).endsWith("/asr/transcribe")) {
        calls.push("hear");
        expect(init.body).toBeInstanceOf(FormData);
        return Response.json({ transcript: " Chess,  mostly. ", turns: [] });
      }
      const body = JSON.parse(String(init.body));
      if (body.response_format.json_schema.name === "next_question") {
        calls.push("ask");
        return Response.json({ choices: [{ message: { content: JSON.stringify({ question: "What got you into chess?", done: false }) } }] });
      }
      calls.push("draft");
      return Response.json({ choices: [{ message: { content: JSON.stringify(draftReply) } }] });
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

const turns = [
  { q: OPENING, a: "Chess, and I'm building an app for cafés" },
  { q: "What got you into chess?", a: "My grandfather" },
  { q: "What inspires you lately?", a: "Small cafés with big tables" },
];

describe("Surprise Me", () => {
  it("needs a signed-in person", async () => {
    const env = testEnv(AI);
    expect((await post(env, "/api/me/surprise/next", null, { turns: [] })).status).toBe(401);
    expect((await post(env, "/api/me/surprise/hear", null, wav(), "audio/wav")).status).toBe(401);
    expect((await post(env, "/api/me/surprise/draft", null, { turns })).status).toBe(401);
  });

  it("opens with the same question every time, then Muse Spark follows up", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    expect(await (await post(env, "/api/me/surprise/next", ana, { turns: [] })).json()).toEqual({ question: OPENING, source: "rules" });
    expect(await (await post(env, "/api/me/surprise/next", ana, { turns: turns.slice(0, 1) })).json()).toEqual({ question: "What got you into chess?", source: "ai" });
    const full = [...turns, ...turns.slice(0, 2)];
    expect(await (await post(env, "/api/me/surprise/next", ana, { turns: full })).json()).toEqual({ question: null, source: "rules" });
    expect(calls).toEqual(["ask"]);
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

  it("drafts lines from the person's own words, an observation and two screened ideas, and saves nothing", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    const res = await (await post(env, "/api/me/surprise/draft", ana, { turns })).json();
    expect(res).toEqual({
      source: "ai",
      lines: [
        { part: "interest", text: "Chess", sourceUrl: null, source: "you said" },
        { part: "talk_about", text: "A café app", sourceUrl: null, source: "you said" },
      ],
      observation: "Chess and cafés: a slow game and a good cup.",
      ideas: ["Best café for a chess game?"],
    });
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM compass_items").get()).toEqual({ n: 0 });
  });

  it("works without the model: the scripted questions, answers as 'you said'", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env);
    expect(await (await post(env, "/api/me/surprise/next", ana, { turns: turns.slice(0, 1) })).json()).toEqual({ question: SCRIPTED[1], source: "rules" });
    expect((await post(env, "/api/me/surprise/hear", ana, wav(), "audio/wav")).status).toBe(503);
    const res = await (await post(env, "/api/me/surprise/draft", ana, { turns: [{ q: SCRIPTED[0], a: "chess, cycling" }] })).json();
    expect(res).toMatchObject({ source: "rules", observation: null, ideas: [], lines: [{ text: "chess" }, { text: "cycling" }] });
    expect(calls).toEqual([]);
  });

  it("falls back to the person's words when the model invents everything", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    draftReply = { compass: [{ part: "interest", text: "Jazz piano" }], observation: "x", ideas: [] };
    const res = await (await post(env, "/api/me/surprise/draft", ana, { turns: [{ q: SCRIPTED[0], a: "chess" }] })).json();
    expect(res).toMatchObject({ source: "rules", lines: [{ part: "interest", text: "chess" }] });
  });

  it("stops with the fixed help message at crisis words, never model text", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    const hard = [{ q: OPENING, a: "nothing, I want to die" }];
    expect((await (await post(env, "/api/me/surprise/next", ana, { turns: hard })).json()).help).toMatch(/143/);
    expect((await (await post(env, "/api/me/surprise/draft", ana, { turns: hard })).json()).help).toMatch(/143/);
    expect(calls).toEqual([]);
  });

  it("refuses malformed conversations", async () => {
    const env = testEnv(AI);
    const ana = await person(env);
    expect((await post(env, "/api/me/surprise/next", ana, { turns: "hi" })).status).toBe(400);
    expect((await post(env, "/api/me/surprise/draft", ana, { turns: [] })).status).toBe(400);
  });
});
