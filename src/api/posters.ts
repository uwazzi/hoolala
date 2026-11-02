// Poster QR (one generic code for coffee machines): scans count per GPS
// zone so hotspot places can be tracked, and the fast onboarding (email
// link, 18+, first name) ends on /around/new to post an icebreaker. Scan
// counting never blocks or identifies anyone: snapped cells and day
// buckets only, no user ids, and the raw point is dropped right away.

import { sendMagicLink } from "../channels/email";
import { insertLoginToken, setFirstName } from "../db/auth";
import { recordPosterScan } from "../db/posters";
import { localityFor } from "../places/geocode";
import { loginTokenExpiry, normalizeEmail, normalizeFirstName, START_LIMITS } from "../rules/auth";
import { snapToCell } from "../rules/rooms";
import { screenText, SCREEN_MESSAGES } from "../rules/screening";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, randomToken, sha256Hex } from "./session";

const SCAN_LIMIT = { max: 30, windowS: 60 * 60 };

function pointOf(body: Record<string, unknown>): { lat: number; lng: number } | null {
  const { lat, lng } = body as { lat: unknown; lng: unknown };
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** POST /api/posters/scan: count the scan in its GPS zone, or unknown. */
export async function handlePosterScan(request: Request, env: Env, now = new Date()): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (await overLimit(env, `poster-scan-ip:${await sha256Hex(ip)}`, SCAN_LIMIT)) return json({ error: "too_many" }, 429);
  const day = now.toISOString().slice(0, 10);
  const point = pointOf(await readJson(request));
  if (!point) {
    await recordPosterScan(env.DB, day, "unknown", null);
    return json({ ok: true });
  }
  const cell = snapToCell(point.lat, point.lng);
  const locality = await localityFor(cell);
  await recordPosterScan(env.DB, day, `${cell.lat},${cell.lng}`, locality);
  return json({ ok: true });
}

/** CHECK YOUR EMAIL: the magic link carries only the poster marker. */
export async function handlePosterStart(request: Request, env: Env, now = new Date()): Promise<Response> {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "bad_email" }, 400);
  if (body.adult !== true) return json({ error: "adult_required" }, 400);

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (
    (await overLimit(env, `rl:pstart:email:${await sha256Hex(email)}`, START_LIMITS.email)) ||
    (await overLimit(env, `rl:pstart:ip:${await sha256Hex(ip)}`, START_LIMITS.ip))
  ) {
    return json({ error: "too_many" }, 429);
  }

  const token = randomToken();
  await insertLoginToken(env.DB, await sha256Hex(token), email, loginTokenExpiry(now));
  const url = new URL(request.url);
  const link = `${url.origin}/auth/verify?token=${token}&poster=1`;
  if (!env.EMAIL_API_KEY && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    return json({ ok: true });
  }
  if (!(await sendMagicLink(env, { to: email, link }))) {
    return json({ error: "email_failed" }, 503);
  }
  return json({ ok: true });
}

/**
 * I'M IN: after the email link, set the screened first name when missing.
 * No room, no pending join: onboarding ends on /around/new.
 */
export async function handlePosterClaim(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!user.first_name) {
    const body = await readJson(request);
    const clean = normalizeFirstName(body.firstName);
    if (!clean || clean.length > 20) return json({ error: "bad_name", message: "First name only, up to 20 characters." }, 400);
    const screened = screenText(clean, 20);
    if (!screened.ok) {
      const message = (SCREEN_MESSAGES as Record<string, string>)[screened.category as string] ?? "That one doesn't fit. Try again?";
      return json({ error: "screened", category: screened.category, message }, 422);
    }
    await setFirstName(env.DB, user.id, clean);
  }
  return json({ ok: true });
}
