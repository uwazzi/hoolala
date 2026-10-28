// PLACE IT: details about one place from the web (opening hours, menu items,
// prices, wifi...), each with the page it came from. Up to 2 searches about
// this place only. Facts without a page the search returned are dropped, so
// no menu item is ever invented. Stored as AI / FOUND until a person confirms.
// Google Places, when switched on, is shown live and never stored.

import { FACT_FIELDS, normalizeFactValue } from "../rules/places";
import { resolveCitation } from "../rules/grounding";
import { screenText } from "../rules/screening";
import type { Env, FactField, PlaceRow } from "../types";
import { searchStructured } from "./client";

export interface FoundFact {
  field: FactField;
  value: string;
  url: string;
}

const INSTRUCTIONS = `You collect practical details about one public place (a café, bar, coworking space or library) for people who are there now.
Search the web for this place only; at most 2 searches. Prefer its own website, then reliable listings.
Return up to 8 facts. Fields: hours (opening hours), menu_item (an item, with its price if shown), price (a typical price), spot (a place to sit, like a terrace), wifi, sockets, quiet (how noisy), rule (a house rule, like laptops or dogs).
Each value is one short line (at most 80 characters) in English, with the full URL (starting with https://) of the page it came from, copied exactly from the search results.
Only what a page actually says. Never guess, never invent menu items or prices. Nothing about staff or customers.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string", enum: FACT_FIELDS.map((f) => f.id) },
          value: { type: "string" },
          url: { type: "string" },
        },
        required: ["field", "value", "url"],
      },
    },
  },
  required: ["facts"],
};

function validate(v: unknown): { field: string; value: string; url: string }[] | null {
  const list = (v as { facts?: unknown })?.facts;
  if (!Array.isArray(list)) return null;
  return list.filter((f) => f && typeof f.field === "string" && typeof f.value === "string" && typeof f.url === "string");
}

export async function placeIt(
  env: Env,
  place: Pick<PlaceRow, "name" | "kind" | "city">,
): Promise<{ facts: FoundFact[]; searches: number; total: number; citations: string[] } | null> {
  const res = await searchStructured(env, {
    purpose: "place",
    instructions: INSTRUCTIONS,
    input: `Place: ${place.name} (${place.kind})${place.city ? ` in ${place.city}` : ""}.`,
    schemaName: "facts",
    schema: SCHEMA,
    validate,
    effort: "low",
    timeoutMs: 15_000,
    maxTokens: 3000,
    maxSearches: 2,
    location: { country: "CH", ...(place.city ? { city: place.city } : {}), timezone: "Europe/Zurich" },
  });
  if (!res.ok) return null;
  const facts: FoundFact[] = [];
  const seen = new Set<string>();
  for (const f of res.value.value) {
    if (!FACT_FIELDS.some((x) => x.id === f.field)) continue;
    const value = normalizeFactValue(f.value);
    if (!value || !screenText(value, 80).ok) continue;
    // The search was about this place, so a returned page on the cited site is an honest source.
    const url = resolveCitation(f.url, value, res.value.results, [], { sameSiteFallback: true });
    if (!url) continue;
    const key = `${f.field}:${value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push({ field: f.field as FactField, value, url });
    if (facts.length === 8) break;
  }
  return { facts, searches: res.value.searches, total: res.value.value.length, citations: [...new Set(facts.map((f) => f.url))] };
}
