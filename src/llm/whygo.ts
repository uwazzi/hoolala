// WHY GO: one line per nearby place saying why it fits, plus a tiny try
// there. One call for up to 6 places; every used fact must exist, no
// invented numbers, and the try stays small (step 1 to 3). Items failing
// any check are dropped and the caller falls back to the template.

import { screenText } from "../rules/screening";
import type { Env } from "../types";
import { structured, writeWorking } from "./client";

export interface WhyGoPlace {
  id: string;
  name: string;
  kind: string;
  distance_m: number;
  facts: { id: string; text: string }[];
  compass: string[];
  visits: number;
  talking: string | null;
}

export interface WhyGoItem {
  place_id: string;
  why: string;
  tiny_try: string;
  facts_used: string[];
}

const SYSTEM = `You say why each nearby place fits the person, in one line per place, and suggest one tiny try there.
Use only the facts given for each place. Never invent numbers, times, prices or features. Never flirting or dating, contact details, streaks, shame or advice.
Why: at most 140 characters, naming what fits (their interests, the place's features, its visits or talking). Tiny try: at most 80 characters, a step 1 to 3 try (a nod, a hello, one small question); never an invitation, a date or anything asking for contact.
Answer with the JSON schema only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          place_id: { type: "string" },
          why: { type: "string" },
          tiny_try: { type: "string" },
          facts_used: { type: "array", items: { type: "string" } },
        },
        required: ["place_id", "why", "tiny_try", "facts_used"],
      },
    },
  },
  required: ["places"],
};

// Words that lift a try to step 4+ (commitments) or off limits entirely.
const TRY_CAP = ["come with", "meet me", "coffee with", "go out", "date", "number", "contact", "kiss", "flirt", "marry"];

/** Every number in the model's words must already exist in the input. */
export function numbersOk(text: string, blob: string): boolean {
  const numbers = text.match(/\d+(?::\d{2})?/g) ?? [];
  return numbers.every((n) => blob.includes(n));
}

function shapeOk(r: Record<string, unknown>): r is { place_id: string; why: string; tiny_try: string; facts_used: unknown } {
  return typeof r.place_id === "string" && typeof r.why === "string" && typeof r.tiny_try === "string" && Array.isArray(r.facts_used);
}

export function validateWhyGo(value: unknown, places: WhyGoPlace[]): WhyGoItem[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { places?: unknown }).places)) return null;
  const byId = new Map(places.map((p) => [p.id, p]));
  const kept: WhyGoItem[] = [];
  for (const item of (value as { places: unknown[] }).places) {
    if (!item || typeof item !== "object" || !shapeOk(item as Record<string, unknown>)) continue;
    const r = item as { place_id: string; why: string; tiny_try: string; facts_used: unknown[] };
    const place = byId.get(r.place_id);
    if (!place) continue;
    if (!r.why || r.why.length > 140 || !r.tiny_try || r.tiny_try.length > 80) continue;
    if (!r.facts_used.every((f) => typeof f === "string" && place.facts.some((x) => x.id === f))) continue;
    if (!screenText(r.why, 140).ok || !screenText(r.tiny_try, 80).ok) continue;
    const blob = `${place.facts.map((f) => f.text).join(" ")} ${place.visits} ${place.distance_m} ${place.name} ${place.kind}`;
    if (!numbersOk(`${r.why} ${r.tiny_try}`, blob)) continue;
    if (TRY_CAP.some((w) => r.tiny_try.toLowerCase().includes(w))) continue;
    kept.push({ place_id: r.place_id, why: r.why, tiny_try: r.tiny_try, facts_used: r.facts_used as string[] });
  }
  return kept.length ? kept : null;
}

/** The template fallback, and the workings line: only real inputs, composed. */
export function templateWhy(place: WhyGoPlace): string {
  const bits: string[] = [];
  if (place.compass.length) bits.push(`On your compass: ${place.compass.join(", ")}.`);
  if (place.talking) bits.push(`Talking here: ${place.talking}.`);
  if (place.visits > 0) bits.push(`${place.visits} Hoolala! visit${place.visits === 1 ? "" : "s"}.`);
  if (!bits.length) return "Close by. Not on your compass, so it ranks low.";
  return bits.join(" ");
}

function describePlace(p: WhyGoPlace): string {
  const facts = p.facts.map((f) => `[${f.id}] ${f.text}`).join("; ") || "no facts";
  return `${p.id} | ${p.name} (${p.kind}), ${p.distance_m} m. Facts: ${facts}. Compass overlap: ${p.compass.join(", ") || "none"}. Hoolala! visits: ${p.visits}. Talking: ${p.talking ?? "not enough ratings"}.`;
}

export async function whyGo(env: Env, userId: string, places: WhyGoPlace[]): Promise<WhyGoItem[] | null> {
  const res = await structured<WhyGoItem[]>(env, {
    purpose: "why_go",
    system: SYSTEM,
    user: places
      .slice(0, 6)
      .map(describePlace)
      .join("\n"),
    schemaName: "why_go",
    schema: SCHEMA,
    validate: (v) => validateWhyGo(v, places),
    effort: "low",
    timeoutMs: 6000,
    maxTokens: 1200,
  });
  if (!res.ok) return null;
  await writeWorking(env, {
    userId,
    fn: "why_go",
    tools: [],
    verdict: res.value.length === places.length ? "approved" : `partial: ${res.value.length}/${places.length}`,
    effort: "low",
  });
  return res.value;
}
