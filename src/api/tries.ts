// WP28 + WP29: tiny tries. GET /api/tries/today (TRY IT when the model is
// on, else today's library try at your step), POST /api/tries (tell what
// happened), POST /api/tries/step (NEXT TIME choice), GET /api/me/plant
// (your counts). Signed-in only; the step is code-assigned.

import { triesFor, tryById, type TryPlace } from "../content/tries";
import { compassTexts } from "../db/compass";
import { getGameTry } from "../db/tries";
import { pickedTodayTry } from "./game";
import { getTry, lastOutcomes, recordTry, setUserStep, tryCounts, userStep } from "../db/tries";
import { draftTry, timeOfDay, validateDraft } from "../llm/tryit";
import { llmEnabled } from "../llm/client";
import { suggestNext, validateTry, type Outcome, type Step } from "../rules/tries";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const PLACES: TryPlace[] = ["anywhere", "cafe", "work"];
const OUTCOMES: Outcome[] = ["went_well", "no_reply", "awkward", "didnt_happen"];
const RECORD_LIMIT = { max: 30, windowS: 24 * 60 * 60 };
const OTHER_MESSAGE = "That one doesn't fit the house rules here. Try again?";

function isPlace(value: unknown): value is TryPlace {
  return typeof value === "string" && (PLACES as string[]).includes(value);
}

function metaFor(minutes: number, wordsMax: number): string {
  const talking = wordsMax === 0 ? "NO TALKING NEEDED" : wordsMax <= 12 ? "A FEW WORDS" : "SHORT CHAT";
  return `${minutes} MIN · ${talking}`;
}

export async function handleTodayTry(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  // WP37: the picked game try is today's try when there is one.
  const picked = await pickedTodayTry(env.DB, user.id);
  if (picked) return json({ try: picked, step: picked.step });
  const url = new URL(request.url);
  const place = url.searchParams.get("place") ?? "anywhere";
  if (!isPlace(place)) return json({ error: "bad_place" }, 400);
  const skip = Number(url.searchParams.get("skip") ?? "0");
  if (!Number.isInteger(skip) || skip < 0) return json({ error: "bad_skip" }, 400);
  const step = (await userStep(env.DB, user.id)) as Step;

  if (llmEnabled(env)) {
    const draft = await draftTry(env, user.id, {
      step,
      place,
      timeOfDay: timeOfDay(now),
      last: ((await lastOutcomes(env.DB, user.id, 3)) as Outcome[]).filter((o) => OUTCOMES.includes(o)),
      interests: (await compassTexts(env.DB, user.id)).slice(0, 8),
    });
    if (draft) {
      return json({
        try: {
          id: null,
          step,
          place,
          title: draft.title,
          hint: draft.hint,
          meta: metaFor(draft.minutes, draft.words_max),
          source: "try_it",
          why: draft.why,
          minutes: draft.minutes,
          words_max: draft.words_max,
          asks_of_other: draft.asks_of_other,
        },
        step,
      });
    }
  }

  const options = triesFor(step, place);
  const day = Math.floor(now.getTime() / 86_400_000);
  const pick = options[(day + skip) % options.length];
  return json({ try: { ...pick, source: "library", why: null }, step });
}

export async function handleRecordTry(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (typeof body.outcome !== "string" || !OUTCOMES.includes(body.outcome as Outcome)) return json({ error: "bad_outcome" }, 400);
  const placeKind = body.placeKind === undefined ? "anywhere" : body.placeKind;
  if (!isPlace(placeKind)) return json({ error: "bad_place" }, 400);
  if (await overLimit(env, `rl:tries:${user.id}`, RECORD_LIMIT)) return json({ error: "too_many" }, 429);
  const outcome = body.outcome as Outcome;
  const step = (await userStep(env.DB, user.id)) as Step;

  // A try_it draft is re-checked on the way in: shape, step bounds, rules.
  // Only its author could have tampered with it, so no second model verdict.
  let stored: { source: "library" | "try_it" | "game"; libraryId: string | null; title: string | null; hint: string | null; why: string | null };
  if (body.source === "game") {
    const row = typeof body.gameId === "string" ? await getGameTry(env.DB, user.id, body.gameId) : null;
    if (!row) return json({ error: "not_found" }, 404);
    stored = { source: "game", libraryId: null, title: row.title, hint: "", why: null };
  } else if (body.source === "try_it") {
    const draft = validateDraft(body.draft);
    if (!draft) return json({ error: "bad_try" }, 400);
    const check = screenText(`${draft.title} ${draft.hint}`, 200);
    if (!check.ok) {
      return json({ error: "screened", category: check.category, message: (SCREEN_MESSAGES as Record<string, string>)[check.category!] ?? OTHER_MESSAGE }, 422);
    }
    if (validateTry(draft, { step, place: placeKind, timeOfDay: timeOfDay(now), last: [], interests: [] }) !== "ok") {
      return json({ error: "bad_try" }, 400);
    }
    stored = { source: "try_it", libraryId: null, title: draft.title, hint: draft.hint, why: draft.why };
  } else {
    const found = typeof body.libraryId === "string" ? tryById(body.libraryId) : null;
    if (!found) return json({ error: "bad_library" }, 400);
    stored = { source: "library", libraryId: found.id, title: null, hint: null, why: null };
  }

  const tryId = crypto.randomUUID();
  await recordTry(env.DB, {
    id: tryId,
    userId: user.id,
    step,
    source: stored.source,
    libraryId: stored.libraryId,
    placeKind,
    outcome,
    title: stored.title,
    hint: stored.hint,
    why: stored.why,
    createdAt: now.toISOString(),
  });
  const counts = await tryCounts(env.DB, user.id);
  const leaf = outcome !== "didnt_happen";
  return json({ ok: true, try_id: tryId, step, leaves: counts.leaves, grew: leaf ? Math.min(counts.leaves, 9) - 1 : -1, suggestion: suggestNext(step, outcome) });
}

/** One recorded try for its owner: title and outcome, for the COMPASS? fix-up. */
export async function handleTry(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const row = await getTry(env.DB, user.id, id);
  if (!row) return json({ error: "not_found" }, 404);
  const lib = row.library_id ? tryById(row.library_id) : null;
  return json({ try: { id: row.id, title: row.title ?? lib?.title ?? "A tiny try", outcome: row.outcome, created_at: row.created_at } });
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
