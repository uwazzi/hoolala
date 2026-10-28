// WP25 the place card and place points.
// GET /api/places/:id/card · POST /api/places/:id/fetch (PLACE IT) ·
// POST /api/places/:id/facts {field, value, replaces?} ·
// POST /api/places/facts/:id/confirm · POST /api/places/facts/:id/dispute · GET /api/me/points
// Everything here needs a check-in at that place now. Points are private:
// only ever returned to the person themselves.

import {
  addContribution,
  confirmedThisMonth,
  confirmFact,
  countNow,
  disputeFact,
  factsForPlace,
  getFact,
  insertPeopleFact,
  newestWebFactAt,
  pointsSummary,
  replaceWebFacts,
  settlePoints,
} from "../db/facts";
import { getActiveCheckin, getPlace } from "../db/places";
import { llmEnabled, writeWorking } from "../llm/client";
import { placeIt } from "../llm/place";
import { screenWithModel } from "../llm/screen";
import { sourceDomain } from "../rules/grounding";
import { confirmProblem, FACT_FIELDS, isFactField, monthOf, normalizeFactValue, POINTS, webFactsStale } from "../rules/places";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { Env, PlaceFactRow, UserRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const FACT_LIMIT = { max: 20, windowS: 60 * 60 };

async function here(env: Env, request: Request, now: Date, placeId: string): Promise<{ user: UserRow } | { error: Response }> {
  const user = await getSessionUser(request, env, now);
  if (!user) return { error: json({ error: "signed_out" }, 401) };
  const checkin = await getActiveCheckin(env.DB, user.id, now.toISOString());
  if (!checkin || checkin.place_id !== placeId) return { error: json({ error: "not_here" }, 403) };
  return { user };
}

function factView(f: PlaceFactRow, userId: string) {
  return {
    id: f.id,
    field: f.field,
    label: FACT_FIELDS.find((x) => x.id === f.field)?.label ?? f.field,
    value: f.value,
    source: f.source,
    sourceUrl: f.source_url,
    sourceDomain: f.source_url ? sourceDomain(f.source_url) : null,
    state: f.state,
    confirmations: f.confirmations,
    mine: f.added_by === userId,
  };
}

async function card(env: Env, placeId: string, user: UserRow, now: Date) {
  const place = await getPlace(env.DB, placeId);
  await settlePoints(env.DB, user.id, now);
  const facts = await factsForPlace(env.DB, placeId, now);
  return {
    place: place ? { id: place.id, name: place.name, kind: place.kind, city: place.city } : null,
    facts: facts.map((f) => factView(f, user.id)),
    canFetch: llmEnabled(env) && !place?.is_sample && webFactsStale(await newestWebFactAt(env.DB, placeId), now),
    points: await pointsSummary(env.DB, user.id),
  };
}

export async function handleCard(placeId: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const h = await here(env, request, now, placeId);
  if ("error" in h) return h.error;
  return json(await card(env, placeId, h.user, now));
}

/** PLACE IT: once per place per 30 days (or an hour after a failure), by whoever opens the card first. */
export async function handleFetch(placeId: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const h = await here(env, request, now, placeId);
  if ("error" in h) return h.error;
  const lock = `placeit:${placeId}`;
  const place = await getPlace(env.DB, placeId);
  if (!place || place.is_sample || !llmEnabled(env) || (await env.SESSIONS.get(lock, { type: "text" }))) {
    return json({ ...(await card(env, placeId, h.user, now)), workingsId: null });
  }
  await env.SESSIONS.put(lock, "running", { expirationTtl: 60 * 60 });
  const found = await placeIt(env, place);
  let workingsId: string | null = null;
  if (found) {
    await replaceWebFacts(env.DB, placeId, found.facts, now.toISOString());
    await env.SESSIONS.put(lock, "done", { expirationTtl: 30 * 24 * 60 * 60 });
    workingsId = await writeWorking(env, {
      userId: h.user.id,
      fn: "place",
      tools: found.searches ? Array(found.searches).fill("web_search") : [],
      citations: found.citations,
      grounded: found.facts.length,
      total: found.total,
      effort: "low",
    });
  }
  return json({ ...(await card(env, placeId, h.user, now)), workingsId });
}

/** ADD or FIX: screened like any post; points wait for someone else's confirm or a quiet day. */
export async function handleAddFact(placeId: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const h = await here(env, request, now, placeId);
  if ("error" in h) return h.error;
  if (await overLimit(env, `rl:fact:${h.user.id}`, FACT_LIMIT)) return json({ error: "too_many" }, 429);
  const body = await readJson(request);
  if (!isFactField(body.field)) return json({ error: "bad_field" }, 400);
  const value = normalizeFactValue(body.value);
  if (!value) return json({ error: "bad_value" }, 400);
  const rules = screenText(value, 80);
  if (!rules.ok) return json({ error: "screened", category: rules.category, message: SCREEN_MESSAGES[rules.category!] }, 422);
  const ai = await screenWithModel(env, value);
  if (ai?.verdict === "reject") {
    return json({ error: "screened", category: ai.category, message: (SCREEN_MESSAGES as Record<string, string>)[ai.category] ?? "That one doesn't fit the house rules here. Try again?" }, 422);
  }

  let action: "add_fact" | "fix_fact" = "add_fact";
  if (typeof body.replaces === "string") {
    const old = await getFact(env.DB, body.replaces);
    if (!old || old.place_id !== placeId) return json({ error: "not_found" }, 404);
    await disputeFact(env.DB, old.id, now.toISOString());
    action = "fix_fact";
  }
  const id = crypto.randomUUID();
  await insertPeopleFact(env.DB, { id, placeId, field: body.field, value, userId: h.user.id, nowIso: now.toISOString() });
  await addContribution(env.DB, { userId: h.user.id, placeId, factId: id, action, state: "pending", points: POINTS[action], month: monthOf(now), nowIso: now.toISOString() });
  return json(await card(env, placeId, h.user, now));
}

async function factHere(factId: string, request: Request, env: Env, now: Date) {
  const fact = await getFact(env.DB, factId);
  if (!fact) return { error: json({ error: "not_found" }, 404) };
  const h = await here(env, request, now, fact.place_id);
  if ("error" in h) return { error: h.error };
  return { fact, user: h.user };
}

/** THAT'S RIGHT: someone else's detail, once a month; 2 points that count now (within the daily cap). */
export async function handleConfirm(factId: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const f = await factHere(factId, request, env, now);
  if ("error" in f) return f.error!;
  const month = monthOf(now);
  const problem = confirmProblem(f.fact, f.user.id, true, await confirmedThisMonth(env.DB, f.user.id, factId, month));
  if (problem) return json({ error: problem }, problem === "gone" ? 404 : 409);
  await confirmFact(env.DB, factId, now.toISOString());
  const points = await countNow(env.DB, f.user.id, POINTS.confirm_fact, now);
  await addContribution(env.DB, { userId: f.user.id, placeId: f.fact.place_id, factId, action: "confirm_fact", state: "counted", points, month, nowIso: now.toISOString() });
  return json(await card(env, f.fact.place_id, f.user, now));
}

/** NOT ANY MORE: a confirmed detail goes back to found; a found one is set aside. No points. */
export async function handleDispute(factId: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const f = await factHere(factId, request, env, now);
  if ("error" in f) return f.error!;
  await disputeFact(env.DB, factId, now.toISOString());
  return json(await card(env, f.fact.place_id, f.user, now));
}

export async function handlePoints(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  await settlePoints(env.DB, user.id, now);
  return json(await pointsSummary(env.DB, user.id));
}
