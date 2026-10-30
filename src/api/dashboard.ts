// Owner dashboard: aggregate product counts for the owner only. The token
// travels as a Bearer header (or ?token=); without the configured
// OWNER_TOKEN the endpoint stays closed.

import { dashboardCounts } from "../db/dashboard";
import { tokensEqual } from "../rules/dashboard";
import type { Env } from "../types";
import { json } from "./health";

export async function handleDashboard(request: Request, env: Env): Promise<Response> {
  if (!env.OWNER_TOKEN) return json({ error: "forbidden" }, 403);
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const shown = bearer ?? new URL(request.url).searchParams.get("token") ?? "";
  if (!tokensEqual(shown, env.OWNER_TOKEN)) return json({ error: "forbidden" }, 403);
  const counts = await dashboardCounts(env.DB);
  const res = json({ ...counts, updatedAt: new Date().toISOString() });
  res.headers.set("cache-control", "no-store");
  return res;
}
