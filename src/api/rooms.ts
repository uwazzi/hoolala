// WP-A2/A3 icebreaker rooms (v6.4). POST /api/rooms/scan (one look around:
// open rooms within 500 m, never people), POST /api/rooms/:id/join and
// POST /api/rooms/:id/leave. The borrowed point is snapped to the grid cell
// in the request, then discarded; raw coordinates never touch D1, KV or logs.

import { compassTexts } from "../db/compass";
import { blockedIds } from "../db/here";
import {
  addMember,
  candidateRooms,
  currentMemberIds,
  currentRoomsFor,
  getMembership,
  getRoom,
  joinsLastHour,
  markLeft,
  memberNames,
  rejoined,
  removedIds,
} from "../db/rooms";
import { writeWorking } from "../llm/client";
import { screenWithModel } from "../llm/screen";
import { fitsYou } from "../rules/compass";
import {
  canJoinAnother,
  JOIN_LINE_MAX,
  joinRefusal,
  roomCard,
  snapToCell,
  visibleRooms,
  type Cell,
} from "../rules/rooms";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import type { Env, RoomRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const SCAN_LIMIT = { max: 20, windowS: 60 * 60 };

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
  else await addMember(env.DB, { roomId: room.id, userId: user.id, role: "member", line: line ?? undefined, joinedAt: now.toISOString() });
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
  await markLeft(env.DB, id, user.id);
  return json({ ok: true });
}
