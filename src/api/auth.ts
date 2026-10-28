// WP2: email magic link sign-in.
// POST /api/auth/start · GET /auth/verify · POST /api/auth/logout
// The start response is the same whether or not the email has an account.

import { sendMagicLink } from "../channels/email";
import { consumeLoginToken, createEmailUser, findUserByEmail, insertLoginToken } from "../db/auth";
import { clearSessionCookie, loginTokenExpiry, normalizeEmail, sessionCookie, START_LIMITS } from "../rules/auth";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { createSession, endSession, randomToken, sha256Hex } from "./session";

export async function handleAuthStart(request: Request, env: Env, now = new Date()): Promise<Response> {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "bad_email" }, 400);
  if (body.adult !== true) return json({ error: "adult_required" }, 400);

  // Keys hold hashes only: no email or IP in KV.
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (
    (await overLimit(env, `rl:start:email:${await sha256Hex(email)}`, START_LIMITS.email)) ||
    (await overLimit(env, `rl:start:ip:${await sha256Hex(ip)}`, START_LIMITS.ip))
  ) {
    return json({ error: "too_many" }, 429);
  }

  const token = randomToken();
  await insertLoginToken(env.DB, await sha256Hex(token), email, loginTokenExpiry(now));
  const url = new URL(request.url);
  const link = `${url.origin}/auth/verify?token=${token}`;

  if (!env.EMAIL_API_KEY && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    console.log(`[dev] sign-in link: ${link}`);
    return json({ ok: true });
  }
  if (!(await sendMagicLink(env, { to: email, link }))) {
    return json({ error: "email_failed" }, 503);
  }
  return json({ ok: true });
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function handleAuthVerify(request: Request, env: Env, now = new Date()): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return redirect("/signin?error=link");
  const email = await consumeLoginToken(env.DB, await sha256Hex(token), now.toISOString());
  if (!email) return redirect("/signin?error=link");

  const user =
    (await findUserByEmail(env.DB, email)) ??
    (await createEmailUser(env.DB, crypto.randomUUID(), email, now.toISOString()));
  const session = await createSession(env, user.id, now);
  return redirect(user.first_name ? "/" : "/signin?step=name", sessionCookie(session));
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  await endSession(request, env);
  const res = json({ ok: true });
  res.headers.set("set-cookie", clearSessionCookie());
  return res;
}
