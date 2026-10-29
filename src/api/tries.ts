// WP28: tiny tries. GET /api/tries/today (today's library try at your step),
// POST /api/tries (tell what happened), POST /api/tries/step (NEXT TIME choice),
// GET /api/me/plant (your counts). Signed-in only; the step is code-assigned.
// No model: the library is the whole generator until TRY IT (WP29).

import { triesFor, tryById, type TryPlace } from "../content/tries";
import { recordTry, setUserStep, tryCounts, userStep } from "../db/tries";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const PLACES: TryPlace[] = ["anywhere", "cafe", "work"];
const OUTCOMES = ["went_well", "no_reply", "awkward", "didnt_happen"];
const RECORD_LIMIT = { max: 30, windowS: 24 * 60 * 60 };

function isPlace(value: unknown): value is TryPlace {
  return typeof value === "string" && (PLACES as string[]).includes(value);
}

// Rule 14 in one line: braver after well, same after no reply or awkward,
// gentler after missed, never outside the ladder. WP29 moves this into
// src/rules/tries.ts with the full suggestion rule.
function suggest(step: number, outcome: string): -1 | 0 | 1 {
  const move = outcome === "went_well" ? 1 : outcome === "didnt_happen" ? -1 : 0;
  return step + move < 1 || step + move > 5 ? 0 : move;
}

export async function handleTodayTry(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const url = new URL(request.url);
  const place = url.searchParams.get("place") ?? "anywhere";
  if (!isPlace(place)) return json({ error: "bad_place" }, 400);
  const skip = Number(url.searchParams.get("skip") ?? "0");
  if (!Number.isInteger(skip) || skip < 0) return json({ error: "bad_skip" }, 400);
  const step = await userStep(env.DB, user.id);
  const options = triesFor(step, place);
  const day = Math.floor(now.getTime() / 86_400_000);
  return json({ try: options[(day + skip) % options.length], step });
}

export async function handleRecordTry(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const found = typeof body.libraryId === "string" ? tryById(body.libraryId) : null;
  if (!found) return json({ error: "bad_library" }, 400);
  if (typeof body.outcome !== "string" || !OUTCOMES.includes(body.outcome)) return json({ error: "bad_outcome" }, 400);
  const placeKind = body.placeKind === undefined ? "anywhere" : body.placeKind;
  if (!isPlace(placeKind)) return json({ error: "bad_place" }, 400);
  if (await overLimit(env, `rl:tries:${user.id}`, RECORD_LIMIT)) return json({ error: "too_many" }, 429);
  const step = await userStep(env.DB, user.id);
  await recordTry(env.DB, {
    id: crypto.randomUUID(),
    userId: user.id,
    step,
    libraryId: found.id,
    placeKind,
    outcome: body.outcome as string,
    createdAt: now.toISOString(),
  });
  const counts = await tryCounts(env.DB, user.id);
  const leaf = body.outcome !== "didnt_happen";
  return json({ ok: true, step, leaves: counts.leaves, grew: leaf ? Math.min(counts.leaves, 9) - 1 : -1, suggestion: suggest(step, body.outcome as string) });
}

export async function handleStep(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (body.choice !== -1 && body.choice !== 0 && body.choice !== 1) return json({ error: "bad_choice" }, 400);
  const step = Math.min(5, Math.max(1, (await userStep(env.DB, user.id)) + (body.choice as number)));
  await setUserStep(env.DB, user.id, step);
  return json({ step });
}

export async function handlePlant(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const counts = await tryCounts(env.DB, user.id);
  return json({ tries: counts.tries, leaves: counts.leaves, step: await userStep(env.DB, user.id) });
}
