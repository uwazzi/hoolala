// WP-A2/A3 icebreaker rooms (v6.4). POST /api/rooms/scan (one look around:
// open rooms within 500 m, never people), POST /api/rooms/:id/join and
// POST /api/rooms/:id/leave. The borrowed point is snapped to the grid cell
// in the request, then discarded; raw coordinates never touch D1, KV or logs.

import { compassTexts } from "../db/compass";
import { blockedIds } from "../db/here";
import {
  addMember,
  addReply,
  atTableIds,
  atTableNames,
  candidateRooms,
  createRoom,
  currentMemberIds,
  currentRoomsFor,
  getMembership,
  getRoom,
  joinsLastHour,
  markAtTable,
  markLeft,
  markRemoved,
  markTableLeft,
  memberNames,
  membershipByToken,
  openRoomsByStarter,
  recordTablePairs,
  rejoined,
  removedIds,
  repliesFor,
  roomMemberViews,
  setRoomStatus,
  startsToday,
  tableMeetingCount,
} from "../db/rooms";
import { writeWorking } from "../llm/client";
import { roomIdeasFor } from "../llm/roomideas";
import { mintTableToken, verifyTableToken } from "./table";
import { getDebrief, metAtTable } from "../db/debrief";
import { translationFor, type ScreenVerdict } from "../llm/screen";
import { screenWithModel } from "../llm/screen";
import { fitsYou } from "../rules/compass";
import {
  canJoinAnother,
  canRemove,
  canStartRoom,
  isRoomReply,
  JOIN_LINE_MAX,
  joinRefusal,
  normalizeDuration,
  REMOVED_NOTE,
  ROOM_CAPACITY,
  ROOM_REPLY_LABELS,
  roomCard,
  roomEndsAt,
  snapToCell,
  TOPIC_MAX,
  visibleRooms,
  type Cell,
} from "../rules/rooms";
import { SCREEN_MESSAGES, screenPlaceText, screenText } from "../rules/screening";
import type { Env, RoomRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const SCAN_LIMIT = { max: 20, windowS: 60 * 60 };
const SUGGEST_LIMIT = { max: 20, windowS: 60 * 60 };

const OTHER_MESSAGE = "That one doesn't fit the house rules here. Try again?";

function refused(category: string): Response {
  const message = (SCREEN_MESSAGES as Record<string, string>)[category] ?? OTHER_MESSAGE;
  return json({ error: "screened", category, message }, 422);
}

function pointOf(body: Record<string, unknown>): { lat: number; lng: number } | null {
  const { lat, lng } = body as { lat: unknown; lng: unknown };
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

async function cardsFor(env: Env, viewerId: string, viewerCell: Cell, compass: string[], now: Date) {
  const rooms = await candidateRooms(env.DB, viewerCell.lat, viewerCell.lng, now.toISOString());
  const blocked = [...(await blockedIds(env.DB, viewerId))];
  const candidates = await Promise.all(
    rooms.map(async (r) => ({
      id: r.id,
      starterId: r.starter_id,
      status: r.status,
      endsAt: r.ends_at,
      cellLat: r.cell_lat,
      cellLng: r.cell_lng,
      memberIds: await currentMemberIds(env.DB, r.id),
      removedIds: await removedIds(env.DB, r.id),
      fitsYou: fitsYou(`${r.topic} ${r.place_text}`, compass),
    })),
  );
  const viewer = { id: viewerId, blockedIds: blocked };
  const seen = visibleRooms(viewer, candidates, viewerCell, now);
  const byId = new Map(rooms.map((r) => [r.id, r]));
  return Promise.all(
    seen.map(async (c) => {
      const r = byId.get(c.id) as RoomRow;
      const isMember = c.memberIds.includes(viewerId);
      return {
        id: r.id,
        ...roomCard(
          {
            topic: r.topic,
            placeText: r.place_text,
            endsAt: r.ends_at,
            cellLat: r.cell_lat,
            cellLng: r.cell_lng,
            memberCount: c.memberIds.length,
            memberNames: isMember ? await memberNames(env.DB, r.id) : [],
          },
          viewerCell,
          isMember,
        ),
        fitsYou: c.fitsYou,
        translation: r.translation,
        lang: r.lang,
        member: isMember,
      };
    }),
  );
}

export async function handleRoomsScan(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const point = pointOf(await readJson(request));
  if (!point) return json({ error: "bad_location" }, 400);
  if (await overLimit(env, `rooms-scan:${user.id}`, SCAN_LIMIT)) return json({ error: "rate_limited" }, 429);
  // Snap, then forget the raw point: nothing below sees it again.
  const cell = snapToCell(point.lat, point.lng);
  const compass = await compassTexts(env.DB, user.id);
  return json({ rooms: await cardsFor(env, user.id, cell, compass, now) });
}

export async function handleRoomJoin(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const point = pointOf(body);
  if (!point) return json({ error: "bad_location" }, 400);
  const room = await getRoom(env.DB, id);
  if (!room) return json({ error: "not_found" }, 404);
  const cell = snapToCell(point.lat, point.lng);
  const blocked = [...(await blockedIds(env.DB, user.id))];
  const candidate = {
    id: room.id,
    starterId: room.starter_id,
    status: room.status,
    endsAt: room.ends_at,
    cellLat: room.cell_lat,
    cellLng: room.cell_lng,
    memberIds: await currentMemberIds(env.DB, room.id),
    removedIds: await removedIds(env.DB, room.id),
    fitsYou: false,
  };
  const viewer = { id: user.id, blockedIds: blocked };
  const membership = await getMembership(env.DB, room.id, user.id);
  const refusal = joinRefusal(viewer, candidate, cell, now);
  if (refusal === "hidden") return json({ error: "not_found" }, 404);
  if (refusal === "full") return json({ error: "full" }, 409);
  if (membership && membership.left_at === null) {
    // Already in: the same member view, no second join counted.
    return json(await memberView(env, room, cell));
  }
  const mine = await currentRoomsFor(env.DB, user.id);
  const joinedNow = mine.filter((m) => m.role === "member").length;
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  if (!canJoinAnother(joinedNow, await joinsLastHour(env.DB, user.id, hourAgo))) return json({ error: "too_many" }, 429);

  let line: string | null = null;
  if (body.line !== undefined && body.line !== null && String(body.line).trim() !== "") {
    const result = screenText(body.line, JOIN_LINE_MAX);
    if (!result.ok) return refused(result.category as string);
    const clean = String(body.line).trim();
    const ai = await screenWithModel(env, clean);
    if (ai) {
      await writeWorking(env, {
        userId: user.id,
        fn: "screen",
        tools: [],
        verdict: ai.verdict === "approve" ? "approved" : `rejected: ${ai.category}`,
        effort: "minimal",
      });
    }
    if (ai?.verdict === "reject") return refused(ai.category);
    line = clean;
  }

  if (membership) await rejoined(env.DB, room.id, user.id, now.toISOString());
  else
    await addMember(env.DB, {
      roomId: room.id,
      userId: user.id,
      role: "member",
      line: line ?? undefined,
      joinedAt: now.toISOString(),
      removeToken: crypto.randomUUID(),
    });
  return json(await memberView(env, room, cell));
}

async function memberView(env: Env, room: RoomRow, cell: Cell) {
  const ids = await currentMemberIds(env.DB, room.id);
  return {
    id: room.id,
    count: ids.length,
    ...roomCard(
      {
        topic: room.topic,
        placeText: room.place_text,
        endsAt: room.ends_at,
        cellLat: room.cell_lat,
        cellLng: room.cell_lng,
        memberCount: ids.length,
        memberNames: await memberNames(env.DB, room.id),
      },
      cell,
      true,
    ),
    translation: room.translation,
    lang: room.lang,
    member: true,
  };
}

export async function handleRoomLeave(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const membership = await getMembership(env.DB, id, user.id);
  if (membership && membership.left_at === null && membership.removed === 0) {
    await addReply(env.DB, { id: crypto.randomUUID(), roomId: id, userId: user.id, code: "LEAVE", createdAt: now.toISOString() });
  }
  await markLeft(env.DB, id, user.id);
  await markTableLeft(env.DB, id, user.id, now.toISOString());
  return json({ ok: true });
}

/** NEED ONE?: 3 checked ideas from the compass, or creative ones without it. */
export async function handleRoomsSuggest(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (await overLimit(env, `rooms-suggest:${user.id}`, SUGGEST_LIMIT)) return json({ error: "rate_limited" }, 429);
  const body = await readJson(request);
  const lang = body.lang === "fr" ? "fr" : "en";
  const compass = await compassTexts(env.DB, user.id);
  const result = await roomIdeasFor(env, user.id, compass, now, lang);
  return json({
    ...result,
    label: result.fromCompass ? "AI / SUGGESTION · FROM YOUR COMPASS · CHECKED" : "AI / SUGGESTION · CHECKED",
  });
}

async function screenSecondOpinion(env: Env, userId: string, text: string): Promise<ScreenVerdict | null> {
  const ai = await screenWithModel(env, text);
  if (ai) {
    await writeWorking(env, {
      userId,
      fn: "screen",
      tools: [],
      verdict: ai.verdict === "approve" ? "approved" : `rejected: ${ai.category}`,
      effort: "minimal",
    });
  }
  return ai;
}

/** POST IT: a topic, a public place, a duration, one borrowed point. */
export async function handleRoomPost(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const placeText = typeof body.placeText === "string" ? body.placeText.trim() : "";
  if (!topic || !placeText) return json({ error: "needs_topic_and_place" }, 400);
  const durationMin = normalizeDuration(body.durationMin);
  if (!durationMin) return json({ error: "bad_duration" }, 400);
  const point = pointOf(body);
  if (!point) return json({ error: "bad_location" }, 400);
  // Code rules first: instant, free, and final on refusal.
  const topicCode = screenText(topic, TOPIC_MAX);
  if (!topicCode.ok) return refused(topicCode.category as string);
  const placeCode = screenPlaceText(placeText);
  if (!placeCode.ok) return refused(placeCode.category as string);
  if (!canStartRoom(await openRoomsByStarter(env.DB, user.id), await startsToday(env.DB, user.id, now.toISOString().slice(0, 10)))) {
    const open = await openRoomsByStarter(env.DB, user.id);
    return json({ error: open > 0 ? "already_open" : "too_many" }, open > 0 ? 409 : 429);
  }
  // Then SCREEN IT, topic and place; when it is down, the code approval stands.
  const topicAi = await screenSecondOpinion(env, user.id, topic);
  if (topicAi?.verdict === "reject") return refused(topicAi.category);
  const placeAi = await screenSecondOpinion(env, user.id, placeText);
  if (placeAi?.verdict === "reject") return refused(placeAi.category);

  const cell = snapToCell(point.lat, point.lng);
  const id = crypto.randomUUID();
  const opensAt = now.toISOString();
  await createRoom(env.DB, {
    id,
    starterId: user.id,
    topic,
    placeText,
    cellLat: cell.lat,
    cellLng: cell.lng,
    lang: topicAi?.lang ?? null,
    translation: topicAi ? translationFor(topicAi, topic) : null,
    opensAt,
    endsAt: roomEndsAt(now, durationMin),
    status: "open",
    createdAt: opensAt,
  });
  await addMember(env.DB, { roomId: id, userId: user.id, role: "starter", joinedAt: opensAt, removeToken: crypto.randomUUID() });
  const created = (await getRoom(env.DB, id)) as RoomRow;
  return json({ ...(await memberView(env, created, cell)), mine: true });
}

export async function handleRoomDetail(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const room = await getRoom(env.DB, id);
  if (!room) return json({ error: "not_found" }, 404);
  const membership = await getMembership(env.DB, id, user.id);
  if (membership && membership.removed === 1) return json({ closedForYou: true, note: REMOVED_NOTE });
  const current = membership && membership.left_at === null;
  const live = room.status === "open" && Date.parse(room.ends_at) > now.getTime();
  if (!current) {
    if (!live) return json({ error: "not_found" }, 404);
    const count = (await currentMemberIds(env.DB, id)).length;
    return json({
      id: room.id,
      topic: room.topic,
      placeText: room.place_text,
      endsAt: room.ends_at,
      status: room.status,
      size: `${count} IN · UP TO ${ROOM_CAPACITY}`,
      translation: room.translation,
      lang: room.lang,
      member: false,
      names: null,
    });
  }
  if (!live) return json({ id: room.id, closed: true });
  const views = await roomMemberViews(env.DB, id);
  const replies = await repliesFor(env.DB, id);
  const lastByUser = new Map<string, string>();
  for (const reply of replies) lastByUser.set(reply.user_id, reply.code);
  const atTable = await atTableIds(env.DB, id);
  return json({
    id: room.id,
    topic: room.topic,
    placeText: room.place_text,
    endsAt: room.ends_at,
    status: room.status,
    size: `${views.length} IN · UP TO ${ROOM_CAPACITY}`,
    count: views.length,
    mine: room.starter_id === user.id,
    member: true,
    translation: room.translation,
    lang: room.lang,
    tableOpen: atTable.length > 0,
    youAtTable: atTable.includes(user.id),
    atTable: await atTableNames(env.DB, id),
    recorded: await tableMeetingCount(env.DB, atTable, now.toISOString().slice(0, 10)),
    members: views.map((m) => {
      const last = lastByUser.get(m.userId);
      const you = m.userId === user.id;
      return {
        name: m.name,
        you,
        starter: m.role === "starter",
        status: last ? ROOM_REPLY_LABELS[last as keyof typeof ROOM_REPLY_LABELS] : m.role === "starter" ? "AT THE SPOT" : "ON MY WAY",
        line: m.line,
        // The starter removes others by opaque token; nobody sees user ids.
        removeToken: room.starter_id === user.id && !you ? m.removeToken : null,
      };
    }),
  });
}

export async function handleRoomReply(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const code = (await readJson(request)).code;
  if (!isRoomReply(code)) return json({ error: "bad_reply" }, 400);
  const room = await getRoom(env.DB, id);
  const membership = room ? await getMembership(env.DB, id, user.id) : null;
  if (!room || !membership || membership.left_at !== null || membership.removed === 1) return json({ error: "not_found" }, 404);
  if (room.status !== "open" || Date.parse(room.ends_at) <= now.getTime()) return json({ error: "closed" }, 409);
  await addReply(env.DB, { id: crypto.randomUUID(), roomId: id, userId: user.id, code, createdAt: now.toISOString() });
  if (code === "LEAVE") await markLeft(env.DB, id, user.id);
  return json({ ok: true });
}

export async function handleRoomTakedown(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const room = await getRoom(env.DB, id);
  if (!room || room.starter_id !== user.id) return json({ error: "not_found" }, 404);
  await setRoomStatus(env.DB, id, "closed");
  return json({ ok: true });
}

/** The phone goes on the table: a fresh signed QR, and a seat at the table. */
export async function handleTableToken(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!env.TABLE_QR_SECRET) return json({ error: "table_unavailable" }, 503);
  const room = await getRoom(env.DB, id);
  const membership = room ? await getMembership(env.DB, id, user.id) : null;
  if (!room || !membership || membership.left_at !== null || membership.removed === 1) return json({ error: "not_found" }, 404);
  if (room.status !== "open" || Date.parse(room.ends_at) <= now.getTime()) return json({ error: "closed" }, 409);
  await markAtTable(env.DB, id, user.id, now.toISOString());
  const token = await mintTableToken(env.TABLE_QR_SECRET, room.id, user.id, now);
  return json({ token, url: `${new URL(request.url).origin}/r/${token}`, refreshAt: now.toISOString() });
}

/** Leaving the table keeps the meeting history for the debrief, which opens when due. */
export async function handleTableLeave(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  await markTableLeft(env.DB, id, user.id, now.toISOString());
  const met = await metAtTable(env.DB, id, user.id);
  const answered = await getDebrief(env.DB, id, user.id);
  return json({ ok: true, debrief: met.length > 0 && !answered ? id : null });
}

/**
 * The scan is the meeting. A member scans and sits down; a signed-in
 * non-member nearby joins first. Blocked pairs are refused silently and
 * record nothing. Honest claim: both at the same Hoolala! table.
 */
export async function handleTableScan(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!env.TABLE_QR_SECRET) return json({ error: "table_unavailable" }, 503);
  const body = await readJson(request);
  const scanned = await verifyTableToken(env.TABLE_QR_SECRET, body.token, now);
  if (!scanned) return json({ error: "bad_token" }, 404);
  const room = await getRoom(env.DB, scanned.roomId);
  if (!room || room.status !== "open" || Date.parse(room.ends_at) <= now.getTime()) return json({ error: "bad_token" }, 404);
  const shower = await getMembership(env.DB, room.id, scanned.showerId);
  if (!shower || shower.left_at !== null || shower.removed === 1) return json({ error: "bad_token" }, 404);

  const blocked = await blockedIds(env.DB, user.id);
  const atTable = await atTableIds(env.DB, room.id);
  if (blocked.has(scanned.showerId) || atTable.some((id) => blocked.has(id))) return json({ error: "not_found" }, 404);

  const membership = await getMembership(env.DB, room.id, user.id);
  if (membership && membership.removed === 1) return json({ error: "not_found" }, 404);
  const current = membership && membership.left_at === null;
  if (!current) {
    const point = pointOf(body);
    if (!point) return json({ error: "needs_location" }, 400);
    const cell = snapToCell(point.lat, point.lng);
    const candidate = {
      id: room.id,
      starterId: room.starter_id,
      status: room.status,
      endsAt: room.ends_at,
      cellLat: room.cell_lat,
      cellLng: room.cell_lng,
      memberIds: await currentMemberIds(env.DB, room.id),
      removedIds: await removedIds(env.DB, room.id),
      fitsYou: false,
    };
    const refusal = joinRefusal({ id: user.id, blockedIds: [...blocked] }, candidate, cell, now);
    if (refusal === "hidden") return json({ error: "not_found" }, 404);
    if (refusal === "full") return json({ error: "full" }, 409);
    if (membership) await rejoined(env.DB, room.id, user.id, now.toISOString());
    else {
      await addMember(env.DB, { roomId: room.id, userId: user.id, role: "member", joinedAt: now.toISOString(), removeToken: crypto.randomUUID() });
    }
  }
  await markAtTable(env.DB, room.id, user.id, now.toISOString());
  const recorded = await recordTablePairs(env.DB, room.id, user.id, now.toISOString().slice(0, 10), now.toISOString());
  return json({ ok: true, roomId: room.id, atTable: await atTableNames(env.DB, room.id), recorded });
}

export async function handleRoomRemove(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const room = await getRoom(env.DB, id);
  const token = (await readJson(request)).token;
  if (!room || room.starter_id !== user.id) return json({ error: "not_found" }, 404);
  if (typeof token !== "string" || !token) return json({ error: "bad_target" }, 400);
  const target = await membershipByToken(env.DB, id, token);
  const targetId = target?.user_id ?? "";
  const current = target !== null && target.left_at === null && target.removed === 0;
  if (!target || !canRemove(user.id, room.starter_id, targetId, current)) return json({ error: "not_found" }, 404);
  await markRemoved(env.DB, id, targetId);
  return json({ ok: true });
}
