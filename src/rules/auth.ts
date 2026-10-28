// WP2 sign-in rules. Pure: no I/O, no clock, no randomness.

import type { LoginTokenRow } from "../types";

export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_S = 30 * 24 * 60 * 60;
export const SESSION_COOKIE = "hoolala_session";

/** Sign-in requests: per email, then per IP. */
export const START_LIMITS = {
  email: { max: 3, windowS: 15 * 60 },
  ip: { max: 10, windowS: 60 * 60 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercased, trimmed email, or null when it can't be one. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export type LoginTokenState = "ok" | "missing" | "used" | "expired";

export function loginTokenState(row: LoginTokenRow | null, now: Date): LoginTokenState {
  if (!row) return "missing";
  if (row.used_at) return "used";
  if (Date.parse(row.expires_at) <= now.getTime()) return "expired";
  return "ok";
}

export function loginTokenExpiry(now: Date): string {
  return new Date(now.getTime() + LOGIN_TOKEN_TTL_MS).toISOString();
}

export function sessionExpiry(now: Date): string {
  return new Date(now.getTime() + SESSION_TTL_S * 1000).toISOString();
}

export function isOverLimit(count: number, max: number): boolean {
  return count >= max;
}

/**
 * First name as people use it: 1 to 30 letters, with spaces, hyphens,
 * apostrophes and dots. No digits, links or handles.
 */
export function normalizeFirstName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 30) return null;
  if (!/^\p{L}[\p{L}\p{M} .'’-]*$/u.test(name)) return null;
  return name;
}

/**
 * Session cookie. SameSite=None only inside the Telegram webview (WP21),
 * where the app runs in a third-party frame.
 */
export function sessionCookie(token: string, opts: { telegram?: boolean } = {}): string {
  const sameSite = opts.telegram ? "None" : "Lax";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${SESSION_TTL_S}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}
