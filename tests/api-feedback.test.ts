import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { cleanLog } from "../src/rules/feedback";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const TOKEN = "owner-token-for-tests";

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => vi.useRealTimers());

function call(env: Env, method: string, path: string, opts: { who?: Person; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.who) headers.cookie = opts.who.cookie;
  if (opts.body) headers["content-type"] = "application/json";
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return worker.fetch(
    new Request(`${BASE}${path}`, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined }),
    env,
    ctx,
  );
}

async function person(env: Env, name: string): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${name}@example.com`, name, NOW);
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

describe("feedback log cleaning", () => {
  it("keeps the last entries, short lines only", () => {
    expect(cleanLog("nope")).toEqual([]);
    const many = Array.from({ length: 60 }, (_, i) => ({ t: i, line: `l${i}` }));
    const kept = cleanLog(many);
    expect(kept.length).toBe(50);
    expect(kept[0]).toEqual({ t: 10, line: "l10" });
    expect(cleanLog([{ t: 1, line: "x".repeat(500) }])[0].line.length).toBe(200);
    expect(cleanLog([{ t: "soon", line: 42 }])).toEqual([]);
  });
});

describe("POST /api/feedback", () => {
  it("needs a signed-in person", async () => {
    const env = testEnv();
    expect((await call(env, "POST", "/api/feedback", { body: { screen: "/surprise" } })).status).toBe(401);
  });

  it("stores screen, message, log and name", async () => {
    const env = testEnv();
    env.OWNER_TOKEN = TOKEN;
    const ana = await person(env, "Ana");
    const res = await call(env, "POST", "/api/feedback", {
      who: ana,
      body: { screen: "/surprise", message: "Save did nothing.", log: [{ t: 1, line: "POST /api/me/compass/save -> 500" }] },
    });
    expect(res.status).toBe(200);
    const list = await (await call(env, "GET", "/api/feedback", { token: TOKEN })).json();
    expect(list.feedback).toMatchObject([
      { screen: "/surprise", message: "Save did nothing.", firstName: "Ana", log: [{ t: 1, line: "POST /api/me/compass/save -> 500" }] },
    ]);
    expect(list.feedback[0].id).toBeTruthy();
  });

  it("refuses an overlong or dirty message", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const long = await call(env, "POST", "/api/feedback", { who: ana, body: { screen: "/surprise", message: "x".repeat(501) } });
    expect(long.status).toBe(400);
  });
});

describe("GET /api/feedback", () => {
  it("needs the owner token", async () => {
    const env = testEnv();
    env.OWNER_TOKEN = TOKEN;
    const ana = await person(env, "Ana");
    expect((await call(env, "GET", "/api/feedback")).status).toBe(403);
    expect((await call(env, "GET", "/api/feedback", { who: ana })).status).toBe(403);
    expect((await call(env, "GET", "/api/feedback", { token: "wrong" })).status).toBe(403);
  });
});
