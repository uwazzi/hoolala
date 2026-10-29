import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleAuthStart, handleAuthVerify } from "../src/api/auth";
import { handleMe } from "../src/api/me";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;

let sent: { to: string[]; text: string }[];
let providerOk: boolean;

beforeEach(() => {
  sent = [];
  providerOk = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: providerOk ? 200 : 500 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function start(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${BASE}/api/auth/start`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

function lastToken(): string {
  const match = sent.at(-1)!.text.match(/token=([\w-]+)/);
  return match![1];
}

function cookieFrom(res: Response): string {
  return res.headers.get("set-cookie")!.split(";")[0];
}

/** Full sign-in; returns the cookie header value. */
async function signIn(env: ReturnType<typeof testEnv>, email = "hugo@example.com", now = new Date()) {
  await handleAuthStart(start({ email, adult: true }, { "cf-connecting-ip": crypto.randomUUID() }), env, now);
  const res = await handleAuthVerify(new Request(`${BASE}/auth/verify?token=${lastToken()}`), env, now);
  return { res, cookie: cookieFrom(res) };
}

describe("POST /api/auth/start", () => {
  it("refuses a bad email and a missing 18+ confirmation", async () => {
    const env = testEnv();
    expect((await handleAuthStart(start({ email: "nope", adult: true }), env)).status).toBe(400);
    const res = await handleAuthStart(start({ email: "hugo@example.com" }), env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "adult_required" });
    expect(sent).toHaveLength(0);
  });

  it("sends a link and stores only the token's hash", async () => {
    const env = testEnv();
    const res = await handleAuthStart(start({ email: " Hugo@Example.com ", adult: true }), env);
    expect(res.status).toBe(200);
    expect(sent[0].to).toEqual(["hugo@example.com"]);
    expect(sent[0].text).toContain(`${BASE}/auth/verify?token=`);
    const token = lastToken();
    const rows = env.DB.sqlite.prepare("SELECT * FROM login_tokens").all() as { token_hash: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("answers the same whether or not the email has an account", async () => {
    const env = testEnv();
    await signIn(env, "known@example.com");
    const known = await handleAuthStart(start({ email: "known@example.com", adult: true }), env);
    const unknown = await handleAuthStart(start({ email: "new@example.com", adult: true }), env);
    expect(known.status).toBe(unknown.status);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("rate limits per email and per IP, keyed by hashes only", async () => {
    const env = testEnv();
    for (let i = 0; i < 3; i++) {
      expect((await handleAuthStart(start({ email: "a@example.com", adult: true }), env)).status).toBe(200);
    }
    expect((await handleAuthStart(start({ email: "a@example.com", adult: true }), env)).status).toBe(429);
    for (let i = 0; i < 7; i++) {
      await handleAuthStart(start({ email: `b${i}@example.com`, adult: true }), env);
    }
    expect((await handleAuthStart(start({ email: "c@example.com", adult: true }), env)).status).toBe(429);
    for (const key of env.SESSIONS.store.keys()) {
      expect(key).not.toContain("example.com");
      expect(key).not.toContain("203.0.113.7");
    }
  });

  it("says so when the email provider fails", async () => {
    providerOk = false;
    const res = await handleAuthStart(start({ email: "a@example.com", adult: true }), testEnv());
    expect(res.status).toBe(503);
  });

  it("never logs the email or the link", async () => {
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    await handleAuthStart(start({ email: "a@example.com", adult: true }), testEnv());
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("GET /auth/verify", () => {
  it("signs a new person in, 18+, and asks for a first name", async () => {
    const env = testEnv();
    const { res } = await signIn(env);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/signin?step=name");
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    const user = env.DB.sqlite.prepare("SELECT * FROM users").get() as { email: string; is_adult: number };
    expect(user.email).toBe("hugo@example.com");
    expect(user.is_adult).toBe(1);
  });

  it("refuses a reused link", async () => {
    const env = testEnv();
    await handleAuthStart(start({ email: "a@example.com", adult: true }), env);
    const url = `${BASE}/auth/verify?token=${lastToken()}`;
    expect((await handleAuthVerify(new Request(url), env)).headers.get("set-cookie")).not.toBeNull();
    const again = await handleAuthVerify(new Request(url), env);
    expect(again.headers.get("location")).toBe("/signin?error=link");
    expect(again.headers.get("set-cookie")).toBeNull();
  });

  it("refuses an expired link", async () => {
    const env = testEnv();
    const now = new Date("2026-10-27T12:00:00.000Z");
    await handleAuthStart(start({ email: "a@example.com", adult: true }), env, now);
    const later = new Date(now.getTime() + 15 * 60 * 1000 + 1);
    const res = await handleAuthVerify(new Request(`${BASE}/auth/verify?token=${lastToken()}`), env, later);
    expect(res.headers.get("location")).toBe("/signin?error=link");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a wrong or missing token", async () => {
    const env = testEnv();
    await handleAuthStart(start({ email: "a@example.com", adult: true }), env);
    for (const url of [`${BASE}/auth/verify?token=made-up`, `${BASE}/auth/verify`]) {
      const res = await handleAuthVerify(new Request(url), env);
      expect(res.headers.get("location")).toBe("/signin?error=link");
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("finds the same person on the next sign-in and goes home once named", async () => {
    const env = testEnv();
    const first = await signIn(env);
    await handleMe(
      new Request(`${BASE}/api/me`, { method: "PATCH", headers: { cookie: first.cookie }, body: JSON.stringify({ firstName: "Hugo" }) }),
      env,
    );
    const second = await signIn(env);
    expect(second.res.headers.get("location")).toBe("/");
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 1 });
  });
});

describe("/api/me", () => {
  it("is signed out without a valid session", async () => {
    const env = testEnv();
    expect((await handleMe(new Request(`${BASE}/api/me`), env)).status).toBe(401);
    const forged = new Request(`${BASE}/api/me`, { headers: { cookie: "hoolala_session=forged" } });
    expect((await handleMe(forged, env)).status).toBe(401);
  });

  it("returns only id, first name, 18+ and the story flag", async () => {
    const env = testEnv();
    const { cookie } = await signIn(env);
    const res = await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie } }), env);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["firstName", "id", "introSeen", "isAdult"]);
    expect(body).toMatchObject({ firstName: null, isAdult: true, introSeen: false });
  });

  it("marks the onboarding story seen, and only when signed in", async () => {
    const env = testEnv();
    const seen = (cookie?: string) =>
      worker.fetch(new Request(`${BASE}/api/me/intro-seen`, { method: "POST", headers: cookie ? { cookie } : {} }), env, ctx);
    expect((await seen()).status).toBe(401);
    const { cookie } = await signIn(env);
    expect(await (await seen(cookie)).json()).toMatchObject({ introSeen: true });
    const again = await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie } }), env);
    expect(await again.json()).toMatchObject({ introSeen: true });
    expect((await seen(cookie)).status).toBe(200);
  });

  it("sets a first name and refuses a bad one", async () => {
    const env = testEnv();
    const { cookie } = await signIn(env);
    const patch = (firstName: string) =>
      handleMe(new Request(`${BASE}/api/me`, { method: "PATCH", headers: { cookie }, body: JSON.stringify({ firstName }) }), env);
    expect((await patch("@hugo")).status).toBe(400);
    expect(await (await patch(" Hugo ")).json()).toMatchObject({ firstName: "Hugo" });
  });

  it("refuses an expired session", async () => {
    const env = testEnv();
    const { cookie } = await signIn(env, "a@example.com", new Date("2026-10-27T12:00:00.000Z"));
    const later = new Date("2026-11-27T12:00:00.000Z");
    expect((await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie } }), env, later)).status).toBe(401);
  });

  it("falls back to D1 when KV hasn't caught up", async () => {
    const env = testEnv();
    const { cookie } = await signIn(env);
    env.SESSIONS.store.clear();
    expect((await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie } }), env)).status).toBe(200);
  });
});

describe("through the worker", () => {
  it("routes sign-in, me and logout end to end", async () => {
    const env = testEnv();
    expect((await worker.fetch(start({ email: "a@example.com", adult: true }), env, ctx)).status).toBe(200);
    const verify = await worker.fetch(new Request(`${BASE}/auth/verify?token=${lastToken()}`), env, ctx);
    expect(verify.status).toBe(303);
    expect(verify.headers.get("content-security-policy")).toContain("default-src 'self'");
    const cookie = cookieFrom(verify);
    expect((await worker.fetch(new Request(`${BASE}/api/me`, { headers: { cookie } }), env, ctx)).status).toBe(200);

    const out = await worker.fetch(new Request(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie } }), env, ctx);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await worker.fetch(new Request(`${BASE}/api/me`, { headers: { cookie } }), env, ctx)).status).toBe(401);
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });

  it("refuses writes from another origin", async () => {
    const env = testEnv();
    const res = await worker.fetch(
      start({ email: "a@example.com", adult: true }, { origin: "https://evil.example" }),
      env,
      ctx,
    );
    expect(res.status).toBe(403);
    expect(sent).toHaveLength(0);
  });
});

describe("DELETE /api/me", () => {
  it("removes the person's data, keeps anonymous counts, and ends every session", async () => {
    const env = testEnv();
    const a = await signIn(env, "a@example.com");
    const b = await signIn(env, "b@example.com");
    const ids = env.DB.sqlite.prepare("SELECT id, email FROM users ORDER BY email").all() as { id: string }[];
    const [A, B] = ids.map((r) => r.id);
    const t = "2026-10-27T12:00:00.000Z";
    const db = env.DB.sqlite;
    db.exec(`
      UPDATE users SET first_name = 'Ana', telegram_user_id = '42' WHERE id = '${A}';
      INSERT INTO places (id, slug, name, kind, radius_m, added_by, status, created_at)
        VALUES ('p1', 'cafe', 'Café', 'cafe', 150, '${A}', 'active', '${t}');
      INSERT INTO place_facts (id, place_id, field, value, source, state, added_by, confirmations, updated_at)
        VALUES ('f1', 'p1', 'wifi', 'yes', 'people', 'confirmed', '${A}', 1, '${t}');
      INSERT INTO checkins (id, user_id, place_id, method, started_at, ends_at)
        VALUES ('c1', '${A}', 'p1', 'location', '${t}', '${t}'), ('c2', '${B}', 'p1', 'location', '${t}', '${t}');
      INSERT INTO signals (id, owner_id, audience, place_id, topic, capacity, created_at, expires_at, state)
        VALUES ('s1', '${A}', 'place', 'p1', 'Anyone into chess?', 2, '${t}', '${t}', 'open'),
               ('s2', '${B}', 'place', 'p1', 'Board games?', 2, '${t}', '${t}', 'open');
      INSERT INTO signal_responses (id, signal_id, responder_id, state, created_at)
        VALUES ('r1', 's1', '${B}', 'accepted', '${t}'), ('r2', 's2', '${A}', 'requested', '${t}');
      INSERT INTO quick_replies (id, signal_id, user_id, kind, created_at) VALUES ('q1', 's1', '${B}', 'on_my_way', '${t}');
      INSERT INTO interactions (id, kind, user_a, user_b, place_id, signal_id, day, confirmed_at)
        VALUES ('i1', 'here', '${A}', '${B}', 'p1', 's1', '2026-10-27', '${t}');
      INSERT INTO moments (id, user_id, interaction_id, label) VALUES ('m1', '${A}', 'i1', 'x'), ('m2', '${B}', 'i1', 'x');
      INSERT INTO stay_in_touch (user_id, other_id, signal_id, chosen_at) VALUES ('${A}', '${B}', 's1', '${t}');
      INSERT INTO friendships (user_a, user_b, created_at, status) VALUES ('${A}', '${B}', '${t}', 'active');
      INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES ('${B}', '${A}', '${t}');
      INSERT INTO compass_items (id, user_id, part, text, origin, created_at)
        VALUES ('k1', '${A}', 'interest', 'chess', 'questions', '${t}');
    `);

    const res = await worker.fetch(
      new Request(`${BASE}/api/me`, { method: "DELETE", headers: { cookie: a.cookie } }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");

    const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    expect(db.prepare(`SELECT email, telegram_user_id, first_name, deleted_at FROM users WHERE id = '${A}'`).get())
      .toMatchObject({ email: null, telegram_user_id: null, first_name: null });
    expect(count(`SELECT COUNT(*) AS n FROM users WHERE id = '${A}' AND deleted_at IS NOT NULL`)).toBe(1);
    expect(count(`SELECT COUNT(*) AS n FROM checkins WHERE user_id = '${A}'`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM signals WHERE owner_id = '${A}'`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM signal_responses WHERE responder_id = '${A}' OR signal_id = 's1'`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM quick_replies`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM moments WHERE user_id = '${A}'`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM friendships`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM stay_in_touch`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM blocks`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM compass_items`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = '${A}'`)).toBe(0);
    expect(count(`SELECT COUNT(*) AS n FROM login_tokens WHERE email = 'a@example.com'`)).toBe(0);
    // Anonymous counts and the other person's things stay.
    expect(db.prepare("SELECT signal_id FROM interactions WHERE id = 'i1'").get()).toEqual({ signal_id: null });
    expect(count(`SELECT COUNT(*) AS n FROM signals WHERE owner_id = '${B}'`)).toBe(1);
    expect(count(`SELECT COUNT(*) AS n FROM checkins WHERE user_id = '${B}'`)).toBe(1);
    expect(count(`SELECT COUNT(*) AS n FROM moments WHERE user_id = '${B}'`)).toBe(1);
    expect(db.prepare("SELECT added_by FROM places WHERE id = 'p1'").get()).toEqual({ added_by: null });
    expect(db.prepare("SELECT added_by FROM place_facts WHERE id = 'f1'").get()).toEqual({ added_by: null });

    // Old session is dead; B is untouched; the same email can start afresh.
    expect((await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie: a.cookie } }), env)).status).toBe(401);
    expect((await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie: b.cookie } }), env)).status).toBe(200);
    const again = await signIn(env, "a@example.com");
    const fresh = await (await handleMe(new Request(`${BASE}/api/me`, { headers: { cookie: again.cookie } }), env)).json();
    expect(fresh.id).not.toBe(A);
  });
});
