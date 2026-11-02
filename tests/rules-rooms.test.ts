import { describe, expect, it } from "vitest";
import {
  GRID_M,
  ROOM_CAPACITY,
  ROOM_RADIUS_M,
  canJoin,
  canJoinAnother,
  canRemove,
  canStartRoom,
  cellDistanceM,
  distanceLabel,
  isRoomReply,
  joinRefusal,
  normalizeDuration,
  REMOVED_NOTE,
  roomCard,
  roomEndsAt,
  ROOM_REPLIES,
  roundDistanceM,
  snapToCell,
  visibleRooms,
  type RoomCandidate,
  type RoomViewer,
} from "../src/rules/rooms";

const NOW = new Date("2026-11-02T14:00:00.000Z");
const ENDS = "2026-11-02T15:00:00.000Z";
// A Lausanne café.
const CAFE = { lat: 46.5197, lng: 6.6323 };

function room(over: Partial<RoomCandidate> = {}): RoomCandidate {
  return {
    id: "room-1",
    starterId: "starter",
    status: "open",
    endsAt: ENDS,
    cellLat: CAFE.lat,
    cellLng: CAFE.lng,
    memberIds: ["starter"],
    removedIds: [],
    fitsYou: false,
    ...over,
  };
}

const viewer = (over: Partial<RoomViewer> = {}): RoomViewer => ({ id: "viewer", blockedIds: [], ...over });

/** A cell about `meters` north of the café (1° latitude is about 111.32 km). */
function northOf(meters: number) {
  return { lat: CAFE.lat + meters / 111320, lng: CAFE.lng };
}

describe("snapToCell", () => {
  it("never returns the raw coordinates", () => {
    const cell = snapToCell(CAFE.lat, CAFE.lng);
    expect(cell.lat === CAFE.lat && cell.lng === CAFE.lng).toBe(false);
    expect(GRID_M).toBe(200);
  });

  it("snaps two points 50 m apart in one cell to the same centre", () => {
    const centre = snapToCell(CAFE.lat, CAFE.lng);
    // 10 m steps from the centre stay inside the 200 m cell.
    const a = { lat: centre.lat + 10 / 111320, lng: centre.lng };
    const b = { lat: centre.lat - 10 / 111320, lng: centre.lng };
    expect(cellDistanceM(a, b)).toBeGreaterThan(15);
    expect(snapToCell(a.lat, a.lng)).toEqual(centre);
    expect(snapToCell(b.lat, b.lng)).toEqual(centre);
  });
});

describe("visibleRooms", () => {
  it("shows a room 480 m away (cell to cell) but not one 520 m away", () => {
    const near = northOf(480);
    const far = northOf(520);
    expect(cellDistanceM(CAFE, near)).toBeLessThanOrEqual(ROOM_RADIUS_M);
    expect(cellDistanceM(CAFE, far)).toBeGreaterThan(ROOM_RADIUS_M);
    const rooms = [
      room({ id: "near", cellLat: near.lat, cellLng: near.lng }),
      room({ id: "far", cellLat: far.lat, cellLng: far.lng }),
    ];
    expect(visibleRooms(viewer(), rooms, CAFE, NOW).map((r) => r.id)).toEqual(["near"]);
  });

  it("hides expired, closed and full rooms, but a member still sees their own full room", () => {
    const full = room({ id: "full", memberIds: ["s", "a", "b", "c", "d", "e"] });
    expect(full.memberIds.length).toBe(ROOM_CAPACITY);
    const rooms = [
      room({ id: "expired", endsAt: NOW.toISOString() }),
      room({ id: "closed", status: "closed" }),
      full,
    ];
    expect(visibleRooms(viewer(), rooms, CAFE, NOW)).toEqual([]);
    // A member of the full room still sees it.
    expect(visibleRooms(viewer({ id: "a" }), [full], CAFE, NOW).map((r) => r.id)).toEqual(["full"]);
  });

  it("hides rooms both ways after a block with the starter", () => {
    const r = room();
    expect(visibleRooms(viewer({ blockedIds: ["starter"] }), [r], CAFE, NOW)).toEqual([]);
    // The starter blocked by the viewer sees nothing either (blockedIds holds both directions).
    expect(visibleRooms({ id: "starter", blockedIds: ["viewer"] }, [room({ starterId: "viewer" })], CAFE, NOW)).toEqual([]);
  });

  it("never shows a room again to someone the starter removed", () => {
    const r = room({ removedIds: ["viewer"] });
    expect(visibleRooms(viewer(), [r], CAFE, NOW)).toEqual([]);
  });

  it("returns at most 3 rooms, FITS YOU first, then nearest", () => {
    const rooms = [
      room({ id: "near", ...cell(northOf(100)) }),
      room({ id: "mid", ...cell(northOf(200)) }),
      room({ id: "fits", ...cell(northOf(400)), fitsYou: true }),
      room({ id: "last", ...cell(northOf(300)) }),
    ];
    expect(visibleRooms(viewer(), rooms, CAFE, NOW).map((r) => r.id)).toEqual(["fits", "near", "mid"]);
  });
});

function cell(c: { lat: number; lng: number }) {
  return { cellLat: c.lat, cellLng: c.lng };
}

describe("distance shown to the viewer", () => {
  it("rounds to 50 m and never gives an exact distance or direction", () => {
    expect(roundDistanceM(148)).toBe(150);
    expect(roundDistanceM(172)).toBe(150);
    expect(roundDistanceM(175)).toBe(200);
    expect(distanceLabel(148)).toBe("ABOUT 150 M AWAY");
    expect(distanceLabel(148)).not.toContain("148");
  });
});

describe("canJoin", () => {
  it("lets anyone nearby join an open room with space", () => {
    expect(canJoin(viewer(), room(), CAFE, NOW)).toBe(true);
  });

  it("refuses a 7th join", () => {
    const full = room({ memberIds: ["s", "a", "b", "c", "d", "e"] });
    expect(canJoin(viewer(), full, CAFE, NOW)).toBe(false);
  });

  it("refuses removed people, even with space", () => {
    expect(canJoin(viewer(), room({ removedIds: ["viewer"] }), CAFE, NOW)).toBe(false);
  });

  it("refuses when the viewer blocked anyone in the room, or was blocked", () => {
    const r = room({ memberIds: ["starter", "member"] });
    expect(canJoin(viewer({ blockedIds: ["member"] }), r, CAFE, NOW)).toBe(false);
    expect(canJoin(viewer({ blockedIds: ["starter"] }), r, CAFE, NOW)).toBe(false);
  });

  it("refuses far, closed and expired rooms", () => {
    const far = northOf(520);
    expect(canJoin(viewer(), room({ cellLat: far.lat, cellLng: far.lng }), CAFE, NOW)).toBe(false);
    expect(canJoin(viewer(), room({ status: "closed" }), CAFE, NOW)).toBe(false);
    expect(canJoin(viewer(), room({ endsAt: NOW.toISOString() }), CAFE, NOW)).toBe(false);
  });

  it("says full only when nothing hidden also applies", () => {
    const full = room({ memberIds: ["s", "a", "b", "c", "d", "e"] });
    expect(joinRefusal(viewer(), full, CAFE, NOW)).toBe("full");
    expect(joinRefusal(viewer({ blockedIds: ["s"] }), full, CAFE, NOW)).toBe("hidden");
    expect(joinRefusal(viewer(), room(), CAFE, NOW)).toBeNull();
  });
});

describe("remove and leave", () => {
  it("lets only the starter remove a member, never themselves", () => {
    expect(canRemove("starter", "starter", "member", true)).toBe(true);
    expect(canRemove("member", "starter", "other", true)).toBe(false);
    expect(canRemove("starter", "starter", "starter", true)).toBe(false);
    expect(canRemove("starter", "starter", "stranger", false)).toBe(false);
  });

  it("tells the removed person nothing but the neutral line", () => {
    expect(REMOVED_NOTE).toBe("That room is closed for you now");
  });
});

describe("names", () => {
  const cardInput = {
    topic: "Teach me a two-player game?",
    placeText: "Café du Coin, window table",
    endsAt: ENDS,
    cellLat: CAFE.lat,
    cellLng: CAFE.lng,
    memberCount: 2,
    memberNames: ["Hugo", "Lea"],
  };

  it("shows member first names to members only", () => {
    expect(roomCard(cardInput, CAFE, true).names).toEqual(["Hugo", "Lea"]);
    expect(roomCard(cardInput, CAFE, false).names).toBeNull();
  });

  it("shows non-members only the topic, place, rough distance, end time and size", () => {
    expect(roomCard(cardInput, CAFE, false)).toEqual({
      topic: "Teach me a two-player game?",
      placeText: "Café du Coin, window table",
      endsAt: ENDS,
      distance: "ABOUT 0 M AWAY",
      size: "2 IN · UP TO 6",
      names: null,
    });
  });
});

describe("limits", () => {
  it("allows 1 open room per starter and 5 starts a day", () => {
    expect(canStartRoom(0, 0)).toBe(true);
    expect(canStartRoom(1, 1)).toBe(false);
    expect(canStartRoom(0, 5)).toBe(false);
  });

  it("allows 2 joined rooms at once and 10 joins an hour", () => {
    expect(canJoinAnother(1, 0)).toBe(true);
    expect(canJoinAnother(2, 0)).toBe(false);
    expect(canJoinAnother(0, 10)).toBe(false);
  });
});

describe("expiry", () => {
  it("reads only 30, 60 or 120 minutes", () => {
    expect(normalizeDuration(30)).toBe(30);
    expect(normalizeDuration(60)).toBe(60);
    expect(normalizeDuration(120)).toBe(120);
    for (const v of [0, 45, 90, "60", null]) expect(normalizeDuration(v)).toBeNull();
  });

  it("ends the room after its duration", () => {
    expect(roomEndsAt(new Date("2026-11-02T14:00:00.000Z"), 60)).toBe("2026-11-02T15:00:00.000Z");
  });
});

describe("room replies", () => {
  it("allows the five set codes only, no free text", () => {
    expect(ROOM_REPLIES).toEqual(["AT_THE_SPOT", "ON_MY_WAY", "FIVE_LATE", "CALL_IT_OFF", "LEAVE"]);
    expect(isRoomReply("ON_MY_WAY")).toBe(true);
    expect(isRoomReply("hello there")).toBe(false);
  });
});
