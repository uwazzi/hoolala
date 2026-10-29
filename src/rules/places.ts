// WP25 place facts and place points. Pure. Points are private, small and
// hard to farm: only while checked in at that place, never for confirming
// your own detail, counted when someone else confirms or after 24 hours
// without a dispute, at most 30 a day, one confirm per detail per month.
// No leaderboards, public totals, streaks or levels anywhere.

import type { ContributionAction, FactField } from "../types";

export const POINTS: Record<ContributionAction, number> = { add_place: 10, add_fact: 5, fix_fact: 5, confirm_fact: 2 };
export const DAILY_CAP = 30;
export const SETTLE_MS = 24 * 60 * 60 * 1000;
export const WEB_FACT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const FACT_FIELDS: { id: FactField; label: string }[] = [
  { id: "hours", label: "Opening hours" },
  { id: "menu_item", label: "On the menu" },
  { id: "price", label: "A price" },
  { id: "spot", label: "A spot to sit" },
  { id: "wifi", label: "Wi-fi" },
  { id: "sockets", label: "Sockets" },
  { id: "quiet", label: "Noise" },
  { id: "rule", label: "House rule" },
];

export function isFactField(v: unknown): v is FactField {
  return typeof v === "string" && FACT_FIELDS.some((f) => f.id === v);
}

/** A detail as people write it: one short line, 2 to 80 characters. */
export function normalizeFactValue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().replace(/\s+/g, " ");
  return v.length >= 2 && v.length <= 80 ? v : null;
}

export type ConfirmProblem = "own" | "not_here" | "already" | "gone";

/** THAT'S RIGHT: someone else, checked in at that place now, once a month per detail. */
export function confirmProblem(
  fact: { added_by: string | null; state: string },
  userId: string,
  checkedInHere: boolean,
  confirmedThisMonth: boolean,
): ConfirmProblem | null {
  if (!checkedInHere) return "not_here";
  if (fact.added_by === userId) return "own";
  if (fact.state === "disputed") return "gone";
  if (confirmedThisMonth) return "already";
  return null;
}

/**
 * Whether a pending add or fix may now count: someone else confirmed it, or a
 * day passed without a dispute. A disputed detail never counts.
 */
export function settles(
  c: { created_at: string },
  fact: { state: string; confirmations: number } | null,
  now: Date,
): "count" | "reject" | "wait" {
  if (!fact) return "reject";
  if (fact.state === "disputed") return "reject";
  if (fact.confirmations > 0) return "count";
  return now.getTime() - Date.parse(c.created_at) >= SETTLE_MS ? "count" : "wait";
}

/** Points that may still count today, under the daily cap. */
export function underCap(countedToday: number, points: number): number {
  return Math.max(0, Math.min(points, DAILY_CAP - countedToday));
}

/** Web facts are kept 30 days; after that PLACE IT looks again. */
export function webFactsStale(newestWebFactAt: string | null, now: Date): boolean {
  return !newestWebFactAt || now.getTime() - Date.parse(newestWebFactAt) > WEB_FACT_TTL_MS;
}

export function monthOf(now: Date): string {
  return now.toISOString().slice(0, 7);
}

// WP32 Around me: metres, bearings, fit and talking labels. Pure.

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const t = Math.PI / 180;
  const dLat = (lat2 - lat1) * t;
  const dLng = (lng2 - lng1) * t;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Compass bearing from the person to the place, 0 to 360, 0 is north. */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const t = Math.PI / 180;
  const dLng = (lng2 - lng1) * t;
  const y = Math.sin(dLng) * Math.cos(lat2 * t);
  const x = Math.cos(lat1 * t) * Math.sin(lat2 * t) - Math.sin(lat1 * t) * Math.cos(lat2 * t) * Math.cos(dLng);
  return ((Math.atan2(y, x) / t) % 360 + 360) % 360;
}

/** Any compass word of 4+ letters found in the place's words. */
export function compassOverlap(interests: string[], haystack: string): boolean {
  const hay = haystack.toLowerCase();
  return interests.some((i) =>
    i
      .toLowerCase()
      .split(/[^a-zà-ÿ]+/i)
      .some((w) => w.length >= 4 && hay.includes(w)),
  );
}

export type Fit = "GOOD" | "OK" | "LOW";

/** GOOD needs the compass plus something real (features or visits). */
export function fitFor(input: { compass: boolean; features: boolean; visits: number }): Fit {
  if (input.compass && (input.features || input.visits >= 5)) return "GOOD";
  if (input.compass || input.features || input.visits >= 5) return "OK";
  return "LOW";
}

export type Talking = "LOW" | "MIXED" | "HIGH";

/** Median of ratings from the last 90 days; fewer than 3 stays unlabeled. */
export function talkingLabel(ratings: { value: number; visit_date: string }[], nowIso: string): Talking | null {
  const cutoff = Date.parse(nowIso) - 90 * 86_400_000;
  const values = ratings
    .filter((r) => Date.parse(r.visit_date) >= cutoff)
    .map((r) => r.value)
    .sort((a, b) => a - b);
  if (values.length < 3) return null;
  const median = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  return median <= 1.5 ? "LOW" : median >= 2.5 ? "HIGH" : "MIXED";
}
