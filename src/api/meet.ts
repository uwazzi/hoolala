// WP5 MEET and STAY IN TOUCH; WP6 Live numbers.
// POST /api/meet/start {signalId} · POST /api/meet/join {code} ·
// GET /api/meet/:id · POST /api/meet/:id/agree · POST /api/meet/:id/stay-in-touch ·
// GET /api/live (public)
// No model, on purpose: two people confirm, not an AI.

import { getActiveCheckin } from "../db/places";
import { blockedIds, getSignal, responsesFor } from "../db/here";
import {
  agree,
  chooseStayInTouch,
  confirmMeet,
  firstName,
  getExchange,
  getExchangeByHash,
  insertExchange,
  liveCounts,
  setJoiner,
} from "../db/meet";
import {
  codeFromBytes,
  connectionRate,
  dayOf,
  joinProblem,
  meetExpiry,
  normalizeMeetCode,
  pair,
  signalParty,
} from "../rules/meet";
import type { Env, MeetExchangeRow, UserRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, sha256Hex } from "./session";

const JOIN_LIMIT = { max: 20, windowS: 10 * 60 };
/** The Live page counts real-life hellos since the hackathon started. */
export const LIVE_SINCE = "2026-10-27T00:00:00.000Z";

async function partyOf(env: Env, signalId: string | null) {
  const signal = signalId ? await getSignal(env.DB, signalId) : null;
  if (!signal) return null;
  const accepted = (await responsesFor(env.DB, [signal.id])).filter((r) => r.state === "accepted").map((r) => r.responder_id);
  return { signal, party: signalParty(signal.owner_id, accepted) };
}

function otherOf(ex: MeetExchangeRow, userId: string): string | null {
  return userId === ex.initiator_id ? ex.joiner_id : ex.initiator_id;
}

async function stateFor(env: Env, ex: MeetExchangeRow, user: UserRow) {
  const other = otherOf(ex, user.id);
  const youAgreed = Boolean(user.id === ex.initiator_id ? ex.initiator_agreed_at : ex.joiner_agreed_at);
  const theyAgreed = Boolean(user.id === ex.initiator_id ? ex.joiner_agreed_at : ex.initiator_agreed_at);
  return {
    id: ex.id,
    state: youAgreed && theyAgreed ? "confirmed" : ex.joiner_id ? "joined" : "waiting",
    otherName: other ? await firstName(env.DB, other) : null,
    youAgreed,
    theyAgreed,
    expiresAt: ex.expires_at,
  };
}

export async function handleMeetStart(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const found = typeof body.signalId === "string" ? await partyOf(env, body.signalId) : null;
  // Only someone in an accepted pair on this signal can start a meet.
  if (!found || !found.party.has(user.id) || found.party.size < 2) return json({ error: "not_found" }, 404);

  const code = codeFromBytes(crypto.getRandomValues(new Uint8Array(6)));
  const id = crypto.randomUUID();
  const expiresAt = meetExpiry(now);
  await insertExchange(env.DB, { id, initiatorId: user.id, tokenHash: await sha256Hex(code), expiresAt, signalId: found.signal.id });
  return json({ id, code, expiresAt, url: `${new URL(request.url).origin}/meet?code=${code}` });
}

export async function handleMeetJoin(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (await overLimit(env, `rl:meetjoin:${user.id}`, JOIN_LIMIT)) return json({ error: "too_many" }, 429);
  const code = normalizeMeetCode((await readJson(request)).code);
  const ex = code ? await getExchangeByHash(env.DB, await sha256Hex(code)) : null;
  const found = ex ? await partyOf(env, ex.signal_id) : null;
  if (!ex || !found) return json({ error: "not_found" }, 404);
  const blocked = (await blockedIds(env.DB, user.id)).has(ex.initiator_id);
  const problem = joinProblem(ex, user.id, found.party, found.signal.owner_id, blocked, now);
  // Blocked and not-party look the same as a wrong code.
  if (problem === "blocked" || problem === "not_party") return json({ error: "not_found" }, 404);
  if (problem) return json({ error: problem }, 409);
  if (!(await setJoiner(env.DB, ex.id, user.id))) return json({ error: "taken" }, 409);
  return json(await stateFor(env, { ...ex, joiner_id: user.id }, user));
}

async function participant(id: string, request: Request, env: Env, now: Date) {
  const user = await getSessionUser(request, env, now);
  if (!user) return { error: json({ error: "signed_out" }, 401) };
  const ex = await getExchange(env.DB, id);
  if (!ex || (ex.initiator_id !== user.id && ex.joiner_id !== user.id)) return { error: json({ error: "not_found" }, 404) };
  return { user, ex };
}

export async function handleMeetState(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const p = await participant(id, request, env, now);
  if ("error" in p) return p.error!;
  return json(await stateFor(env, p.ex, p.user));
}

export async function handleMeetAgree(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const p = await participant(id, request, env, now);
  if ("error" in p) return p.error!;
  const { user } = p;
  if (!p.ex.joiner_id) return json({ error: "waiting" }, 409);
  const confirmedBefore = Boolean(p.ex.initiator_agreed_at && p.ex.joiner_agreed_at);
  if (!confirmedBefore && Date.parse(p.ex.expires_at) <= now.getTime()) return json({ error: "expired" }, 409);
  if ((await blockedIds(env.DB, user.id)).has(otherOf(p.ex, user.id)!)) return json({ error: "not_found" }, 404);

  await agree(env.DB, p.ex, user.id, now.toISOString());
  const ex = (await getExchange(env.DB, id))!;
  if (ex.initiator_agreed_at && ex.joiner_agreed_at) {
    const [a, b] = pair(ex.initiator_id, ex.joiner_id!);
    const checkin = await getActiveCheckin(env.DB, ex.initiator_id, now.toISOString());
    const signal = await getSignal(env.DB, ex.signal_id!);
    await confirmMeet(env.DB, {
      interactionId: crypto.randomUUID(),
      userA: a,
      userB: b,
      placeId: signal?.place_id ?? checkin?.place_id ?? null,
      signalId: ex.signal_id!,
      day: dayOf(now),
      nowIso: now.toISOString(),
    });
  }
  return json(await stateFor(env, ex, user));
}

export async function handleStayInTouch(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const p = await participant(id, request, env, now);
  if ("error" in p) return p.error!;
  const { ex, user } = p;
  if (!ex.initiator_agreed_at || !ex.joiner_agreed_at || !ex.joiner_id) return json({ error: "not_met" }, 409);
  const other = otherOf(ex, user.id)!;
  if ((await blockedIds(env.DB, user.id)).has(other)) return json({ ok: true });
  const [a, b] = pair(user.id, other);
  await chooseStayInTouch(env.DB, { userId: user.id, otherId: other, signalId: ex.signal_id!, userA: a, userB: b, nowIso: now.toISOString() });
  // Same answer whether or not they chose it too: a one-sided choice is never revealed.
  return json({ ok: true });
}

export async function handleLive(env: Env, now = new Date()): Promise<Response> {
  const c = await liveCounts(env.DB, LIVE_SINCE, new Date(now.getTime() - 7 * 86_400_000).toISOString());
  const res = json({
    since: LIVE_SINCE,
    hellos: c.hellos,
    connection: connectionRate(c.acceptedSignals, c.metSignals),
    checkins: { ok: c.checkinOk, of: c.checkinAttempts, percent: c.checkinAttempts ? Math.round((c.checkinOk / c.checkinAttempts) * 100) : null },
    factsConfirmedThisWeek: c.factsConfirmedWeek,
    places: c.places,
    updatedAt: now.toISOString(),
  });
  res.headers.set("cache-control", "public, max-age=30");
  return res;
}
