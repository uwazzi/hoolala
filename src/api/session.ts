// WP2: session helpers every signed-in endpoint uses. The cookie holds a
// random token; D1 and KV hold only its SHA-256 hash.

import { deleteSession, findSession, getUser, insertSession } from "../db/auth";
import { readCookie, SESSION_COOKIE, SESSION_TTL_S, sessionExpiry } from "../rules/auth";
import type { Env, UserRow } from "../types";

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const kvKey = (hash: string) => `session:${hash}`;

/** Creates a session and returns the raw token for the cookie. */
export async function createSession(env: Env, userId: string, now: Date): Promise<string> {
  const token = randomToken();
  const id = await sha256Hex(token);
  const expiresAt = sessionExpiry(now);
  await insertSession(env.DB, { id, user_id: userId, expires_at: expiresAt });
  await env.SESSIONS.put(kvKey(id), JSON.stringify({ userId, expiresAt }), { expirationTtl: SESSION_TTL_S });
  return token;
}

async function sessionHash(request: Request): Promise<string | null> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  return token ? sha256Hex(token) : null;
}

/** The signed-in person, or null. KV first, D1 when KV hasn't caught up. */
export async function getSessionUser(request: Request, env: Env, now = new Date()): Promise<UserRow | null> {
  const id = await sessionHash(request);
  if (!id) return null;
  let session: { userId: string; expiresAt: string } | null = null;
  const cached = await env.SESSIONS.get(kvKey(id), { type: "text" });
  if (cached) {
    session = JSON.parse(cached);
  } else {
    const row = await findSession(env.DB, id);
    if (row) session = { userId: row.user_id, expiresAt: row.expires_at };
  }
  if (!session || Date.parse(session.expiresAt) <= now.getTime()) return null;
  return getUser(env.DB, session.userId);
}

export async function endSession(request: Request, env: Env): Promise<void> {
  const id = await sessionHash(request);
  if (!id) return;
  await deleteSession(env.DB, id);
  await env.SESSIONS.delete(kvKey(id));
}

export async function forgetSessions(env: Env, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => env.SESSIONS.delete(kvKey(id))));
}
