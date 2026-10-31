// WP39 keeping the juicy bits. POST /api/me/juicy/extract {q1f, q4, chips, q5}.
// A dry run, never a save: the two free-text answers are processed into kept
// bits and dropped. Crisis words get the fixed help message, never model
// text. The free text is never logged or stored.

import { extractJuicy, type JuicyInput } from "../llm/juicy";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import { MAX_ANSWER } from "../rules/surprise";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const EXTRACT_LIMIT = { max: 30, windowS: 60 * 60 };
const MAX_CHIPS = 7;
const MAX_CHIP = 24;

function chipsOf(raw: unknown): JuicyInput["chips"] | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (c.q1 !== null && (typeof c.q1 !== "string" || c.q1.length > MAX_CHIP)) return null;
  if (c.q3 !== null && (typeof c.q3 !== "string" || c.q3.length > MAX_CHIP)) return null;
  for (const key of ["q2", "q2f"] as const) {
    if (!Array.isArray(c[key]) || c[key].length > MAX_CHIPS || !c[key].every((x): x is string => typeof x === "string" && x.length <= MAX_CHIP)) return null;
  }
  return { q1: c.q1 as string | null, q2: c.q2 as string[], q2f: c.q2f as string[], q3: c.q3 as string | null };
}

export async function handleExtract(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const q1f = body.q1f === null || body.q1f === undefined ? null : body.q1f;
  const q4 = body.q4 === null || body.q4 === undefined ? null : body.q4;
  if ((q1f !== null && (typeof q1f !== "string" || q1f.length > MAX_ANSWER)) || (q4 !== null && (typeof q4 !== "string" || q4.length > MAX_ANSWER))) {
    return json({ error: "bad_extract" }, 400);
  }
  const chips = chipsOf(body.chips);
  if (!chips || !Array.isArray(body.q5) || body.q5.length > MAX_CHIPS || !body.q5.every((x): x is string => typeof x === "string" && x.length <= MAX_CHIP)) {
    return json({ error: "bad_extract" }, 400);
  }
  for (const text of [q1f, q4]) {
    if (text && screenText(text, MAX_ANSWER).category === "crisis") return json({ error: "crisis", why: SCREEN_MESSAGES.crisis }, 422);
  }
  if (await overLimit(env, `rl:juicy:${user.id}`, EXTRACT_LIMIT)) return json({ error: "too_many" }, 429);
  const { bits, fallback } = await extractJuicy(env, user.id, { q1f, q4, chips, q5: body.q5 });
  return json({ topics: bits.topics, people: bits.people, nearlySaid: bits.nearlySaid, fallback });
}
