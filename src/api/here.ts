// WP22 Signals here.
// GET /api/here · POST /api/here/signals · POST /api/here/signals/:id/cancel ·
// POST /api/here/signals/:id/curious · POST /api/here/responses/:id/accept ·
// POST /api/here/responses/:id/decline · POST /api/here/signals/:id/quick ·
// POST /api/block · POST /api/report
// Visibility through src/rules/here.ts only. The client never gets a user id,
// and never a name before both have accepted. No model involved yet: posts
// and lines pass the code screening rules (SCREEN IT joins in WP23).

import { compassTexts } from "../db/compass";
import { getActiveCheckin, getPlace } from "../db/places";
import { fitsYou } from "../rules/compass";
import { ensureSample, isSampleUser } from "../db/sample";
import { SAMPLE_PLACE } from "../rules/sample";
import {
  acceptResponse,
  blockedIds,
  cancelSignal,
  candidateSignals,
  countCuriousSince,
  countOpenSignals,
  declineResponse,
  findResponse,
  getResponse,
  getSignal,
  insertBlock,
  insertQuickReply,
  insertResponse,
  insertSignal,
  meetingPointsFor,
  ownResponses,
  ownSignals,
  quickRepliesFor,
  reportItem,
  responsesFor,
} from "../db/here";
import {
  canAccept,
  canBeCurious,
  canPost,
  canQuickReply,
  canSee,
  canSeeNames,
  DISCOVER_LIMIT,
  expiresAt,
  isQuickReply,
  LINE_MAX,
  normalizeCapacity,
  normalizeSpot,
  placeSpots,
  quickReplyText,
  TOPIC_MAX,
  whenAt,
} from "../rules/here";
import { writeWorking } from "../llm/client";
import { suggestFor } from "../llm/suggest";
import { sourceDomain } from "../rules/grounding";
import { type ScreenVerdict, screenWithModel, translationFor } from "../llm/screen";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { Env, UserRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const HOUR_MS = 60 * 60 * 1000;

interface Reply {
  from: string;
  text: string;
  at: string;
}

async function here(user: UserRow, env: Env, now: Date) {
  const checkin = await getActiveCheckin(env.DB, user.id, now.toISOString());
  return checkin;
}

const OTHER_MESSAGE = "That one doesn't fit the house rules here. Try again?";

function refused(category: string): Response {
  const message = (SCREEN_MESSAGES as Record<string, string>)[category] ?? OTHER_MESSAGE;
  return json({ error: "screened", category, message }, 422);
}

/**
 * Code rules first; they decide alone when the model is off or late. Then
 * SCREEN IT may add a refusal, never overrule one, never change the words.
 */
async function screened(
  env: Env,
  userId: string,
  text: unknown,
  max: number,
): Promise<{ ok: true; text: string; ai: ScreenVerdict | null; workingsId: string | null } | { ok: false; response: Response }> {
  const result = screenText(text, max);
  if (!result.ok) return { ok: false, response: refused(result.category!) };
  const clean = (text as string).trim();
  const ai = await screenWithModel(env, clean);
  const workingsId = ai
    ? await writeWorking(env, { userId, fn: "screen", tools: [], verdict: ai.verdict === "approve" ? "approved" : `rejected: ${ai.category}`, effort: "minimal" })
    : null;
  if (ai?.verdict === "reject") return { ok: false, response: refused(ai.category) };
  return { ok: true, text: clean, ai, workingsId };
}

export async function handleHere(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const nowIso = now.toISOString();
  const checkin = await here(user, env, now);
  if (!checkin) return json({ checkin: null });
  if (checkin.place_id === SAMPLE_PLACE.id) await ensureSample(env.DB, now);

  const place = await getPlace(env.DB, checkin.place_id);
  const blocked = await blockedIds(env.DB, user.id);

  // My signals, with curious requests (names only once accepted) and replies.
  const mine = await ownSignals(env.DB, user.id, nowIso);
  const joined = (await ownResponses(env.DB, user.id, new Date(now.getTime() - 2 * HOUR_MS).toISOString())).filter(
    (r) => !blocked.has(r.owner_id),
  );
  const responses = (await responsesFor(env.DB, mine.map((s) => s.id))).filter((r) => !blocked.has(r.responder_id));
  const replies = await quickRepliesFor(env.DB, [...mine.map((s) => s.id), ...joined.filter((j) => j.state === "accepted").map((j) => j.signal_id)]);
  const repliesFor = (signalId: string): Reply[] =>
    replies
      .filter((q) => q.signal_id === signalId && !blocked.has(q.user_id))
      .map((q) => ({
        from: q.user_id === user.id ? "You" : (q.first_name ?? "Someone"),
        text: quickReplyText(q.kind, mine.find((s) => s.id === signalId)?.spot ?? joined.find((j) => j.signal_id === signalId)?.spot ?? null),
        at: q.created_at,
      }));

  // Meeting points: on my own signals, and on ones where I was accepted. Never anyone else's.
  const points = await meetingPointsFor(env.DB, [...mine.map((s) => s.id), ...joined.filter((j) => j.state === "accepted").map((j) => j.signal_id)]);

  // Discovery: three at a time, through canSee, skipping ones I already answered.
  // FITS YOU (the viewer's own compass) only puts matching ones first, for them.
  const answered = new Set(joined.map((j) => j.signal_id));
  const mineTexts = await compassTexts(env.DB, user.id);
  const discover = (await candidateSignals(env.DB, checkin.place_id, nowIso))
    .filter((s) => !answered.has(s.id))
    .filter((s) =>
      canSee(s, { viewerId: user.id, viewerPlaceId: checkin.place_id, ownerHere: s.owner_here === 1, blocked: blocked.has(s.owner_id), now }),
    )
    .map((s) => ({ ...s, fits: mineTexts.length > 0 && fitsYou(s.topic, mineTexts) }))
    .sort((a, b) => Number(b.fits) - Number(a.fits))
    .slice(0, DISCOVER_LIMIT);

  return json({
    checkin: {
      place: { id: checkin.place_id, slug: checkin.place_slug, name: checkin.place_name, kind: checkin.place_kind },
      method: checkin.method,
      endsAt: checkin.ends_at,
    },
    spots: placeSpots(place?.spots_json ?? null),
    mine: mine.map((s) => ({
      id: s.id,
      topic: s.topic,
      translation: s.translation,
      whenAt: s.when_at,
      spot: s.spot,
      capacity: s.capacity,
      expiresAt: s.expires_at,
      state: s.state,
      requests: responses
        .filter((r) => r.signal_id === s.id && r.state !== "withdrawn")
        .map((r) => ({
          id: r.id,
          line: r.line,
          state: r.state,
          name: canSeeNames(user.id, s.owner_id, r) ? r.responder_name : null,
        })),
      replies: repliesFor(s.id),
      meetingPoint: points.get(s.id) ?? null,
    })),
    joined: joined.map((j) => ({
      responseId: j.id,
      signalId: j.signal_id,
      topic: j.topic,
      translation: j.translation,
      whenAt: j.when_at,
      spot: j.spot,
      expiresAt: j.expires_at,
      state: j.state,
      signalState: j.signal_state,
      ownerName: canSeeNames(user.id, j.owner_id, j) ? j.owner_name : null,
      sample: j.owner_sample === 1,
      replies: j.state === "accepted" ? repliesFor(j.signal_id) : [],
      meetingPoint: j.state === "accepted" ? points.get(j.signal_id) ?? null : null,
    })),
    discover: discover.map((s) => ({
      id: s.id,
      topic: s.topic,
      translation: s.translation,
      whenAt: s.when_at,
      spot: s.spot,
      capacity: s.capacity,
      expiresAt: s.expires_at,
      fitsYou: s.fits,
    })),
  });
}

export async function handlePostSignal(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const checkin = await here(user, env, now);
  if (!checkin) return json({ error: "not_checked_in" }, 403);
  const body = await readJson(request);

  const topic = await screened(env, user.id, body.topic, TOPIC_MAX);
  if (!topic.ok) return topic.response;
  const place = await getPlace(env.DB, checkin.place_id);
  const spot = normalizeSpot(body.spot, placeSpots(place?.spots_json ?? null));
  if (!spot) return json({ error: "bad_spot" }, 400);
  const capacity = normalizeCapacity(body.capacity);
  if (!capacity) return json({ error: "bad_capacity" }, 400);
  const when = whenAt(body.when, now);
  if (!when) return json({ error: "bad_when" }, 400);
  if (!canPost(await countOpenSignals(env.DB, user.id, now.toISOString()))) return json({ error: "too_many_open" }, 429);

  const id = crypto.randomUUID();
  const expires = expiresAt(now, when);
  // The signal never outlives the poster's check-in.
  const ends = Date.parse(checkin.ends_at) < Date.parse(expires) ? checkin.ends_at : expires;
  await insertSignal(env.DB, {
    id,
    ownerId: user.id,
    placeId: checkin.place_id,
    topic: topic.text,
    whenAt: when.toISOString(),
    spot,
    capacity,
    createdAt: now.toISOString(),
    expiresAt: ends,
    verdict: topic.ai ? "approved_by_model" : "approved_by_rules",
    category: topic.ai?.category ?? null,
    lang: topic.ai?.lang ?? null,
    translation: topic.ai ? translationFor(topic.ai, topic.text) : null,
  });
  return json({ signal: { id, expiresAt: ends }, workingsId: topic.workingsId });
}

const SUGGEST_LIMIT = { max: 10, windowS: 60 * 60 };

/** SUGGEST IT: three ideas for this place now. Suggestions only; never posted for anyone. */
export async function handleSuggest(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const checkin = await here(user, env, now);
  if (!checkin) return json({ error: "not_checked_in" }, 403);
  if (await overLimit(env, `rl:suggest:${user.id}`, SUGGEST_LIMIT)) return json({ error: "too_many" }, 429);
  const place = await getPlace(env.DB, checkin.place_id);
  if (!place) return json({ error: "not_found" }, 404);

  const s = await suggestFor(env, place, placeSpots(place.spots_json), now);
  const workingsId =
    s.source === "ai"
      ? await writeWorking(env, {
          userId: user.id,
          fn: "suggest",
          tools: s.searched ? ["web_search"] : [],
          citations: s.citations,
          grounded: s.grounded,
          total: s.total,
          effort: "low",
        })
      : null;
  return json({
    source: s.source,
    workingsId,
    ideas: s.ideas.map((i) => ({ topic: i.topic, why: i.why, citationUrl: i.citationUrl, sourceDomain: i.citationUrl ? sourceDomain(i.citationUrl) : null })),
  });
}

export async function handleCancelSignal(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!(await cancelSignal(env.DB, id, user.id))) return json({ error: "not_found" }, 404);
  return json({ ok: true });
}

export async function handleCurious(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const checkin = await here(user, env, now);
  const signal = await getSignal(env.DB, id);
  // Same answer whether the signal doesn't exist or the person can't see it.
  if (!checkin || !signal) return json({ error: "not_found" }, 404);
  const blocked = await blockedIds(env.DB, user.id);
  const ownerHere = (await candidateSignals(env.DB, checkin.place_id, now.toISOString())).some((s) => s.id === id && s.owner_here === 1);
  if (!canSee(signal, { viewerId: user.id, viewerPlaceId: checkin.place_id, ownerHere, blocked: blocked.has(signal.owner_id), now })) {
    return json({ error: "not_found" }, 404);
  }
  if (await findResponse(env.DB, id, user.id)) return json({ error: "already_curious" }, 409);
  if (!canBeCurious(await countCuriousSince(env.DB, user.id, new Date(now.getTime() - HOUR_MS).toISOString()))) {
    return json({ error: "too_many_curious" }, 429);
  }

  const body = await readJson(request);
  let line: string | null = null;
  if (typeof body.line === "string" && body.line.trim()) {
    const checked = await screened(env, user.id, body.line, LINE_MAX);
    if (!checked.ok) return checked.response;
    line = checked.text;
  }
  const responseId = crypto.randomUUID();
  await insertResponse(env.DB, { id: responseId, signalId: id, responderId: user.id, line, createdAt: now.toISOString() });
  // Sample Sophie always says yes and heads to the spot, so the demo works alone.
  if (await isSampleUser(env.DB, signal.owner_id)) {
    await acceptResponse(env.DB, responseId, id, now.toISOString());
    await insertQuickReply(env.DB, { id: crypto.randomUUID(), signalId: id, userId: signal.owner_id, kind: "at_spot", createdAt: now.toISOString() });
    return json({ response: { id: responseId, state: "accepted" } });
  }
  return json({ response: { id: responseId, state: "requested" } });
}

/** The owner decides. Only the owner, only on their own signal. */
async function ownerDecision(id: string, request: Request, env: Env, now: Date) {
  const user = await getSessionUser(request, env, now);
  if (!user) return { error: json({ error: "signed_out" }, 401) };
  const response = await getResponse(env.DB, id);
  const signal = response ? await getSignal(env.DB, response.signal_id) : null;
  if (!response || !signal || signal.owner_id !== user.id) return { error: json({ error: "not_found" }, 404) };
  return { user, response, signal };
}

export async function handleAccept(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const d = await ownerDecision(id, request, env, now);
  if ("error" in d) return d.error!;
  const accepted = (await responsesFor(env.DB, [d.signal.id])).filter((r) => r.state === "accepted").length;
  if (!canAccept(accepted, d.signal.capacity) || d.signal.state !== "open") return json({ error: "full" }, 409);
  if (!(await acceptResponse(env.DB, id, d.signal.id, now.toISOString()))) return json({ error: "full" }, 409);
  return json({ ok: true });
}

export async function handleDecline(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const d = await ownerDecision(id, request, env, now);
  if ("error" in d) return d.error!;
  if (!(await declineResponse(env.DB, id, now.toISOString()))) return json({ error: "not_found" }, 404);
  return json({ ok: true });
}

export async function handleQuickReply(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (!isQuickReply(body.kind)) return json({ error: "bad_kind" }, 400);
  const signal = await getSignal(env.DB, id);
  if (!signal) return json({ error: "not_found" }, 404);
  const acceptedIds = (await responsesFor(env.DB, [id])).filter((r) => r.state === "accepted").map((r) => r.responder_id);
  // Strangers get the same answer as a missing signal.
  if (!canQuickReply(user.id, signal.owner_id, acceptedIds) || (user.id === signal.owner_id && !acceptedIds.length)) {
    return json({ error: "not_found" }, 404);
  }
  await insertQuickReply(env.DB, { id: crypto.randomUUID(), signalId: id, userId: user.id, kind: body.kind, createdAt: now.toISOString() });
  return json({ ok: true });
}

/** Resolves who a signal or response belongs to, without ever showing the id. */
async function targetOf(env: Env, body: Record<string, unknown>, userId: string) {
  if (typeof body.responseId === "string") {
    const r = await getResponse(env.DB, body.responseId);
    const s = r ? await getSignal(env.DB, r.signal_id) : null;
    // A responder can be blocked or reported by the signal's owner.
    if (r && s && s.owner_id === userId) return { userId: r.responder_id, signalId: s.id, responseId: r.id };
    return null;
  }
  if (typeof body.signalId === "string") {
    const s = await getSignal(env.DB, body.signalId);
    if (s && s.owner_id !== userId) return { userId: s.owner_id, signalId: s.id, responseId: null };
  }
  return null;
}

export async function handleBlock(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const target = await targetOf(env, await readJson(request), user.id);
  if (!target) return json({ error: "not_found" }, 404);
  await insertBlock(env.DB, user.id, target.userId, now.toISOString());
  return json({ ok: true });
}

export async function handleReport(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const target = await targetOf(env, body, user.id);
  if (!target) return json({ error: "not_found" }, 404);
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
  await reportItem(env.DB, {
    id: crypto.randomUUID(),
    reporterId: user.id,
    targetUserId: target.userId,
    signalId: target.signalId,
    responseId: target.responseId,
    reason: reason || "unspecified",
    createdAt: now.toISOString(),
  });
  return json({ ok: true });
}
