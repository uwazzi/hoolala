// WP32 Around me (v6.1 rework). POST /api/around/scan (borrowed location,
// never stored: nearby places with fit, talking level, WHY GO, tiny try,
// workings line, today's read and the open-signal count) and
// POST /api/around/rate (one talking value per place per week). Signed in
// only; rating needs an active check-in at that place.

import { compassTexts } from "../db/compass";
import { getActiveCheckin, getPlace, placesInBox } from "../db/places";
import { openSignalCount, ratePlace, ratedThisWeek, readLinks, talkingRatings, visitCount } from "../db/around";
import { factsForPlace } from "../db/facts";
import { llmEnabled } from "../llm/client";
import { mapNearby, type MapPlace } from "../places/provider";
import { readIt } from "../llm/readit";
import { templateWhy, whyGo, type WhyGoPlace } from "../llm/whygo";
import { openLabel, openState, resolveTimeZone, type OpenInfo } from "../rules/hours";
import { displayLink } from "../rules/pages";
import {
  bearingDeg,
  compassWords,
  fitFor,
  haversineM,
  talkingLabel,
  talkingWord,
  templateTry,
  weekKey,
  workingsLine,
  type TalkingLevel,
} from "../rules/places";
import type { Env, PlaceKind } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

// TEMP testing: 20 scans an hour; revert to 10 after the test (owner call).
const SCAN_LIMIT = { max: 20, windowS: 60 * 60 };
const RATE_LIMIT = { max: 20, windowS: 24 * 60 * 60 };
const MAX_PLACES = 8;
const READ_PLACES = 3;
const FIT_RANK = { GOOD: 0, OK: 1, LOW: 2 } as const;

interface ScanPlace {
  id: string;
  name: string;
  kind: PlaceKind;
  source: "hoolala" | "osm" | "google";
  /** Map places check in by refetching the provider, never by client id. */
  external?: { provider: "osm" | "google"; id: string };
  distance_m: number;
  bearing: number;
  lat: number;
  lng: number;
  fit: "GOOD" | "OK" | "LOW";
  talking: { level: TalkingLevel; word: string } | null;
  why: string;
  why_source: "why_go" | "template";
  tiny_try: string;
  workings: string;
  facts: string[];
  visits: number;
  here_now: number;
  /** Open now or opening within the hour, when the listing says so. */
  open: { label: string | null };
  /** Public listing details: shown on the card, never stored. */
  contact: { hours: string | null; phone: string | null; website: string | null; website_label: string | null };
  read: { items: string[]; hours: string | null; kind: string; source: string } | null;
}

function boxFor(lat: number, lng: number, radiusM: number) {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

export async function handleScan(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (body.consent !== true) return json({ error: "needs_consent" }, 400);
  const { lat, lng, widen } = body as { lat: unknown; lng: unknown; widen: unknown };
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return json({ error: "bad_location" }, 400);
  }
  const timeZone = resolveTimeZone((body as { tz?: unknown }).tz);
  const steps = widen === undefined ? 0 : widen;
  if (steps !== 0 && steps !== 1 && steps !== 2) return json({ error: "bad_widen" }, 400);
  if (await overLimit(env, `scan:${user.id}`, SCAN_LIMIT)) return json({ error: "rate_limited" }, 429);

  const radiusM = 500 * 2 ** (steps as number);
  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const compass = await compassTexts(env.DB, user.id);

  const ours = (await placesInBox(env.DB, boxFor(lat, lng, radiusM)))
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ place: p, distance_m: Math.round(haversineM(lat, lng, p.lat as number, p.lng as number)) }))
    .filter((r) => r.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, MAX_PLACES);

  // Live map places fill what the database doesn't know; ours win the ties.
  const live = (await mapNearby(env, { lat, lng }, radiusM))
    .map((map) => ({ map, distance_m: Math.round(haversineM(lat, lng, map.point.lat, map.point.lng)) }))
    .filter((r) => r.distance_m <= radiusM)
    .filter((r) => !ours.some((o) => (r.map.provider === "osm" ? o.place.osm_id : o.place.google_place_id) === r.map.id))
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, MAX_PLACES);

  const enriched = (
    await Promise.all([
      ...ours.map(async (r) => {
        const rows = await factsForPlace(env.DB, r.place.id, now);
        const facts = rows.slice(0, 6);
        const visits = await visitCount(env.DB, r.place.id, cutoff);
        const level = talkingLabel(await talkingRatings(env.DB, r.place.id), nowIso);
        const words = `${r.place.name} ${facts.map((f) => f.value).join(" ")}`;
        const matched = compassWords(compass, words);
        return {
          id: r.place.id,
          name: r.place.name,
          kind: r.place.kind,
          source: "hoolala" as const,
          external: undefined as ScanPlace["external"],
          distance_m: r.distance_m,
          bearing: Math.round(bearingDeg(lat, lng, r.place.lat as number, r.place.lng as number)),
          lat: r.place.lat as number,
          lng: r.place.lng as number,
          fit: fitFor({ compass: matched.length > 0, features: facts.length > 0, visits }),
          talking: level ? { level, word: talkingWord(level) } : null,
          matched,
          link: async () => (await readLinks(env.DB, r.place.id))[0] ?? null,
          facts: facts.map((f) => f.value),
          // People's free-text hours are shown, never parsed: only map tags filter.
          contact: { hours: rows.find((f) => f.field === "hours")?.value ?? null, phone: null, site: null },
          openInfo: { state: "unknown", opensAt: null, today: null } as OpenInfo,
          visits,
          hereNow: await openSignalCount(env.DB, r.place.id, nowIso),
        };
      }),
      ...live.map(async (r) => {
        const matched = compassWords(compass, r.map.name);
        const info = openState(r.map.hours, now, timeZone);
        return {
          id: `${r.map.provider}:${r.map.id}`,
          name: r.map.name,
          kind: r.map.kind,
          source: r.map.provider,
          external: { provider: r.map.provider, id: r.map.id } as ScanPlace["external"],
          distance_m: r.distance_m,
          bearing: Math.round(bearingDeg(lat, lng, r.map.point.lat, r.map.point.lng)),
          lat: r.map.point.lat,
          lng: r.map.point.lng,
          fit: fitFor({ compass: matched.length > 0, features: false, visits: 0 }),
          talking: null as ScanPlace["talking"],
          matched,
          link: async () => r.map.website ?? null,
          facts: [] as string[],
          contact: { hours: info.today, phone: r.map.phone ?? null, site: displayLink(r.map.website) },
          openInfo: info,
          visits: 0,
          hereNow: 0,
        };
      }),
    ])
    // Open now, opening soon, or hours unknown. Known-closed stays out.
  ).filter((e) => e.openInfo.state !== "closed" || openLabel(e.openInfo, now, timeZone) !== null);

  const whys = llmEnabled(env)
    ? await whyGo(
        env,
        user.id,
        enriched.map(
          (e): WhyGoPlace => ({
            id: e.id,
            name: e.name,
            kind: e.kind,
            distance_m: e.distance_m,
            facts: e.facts.map((text, i) => ({ id: `f${i}`, text })),
            compass,
            visits: e.visits,
            talking: e.talking?.word ?? null,
          }),
        ),
      )
    : null;
  const whyById = new Map((whys ?? []).map((w) => [w.place_id, w]));

  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const places: ScanPlace[] = enriched.map((e) => {
    const fallback: WhyGoPlace = {
      id: e.id,
      name: e.name,
      kind: e.kind,
      distance_m: e.distance_m,
      facts: e.facts.map((text, j) => ({ id: `f${j}`, text })),
      compass,
      visits: e.visits,
      talking: e.talking?.word ?? null,
    };
    const why = whyById.get(e.id);
    return {
      id: e.id,
      name: e.name,
      kind: e.kind,
      source: e.source,
      ...(e.external ? { external: e.external } : {}),
      distance_m: e.distance_m,
      bearing: e.bearing,
      lat: e.lat,
      lng: e.lng,
      fit: e.fit,
      talking: e.talking,
      why: why?.why ?? templateWhy(fallback),
      why_source: (why ? "why_go" : "template") as ScanPlace["why_source"],
      tiny_try: why?.tiny_try ?? templateTry(e.id),
      workings: workingsLine({
        compass: e.matched,
        feature: e.facts[0] ?? null,
        talking: e.talking?.word ?? null,
        visits: e.visits,
        fit: e.fit,
      }),
      facts: e.facts,
      visits: e.visits,
      here_now: e.hereNow,
      open: { label: openLabel(e.openInfo, now, timeZone) },
      contact: {
        hours: e.contact.hours,
        phone: e.contact.phone,
        website: e.contact.site?.href ?? null,
        website_label: e.contact.site?.label ?? null,
      },
      read: null as ScanPlace["read"],
    };
  });
  places.sort(
    (a, b) => FIT_RANK[a.fit] - FIT_RANK[b.fit] || (b.talking?.level ?? -1) - (a.talking?.level ?? -1) || a.distance_m - b.distance_m,
  );
  const shown = places.slice(0, MAX_PLACES);
  if (llmEnabled(env)) {
    const byId = new Map(enriched.map((e) => [e.id, e]));
    await Promise.all(
      shown.slice(0, READ_PLACES).map(async (p) => {
        const link = await byId.get(p.id)?.link();
        if (!link) return;
        const menu = await readIt(env, user.id, link, p.name, dateLabel);
        if (menu) p.read = { ...menu.menu, source: menu.source };
      }),
    );
  }
  return json({ radius_m: radiusM, places: shown });
}

/** GOODBYE: how was the talking where you are right now, one value a week. */
export async function handleRate(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const { place_id, value } = body as { place_id: unknown; value: unknown };
  if (typeof place_id !== "string" || !(await getPlace(env.DB, place_id))) return json({ error: "unknown_place" }, 404);
  if (value !== 1 && value !== 2 && value !== 3 && value !== 4 && value !== 5) return json({ error: "bad_value" }, 400);
  const checkin = await getActiveCheckin(env.DB, user.id, now.toISOString());
  if (!checkin || checkin.place_id !== place_id) return json({ error: "not_here" }, 403);
  if (await overLimit(env, `rate:${user.id}`, RATE_LIMIT)) return json({ error: "rate_limited" }, 429);
  const visitDate = now.toISOString().slice(0, 10);
  if (await ratedThisWeek(env.DB, place_id, user.id, weekKey(visitDate))) return json({ error: "rated_this_week" }, 409);
  await ratePlace(env.DB, {
    placeId: place_id,
    userId: user.id,
    value,
    visitDate,
    week: weekKey(visitDate),
    nowIso: now.toISOString(),
  });
  return json({ ok: true });
}
