// SUGGEST IT: three topic ideas for the place and the hour, with at most one
// web search for something happening nearby today. Every event idea must cite
// a URL the search returned (src/rules/grounding.ts) and every idea passes the
// code rules and SCREEN IT. Only place information goes in; never anything
// about the person. Cached per place for an hour. Ideas are suggestions:
// USE THIS fills the text box, nothing is ever posted automatically.

import { type Idea, type RawIdea, ground, MAX_IDEAS, starterIdeas } from "../rules/grounding";
import { screenText } from "../rules/screening";
import type { Env, PlaceRow } from "../types";
import { searchStructured } from "./client";
import { screenWithModel } from "./screen";

const CACHE_TTL_S = 60 * 60;

const INSTRUCTIONS = `You suggest short invitations to talk that someone could post right now in a café, bar, coworking space or library, for other people in the same room to answer.
Give exactly 3 ideas. Each topic is at most 60 characters, friendly, public and easy to answer.
At most one idea may mention a public event happening in the area today. Only use an event you found with web search, and copy its URL exactly as it appears in the search results into citation_url; kind is "event". If you find nothing good, don't use an event.
The other ideas are general starters that fit the place, the spots and the time of day; kind is "general" and citation_url is null.
Never dating or flirting, selling, recruiting, contact details or anything about specific people. Write in English. "why" is one short reason the idea fits now.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          topic: { type: "string" },
          why: { type: "string" },
          kind: { type: "string", enum: ["event", "general"] },
          citation_url: { type: ["string", "null"] },
        },
        required: ["topic", "why", "kind", "citation_url"],
      },
    },
  },
  required: ["ideas"],
};

export function validateIdeas(value: unknown): RawIdea[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { ideas?: unknown }).ideas)) return null;
  const ideas = (value as { ideas: unknown[] }).ideas.flatMap((i): RawIdea[] => {
    if (!i || typeof i !== "object") return [];
    const r = i as Record<string, unknown>;
    if (typeof r.topic !== "string" || typeof r.why !== "string") return [];
    if (r.kind !== "event" && r.kind !== "general") return [];
    if (r.citation_url !== null && typeof r.citation_url !== "string") return [];
    return [{ topic: r.topic, why: r.why, kind: r.kind, citation_url: r.citation_url as string | null }];
  });
  return ideas.length ? ideas.slice(0, 6) : null;
}

/** Day and time in Zurich, e.g. "Wednesday 28 October 2026, 19:50". */
export function localTime(now: Date): { label: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { label: `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`, hour: Number(get("hour")) };
}

export interface Suggestions {
  ideas: Idea[];
  source: "ai" | "rules";
  citations: string[];
  grounded: number;
  total: number;
  searched: boolean;
}

/** Each idea passes the code rules, then SCREEN IT; a refusal drops the idea. */
async function screenIdeas(env: Env, ideas: Idea[]): Promise<Idea[]> {
  const checked = await Promise.all(
    ideas.map(async (idea) => {
      if (!screenText(idea.topic, 60).ok) return null;
      const ai = await screenWithModel(env, idea.topic);
      return ai?.verdict === "reject" ? null : idea;
    }),
  );
  return checked.filter((i): i is Idea => i !== null);
}

export async function suggestFor(
  env: Env,
  place: Pick<PlaceRow, "id" | "name" | "kind" | "city">,
  spots: string[],
  now: Date,
): Promise<Suggestions> {
  const { label, hour } = localTime(now);
  const fallback: Suggestions = { ideas: starterIdeas(hour), source: "rules", citations: [], grounded: 0, total: 0, searched: false };

  const cacheKey = `suggest:v1:${place.id}:${Math.floor(now.getTime() / (CACHE_TTL_S * 1000))}`;
  const cached = await env.SESSIONS.get(cacheKey, { type: "text" });
  if (cached) {
    try {
      return { ...(JSON.parse(cached) as Suggestions), searched: false };
    } catch {
      // Recompute below.
    }
  }

  const res = await searchStructured(env, {
    purpose: "suggest",
    instructions: INSTRUCTIONS,
    input: `Place: ${place.name} (${place.kind})${place.city ? ` in ${place.city}` : ""}. Time: ${label}. Spots: ${spots.join(", ")}.`,
    schemaName: "ideas",
    schema: SCHEMA,
    validate: validateIdeas,
    effort: "low",
    timeoutMs: 15_000,
    maxTokens: 2500,
    maxSearches: 1,
    location: { country: "CH", ...(place.city ? { city: place.city } : {}), timezone: "Europe/Zurich" },
  });
  if (!res.ok) return fallback;

  const grounded = ground(res.value.value, res.value.results);
  const ideas = (await screenIdeas(env, grounded.ideas)).slice(0, MAX_IDEAS);
  if (!ideas.length) return fallback;
  const result: Suggestions = {
    ideas,
    source: "ai",
    citations: ideas.map((i) => i.citationUrl).filter((u): u is string => u !== null),
    grounded: grounded.grounded,
    total: grounded.total,
    searched: res.value.searches > 0,
  };
  await env.SESSIONS.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL_S });
  return result;
}
