// WP22 Signals here rules. Pure: no I/O, no clock, no randomness.
// Every read path (discover, peek, notifications, PLAN IT tools) uses
// canSee; names go through canSeeNames. Never decide visibility elsewhere.

import type { SignalResponseRow, SignalRow } from "../types";

export const TOPIC_MAX = 60;
export const LINE_MAX = 60;
export const MAX_OPEN_SIGNALS = 2;
export const CURIOUS_PER_HOUR = 5;
export const DISCOVER_LIMIT = 3;
const AFTER_TIME_MS = 30 * 60 * 1000;
const MAX_LIFE_MS = 2 * 60 * 60 * 1000;
const LATEST_WHEN_MS = 90 * 60 * 1000;

/** Used when a place has no spots of its own yet. */
export const DEFAULT_SPOTS = ["At the counter", "The big table", "By the window", "Outside", "By the entrance"];

export function placeSpots(spotsJson: string | null): string[] {
  if (!spotsJson) return DEFAULT_SPOTS;
  try {
    const spots = JSON.parse(spotsJson);
    if (Array.isArray(spots) && spots.length && spots.every((s) => typeof s === "string")) return spots;
  } catch {
    // Fall through to the defaults.
  }
  return DEFAULT_SPOTS;
}

export function normalizeSpot(raw: unknown, spots: string[]): string | null {
  return typeof raw === "string" && spots.includes(raw) ? raw : null;
}

export function normalizeCapacity(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 3 ? raw : null;
}

/** WHEN: "now", "in30", or a time today as ISO, from now up to 90 minutes ahead. */
export function whenAt(raw: unknown, now: Date): Date | null {
  if (raw === "now") return now;
  if (raw === "in30") return new Date(now.getTime() + 30 * 60 * 1000);
  if (typeof raw !== "string") return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  if (t < now.getTime() - 60 * 1000 || t > now.getTime() + LATEST_WHEN_MS) return null;
  return new Date(Math.max(t, now.getTime()));
}

/** At the chosen time plus 30 minutes, and never more than 2 hours after posting. */
export function expiresAt(created: Date, when: Date): string {
  return new Date(Math.min(when.getTime() + AFTER_TIME_MS, created.getTime() + MAX_LIFE_MS)).toISOString();
}

export function canPost(openSignals: number): boolean {
  return openSignals < MAX_OPEN_SIGNALS;
}

export function canBeCurious(curiousLastHour: number): boolean {
  return curiousLastHour < CURIOUS_PER_HOUR;
}

export interface SeeContext {
  viewerId: string;
  /** The place the viewer is checked in at right now, or null. */
  viewerPlaceId: string | null;
  /** Whether the signal's owner is checked in at that place right now. */
  ownerHere: boolean;
  /** Whether either has blocked the other. */
  blocked: boolean;
  now: Date;
}

/**
 * A viewer sees a place signal only if both are checked in at that place now,
 * it is open and unexpired, neither blocked the other, and it isn't theirs.
 */
export function canSee(signal: Pick<SignalRow, "owner_id" | "audience" | "place_id" | "state" | "expires_at">, ctx: SeeContext): boolean {
  return (
    signal.audience === "place" &&
    signal.owner_id !== ctx.viewerId &&
    signal.place_id !== null &&
    signal.place_id === ctx.viewerPlaceId &&
    ctx.ownerHere &&
    !ctx.blocked &&
    signal.state === "open" &&
    Date.parse(signal.expires_at) > ctx.now.getTime()
  );
}

/** First names only between the owner and an accepted responder, never before. */
export function canSeeNames(
  viewerId: string,
  ownerId: string,
  response: Pick<SignalResponseRow, "responder_id" | "state">,
): boolean {
  return response.state === "accepted" && (viewerId === ownerId || viewerId === response.responder_id);
}

/** Accepting fills a place; at capacity the signal is full and leaves discovery. */
export function canAccept(accepted: number, capacity: number): boolean {
  return accepted < capacity;
}

export function stateAfterAccept(accepted: number, capacity: number): "open" | "full" {
  return accepted + 1 >= capacity ? "full" : "open";
}

export const QUICK_REPLIES = ["on_my_way", "five_late", "cant_make_it", "at_spot"] as const;
export type QuickReplyKind = (typeof QUICK_REPLIES)[number];

export function isQuickReply(raw: unknown): raw is QuickReplyKind {
  return typeof raw === "string" && (QUICK_REPLIES as readonly string[]).includes(raw);
}

/** Only the owner and accepted responders talk, and only in quick replies. */
export function canQuickReply(userId: string, ownerId: string, acceptedResponderIds: string[]): boolean {
  return userId === ownerId || acceptedResponderIds.includes(userId);
}

export function quickReplyText(kind: QuickReplyKind, spot: string | null): string {
  switch (kind) {
    case "on_my_way":
      return "On my way.";
    case "five_late":
      return "5 minutes late.";
    case "cant_make_it":
      return "Can't make it. Sorry!";
    case "at_spot":
      return spot ? `We're at: ${spot.toLowerCase()}.` : "We're here.";
  }
}
