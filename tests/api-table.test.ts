import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { mintTableToken } from "../src/api/table";
import { createRoom, addMember } from "../src/db/rooms";
import { snapToCell } from "../src/rules/rooms";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-11-02T14:00:00.000Z";
const ENDS = "2026-11-02T15:00:00.000Z";
const CAFE = { lat: 46.519731, lng: 6.632911 };
const FAR = { lat: 46.529731, lng: 6.642911 };
const SECRET = "test-table-secret";

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

function envWithSecret(): Env {
  return testEnv({ TABLE_QR_SECRET: SECRET, EMAIL_API_KEY: "test-key", EMAIL_FROM: "Hoolala! <hello@hoolala.test>" });
}

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

async function person(env: Env, name: string): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${name}-${id}@example.com`, name, NOW);
  return { id, name, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

async function room(env: Env, starter: Person, over: { at?: { lat: number; lng: number }; topic?: string } = {}) {
  const cell = snapToCell((over.at ?? CAFE).lat, (over.at ?? CAFE).lng);
  const id = crypto.randomUUID();
  await createRoom(env.DB, {
    id, starterId: starter.id, topic: over.topic ?? "Teach me a two-player game?", placeText: "Café du Coin, window table",
    cellLat: cell.lat, cellLng: cell.lng, lang: "en", translation: null, opensAt: NOW, endsAt: ENDS, status: "open", createdAt: NOW,
  });
  await addMember(env.DB, { roomId: id, userId: starter.id, role: "starter", joinedAt: NOW, removeToken: crypto.randomUUID() });
  return id;
}

async function join(env: Env, id: string, who: Person, at = CAFE) {
  return call(env, "POST", `/api/rooms/${id}/join`, who, at);
}

async function tableToken(env: Env, id: string, who: Person) {
  const res = await call(env, "GET", `/api/rooms/${id}/table`, who);
  return { status: res.status, body: (await res.json()) as { token: string; url: string } };
}

async function scanTable(env: Env, who: Person, token: string, at?: { lat: number; lng: number }) {
  const res = await call(env, "POST", "/api/rooms/scan-table", who, { token, ...(at ?? {}) });
  return { status: res.status, body: (await res.json()) as { roomId: string; atTable: string[]; recorded: number; error?: string } };
}

async function tablePairs(env: Env) {
  const { results } = await env.DB.prepare("SELECT * FROM interactions WHERE kind = 'table'").all<Record<string, unknown>>();
  return results;
}

describe("table tokens", () => {
  it("needs an open room, membership and a configured secret", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const { status, body } = await tableToken(env, id, hugo);
    expect(status).toBe(200);
    expect(body.url).toBe(`${BASE}/r/${body.token}`);
    expect((await tableToken(env, id, await person(env, "Marc"))).status).toBe(404);
    const noSecret = testEnv();
    const ana = await person(noSecret, "Ana");
    const other = await room(noSecret, ana);
    expect((await tableToken(noSecret, other, ana)).status).toBe(503);
  });
});

describe("scan = met", () => {
  it("records one meeting per pair with everyone at the table, once per pair per day", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const marc = await person(env, "Marc");
    const id = await room(env, hugo);
    await join(env, id, lea);
    await join(env, id, marc);
    const hugoCode = (await tableToken(env, id, hugo)).body.token;
    const first = await scanTable(env, lea, hugoCode);
    expect(first.status).toBe(200);
    expect(first.body.recorded).toBe(1);
    expect(first.body.atTable).toEqual(["Hugo", "Lea"]);
    // Marc scans Lea's phone: meetings with Hugo and Lea.
    const leaCode = (await tableToken(env, id, lea)).body.token;
    const second = await scanTable(env, marc, leaCode);
    expect(second.body.recorded).toBe(2);
    expect(await tablePairs(env)).toHaveLength(3);
    // A second scan the same day adds none.
    expect((await scanTable(env, marc, leaCode)).body.recorded).toBe(0);
    expect(await tablePairs(env)).toHaveLength(3);
  });

  it("refuses a token older than 60 seconds", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await join(env, id, lea);
    const stale = await mintTableToken(SECRET, id, hugo.id, new Date(Date.parse(NOW) - 61_000));
    expect((await scanTable(env, lea, stale)).status).toBe(404);
    expect(await tablePairs(env)).toHaveLength(0);
  });

  it("refuses tampered tokens", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await join(env, id, lea);
    const good = (await tableToken(env, id, hugo)).body.token;
    const tampered = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
    expect((await scanTable(env, lea, tampered)).status).toBe(404);
    expect((await scanTable(env, lea, "not-a-token")).status).toBe(404);
  });

  it("records in the token's room only", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const a = await room(env, hugo, { topic: "Room A" });
    const b = await room(env, lea, { topic: "Room B" });
    await join(env, a, lea);
    const codeA = (await tableToken(env, a, hugo)).body.token;
    const res = await scanTable(env, lea, codeA);
    expect(res.body.roomId).toBe(a);
    expect(res.body.roomId).not.toBe(b);
  });

  it("never records a blocked pair", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await join(env, id, lea);
    await env.DB.prepare("INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)").bind(lea.id, hugo.id, NOW).run();
    const code = (await tableToken(env, id, hugo)).body.token;
    expect((await scanTable(env, lea, code)).status).toBe(404);
    expect(await tablePairs(env)).toHaveLength(0);
  });

  it("lets a signed-in non-member nearby join by scanning, but not from far away", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const near = await person(env, "Near");
    const far = await person(env, "Far");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    const joined = await scanTable(env, near, code, CAFE);
    expect(joined.status).toBe(200);
    expect(joined.body.recorded).toBe(1);
    const refused = await scanTable(env, far, code, FAR);
    expect(refused.status).toBe(404);
    expect((await scanTable(env, far, code)).status).toBe(400);
  });

  it("stores user ids and the day only: no names, places or coordinates", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await join(env, id, lea);
    const code = (await tableToken(env, id, hugo)).body.token;
    await scanTable(env, lea, code);
    const rows = await tablePairs(env);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["confirmed_at", "day", "id", "kind", "place_id", "signal_id", "user_a", "user_b"]);
    expect(rows[0].place_id).toBeNull();
    expect(rows[0].signal_id).toBeNull();
    const raw = JSON.stringify(rows);
    expect(raw).not.toContain("Hugo");
    expect(raw).not.toContain("Café du Coin");
  });
});

describe("quick onboarding from the table", () => {
  async function land(env: Env, token: string, ip = "203.0.113.7") {
    const res = await rawCall(env, "GET", `/r/${token}`, { "cf-connecting-ip": ip });
    const cookie = res.headers.get("set-cookie");
    return { status: res.status, cookie, pendingId: cookie?.match(/table_pending=([^;]+)/)?.[1] ?? null };
  }

  it("lands a newcomer on the room with a pending join", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    const { status, pendingId } = await land(env, code);
    expect(status).toBe(200);
    expect(pendingId).toBeTruthy();
    const pending = await env.SESSIONS.get(`table-pending:${pendingId}`, { type: "text" });
    expect(JSON.parse(pending as string)).toEqual(expect.objectContaining({ roomId: id, showerId: hugo.id }));
  });

  it("rate-limits pending joins per IP", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    for (let i = 0; i < 5; i++) expect((await land(env, code)).pendingId).toBeTruthy();
    expect((await land(env, code)).pendingId).toBeNull();
  });

  it("takes a newcomer from email link and first name straight to the table", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    const { pendingId } = await land(env, code);
    const start = await rawCall(env, "POST", "/api/table/start", { "cf-connecting-ip": "203.0.113.9" }, { email: "new@example.com", adult: true, pendingId });
    expect(start.status).toBe(200);
    expect(sent).toHaveLength(1);
    const link = sent[0].text.match(/https?:\/\/\S+/)?.[0] as string;
    expect(link).toContain(`table=${pendingId}`);
    // The link is opened on the phone: an account, a session, straight back.
    const verify = await rawCall(env, "GET", new URL(link).pathname + new URL(link).search);
    expect(verify.status).toBe(303);
    expect(verify.headers.get("location")).toBe(`/r/claim?pending=${pendingId}`);
    const cookie = verify.headers.get("set-cookie")!.split(";")[0];
    const me = (await (await rawCall(env, "GET", "/api/me", { cookie })).json()) as { firstName: string | null };
    expect(me.firstName).toBeNull();
    const claim = await rawCall(env, "POST", "/api/table/claim", { cookie }, { pendingId, firstName: "New" });
    expect(claim.status).toBe(200);
    expect(((await claim.json()) as { roomId: string }).roomId).toBe(id);
    expect(await tablePairs(env)).toHaveLength(1);
    const detail = (await (await rawCall(env, "GET", `/api/rooms/${id}`, { cookie })).json()) as { member: boolean; members: { name: string }[] };
    expect(detail.member).toBe(true);
    expect(detail.members.map((m) => m.name)).toEqual(["Hugo", "New"]);
  });

  it("claims once: a second use records nothing", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    const { pendingId } = await land(env, code);
    const newcomer = await person(env, "New");
    await env.DB.prepare("UPDATE users SET first_name = NULL WHERE id = ?").bind(newcomer.id).run();
    const claim = await call(env, "POST", "/api/table/claim", newcomer, { pendingId, firstName: "New" });
    expect(claim.status).toBe(200);
    expect(((await claim.json()) as { roomId: string }).roomId).toBe(id);
    const again = await call(env, "POST", "/api/table/claim", newcomer, { pendingId, firstName: "New" });
    expect(again.status).toBe(409);
    expect(await tablePairs(env)).toHaveLength(1);
  });

  it("screens the table first name", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    const { pendingId } = await land(env, code);
    const newcomer = await person(env, "New");
    await env.DB.prepare("UPDATE users SET first_name = NULL WHERE id = ?").bind(newcomer.id).run();
    const claim = await call(env, "POST", "/api/table/claim", newcomer, { pendingId, firstName: "You idiot" });
    expect(claim.status).toBe(422);
    expect(await tablePairs(env)).toHaveLength(0);
  });

  it("gives an account but no membership or meetings when the room ended or filled", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const id = await room(env, hugo);
    const code = (await tableToken(env, id, hugo)).body.token;
    const { pendingId } = await land(env, code);
    await env.DB.prepare("UPDATE rooms SET status = 'closed' WHERE id = ?").bind(id).run();
    const newcomer = await person(env, "New");
    const claim = await call(env, "POST", "/api/table/claim", newcomer, { pendingId });
    expect(claim.status).toBe(409);
    expect(await tablePairs(env)).toHaveLength(0);
    const membership = await env.DB.prepare("SELECT * FROM room_members WHERE room_id = ? AND user_id = ?").bind(id, newcomer.id).first();
    expect(membership).toBeNull();
  });
});

describe("live counts table meetings", () => {
  it("counts scan-recorded pairs, never sample people", async () => {
    const env = envWithSecret();
    const hugo = await person(env, "Hugo");
    const lea = await person(env, "Lea");
    const id = await room(env, hugo);
    await join(env, id, lea);
    const code = (await tableToken(env, id, hugo)).body.token;
    await scanTable(env, lea, code);
    const live = (await (await rawCall(env, "GET", "/api/live")).json()) as { hellos: number };
    expect(live.hellos).toBe(1);
  });
});
