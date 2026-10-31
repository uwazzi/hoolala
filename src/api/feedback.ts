// Say hi: people send what they saw plus the log behind it; the owner
// reads it back with the owner token. The message passes the code rules.

import { insertFeedback, recentFeedback } from "../db/feedback";
import { tokensEqual } from "../rules/dashboard";
import { cleanLog, MAX_MESSAGE, MAX_SCREEN } from "../rules/feedback";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const POST_LIMIT = { max: 10, windowS: 60 * 60 };

function owner(request: Request, env: Env): boolean {
  if (!env.OWNER_TOKEN) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const shown = bearer ?? new URL(request.url).searchParams.get("token") ?? "";
  return tokensEqual(shown, env.OWNER_TOKEN);
}

export async function handleFeedback(request: Request, env: Env, now = new Date()): Promise<Response> {
  if (request.method === "GET") {
    if (!owner(request, env)) return json({ error: "forbidden" }, 403);
    const rows = await recentFeedback(env.DB);
    return json({
      feedback: rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        screen: r.screen,
        message: r.message,
        log: JSON.parse(r.log_json) as unknown[],
        createdAt: r.created_at,
      })),
    });
  }

  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (await overLimit(env, `rl:feedback:${user.id}`, POST_LIMIT)) return json({ error: "too_many" }, 429);
  const body = await readJson(request);
  const screen = typeof body.screen === "string" ? body.screen.trim().slice(0, MAX_SCREEN) : "";
  if (!screen) return json({ error: "bad_screen" }, 400);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > MAX_MESSAGE) return json({ error: "bad_message" }, 400);
  if (message) {
    const check = screenText(message, MAX_MESSAGE);
    if (!check.ok) {
      const text = (SCREEN_MESSAGES as Record<string, string>)[check.category!] ?? "That is not one for us.";
      return json({ error: "screened", message: text }, 422);
    }
  }
  await insertFeedback(env.DB, {
    id: crypto.randomUUID(),
    userId: user.id,
    firstName: user.first_name,
    screen,
    message,
    logJson: JSON.stringify(cleanLog(body.log)),
    nowIso: now.toISOString(),
  });
  return json({ ok: true });
}
