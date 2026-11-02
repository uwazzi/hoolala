// SUGGEST IT for rooms (v6.4): three topic ideas from the compass when there
// is one, creative ones when not. Every idea passes the code rules and
// SCREEN IT before it is shown; failures are dropped. Ideas are suggestions:
// tapping one fills the text box, nothing is ever posted automatically.

import { compassWords } from "../rules/places";
import { screenText } from "../rules/screening";
import type { Env } from "../types";
import { structured } from "./client";
import { screenWithModel } from "./screen";
import { localTime } from "./suggest";

export interface FallbackIdea {
  text: string;
  tags: string[];
}

/** Fixed, pre-screened ideas for when the model is off or every idea fails. */
export const FALLBACK_IDEAS: FallbackIdea[] = [
  { text: "Settle it: is pineapple on pizza a crime?", tags: ["food", "cooking"] },
  { text: "One good podcast for one good podcast. Swap?", tags: ["podcast", "music"] },
  { text: "Ten minutes, no phones: best thing you read this week?", tags: ["books", "reading"] },
  { text: "Teach me a two-player game in ten minutes?", tags: ["board games", "games"] },
  { text: "What is everyone reading right now?", tags: ["books", "reading"] },
  { text: "Best soup in this part of town? Compare notes.", tags: ["food", "cooking"] },
  { text: "Slow coffee, one recipe swap. Who is in?", tags: ["coffee", "cooking"] },
  { text: "Card game at the big table. Who is next?", tags: ["board games", "games"] },
  { text: "One travel tip each. Best one wins nothing.", tags: ["travel"] },
];

const CACHE_TTL_S = 60 * 60;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
  required: ["ideas"],
};

export function validateRoomIdeas(value: unknown): { text: string }[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { ideas?: unknown }).ideas)) return null;
  const ideas = (value as { ideas: unknown[] }).ideas.flatMap((i): { text: string }[] => {
    if (!i || typeof i !== "object" || typeof (i as { text?: unknown }).text !== "string") return [];
    const text = ((i as { text: string }).text ?? "").trim();
    return text && text.length <= 60 ? [{ text }] : [];
  });
  return ideas.length ? ideas.slice(0, 6) : null;
}

function systemFor(fromCompass: boolean, lang: "en" | "fr"): string {
  const tongue = lang === "fr" ? "Write in French." : "Write in English.";
  const base =
    "You suggest short invitations to talk that someone could post right now as an icebreaker for people nearby, in a café, a library or a park. " +
    "Give exactly 3 ideas. Each is at most 60 characters, friendly, public and easy to answer. " +
    "Never dating or flirting, selling, recruiting, contact details or anything about specific people. " +
    tongue;
  return fromCompass
    ? `${base} Ground each idea in the person's compass lines below: their interests, what they want more of, how they go.`
    : `${base} There is no compass yet, so be creative and general: games, food, books, the neighbourhood.`;
}

export interface RoomIdeas {
  ideas: { text: string }[];
  source: "ai" | "rules";
  fromCompass: boolean;
  workings: string;
}

/** Fixed ideas first that share a word with the compass, else the first three. */
function pickFallback(compass: string[]): { text: string }[] {
  const hay = compass.join(" ").toLowerCase();
  return [...FALLBACK_IDEAS]
    .map((idea, i) => ({ idea, i, hit: idea.tags.some((t) => hay.includes(t)) }))
    .sort((a, b) => Number(b.hit) - Number(a.hit) || a.i - b.i)
    .slice(0, 3)
    .map(({ idea }) => ({ text: idea.text }));
}

/** Each idea passes the code rules, then SCREEN IT; a refusal drops the idea. */
async function screenIdeas(env: Env, ideas: { text: string }[]): Promise<{ text: string }[]> {
  const checked = await Promise.all(
    ideas.map(async (idea) => {
      if (!screenText(idea.text, 60).ok) return null;
      const ai = await screenWithModel(env, idea.text);
      return ai?.verdict === "reject" ? null : idea;
    }),
  );
  return checked.filter((i): i is { text: string } => i !== null);
}

function workingsFor(compass: string[], ideas: { text: string }[], fromCompass: boolean): string {
  if (!fromCompass) return "no compass: general ideas";
  const matched = compassWords(compass, ideas.map((i) => i.text).join(" "));
  return matched.length ? `from your compass: ${matched.join(", ")}` : "from your compass";
}

export async function roomIdeasFor(env: Env, userId: string, compass: string[], now: Date, lang: "en" | "fr"): Promise<RoomIdeas> {
  const fromCompass = compass.length > 0;
  const fallback: RoomIdeas = { ideas: pickFallback(compass), source: "rules", fromCompass, workings: "" };
  fallback.workings = workingsFor(compass, fallback.ideas, fromCompass);

  const cacheKey = `suggest-rooms:v1:${userId}:${Math.floor(now.getTime() / (CACHE_TTL_S * 1000))}`;
  const cached = await env.SESSIONS.get(cacheKey, { type: "text" });
  if (cached) {
    try {
      return JSON.parse(cached) as RoomIdeas;
    } catch {
      // Recompute below.
    }
  }

  const { label } = localTime(now);
  const input = fromCompass
    ? `Compass lines: ${compass.join(" | ")}. Time: ${label}.`
    : `No compass. Time: ${label}.`;
  const res = await structured(env, {
    purpose: "suggest",
    system: systemFor(fromCompass, lang),
    user: input,
    schemaName: "room_ideas",
    schema: SCHEMA,
    validate: validateRoomIdeas,
    effort: "low",
    timeoutMs: 8000,
    maxTokens: 600,
  });
  if (!res.ok) {
    await env.SESSIONS.put(cacheKey, JSON.stringify(fallback), { expirationTtl: CACHE_TTL_S });
    return fallback;
  }
  const ideas = (await screenIdeas(env, res.value)).slice(0, 3);
  if (!ideas.length) {
    await env.SESSIONS.put(cacheKey, JSON.stringify(fallback), { expirationTtl: CACHE_TTL_S });
    return fallback;
  }
  const result: RoomIdeas = { ideas, source: "ai", fromCompass, workings: workingsFor(compass, ideas, fromCompass) };
  await env.SESSIONS.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL_S });
  return result;
}
