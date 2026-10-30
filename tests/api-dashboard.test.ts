import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokensEqual } from "../src/rules/dashboard";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const TOKEN = "owner-token-for-tests";

type Env = ReturnType<typeof testEnv>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => vi.useRealTimers());

function call(env: Env, path: string, token?: string, viaQuery = false) {
  const url = viaQuery && token ? `${BASE}${path}?token=${token}` : `${BASE}${path}`;
  return worker.fetch(
    new Request(url, { headers: token && !viaQuery ? { authorization: `Bearer ${token}` } : {} }),
    env,
    ctx,
  );
}

function seed(env: Env) {
  const db = env.DB.sqlite;
  const user = (id: string, extra = "") =>
    db.prepare(`INSERT INTO users (id, email, first_name, is_adult, created_at${extra ? `, ${extra}` : ""}) VALUES (?, ?, ?, 1, ?)`).run(id, `${id}@example.com`, id, NOW);
  user("ana");
  user("ben");
  db.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at, deleted_at) VALUES ('gone', 'gone@example.com', 'Gone', 1, ?, ?)").run(NOW, NOW);
  db.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at, is_sample) VALUES ('sophie', 'sophie@example.com', 'Sophie', 1, ?, 1)").run(NOW);
  db.prepare("INSERT INTO places (id, slug, name, kind, created_at) VALUES ('cafe', 'cafe', 'Cafe', 'cafe', ?)").run(NOW);
  db.prepare("INSERT INTO places (id, slug, name, kind, created_at, is_sample) VALUES ('sample', 'sample', 'SAMPLE', 'cafe', ?, 1)").run(NOW);
  const meet = (id: string, a: string, b: string, place: string | null, day = "2026-10-28") =>
    db.prepare("INSERT INTO interactions (id, kind, user_a, user_b, place_id, signal_id, day, confirmed_at) VALUES (?, 'here', ?, ?, ?, NULL, ?, ?)").run(id, a, b, place, day, NOW);
  meet("m1", "ana", "ben", "cafe");
  meet("m2", "ana", "ben", null, "2026-10-27");
  meet("mx", "ana", "sophie", "sample");
  const tried = (id: string, userId: string, outcome: string) =>
    db.prepare("INSERT INTO tries (id, user_id, step, outcome, created_at) VALUES (?, ?, 1, ?, ?)").run(id, userId, outcome, NOW);
  tried("t1", "ana", "went_well");
  tried("t2", "ana", "no_reply");
  tried("t3", "ben", "awkward");
  tried("t4", "ben", "didnt_happen");
  tried("t5", "sophie", "went_well");
}

describe("the owner token compare", () => {
  it("matches equal tokens only", () => {
    expect(tokensEqual("abc123", "abc123")).toBe(true);
    expect(tokensEqual("abc123", "abc124")).toBe(false);
    expect(tokensEqual("abc123", "abc12")).toBe(false);
    expect(tokensEqual("", "abc123")).toBe(false);
  });
});

describe("the owner dashboard", () => {
  it("refuses the counts without the owner token", async () => {
    const env = testEnv();
    env.OWNER_TOKEN = TOKEN;
    expect((await call(env, "/api/dashboard")).status).toBe(403);
    expect((await call(env, "/api/dashboard", "wrong")).status).toBe(403);
  });

  it("stays closed when no owner token is configured", async () => {
    const env = testEnv();
    expect((await call(env, "/api/dashboard", TOKEN)).status).toBe(403);
  });

  it("counts users, interactions, leaves and sentiment for the owner", async () => {
    const env = testEnv();
    env.OWNER_TOKEN = TOKEN;
    seed(env);
    for (const viaQuery of [false, true]) {
      const res = await call(env, "/api/dashboard", TOKEN, viaQuery);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        users: 2,
        interactions: 2,
        leaves: 3,
        sentiment: { went_well: 1, no_reply: 1, awkward: 1, didnt_happen: 1 },
      });
    }
  });
});
