// Shared request helpers for the API handlers.

import { isOverLimit } from "../rules/auth";
import type { Env } from "../types";

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Counts one attempt against a KV window; true when already over the limit. */
export async function overLimit(env: Env, key: string, limit: { max: number; windowS: number }): Promise<boolean> {
  const count = Number((await env.SESSIONS.get(key, { type: "text" })) ?? "0");
  if (isOverLimit(count, limit.max)) return true;
  await env.SESSIONS.put(key, String(count + 1), { expirationTtl: limit.windowS });
  return false;
}
