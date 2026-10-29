// WP32 Around me. POST /api/around/scan (borrowed location, never stored:
// nearby places with fit, talking label, WHY GO and today's read) and
// POST /api/around/rate (leave a talking value after a visit). Signed in
// only; rating needs an active check-in at that place.

import { compassTexts } from "../db/compass";
import { getActiveCheckin, getPlace, placesInBox } from "../db/places";
import { ratePlace, readLinks, talkingRatings, visitCount } from "../db/around";
import { factsForPlace } from "../db/facts";
import { llmEnabled } from "../llm/client";
import { readIt } from "../llm/readit";
import { templateWhy, whyGo, type WhyGoPlace } from "../llm/whygo";
import {
  bearingDeg,
  compassOverlap,
  fitFor,
  haversineM,
  talkingLabel,
  type Talking,
} from "../rules/places";
import type { Env, PlaceKind } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const SCAN_LIMIT = { max: 10, windowS: 60 * 60 };
const RATE_LIMIT = { max: 20, windowS: 24 * 60 * 60 };
const MAX_PLACES = 8;
const READ_PLACES = 3;
const TALKING: Record<Talking, "QUIET" | "CHATTY" | "LIVELY"> = { LOW: "QUIET", MIXED: "CHATTY", HIGH: "LIVELY" };

interface ScanPlace {
  id: string;
  name: string;
  kind: PlaceKind;
  distance_m: number;
  bearing: number;
  fit: "GOOD" | "OK" | "LOW";
  talking: "QUIET" | "CHATTY" | "LIVELY" | null;
  why: string;
  why_source: "why_go" | "template";
  facts: string[];
  visits: number;
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
  const steps = widen === undefined ? 0 : widen;
  if (steps !== 0 && steps !== 1 && steps !== 2) return json({ error: "bad_widen" }, 400);
  if (await overLimit(env, `scan:${user.id}`, SCAN_LIMIT)) return json({ error: "rate_limited" }, 429);

  const radiusM = 500 * 2 ** (steps as number);
  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const compass = await compassTexts(env.DB, user.id);

  const found = (await placesInBox(env.DB, boxFor(lat, lng, radiusM)))
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ place: p, distance_m: Math.round(haversineM(lat, lng, p.lat as number, p.lng as number)) }))
    .filter((r) => r.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, MAX_PLACES);

  const enriched = await Promise.all(
    found.map(async (r) => {
      const facts = (await factsForPlace(env.DB, r.place.id, now)).slice(0, 6);
      const visits = await visitCount(env.DB, r.place.id, cutoff);
      const talking = talkingLabel(await talkingRatings(env.DB, r.place.id), nowIso);
      const words = `${r.place.name} ${facts.map((f) => f.value).join(" ")}`;
      return {
        ...r,
        bearing: Math.round(bearingDeg(lat, lng, r.place.lat as number, r.place.lng as number)),
        fit: fitFor({ compass: compassOverlap(compass, words), features: facts.length > 0, visits }),
        talking: talking ? TALKING[talking] : null,
        facts: facts.map((f) => f.value),
        visits,
      };
    }),
  );

  const whys = llmEnabled(env)
    ? await whyGo(
        env,
        user.id,
        enriched.map(
          (e): WhyGoPlace => ({
            id: e.place.id,
            name: e.place.name,
            kind: e.place.kind,
            distance_m: e.distance_m,
            facts: e.facts.map((text, i) => ({ id: `f${i}`, text })),
            compass,
            visits: e.visits,
            talking: e.talking,
          }),
        ),
      )
    : null;
  const whyById = new Map((whys ?? []).map((w) => [w.place_id, w.why]));

  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const places: ScanPlace[] = await Promise.all(
    enriched.map(async (e, i) => {
      const fallback: WhyGoPlace = {
        id: e.place.id,
        name: e.place.name,
        kind: e.place.kind,
        distance_m: e.distance_m,
        facts: e.facts.map((text, j) => ({ id: `f${j}`, text })),
        compass,
        visits: e.visits,
        talking: e.talking,
      };
      const why = whyById.get(e.place.id);
      let read: ScanPlace["read"] = null;
      if (llmEnabled(env) && i < READ_PLACES) {
        const links = await readLinks(env.DB, e.place.id);
        if (links[0]) {
          const menu = await readIt(env, user.id, links[0], e.place.name, dateLabel);
          if (menu) read = { ...menu.menu, source: menu.source };
        }
      }
      return {
        id: e.place.id,
        name: e.place.name,
        kind: e.place.kind,
        distance_m: e.distance_m,
        bearing: e.bearing,
        fit: e.fit,
        talking: e.talking,
        why: why ?? templateWhy(fallback),
        why_source: why ? "why_go" : "template",
        facts: e.facts,
        visits: e.visits,
        read,
      };
    }),
  );
  return json({ radius_m: radiusM, places });
}

/** GOODBYE: how was the talking where you are right now. */
export async function handleRate(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const { place_id, value } = body as { place_id: unknown; value: unknown };
  if (typeof place_id !== "string" || !(await getPlace(env.DB, place_id))) return json({ error: "unknown_place" }, 404);
  if (value !== 1 && value !== 2 && value !== 3) return json({ error: "bad_value" }, 400);
  const checkin = await getActiveCheckin(env.DB, user.id, now.toISOString());
  if (!checkin || checkin.place_id !== place_id) return json({ error: "not_here" }, 403);
  if (await overLimit(env, `rate:${user.id}`, RATE_LIMIT)) return json({ error: "rate_limited" }, 429);
  await ratePlace(env.DB, {
    placeId: place_id,
    userId: user.id,
    value,
    visitDate: now.toISOString().slice(0, 10),
    nowIso: now.toISOString(),
  });
  return json({ ok: true });
}
