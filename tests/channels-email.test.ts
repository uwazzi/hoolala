import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMagicLink } from "../src/channels/email";
import type { Env } from "../src/types";

const env = { EMAIL_API_KEY: "test-key", EMAIL_FROM: "Hoolala! <hello@hoolala.test>" } as Env;
const mail = { to: "a@example.com", link: "https://hoolala.test/auth/verify?token=t" };

/** Fake Resend: answers each call with the next item (a status, or "network" to throw). */
function provider(...answers: (number | "network" | Response)[]) {
  const calls: { key: string | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push({ key: new Headers(init.headers).get("idempotency-key") });
      const next = answers.shift() ?? 500;
      if (next === "network") throw new TypeError("fetch failed");
      return next instanceof Response ? next : new Response("{}", { status: next });
    }),
  );
  return calls;
}

const sleeps: number[] = [];
const sleep = async (ms: number) => void sleeps.push(ms);

afterEach(() => {
  vi.unstubAllGlobals();
  sleeps.length = 0;
});

describe("sendMagicLink", () => {
  it("sends once on success, with an idempotency key", async () => {
    const calls = provider(200);
    expect(await sendMagicLink(env, mail, sleep)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].key).toMatch(/^signin\/[0-9a-f-]{36}$/);
  });

  it("retries network errors and 5xx with the same key", async () => {
    const calls = provider("network", 503, 200);
    expect(await sendMagicLink(env, mail, sleep)).toBe(true);
    expect(calls).toHaveLength(3);
    expect(new Set(calls.map((c) => c.key)).size).toBe(1);
    expect(sleeps).toEqual([250, 750]);
  });

  it("respects retry-after on 429, capped at 2 s", async () => {
    provider(new Response("{}", { status: 429, headers: { "retry-after": "1" } }), 200);
    expect(await sendMagicLink(env, mail, sleep)).toBe(true);
    expect(sleeps).toEqual([1000]);
    provider(new Response("{}", { status: 429, headers: { "retry-after": "60" } }), 200);
    await sendMagicLink(env, mail, sleep);
    expect(sleeps.at(-1)).toBe(2000);
  });

  it("never retries other 4xx", async () => {
    for (const status of [400, 401, 403, 422]) {
      const calls = provider(status, 200);
      expect(await sendMagicLink(env, mail, sleep)).toBe(false);
      expect(calls).toHaveLength(1);
    }
    expect(sleeps).toEqual([]);
  });

  it("gives up after 3 attempts", async () => {
    const calls = provider(500, 502, 503, 200);
    expect(await sendMagicLink(env, mail, sleep)).toBe(false);
    expect(calls).toHaveLength(3);
  });

  it("uses a new key for each sign-in attempt", async () => {
    const first = provider(200);
    await sendMagicLink(env, mail, sleep);
    const second = provider(200);
    await sendMagicLink(env, mail, sleep);
    expect(first[0].key).not.toBe(second[0].key);
  });

  it("sends nothing without a key or sender", async () => {
    const calls = provider(200);
    expect(await sendMagicLink({} as Env, mail, sleep)).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
