import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { snapToCell } from "../src/rules/rooms";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-11-02T14:00:00.000Z";
const CAFE = { lat: 46.519731, lng: 6.632911 };
const FAR = { lat: 46.529731, lng: 6.642911 };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string; name: string };

let sent: { to: string[]; text: string }[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      if (init?.body) sent.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: 200 });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function call(env: Env, method: string, path: string, who?: Person, body?: unknown, headers: Record<string, string> = {}) {
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

function rawCall(env: Env, method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    ctx,
  );
}

async function person(env: Env, name: string | null): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${id}@example.com`, name, NOW);
  return { id, name: name ?? "", cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

async function scans(env: Env) {
  const { results } = await env.DB.prepare("SELECT day, zone, scans FROM poster_scans ORDER BY zone").all<{ day: string; zone: string; scans: number }>();
  return results;
}

function zoneOf(at: { lat: number; lng: number }): string {
  const cell = snapToCell(at.lat, at.lng);
  return `${cell.lat},${cell.lng}`;
}

describe("poster scans", () => {
  it("counts every scan per day and GPS zone, never blocking the scanner", async () => {
    const env = testEnv();
    const cafe = zoneOf(CAFE);
    expect(cafe).not.toBe(zoneOf(FAR));
    expect((await rawCall(env, "POST", "/api/posters/scan", {}, CAFE)).status).toBe(200);
    expect((await rawCall(env, "POST", "/api/posters/scan", {}, CAFE)).status).toBe(200);
    expect((await rawCall(env, "POST", "/api/posters/scan", {}, FAR)).status).toBe(200);
    expect(await scans(env)).toEqual([
      { day: "2026-11-02", zone: cafe, scans: 2 },
      { day: "2026-11-02", zone: zoneOf(FAR), scans: 1 },
    ]);
  });

  it("counts denied or broken GPS as unknown, still 200", async () => {
    const env = testEnv();
    expect((await rawCall(env, "POST", "/api/posters/scan", {}, {})).status).toBe(200);
    expect((await rawCall(env, "POST", "/api/posters/scan", {}, { lat: "here", lng: 6.6 })).status).toBe(200);
    expect((await rawCall(env, "POST", "/api/posters/scan", {}, { lat: 460, lng: 6.6 })).status).toBe(200);
    expect(await scans(env)).toEqual([{ day: "2026-11-02", zone: "unknown", scans: 3 }]);
  });

  it("rate-limits scans per IP", async () => {
    const env = testEnv();
    for (let i = 0; i < 30; i++) expect((await rawCall(env, "POST", "/api/posters/scan", { "cf-connecting-ip": "203.0.113.7" }, CAFE)).status).toBe(200);
    expect((await rawCall(env, "POST", "/api/posters/scan", { "cf-connecting-ip": "203.0.113.7" }, CAFE)).status).toBe(429);
  });
});

describe("poster onboarding", () => {
  it("needs an email and 18+, then sends a magic link back to the poster claim", async () => {
    const env = testEnv({ EMAIL_API_KEY: "test-key", EMAIL_FROM: "Hoolala! <hello@hoolala.test>" });
    expect(((await (await rawCall(env, "POST", "/api/posters/start", {}, { email: "nope", adult: true })).json()) as { error: string }).error).toBe("bad_email");
    expect((await rawCall(env, "POST", "/api/posters/start", {}, { email: "new@example.com", adult: false })).status).toBe(400);
    expect((await rawCall(env, "POST", "/api/posters/start", {}, { email: "new@example.com", adult: true })).status).toBe(200);
    expect(sent).toHaveLength(1);
    const link = sent[0].text.match(/https?:\/\/\S+/)?.[0] as string;
    expect(link).toContain("poster=1");
    const verify = await rawCall(env, "GET", new URL(link).pathname + new URL(link).search);
    expect(verify.status).toBe(303);
    expect(verify.headers.get("location")).toBe("/p/claim");
    expect(verify.headers.get("set-cookie")).toContain("hoolala_session=");
  });

  it("claim sets the screened first name and finishes without a room", async () => {
    const env = testEnv();
    const newcomer = await person(env, null);
    expect((await call(env, "POST", "/api/posters/claim", newcomer, {})).status).toBe(400);
    expect((await call(env, "POST", "/api/posters/claim", newcomer, { firstName: "You idiot" })).status).toBe(422);
    expect((await call(env, "POST", "/api/posters/claim", newcomer, { firstName: "New" })).status).toBe(200);
    const name = await env.DB.prepare("SELECT first_name AS n FROM users WHERE id = ?").bind(newcomer.id).first<{ n: string }>();
    expect(name?.n).toBe("New");
    expect((await call(env, "POST", "/api/posters/claim", await person(env, "Ana"), {})).status).toBe(200);
    expect((await rawCall(env, "POST", "/api/posters/claim", {}, { firstName: "New" })).status).toBe(401);
  });
});
