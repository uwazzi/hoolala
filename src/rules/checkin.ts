// WP20 check-in rules. Pure: no I/O, no clock, no randomness.

import type { CheckinRow, PlaceKind } from "../types";

export const CHECKIN_HOURS = 4;
export const NEARBY_RADIUS_M = 150;
export const MAX_NEARBY = 5;
export const MAX_SEARCH = 5;

/** Supported cities: a place's city comes from its own coordinates. */
export const CITIES = [
  { id: "lausanne", name: "Lausanne", lat: 46.5197, lng: 6.6323 },
  { id: "geneva", name: "Geneva", lat: 46.2044, lng: 6.1432 },
  { id: "zurich", name: "Zurich", lat: 47.3769, lng: 8.5417 },
  { id: "bern", name: "Bern", lat: 46.948, lng: 7.4474 },
  { id: "basel", name: "Basel", lat: 47.5596, lng: 7.5886 },
] as const;
export const CITY_RADIUS_M = 12_000;
export type CityId = (typeof CITIES)[number]["id"];

export const PLACE_KINDS: readonly PlaceKind[] = ["cafe", "bar", "coworking", "library", "food", "shop", "outdoors", "culture", "sport", "other"];

export interface Point {
  lat: number;
  lng: number;
}

/** A coordinate pair as sent by a phone, or null when it isn't one. */
export function parsePoint(lat: unknown, lng: unknown): Point | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Great-circle distance in metres. */
export function distanceM(a: Point, b: Point): number {
  const r = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function withinRadius(person: Point, place: Point, radiusM = NEARBY_RADIUS_M): boolean {
  return distanceM(person, place) <= radiusM;
}

/** HERE under 50 m, NEXT DOOR otherwise. Never an exact distance. */
export function distanceBand(metres: number): "here" | "next_door" {
  return metres < 50 ? "here" : "next_door";
}

export function cityFor(point: Point): CityId | null {
  let best: { id: CityId; d: number } | null = null;
  for (const city of CITIES) {
    const d = distanceM(point, city);
    if (d <= CITY_RADIUS_M && (!best || d < best.d)) best = { id: city.id, d };
  }
  return best?.id ?? null;
}

/** The known city's display name, as a fallback when the locality lookup fails. */
export function knownCityName(point: Point): string | null {
  const id = cityFor(point);
  return id ? CITIES.find((c) => c.id === id)!.name : null;
}

/**
 * A town or village name as people write it: 2 to 60 letters, with spaces,
 * hyphens, apostrophes and dots. Null when it can't be one.
 */
export function normalizeLocality(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return null;
  if (!/^\p{L}[\p{L}\p{M} .'’()-]*$/u.test(name)) return null;
  return name;
}

/** What search compares: no accents, no case, single spaces. "Échallens" and "echallens" match. */
export function localityKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCity(value: unknown): value is CityId {
  return typeof value === "string" && CITIES.some((c) => c.id === value);
}

export function isPlaceKind(value: unknown): value is PlaceKind {
  return typeof value === "string" && (PLACE_KINDS as readonly string[]).includes(value);
}

export function checkinEnds(start: Date): string {
  return new Date(start.getTime() + CHECKIN_HOURS * 60 * 60 * 1000).toISOString();
}

export function isActive(checkin: Pick<CheckinRow, "ends_at" | "left_at">, now: Date): boolean {
  return checkin.left_at === null && Date.parse(checkin.ends_at) > now.getTime();
}

const HOME_WORDS =
  /\b(home|my place|my flat|my house|my room|apartment|appartement|chez moi|maison|wohnung|zuhause|daheim|bedroom)\b/i;
// German street names are compounds (Bahnhofstrasse), so those match as suffixes.
const STREET_WORDS =
  /\b(rue|route|chemin|avenue|av\.|boulevard|bd|place|street|st\.|road|rd\.|lane)\b|(strasse|straße|str\.|gasse|weg|platz)\b/i;

/**
 * Public places only: 2 to 60 characters, no links, emails or phone numbers,
 * nothing that reads as someone's home or a street address.
 */
export function placeNameProblem(raw: unknown): "length" | "contact" | "home" | "address" | null {
  if (typeof raw !== "string") return "length";
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return "length";
  if (/https?:|www\.|\.[a-z]{2,}\/|@|\+?\d[\d\s().-]{6,}\d/i.test(name)) return "contact";
  if (HOME_WORDS.test(name)) return "home";
  if (/\d/.test(name) && STREET_WORDS.test(name)) return "address";
  return null;
}

export function normalizePlaceName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function slugify(name: string, suffix: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "place"}-${suffix}`;
}

/** Partner place codes: four letters, case-insensitive. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

/** Search text: 2 to 40 characters, matched case-insensitively. */
export function normalizeQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.trim().replace(/\s+/g, " ");
  return q.length >= 2 && q.length <= 40 ? q : null;
}
