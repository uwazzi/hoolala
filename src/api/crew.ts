// WP30: friends. POST /api/crew (start one), GET /api/crew (mine),
// POST /api/crew/join (by link), GET /api/crew/join/:token (dare preview),
// POST /api/crew/invite (a fresh link; the old one retires),
// POST /api/crew/posts, POST /api/crew/posts/:id/nice (toggle),
// POST /api/crew/leave, POST /api/crew/remove. Members only: outsiders get
// the same missing answer everywhere. Posts are screened like topics.

import { triesFor, tryById, TRY_LIBRARY } from "../content/tries";
import {
  addMember,
  addPost,
  closeIfEmpty,
  createCrew,
  crewPosts,
  getCrew,
  getInvite,
  getPost,
  members,
  myCrewId,
  niceFor,
  removeMember,
  setInvite,
  toggleNice,
} from "../db/crew";
import { userStep } from "../db/tries";
import { writeWorking } from "../llm/client";
import { screenWithModel, type ScreenVerdict } from "../llm/screen";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, sha256Hex } from "./session";

const OUTCOMES = ["went_well", "no_reply", "awkward", "didnt_happen"];
const POST_LIMIT = { max: 10, windowS: 3600 };
const JOIN_LIMIT = { max: 10, windowS: 3600 };
const NICE_LIMIT = { max: 60, windowS: 3600 };
const INVITE_LIMIT = { max: 10, windowS: 3600 };
const POSTS_SHOWN = 20;
const WEEK_MS = 7 * 86_400_000;

const OTHER_MESSAGE = "That one doesn't fit the house rules here. Try again?";

function refused(category: string): Response {
  const message = (SCREEN_MESSAGES as Record<string, string>)[category] ?? OTHER_MESSAGE;
  return json({ error: "screened", category, message }, 422);
}

/** Code rules first, then SCREEN IT may add a refusal; same as topics. */
async function screened(
  env: Env,
  userId: string,
  text: unknown,
  max: number,
): Promise<{ ok: true; text: string; ai: ScreenVerdict | null } | { ok: false; response: Response }> {
  const result = screenText(text, max);
  if (!result.ok) return { ok: false, response: refused(result.category!) };
  const clean = (text as string).trim();
  const ai = await screenWithModel(env, clean);
  if (ai) {
    await writeWorking(env, { userId, fn: "screen", tools: [], verdict: ai.verdict === "approve" ? "approved" : `rejected: ${ai.category}`, effort: "minimal" });
  }
  if (ai?.verdict === "reject") return { ok: false, response: refused(ai.category) };
  return { ok: true, text: clean, ai };
}

function sharedTry(step: number, now: Date) {
  const options = triesFor(step, "anywhere");
  return options[Math.floor(now.getTime() / WEEK_MS) % options.length];
}

async function mintInvite(env: Env, crewId: string, userId: string, now: Date) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + WEEK_MS).toISOString();
  await setInvite(env.DB, { tokenHash: await sha256Hex(token), crewId, createdBy: userId, createdAt: now.toISOString(), expiresAt });
  return { token, path: `/friends/join?token=${token}`, expiresAt };
}

async function crewView(env: Env, crewId: string, userId: string) {
  const crew = (await getCrew(env.DB, crewId))!;
  const shared = tryById(crew.shared_library_id) ?? TRY_LIBRARY[0];
  const ms = await members(env.DB, crewId);
  const posts = await crewPosts(env.DB, crewId, POSTS_SHOWN);
  const nice = await niceFor(env.DB, posts.map((p) => p.id));
  return {
    crew: { id: crew.id, name: crew.name, sharedTry: { id: shared.id, step: shared.step, title: shared.title, hint: shared.hint } },
    members: ms.map((m) => ({ id: m.user_id, name: m.name, you: m.user_id === userId })),
    posts: posts.map((p) => {
      const cheers = nice.filter((n) => n.post_id === p.id);
      return {
        id: p.id,
        name: p.name,
        you: p.user_id === userId,
        at: p.created_at,
        outcome: p.outcome,
        text: p.text,
        nice: cheers.filter((c) => c.user_id !== userId).map((c) => c.name),
        nicedByMe: cheers.some((c) => c.user_id === userId),
      };
    }),
  };
}

export async function handleCreateCrew(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (await myCrewId(env.DB, user.id)) return json({ error: "already_in_crew" }, 409);
  const body = await readJson(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 24) return json({ error: "bad_name" }, 400);
  const check = await screened(env, user.id, name, 24);
  if (!check.ok) return check.response;
  const id = crypto.randomUUID();
  await createCrew(env.DB, { id, name: check.text, sharedLibraryId: sharedTry(await userStep(env.DB, user.id), now).id, createdBy: user.id, createdAt: now.toISOString() });
  await addMember(env.DB, id, user.id, now.toISOString());
  const invite = await mintInvite(env, id, user.id, now);
  const view = await crewView(env, id, user.id);
  return json({ crew: view.crew, invite });
}

export async function handleCrew(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const crewId = await myCrewId(env.DB, user.id);
  if (!crewId || !(await getCrew(env.DB, crewId))) return json({ error: "not_found" }, 404);
  return json(await crewView(env, crewId, user.id));
}

export async function handleJoin(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (await overLimit(env, `rl:crewjoin:${user.id}`, JOIN_LIMIT)) return json({ error: "too_many" }, 429);
  const body = await readJson(request);
  if (typeof body.token !== "string" || !body.token) return json({ error: "not_found" }, 404);
  const invite = await getInvite(env.DB, await sha256Hex(body.token));
  if (!invite || invite.expires_at <= now.toISOString()) return json({ error: "not_found" }, 404);
  if (await myCrewId(env.DB, user.id)) return json({ error: "already_in_crew" }, 409);
  await addMember(env.DB, invite.crew_id, user.id, now.toISOString());
  const crew = (await getCrew(env.DB, invite.crew_id))!;
  return json({ crew: { id: crew.id, name: crew.name } });
}

/** The dare preview for link holders; the token is the only key. No sign-in. */
export async function handleJoinPreview(token: string, env: Env, now = new Date()): Promise<Response> {
  const invite = await getInvite(env.DB, await sha256Hex(token));
  if (!invite || invite.expires_at <= now.toISOString()) return json({ error: "not_found" }, 404);
  const crew = await getCrew(env.DB, invite.crew_id);
  if (!crew) return json({ error: "not_found" }, 404);
  const shared = tryById(crew.shared_library_id) ?? TRY_LIBRARY[0];
  const inviter = (await members(env.DB, crew.id)).find((m) => m.user_id === invite.created_by);
  return json({ crewName: crew.name, sharedTry: { title: shared.title, hint: shared.hint }, inviter: inviter?.name ?? "Someone" });
}

export async function handleInvite(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const crewId = await myCrewId(env.DB, user.id);
  if (!crewId) return json({ error: "not_found" }, 404);
  if (await overLimit(env, `rl:crewinvite:${user.id}`, INVITE_LIMIT)) return json({ error: "too_many" }, 429);
  return json({ invite: await mintInvite(env, crewId, user.id, now) });
}

export async function handlePost(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const crewId = await myCrewId(env.DB, user.id);
  if (!crewId) return json({ error: "not_found" }, 404);
  if (await overLimit(env, `rl:crewpost:${user.id}`, POST_LIMIT)) return json({ error: "too_many" }, 429);
  const body = await readJson(request);
  if (typeof body.outcome !== "string" || !OUTCOMES.includes(body.outcome)) return json({ error: "bad_outcome" }, 400);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 140) return json({ error: "bad_text" }, 400);
  const check = await screened(env, user.id, text, 140);
  if (!check.ok) return check.response;
  const id = crypto.randomUUID();
  await addPost(env.DB, {
    id,
    crewId,
    userId: user.id,
    outcome: body.outcome as string,
    text: check.text,
    verdict: check.ai ? (check.ai.verdict === "approve" ? "approved" : `rejected: ${check.ai.category}`) : "approved_by_rules",
    createdAt: now.toISOString(),
  });
  return json({ post: { id, outcome: body.outcome, text: check.text, at: now.toISOString() } });
}

export async function handleNice(postId: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const post = await getPost(env.DB, postId);
  const crewId = post ? await myCrewId(env.DB, user.id) : null;
  if (!post || !crewId || post.crew_id !== crewId) return json({ error: "not_found" }, 404);
  if (await overLimit(env, `rl:crewnice:${user.id}`, NICE_LIMIT)) return json({ error: "too_many" }, 429);
  const niced = await toggleNice(env.DB, postId, user.id, now.toISOString());
  const cheers = (await niceFor(env.DB, [postId])).filter((c) => c.user_id !== user.id).map((c) => c.name);
  return json({ niced, nice: cheers });
}

export async function handleLeaveCrew(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "signed_out" }, 401);
  const crewId = await myCrewId(env.DB, user.id);
  if (!crewId) return json({ error: "not_found" }, 404);
  await removeMember(env.DB, crewId, user.id);
  await closeIfEmpty(env.DB, crewId);
  return json({ ok: true });
}

export async function handleRemoveMember(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "signed_out" }, 401);
  const crewId = await myCrewId(env.DB, user.id);
  if (!crewId) return json({ error: "not_found" }, 404);
  const body = await readJson(request);
  if (typeof body.userId !== "string" || body.userId === user.id) return json({ error: "bad_member" }, 400);
  const ms = await members(env.DB, crewId);
  if (!ms.some((m) => m.user_id === body.userId)) return json({ error: "not_found" }, 404);
  await removeMember(env.DB, crewId, body.userId as string);
  await closeIfEmpty(env.DB, crewId);
  return json({ ok: true });
}
