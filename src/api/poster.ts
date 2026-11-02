// Poster screening (v6.5): own hooks and place names are checked before
// they print. Code rules first, then SCREEN IT; fixed copy only, never
// model text. Nothing is stored: no hook or place text reaches D1, KV or
// logs. No sign-in needed; the rate limit keys on session or hashed IP.
import { writeWorking } from "../llm/client";
import { screenWithModel, type ScreenVerdict } from "../llm/screen";
import { SCREEN_MESSAGES, screenPlaceText, screenText } from "../rules/screening";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, sha256Hex } from "./session";

const CHECK_LIMIT = { max: 10, windowS: 60 };
const OTHER_MESSAGE = "That one doesn't fit a public poster. Try again?";

function messageFor(category: string): string {
  return (SCREEN_MESSAGES as Record<string, string>)[category] ?? OTHER_MESSAGE;
}

async function screenSecondOpinion(env: Env, userId: string | null, text: string): Promise<ScreenVerdict | null> {
  const ai = await screenWithModel(env, text);
  if (ai && userId) {
    // Workings rows need a user id; anonymous checks keep the llm_calls row only.
    await writeWorking(env, {
      userId,
      fn: "screen",
      tools: [],
      verdict: ai.verdict === "approve" ? "approved" : `rejected: ${ai.category}`,
      effort: "minimal",
    });
  }
  return ai;
}

/** POST /api/poster/check: { hook?, place? } to { ok } or { ok: false, field, reason }. */
export async function handlePosterCheck(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = user ? `rl:pcheck:user:${user.id}` : `rl:pcheck:ip:${await sha256Hex(ip)}`;
  if (await overLimit(env, key, CHECK_LIMIT)) return json({ error: "too_many" }, 429);
  const body = await readJson(request);
  for (const field of ["hook", "place"] as const) {
    const raw = body[field];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const text = String(raw).trim();
    const code = field === "place" ? screenPlaceText(text) : screenText(text, 40);
    if (!code.ok) return json({ ok: false, field, reason: messageFor(code.category as string) });
    const ai = await screenSecondOpinion(env, user?.id ?? null, text);
    if (ai && ai.verdict !== "approve") return json({ ok: false, field, reason: messageFor(ai.category) });
  }
  return json({ ok: true });
}
