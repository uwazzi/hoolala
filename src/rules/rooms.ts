// WP-A1 icebreaker rooms (v6.4). Pure: no I/O, no clock, no randomness.
// A room belongs to a rough area: its centre snapped to a 200 m grid with a
// 500 m radius. Raw coordinates never reach this file: callers snap first
// (snapToCell) and discard the raw position. Every read path uses
// visibleRooms; names go through roomCard. Never decide visibility elsewhere.

import { haversineM } from "./places";

/** The room centre grid, in metres (owner decision, 2 Nov). */
export const GRID_M = 200;
/** The rough area around the snapped centre that can find the room. */
export const ROOM_RADIUS_M = 500;
/** Open room, starter included. */
export const ROOM_CAPACITY = 6;
/** Finite by design: at most 3 rooms per look around. */
export const DISCOVER_LIMIT = 3;

export const TOPIC_MAX = 60;
export const PLACE_MAX = 40;
export const JOIN_LINE_MAX = 80;

export const DURATIONS_MIN = [30, 60, 120] as const;
export type RoomDurationMin = (typeof DURATIONS_MIN)[number];

/** 1 open room per starter, at most 2 joined at once, 10 joins an hour, 5 starts a day. */
export const MAX_OPEN_PER_STARTER = 1;
export const MAX_JOINED = 2;
export const JOINS_PER_HOUR = 10;
export const STARTS_PER_DAY = 5;

export type RoomStatus = "open" | "closed" | "expired";

export interface Cell {
  lat: number;
  lng: number;
}

const METRES_PER_DEGREE = 111320;

/**
 * The centre of the 200 m grid cell holding this point. Used for the room
 * centre and for the viewer's own lookup. Never the raw position.
 */
export function snapToCell(lat: number, lng: number): Cell {
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const x = lng * METRES_PER_DEGREE * cos;
  const y = lat * METRES_PER_DEGREE;
  const snappedX = Math.floor(x / GRID_M) * GRID_M + GRID_M / 2;
  const snappedY = Math.floor(y / GRID_M) * GRID_M + GRID_M / 2;
  const snappedLat = snappedY / METRES_PER_DEGREE;
  const snappedCos = Math.max(0.2, Math.cos((snappedLat * Math.PI) / 180));
  return { lat: snappedLat, lng: snappedX / (METRES_PER_DEGREE * snappedCos) };
}

/** Cell-to-cell distance in metres. */
export function cellDistanceM(a: Cell, b: Cell): number {
  return haversineM(a.lat, a.lng, b.lat, b.lng);
}

/** The distance shown to the viewer, rounded to 50 m. Never exact, never a direction. */
export function roundDistanceM(meters: number): number {
  return Math.round(meters / 50) * 50;
}

export function distanceLabel(meters: number): string {
  return `ABOUT ${roundDistanceM(meters)} M AWAY`;
}

export interface RoomCandidate {
  id: string;
  starterId: string;
  status: RoomStatus;
  endsAt: string;
  cellLat: number;
  cellLng: number;
  /** Current members, starter included. */
  memberIds: string[];
  /** People the starter removed; they never see the room again. */
  removedIds: string[];
  /** Compass match, computed for the viewer only. */
  fitsYou: boolean;
}

export interface RoomViewer {
  id: string;
  /** Everyone this person blocked or was blocked by (both directions). */
  blockedIds: string[];
}

function live(room: Pick<RoomCandidate, "status" | "endsAt">, now: Date): boolean {
  return room.status === "open" && Date.parse(room.endsAt) > now.getTime();
}

function withinReach(room: Pick<RoomCandidate, "cellLat" | "cellLng">, viewerCell: Cell): boolean {
  return cellDistanceM({ lat: room.cellLat, lng: room.cellLng }, viewerCell) <= ROOM_RADIUS_M;
}

/**
 * A room is visible when it is open and unexpired, the cell-to-cell distance
 * is at most 500 m, neither person blocked the other, the viewer was not
 * removed from it, and it is not full (unless the viewer is already in it).
 * At most 3 returned: the viewer's FITS YOU first, then nearest.
 */
export function visibleRooms(viewer: RoomViewer, rooms: RoomCandidate[], viewerCell: Cell, now: Date): RoomCandidate[] {
  const blocked = new Set(viewer.blockedIds);
  const seen = rooms.filter(
    (r) =>
      live(r, now) &&
      withinReach(r, viewerCell) &&
      !blocked.has(r.starterId) &&
      !r.removedIds.includes(viewer.id) &&
      (r.memberIds.length < ROOM_CAPACITY || r.memberIds.includes(viewer.id)),
  );
  const distance = (r: RoomCandidate) => cellDistanceM({ lat: r.cellLat, lng: r.cellLng }, viewerCell);
  seen.sort((a, b) => Number(b.fitsYou) - Number(a.fitsYou) || distance(a) - distance(b));
  return seen.slice(0, DISCOVER_LIMIT);
}

/** Open join: the room is visible, has space, and no block touches any current member. */
export function canJoin(viewer: RoomViewer, room: RoomCandidate, viewerCell: Cell, now: Date): boolean {
  const blocked = new Set(viewer.blockedIds);
  return (
    live(room, now) &&
    withinReach(room, viewerCell) &&
    !room.removedIds.includes(viewer.id) &&
    room.memberIds.length < ROOM_CAPACITY &&
    !room.memberIds.some((id) => blocked.has(id))
  );
}

/** Only the starter removes, and only a current member who is not themselves. */
export function canRemove(viewerId: string, starterId: string, targetId: string, targetIsMember: boolean): boolean {
  return viewerId === starterId && targetId !== starterId && targetIsMember;
}

/** The neutral line a removed person sees. Nobody is told why. */
export const REMOVED_NOTE = "That room is closed for you now";

export interface RoomCardInput {
  topic: string;
  placeText: string;
  endsAt: string;
  cellLat: number;
  cellLng: number;
  memberCount: number;
  memberNames: string[];
}

export interface RoomCard {
  topic: string;
  placeText: string;
  endsAt: string;
  distance: string;
  size: string;
  /** First names of current members, members only. */
  names: string[] | null;
}

/**
 * What one room looks like to one viewer. A non-member sees topic, place
 * text, rough distance, end time and room size only; a member also sees the
 * first names of the other current members.
 */
export function roomCard(room: RoomCardInput, viewerCell: Cell, viewerIsMember: boolean): RoomCard {
  return {
    topic: room.topic,
    placeText: room.placeText,
    endsAt: room.endsAt,
    distance: distanceLabel(cellDistanceM({ lat: room.cellLat, lng: room.cellLng }, viewerCell)),
    size: `${room.memberCount} IN · UP TO ${ROOM_CAPACITY}`,
    names: viewerIsMember ? room.memberNames : null,
  };
}

export function canStartRoom(openStarted: number, startedToday: number): boolean {
  return openStarted < MAX_OPEN_PER_STARTER && startedToday < STARTS_PER_DAY;
}

export function canJoinAnother(joinedNow: number, joinsLastHour: number): boolean {
  return joinedNow < MAX_JOINED && joinsLastHour < JOINS_PER_HOUR;
}

export function normalizeDuration(raw: unknown): RoomDurationMin | null {
  return raw === 30 || raw === 60 || raw === 120 ? raw : null;
}

export function roomEndsAt(opensAt: Date, minutes: RoomDurationMin): string {
  return new Date(opensAt.getTime() + minutes * 60 * 1000).toISOString();
}

export const ROOM_REPLIES = ["AT_THE_SPOT", "ON_MY_WAY", "FIVE_LATE", "CALL_IT_OFF", "LEAVE"] as const;
export type RoomReply = (typeof ROOM_REPLIES)[number];

/** Quick replies only, seen by the room. No free text. */
export function isRoomReply(raw: unknown): raw is RoomReply {
  return typeof raw === "string" && (ROOM_REPLIES as readonly string[]).includes(raw);
}

export const ROOM_REPLY_LABELS: Record<RoomReply, string> = {
  AT_THE_SPOT: "AT THE SPOT",
  ON_MY_WAY: "ON MY WAY",
  FIVE_LATE: "5 MIN LATE",
  CALL_IT_OFF: "CALL IT OFF",
  LEAVE: "LEAVE",
};
