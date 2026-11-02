// WP-A4 phones on the table (v6.4): rotating signed QR tokens and the quick
// onboarding for curious people without the app. The QR holds a full URL,
// https://<host>/r/<token>, so any phone camera opens the room; the pending
// join waits 15 minutes for the email link and the first name.

import { sendMagicLink } from "../channels/email";
import { insertLoginToken } from "../db/auth";
import { blockedIds } from "../db/here";
import { addMember, currentMemberIds, getMembership, getRoom, markAtTable, recordTablePairs, rejoined } from "../db/rooms";
import { setFirstName } from "../db/auth";
import { loginTokenExpiry, normalizeEmail, normalizeFirstName, readCookie, START_LIMITS } from "../rules/auth";
import { ROOM_CAPACITY } from "../rules/rooms";
import { screenText, SCREEN_MESSAGES } from "../rules/screening";
import { parseTableToken, tableTokenLive, tableTokenPayload, type TableToken } from "../rules/table";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, randomToken, sha256Hex } from "./session";

const PENDING_TTL_S = 15 * 60;
const PENDING_LIMIT = { max: 5, windowS: 60 * 60 };
const PENDING_COOKIE = "table_pending";

export interface PendingJoin {
  roomId: string;
  showerId: string;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A short-lived signed token: room, shower, issued-at. Tokens are never stored. */
export async function mintTableToken(secret: string, roomId: string, showerId: string, now: Date): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const payload = tableTokenPayload(roomId, showerId, iat);
  return `${payload}.${await hmacHex(secret, payload)}`;
}

/** The token's room and shower, or null when tampered, unknown or older than 60 s. */
export async function verifyTableToken(secret: string, token: unknown, now: Date): Promise<TableToken | null> {
  const parsed = parseTableToken(token);
  if (!parsed || !tableTokenLive(parsed.iat, now.getTime())) return null;
  const sig = await hmacHex(secret, parsed.payload);
  if (sig !== parsed.sig) return null;
  return { roomId: parsed.roomId, showerId: parsed.showerId, iat: parsed.iat };
}

function pendingCookie(id: string): string {
  return `${PENDING_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${PENDING_TTL_S}`;
}

async function readPending(env: Env, id: string | null): Promise<(PendingJoin & { id: string }) | null> {
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const raw = await env.SESSIONS.get(`table-pending:${id}`, { type: "text" });
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as PendingJoin;
    if (!pending.roomId || !pending.showerId) return null;
    return { ...pending, id };
  } catch {
    return null;
  }
}

/**
 * GET /r/<token> from a phone camera. A valid token opens a pending table
 * join (single use, 15 minutes) and the app; anything else opens the app,
 * which explains the table wrapped up.
 */
export async function handleTableLanding(request: Request, token: string, env: Env, now = new Date()): Promise<Response> {
  const secret = env.TABLE_QR_SECRET;
  const app = () => env.ASSETS.fetch(request);
  const verified = secret ? await verifyTableToken(secret, token, now) : null;
  if (!verified) return app();
  const room = await getRoom(env.DB, verified.roomId);
  if (!room || room.status !== "open" || Date.parse(room.ends_at) <= now.getTime()) return app();
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (await overLimit(env, `table-pending-ip:${await sha256Hex(ip)}`, PENDING_LIMIT)) return app();
  const id = randomToken();
  await env.SESSIONS.put(`table-pending:${id}`, JSON.stringify({ roomId: verified.roomId, showerId: verified.showerId }), {
    expirationTtl: PENDING_TTL_S,
  });
  const res = await app();
  const headers = new Headers(res.headers);
  headers.append("set-cookie", pendingCookie(id));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** What the landing and claim pages may show: the topic and the room size. */
export async function handleTablePending(request: Request, env: Env, now = new Date()): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("pending") ?? readCookie(request.headers.get("cookie"), PENDING_COOKIE);
  const pending = await readPending(env, id);
  if (!pending) return json({ error: "gone" }, 404);
  const room = await getRoom(env.DB, pending.roomId);
  if (!room || room.status !== "open" || Date.parse(room.ends_at) <= now.getTime()) return json({ error: "gone" }, 404);
  const count = (await currentMemberIds(env.DB, room.id)).length;
  return json({ pendingId: pending.id, topic: room.topic, size: `${count} IN · UP TO ${ROOM_CAPACITY}`, state: "ok" });
}

/** CHECK YOUR EMAIL: the magic link carries only the pending id. */
export async function handleTableStart(request: Request, env: Env, now = new Date()): Promise<Response> {
  const body = await readJson(request);
  const pending = await readPending(env, typeof body.pendingId === "string" ? body.pendingId : null);
  if (!pending) return json({ error: "gone" }, 404);
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "bad_email" }, 400);
  if (body.adult !== true) return json({ error: "adult_required" }, 400);

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (
    (await overLimit(env, `rl:tstart:email:${await sha256Hex(email)}`, START_LIMITS.email)) ||
    (await overLimit(env, `rl:tstart:ip:${await sha256Hex(ip)}`, START_LIMITS.ip))
  ) {
    return json({ error: "too_many" }, 429);
  }

  const token = randomToken();
  await insertLoginToken(env.DB, await sha256Hex(token), email, loginTokenExpiry(now));
  const url = new URL(request.url);
  const link = `${url.origin}/auth/verify?token=${token}&table=${pending.id}`;
  if (!env.EMAIL_API_KEY && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    return json({ ok: true });
  }
  if (!(await sendMagicLink(env, { to: email, link }))) {
    return json({ error: "email_failed" }, 503);
  }
  return json({ ok: true });
}

/**
 * I'M IN: after the email link, one tap checks the room is still open and
 * not full with no block in the way, then joins the newcomer, sits them at
 * the table and records the pair meetings. Single use: the pending join is
 * consumed first, so a second use records nothing.
 */
export async function handleTableClaim(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const pending = await readPending(env, typeof body.pendingId === "string" ? body.pendingId : null);
  if (!pending) return json({ error: "gone" }, 409);

  // The first name is checked before the pending join is consumed, so a
  // refusal still lets them try a kinder name.
  let firstName = user.first_name;
  if (!firstName) {
    const clean = normalizeFirstName(body.firstName);
    if (!clean || clean.length > 20) return json({ error: "bad_name", message: "First name only, up to 20 characters." }, 400);
    const screened = screenText(clean, 20);
    if (!screened.ok) {
      const message = (SCREEN_MESSAGES as Record<string, string>)[screened.category as string] ?? "That one doesn't fit. Try again?";
      return json({ error: "screened", category: screened.category, message }, 422);
    }
    firstName = clean;
  }

  await env.SESSIONS.delete(`table-pending:${pending.id}`);
  const room = await getRoom(env.DB, pending.roomId);
  const live = room && room.status === "open" && Date.parse(room.ends_at) > now.getTime();
  if (!room || !live) return json({ error: "ended" }, 409);
  const memberIds = await currentMemberIds(env.DB, room.id);
  if (memberIds.length >= ROOM_CAPACITY) return json({ error: "full" }, 409);
  const blocked = await blockedIds(env.DB, user.id);
  if (memberIds.some((id) => blocked.has(id))) return json({ error: "ended" }, 409);

  if (!user.first_name) await setFirstName(env.DB, user.id, firstName as string);
  const membership = await getMembership(env.DB, room.id, user.id);
  if (membership && membership.removed === 1) return json({ error: "ended" }, 409);
  if (!membership) {
    await addMember(env.DB, { roomId: room.id, userId: user.id, role: "member", joinedAt: now.toISOString(), removeToken: crypto.randomUUID() });
  } else if (membership.left_at !== null) {
    await rejoined(env.DB, room.id, user.id, now.toISOString());
  }
  await markAtTable(env.DB, room.id, user.id, now.toISOString());
  await recordTablePairs(env.DB, room.id, user.id, now.toISOString().slice(0, 10), now.toISOString());
  return json({ roomId: room.id });
}
