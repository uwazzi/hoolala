// WP-A5 how did it go (v6.4). The debrief opens after the table with the
// people met; every answer is optional, battery and chat stay private, and
// stay-in-touch only connects when both say yes. The celebration and the
// +5 leaves (WP-A6) follow.

import { chooseStay, getDebrief, insertDebrief, insertOwnerFeedback, metAtTable, pendingDebriefs, stayChoice } from "../db/debrief";
import { getMembership, getRoom } from "../db/rooms";
import { writeWorking } from "../llm/client";
import { screenWithModel } from "../llm/screen";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { DebriefChat, Env, FeedbackTag } from "../types";
import { json } from "./health";
import { readJson } from "./request";
import { getSessionUser } from "./session";

const APP_VERSION = "6.4";
const CHATS: DebriefChat[] = ["awkward", "ok", "good", "great"];
const TAGS: FeedbackTag[] = ["good", "bad", "idea"];

const OTHER_MESSAGE = "That one doesn't fit the house rules here. Try again?";

function due(membership: { table_left_at: string | null } | null, room: { status: string; ends_at: string }, nowMs: number): boolean {
  if (!membership) return false;
  if (membership.table_left_at !== null) return true;
  return room.status !== "open" || Date.parse(room.ends_at) <= nowMs;
}

export async function handleDebriefGet(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const room = await getRoom(env.DB, id);
  if (!room) return json({ error: "not_found" }, 404);
  if (await getDebrief(env.DB, id, user.id)) return json({ answered: true });
  const met = await metAtTable(env.DB, id, user.id);
  if (!met.length) return json({ error: "none" }, 404);
  if (!due(await getMembership(env.DB, id, user.id), room, now.getTime())) return json({ error: "none" }, 404);
  if (Date.parse(room.ends_at) + 24 * 60 * 60 * 1000 <= now.getTime()) return json({ error: "none" }, 404);
  return json({
    roomId: room.id,
    topic: room.topic,
    mine: room.starter_id === user.id,
    met: met.map((m) => ({ name: m.name, stayToken: m.stayToken })),
  });
}

export async function handleDebriefPost(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const room = await getRoom(env.DB, id);
  if (!room) return json({ error: "not_found" }, 404);
  if (await getDebrief(env.DB, id, user.id)) return json({ error: "answered" }, 409);
  const met = await metAtTable(env.DB, id, user.id);
  if (!met.length) return json({ error: "none" }, 404);
  if (!due(await getMembership(env.DB, id, user.id), room, now.getTime())) return json({ error: "none" }, 404);
  if (Date.parse(room.ends_at) + 24 * 60 * 60 * 1000 <= now.getTime()) return json({ error: "none" }, 404);

  const body = await readJson(request);
  const batteryRaw = body.battery === undefined ? null : body.battery;
  if (batteryRaw !== null && (typeof batteryRaw !== "number" || !Number.isInteger(batteryRaw) || batteryRaw < 1 || batteryRaw > 5)) {
    return json({ error: "bad_battery" }, 400);
  }
  const battery = batteryRaw as number | null;
  const chatRaw = body.chat === undefined ? null : body.chat;
  if (chatRaw !== null && (typeof chatRaw !== "string" || !CHATS.includes(chatRaw as DebriefChat))) return json({ error: "bad_chat" }, 400);
  const chat = chatRaw as DebriefChat | null;
  const tagRaw = body.tag === undefined ? null : body.tag;
  if (tagRaw !== null && (typeof tagRaw !== "string" || !TAGS.includes(tagRaw as FeedbackTag))) return json({ error: "bad_tag" }, 400);
  const tag = tagRaw as FeedbackTag | null;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text) {
    const code = screenText(text, 280);
    if (!code.ok) {
      const message = (SCREEN_MESSAGES as Record<string, string>)[code.category as string] ?? OTHER_MESSAGE;
      return json({ error: "screened", category: code.category, message }, 422);
    }
    const ai = await screenWithModel(env, text);
    if (ai) {
      await writeWorking(env, {
        userId: user.id,
        fn: "screen",
        tools: [],
        verdict: ai.verdict === "approve" ? "approved" : `rejected: ${ai.category}`,
        effort: "minimal",
      });
    }
    if (ai?.verdict === "reject") {
      const message = (SCREEN_MESSAGES as Record<string, string>)[ai.category] ?? OTHER_MESSAGE;
      return json({ error: "screened", category: ai.category, message }, 422);
    }
  }

  const nowIso = now.toISOString();
  await insertDebrief(env.DB, { roomId: id, userId: user.id, battery, chat, createdAt: nowIso });
  let feedbackSent = false;
  if (text) {
    await insertOwnerFeedback(env.DB, { id: crypto.randomUUID(), tag, text, createdAt: nowIso, appVersion: APP_VERSION });
    feedbackSent = true;
  }

  const stay = body.stay && typeof body.stay === "object" ? (body.stay as Record<string, unknown>) : {};
  const byToken = new Map(met.filter((m) => m.stayToken).map((m) => [m.stayToken as string, m]));
  const results: { name: string; result: "friends" | "no" | "waiting" }[] = [];
  for (const [token, yes] of Object.entries(stay)) {
    const person = byToken.get(token);
    if (person && yes === true) await chooseStay(env.DB, id, user.id, person.userId, nowIso);
  }
  for (const person of met) {
    const myYes = person.stayToken !== null && stay[person.stayToken] === true;
    const theirYes = await stayChoice(env.DB, id, person.userId, user.id);
    if (myYes && theirYes) {
      results.push({ name: person.name, result: "friends" });
    } else if (!myYes) {
      results.push({ name: person.name, result: "no" });
    } else {
      const theyAnswered = await getDebrief(env.DB, id, person.userId);
      results.push({ name: person.name, result: theyAnswered ? "no" : "waiting" });
    }
  }
  return json({ ok: true, stay: results, feedbackSent });
}

/** The debrief that waits on Around: the oldest unanswered one, or nothing. */
export async function handleDebriefPending(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const [first] = await pendingDebriefs(env.DB, user.id, now.toISOString());
  return json({ room: first ? { id: first.id, topic: first.topic } : null });
}
