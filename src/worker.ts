import { handleAuthStart, handleAuthVerify, handleLogout } from "./api/auth";
import { handleCheckin, handleGetCheckin, handleLeave } from "./api/checkin";
import { handleChanges, handleCompass, handleConfirm, handleConfirmLine, handleDeleteCompass, handleDraft, handleFind, handlePropose, handleRemoveLine, handleUndo } from "./api/compass";
import { handleHealth, json } from "./api/health";
import { ensureSample } from "./db/sample";
import {
  handleAccept,
  handleBlock,
  handleCancelSignal,
  handleCurious,
  handleDecline,
  handleHere,
  handlePostSignal,
  handleQuickReply,
  handleReport,
  handleSuggest,
} from "./api/here";
import { handleIntroSeen, handleMe } from "./api/me";
import { handleLive, handleMeetAgree, handleMeetJoin, handleMeetStart, handleMeetState, handleStayInTouch } from "./api/meet";
import { handleAddPlace, handleNearby, handlePeek, handleSearch } from "./api/places";
import { handleAddFact, handleCard, handleConfirm as handleFactConfirm, handleDispute, handleFetch, handlePoints } from "./api/placecard";
import { handleMeetingPoint, handlePlan } from "./api/plan";
import { handleHear, handleNext, handleSurpriseDraft } from "./api/surprise";
import { handlePlant, handleRecordTry, handleStep, handleTodayTry, handleTry } from "./api/tries";
import { handleRate, handleScan } from "./api/around";
import {
  handleCreateCrew,
  handleCrew,
  handleInvite,
  handleJoin,
  handleJoinPreview,
  handleLeaveCrew,
  handleNice,
  handlePost,
  handleRemoveMember,
} from "./api/crew";
import { handleWorkings } from "./api/workings";
import type { Env, ExecutionContext, ScheduledEvent } from "./types";

// No frame-ancestors / X-Frame-Options: the front end runs inside Telegram's
// webview as a Mini App, so it must stay frameable. See docs/DECISIONS.md.
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' https://telegram.org",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self), camera=(), microphone=(self)",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { method } = request;
  // Cookie-authenticated writes only from our own pages.
  const origin = request.headers.get("origin");
  if (method !== "GET" && origin && origin !== url.origin) {
    return json({ error: "bad_origin" }, 403);
  }
  if (url.pathname === "/api/health" && method === "GET") {
    return handleHealth(request, env);
  }
  if (url.pathname === "/api/auth/start" && method === "POST") {
    return handleAuthStart(request, env);
  }
  if (url.pathname === "/api/auth/logout" && method === "POST") {
    return handleLogout(request, env);
  }
  if (url.pathname === "/api/me") {
    return handleMe(request, env);
  }
  if (url.pathname === "/api/me/intro-seen" && method === "POST") {
    return handleIntroSeen(request, env);
  }
  if (url.pathname === "/api/me/find" && method === "POST") {
    return handleFind(request, env);
  }
  if (url.pathname === "/api/me/compass/draft" && method === "POST") {
    return handleDraft(request, env);
  }
  if (url.pathname === "/api/me/surprise/hear" && method === "POST") {
    return handleHear(request, env);
  }
  if (url.pathname === "/api/me/surprise/next" && method === "POST") {
    return handleNext(request, env);
  }
  if (url.pathname === "/api/me/surprise/draft" && method === "POST") {
    return handleSurpriseDraft(request, env);
  }
  if (url.pathname === "/api/me/compass/confirm" && method === "POST") {
    return handleConfirm(request, env);
  }
  if (url.pathname === "/api/me/compass/propose" && method === "POST") {
    return handlePropose(request, env);
  }
  if (url.pathname === "/api/me/compass/confirm_line" && method === "POST") {
    return handleConfirmLine(request, env);
  }
  if (url.pathname === "/api/me/compass/undo" && method === "POST") {
    return handleUndo(request, env);
  }
  if (url.pathname === "/api/me/compass/changes" && method === "GET") {
    return handleChanges(request, env);
  }
  if (url.pathname === "/api/me/compass") {
    if (method === "GET") return handleCompass(request, env);
    if (method === "DELETE") return handleDeleteCompass(request, env);
  }
  const compassLine = /^\/api\/me\/compass\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (compassLine && method === "DELETE") {
    return handleRemoveLine(compassLine[1], request, env);
  }
  if (url.pathname === "/api/places/nearby" && method === "POST") {
    return handleNearby(request, env);
  }
  if (url.pathname === "/api/places/search" && method === "GET") {
    return handleSearch(request, env);
  }
  if (url.pathname === "/api/places" && method === "POST") {
    return handleAddPlace(request, env);
  }
  const placeCard = /^\/api\/places\/([a-z0-9-]{1,60})\/(card|fetch|facts)$/.exec(url.pathname);
  if (placeCard) {
    const [, id, action] = placeCard;
    if (action === "card" && method === "GET") return handleCard(id, request, env);
    if (action === "fetch" && method === "POST") return handleFetch(id, request, env);
    if (action === "facts" && method === "POST") return handleAddFact(id, request, env);
  }
  const factAction = /^\/api\/places\/facts\/([0-9a-f-]{36})\/(confirm|dispute)$/.exec(url.pathname);
  if (factAction && method === "POST") {
    const [, id, action] = factAction;
    return action === "confirm" ? handleFactConfirm(id, request, env) : handleDispute(id, request, env);
  }
  if (url.pathname === "/api/me/points" && method === "GET") {
    return handlePoints(request, env);
  }
  if (url.pathname === "/api/tries/today" && method === "GET") {
    return handleTodayTry(request, env);
  }
  const tryOne = /^\/api\/tries\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (tryOne && method === "GET") {
    return handleTry(tryOne[1], request, env);
  }
  if (url.pathname === "/api/tries" && method === "POST") {
    return handleRecordTry(request, env);
  }
  if (url.pathname === "/api/tries/step" && method === "POST") {
    return handleStep(request, env);
  }
  if (url.pathname === "/api/me/plant" && method === "GET") {
    return handlePlant(request, env);
  }
  if (url.pathname === "/api/crew" && method === "POST") {
    return handleCreateCrew(request, env);
  }
  if (url.pathname === "/api/crew" && method === "GET") {
    return handleCrew(request, env);
  }
  if (url.pathname === "/api/crew/join" && method === "POST") {
    return handleJoin(request, env);
  }
  const joinPreview = /^\/api\/crew\/join\/([A-Za-z0-9-]{1,64})$/.exec(url.pathname);
  if (joinPreview && method === "GET") {
    return handleJoinPreview(joinPreview[1], env);
  }
  if (url.pathname === "/api/crew/invite" && method === "POST") {
    return handleInvite(request, env);
  }
  if (url.pathname === "/api/crew/posts" && method === "POST") {
    return handlePost(request, env);
  }
  const nice = /^\/api\/crew\/posts\/([0-9a-f-]{36})\/nice$/.exec(url.pathname);
  if (nice && method === "POST") {
    return handleNice(nice[1], request, env);
  }
  if (url.pathname === "/api/crew/leave" && method === "POST") {
    return handleLeaveCrew(request, env);
  }
  if (url.pathname === "/api/crew/remove" && method === "POST") {
    return handleRemoveMember(request, env);
  }
  if (url.pathname === "/api/around/scan" && method === "POST") {
    return handleScan(request, env);
  }
  if (url.pathname === "/api/around/rate" && method === "POST") {
    return handleRate(request, env);
  }
  const peek = /^\/api\/places\/([a-z0-9-]{1,60})\/peek$/.exec(url.pathname);
  if (peek && method === "GET") {
    return handlePeek(peek[1], env);
  }
  if (url.pathname === "/api/checkin" && method === "POST") {
    return handleCheckin(request, env);
  }
  if (url.pathname === "/api/checkin" && method === "GET") {
    return handleGetCheckin(request, env);
  }
  if (url.pathname === "/api/checkin/leave" && method === "POST") {
    return handleLeave(request, env);
  }
  if (url.pathname === "/api/here" && method === "GET") {
    return handleHere(request, env);
  }
  if (url.pathname === "/api/here/suggest" && method === "POST") {
    return handleSuggest(request, env);
  }
  if (url.pathname === "/api/here/signals" && method === "POST") {
    return handlePostSignal(request, env);
  }
  const signalAction = /^\/api\/here\/signals\/([0-9a-f-]{36})\/(cancel|curious|quick)$/.exec(url.pathname);
  if (signalAction && method === "POST") {
    const [, id, action] = signalAction;
    if (action === "cancel") return handleCancelSignal(id, request, env);
    if (action === "curious") return handleCurious(id, request, env);
    return handleQuickReply(id, request, env);
  }
  const planAction = /^\/api\/here\/signals\/([0-9a-f-]{36})\/(plan|meeting-point)$/.exec(url.pathname);
  if (planAction && method === "POST") {
    const [, id, action] = planAction;
    return action === "plan" ? handlePlan(id, request, env) : handleMeetingPoint(id, request, env);
  }
  const responseAction = /^\/api\/here\/responses\/([0-9a-f-]{36})\/(accept|decline)$/.exec(url.pathname);
  if (responseAction && method === "POST") {
    const [, id, action] = responseAction;
    return action === "accept" ? handleAccept(id, request, env) : handleDecline(id, request, env);
  }
  if (url.pathname === "/api/meet/start" && method === "POST") {
    return handleMeetStart(request, env);
  }
  if (url.pathname === "/api/meet/join" && method === "POST") {
    return handleMeetJoin(request, env);
  }
  const meet = /^\/api\/meet\/([0-9a-f-]{36})(?:\/(agree|stay-in-touch))?$/.exec(url.pathname);
  if (meet) {
    const [, id, action] = meet;
    if (!action && method === "GET") return handleMeetState(id, request, env);
    if (action === "agree" && method === "POST") return handleMeetAgree(id, request, env);
    if (action === "stay-in-touch" && method === "POST") return handleStayInTouch(id, request, env);
  }
  const workings = /^\/api\/workings\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (workings && method === "GET") {
    return handleWorkings(workings[1], request, env);
  }
  if (url.pathname === "/api/live" && method === "GET") {
    return handleLive(env);
  }
  if (url.pathname === "/api/block" && method === "POST") {
    return handleBlock(request, env);
  }
  if (url.pathname === "/api/report" && method === "POST") {
    return handleReport(request, env);
  }
  return json({ error: "not_found" }, 404);
}

/** Cron: expire signals, purge old check-ins. metrics_daily rollup lands with WP5/WP6. */
export async function runScheduled(env: Env, now: Date = new Date()): Promise<void> {
  const nowIso = now.toISOString();
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "UPDATE signals SET state = 'expired' WHERE state = 'open' AND expires_at <= ?",
  )
    .bind(nowIso)
    .run();
  await env.DB.prepare("DELETE FROM checkins WHERE started_at < ?").bind(dayAgoIso).run();
  await env.DB.prepare("DELETE FROM workings WHERE created_at < ?")
    .bind(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .run();
  try {
    await ensureSample(env.DB, now);
  } catch {
    // The demo place is a nice-to-have; expiry above is not.
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(await handleApi(request, env));
    }
    if (url.pathname === "/auth/verify" && request.method === "GET") {
      return withSecurityHeaders(await handleAuthVerify(request, env));
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(env));
  },
};
