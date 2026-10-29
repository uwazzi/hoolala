// WP14 CHECK IT: GET /api/workings/:id. How one AI answer was made, shown
// only to the person it was for: capability, tools in order, sources, the
// verdict, how much was grounded, the reasoning level. Never personal text;
// workings rows never hold any. Purged after 7 days by the cron.

import { sourceDomain } from "../rules/grounding";
import type { Env, WorkingRow } from "../types";
import { json } from "./health";
import { getSessionUser } from "./session";

const CAPABILITY: Record<WorkingRow["function"], string> = {
  screen: "Screening (structured output)",
  suggest: "Web search (grounded)",
  findme: "Web search (grounded)",
  place: "Tools",
  plan: "Tools",
  snap: "Vision",
  try_it: "Short drafting",
};

const NAME: Record<WorkingRow["function"], string> = {
  screen: "SCREEN IT",
  suggest: "SUGGEST IT",
  findme: "FIND ME",
  place: "PLACE IT",
  plan: "PLAN IT",
  snap: "SNAP IT",
  try_it: "TRY IT",
};

export async function handleWorkings(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const w = await env.DB.prepare("SELECT * FROM workings WHERE id = ?").bind(id).first<WorkingRow>();
  // Someone else's workings look exactly like missing ones.
  if (!w || w.user_id !== user.id) return json({ error: "not_found" }, 404);
  const parse = (s: string): string[] => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  const citations = parse(w.citations_json);
  return json({
    id: w.id,
    function: NAME[w.function],
    capability: CAPABILITY[w.function],
    model: env.MUSE_SPARK_MODEL ?? null,
    tools: parse(w.tools_json),
    citations: citations.map((url) => ({ url, source: sourceDomain(url) })),
    verdict: w.verdict,
    grounded: w.total_count !== null ? { count: w.grounded_count ?? 0, of: w.total_count } : null,
    reasoningEffort: w.reasoning_effort,
    createdAt: w.created_at,
  });
}
