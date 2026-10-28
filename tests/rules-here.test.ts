import { describe, expect, it } from "vitest";
import {
  canAccept,
  canBeCurious,
  canPost,
  canQuickReply,
  canSee,
  canSeeNames,
  DEFAULT_SPOTS,
  expiresAt,
  isQuickReply,
  normalizeCapacity,
  normalizeSpot,
  placeSpots,
  quickReplyText,
  stateAfterAccept,
  whenAt,
} from "../src/rules/here";

const now = new Date("2026-10-28T14:00:00.000Z");
const signal = { owner_id: "owner", audience: "place" as const, place_id: "cafe", state: "open" as const, expires_at: "2026-10-28T15:00:00.000Z" };
const ctx = { viewerId: "viewer", viewerPlaceId: "cafe", ownerHere: true, blocked: false, now };

describe("canSee", () => {
  it("shows an open signal to someone checked in at the same place", () => {
    expect(canSee(signal, ctx)).toBe(true);
  });

  it("hides it from another place, or from someone not checked in", () => {
    expect(canSee(signal, { ...ctx, viewerPlaceId: "bar" })).toBe(false);
    expect(canSee(signal, { ...ctx, viewerPlaceId: null })).toBe(false);
  });

  it("hides it when the owner has left", () => {
    expect(canSee(signal, { ...ctx, ownerHere: false })).toBe(false);
  });

  it("hides it both ways after a block", () => {
    expect(canSee(signal, { ...ctx, blocked: true })).toBe(false);
  });

  it("never shows the viewer their own signal in discovery", () => {
    expect(canSee(signal, { ...ctx, viewerId: "owner" })).toBe(false);
  });

  it("hides full, cancelled, expired and non-place signals", () => {
    for (const state of ["full", "cancelled", "expired"] as const) expect(canSee({ ...signal, state }, ctx)).toBe(false);
    expect(canSee({ ...signal, expires_at: now.toISOString() }, ctx)).toBe(false);
    expect(canSee({ ...signal, audience: "circle" }, ctx)).toBe(false);
  });
});

describe("canSeeNames", () => {
  it("reveals first names only between owner and an accepted responder", () => {
    const accepted = { responder_id: "r", state: "accepted" as const };
    expect(canSeeNames("owner", "owner", accepted)).toBe(true);
    expect(canSeeNames("r", "owner", accepted)).toBe(true);
    expect(canSeeNames("someone-else", "owner", accepted)).toBe(false);
  });

  it("keeps everyone anonymous before acceptance", () => {
    for (const state of ["requested", "declined", "withdrawn"] as const) {
      expect(canSeeNames("owner", "owner", { responder_id: "r", state })).toBe(false);
      expect(canSeeNames("r", "owner", { responder_id: "r", state })).toBe(false);
    }
  });
});

describe("time", () => {
  it("reads now, in 30 minutes and a time up to 90 minutes ahead", () => {
    expect(whenAt("now", now)).toEqual(now);
    expect(whenAt("in30", now)!.toISOString()).toBe("2026-10-28T14:30:00.000Z");
    expect(whenAt("2026-10-28T15:15:00.000Z", now)!.toISOString()).toBe("2026-10-28T15:15:00.000Z");
  });

  it("refuses the past and more than 90 minutes ahead", () => {
    expect(whenAt("2026-10-28T13:00:00.000Z", now)).toBeNull();
    expect(whenAt("2026-10-28T16:00:00.000Z", now)).toBeNull();
    expect(whenAt("tomorrow", now)).toBeNull();
  });

  it("expires at the time plus 30 minutes, capped at 2 hours", () => {
    expect(expiresAt(now, now)).toBe("2026-10-28T14:30:00.000Z");
    expect(expiresAt(now, new Date("2026-10-28T15:30:00.000Z"))).toBe("2026-10-28T16:00:00.000Z");
  });
});

describe("limits and capacity", () => {
  it("allows 2 open signals and 5 curious per hour", () => {
    expect(canPost(1)).toBe(true);
    expect(canPost(2)).toBe(false);
    expect(canBeCurious(4)).toBe(true);
    expect(canBeCurious(5)).toBe(false);
  });

  it("fills up at capacity", () => {
    expect(canAccept(0, 1)).toBe(true);
    expect(canAccept(1, 1)).toBe(false);
    expect(stateAfterAccept(0, 1)).toBe("full");
    expect(stateAfterAccept(0, 2)).toBe("open");
    expect(stateAfterAccept(1, 2)).toBe("full");
  });

  it("reads capacity 1 to 3 only", () => {
    expect(normalizeCapacity(3)).toBe(3);
    for (const v of [0, 4, 1.5, "2"]) expect(normalizeCapacity(v)).toBeNull();
  });
});

describe("spots and quick replies", () => {
  it("uses the place's spots, or sensible defaults", () => {
    expect(placeSpots('["Terrace","Bar"]')).toEqual(["Terrace", "Bar"]);
    expect(placeSpots(null)).toEqual(DEFAULT_SPOTS);
    expect(placeSpots("broken")).toEqual(DEFAULT_SPOTS);
    expect(normalizeSpot("Terrace", ["Terrace"])).toBe("Terrace");
    expect(normalizeSpot("My flat", ["Terrace"])).toBeNull();
  });

  it("lets only the owner and accepted responders reply, in four set phrases", () => {
    expect(canQuickReply("owner", "owner", [])).toBe(true);
    expect(canQuickReply("r", "owner", ["r"])).toBe(true);
    expect(canQuickReply("stranger", "owner", ["r"])).toBe(false);
    expect(isQuickReply("on_my_way")).toBe(true);
    expect(isQuickReply("hello there")).toBe(false);
    expect(quickReplyText("at_spot", "The big table")).toBe("We're at: the big table.");
  });
});
