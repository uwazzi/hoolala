import { handleAuthStart, handleAuthVerify, handleLogout } from "./api/auth";
import { handleHealth, json } from "./api/health";
import { handleMe } from "./api/me";
import type { Env, ExecutionContext, ScheduledEvent } from "./types";

// No frame-ancestors / X-Frame-Options: the front end runs inside Telegram's
// webview as a Mini App, so it must stay frameable. See docs/DECISIONS.md.
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' https://telegram.org",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self), camera=(), microphone=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { method } = request;
  // Cookie-authenticated writes only from our own pages.
  const origin = request.headers.get("origin");
  if (method !== "GET" && origin && origin !== url.origin) {
    return json({ error: "bad_origin" }, 403);
  }
  if (url.pathname === "/api/health" && method === "GET") {
    return handleHealth(request, env);
  }
  if (url.pathname === "/api/auth/start" && method === "POST") {
    return handleAuthStart(request, env);
  }
  if (url.pathname === "/api/auth/logout" && method === "POST") {
    return handleLogout(request, env);
  }
  if (url.pathname === "/api/me") {
    return handleMe(request, env);
  }
  return json({ error: "not_found" }, 404);
}

/** Cron: expire signals, purge old check-ins. metrics_daily rollup lands with WP5/WP6. */
export async function runScheduled(env: Env, now: Date = new Date()): Promise<void> {
  const nowIso = now.toISOString();
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "UPDATE signals SET state = 'expired' WHERE state = 'open' AND expires_at <= ?",
  )
    .bind(nowIso)
    .run();
  await env.DB.prepare("DELETE FROM checkins WHERE started_at < ?").bind(dayAgoIso).run();
  await env.DB.prepare("DELETE FROM workings WHERE created_at < ?")
    .bind(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .run();
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(await handleApi(request, env));
    }
    if (url.pathname === "/auth/verify" && request.method === "GET") {
      return withSecurityHeaders(await handleAuthVerify(request, env));
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(env));
  },
};
