// WP23 PLAN IT. POST /api/here/signals/:id/plan · POST /api/here/signals/:id/meeting-point
// Only the owner and accepted responders of a signal may plan or set its
// meeting point. The agent drafts; a person confirms with a tap, either the
// exact draft (with its one-time confirmation token) or their own choice.

import { getPlace } from "../db/places";
import { getSignal, meetingPointsFor, repliesByRole, responsesFor, saveMeetingPoint } from "../db/here";
import { planMeeting } from "../llm/agent";
import { writeWorking } from "../llm/client";
import { placeSpots } from "../rules/here";
import { checkDraft, PLAN_TOKEN_TTL_S } from "../rules/plan";
import type { Env, UserRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, randomToken } from "./session";

const PLAN_LIMIT = { max: 10, windowS: 60 * 60 };

/** The signal, its place's spots and how many accepted, if this person is part of an accepted pair on it. */
async function pairContext(env: Env, user: UserRow, signalId: string, now: Date) {
  const signal = await getSignal(env.DB, signalId);
  if (!signal || (signal.state !== "open" && signal.state !== "full") || Date.parse(signal.expires_at) <= now.getTime()) return null;
  const accepted = (await responsesFor(env.DB, [signal.id])).filter((r) => r.state === "accepted");
  const inPair = accepted.length > 0 && (signal.owner_id === user.id || accepted.some((r) => r.responder_id === user.id));
  if (!inPair) return null;
  const place = signal.place_id ? await getPlace(env.DB, signal.place_id) : null;
  return { signal, accepted: accepted.length, spots: placeSpots(place?.spots_json ?? null) };
}

export async function handlePlan(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const pair = await pairContext(env, user, id, now);
  if (!pair) return json({ error: "not_found" }, 404);
  if (await overLimit(env, `rl:plan:${user.id}`, PLAN_LIMIT)) return json({ error: "too_many" }, 429);

  const draft = await planMeeting(env, {
    signal: pair.signal,
    accepted: pair.accepted,
    spots: pair.spots,
    hours: null, // PLACE IT (WP25) will fill opening hours.
    replies: await repliesByRole(env.DB, pair.signal.id, pair.signal.owner_id),
    now,
  });
  if (!draft) return json({ error: "no_draft" }, 409);

  const confirmationToken = randomToken(18);
  await env.SESSIONS.put(
    `plan:${confirmationToken}`,
    JSON.stringify({ signalId: pair.signal.id, userId: user.id, spot: draft.spot, time: draft.time }),
    { expirationTtl: PLAN_TOKEN_TTL_S },
  );
  const workingsId =
    draft.source === "ai"
      ? await writeWorking(env, { userId: user.id, fn: "plan", tools: draft.toolOrder, verdict: "draft", effort: "medium" })
      : null;
  return json({ draft: { spot: draft.spot, time: draft.time, why: draft.why }, source: draft.source, confirmationToken, workingsId });
}

export async function handleMeetingPoint(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const pair = await pairContext(env, user, id, now);
  if (!pair) return json({ error: "not_found" }, 404);
  const body = await readJson(request);
  const checked = checkDraft(body.spot, body.time, { spots: pair.spots, now, expiresAt: pair.signal.expires_at });
  if (!checked) return json({ error: "bad_meeting_point" }, 400);

  let proposedBy: "person" | "agent" = "person";
  if (typeof body.confirmationToken === "string") {
    const key = `plan:${body.confirmationToken}`;
    const raw = await env.SESSIONS.get(key, { type: "text" });
    const draft = raw ? (JSON.parse(raw) as { signalId: string; userId: string; spot: string; time: string }) : null;
    // The token confirms exactly the draft it was issued with, for this person and signal, once.
    if (!draft || draft.signalId !== id || draft.userId !== user.id || draft.spot !== checked.spot || draft.time !== checked.time) {
      return json({ error: "bad_token" }, 409);
    }
    await env.SESSIONS.delete(key);
    proposedBy = "agent";
  }
  await saveMeetingPoint(env.DB, { signalId: id, spot: checked.spot, time: checked.time, proposedBy, nowIso: now.toISOString() });
  const saved = (await meetingPointsFor(env.DB, [id])).get(id)!;
  return json({ meetingPoint: saved });
}
