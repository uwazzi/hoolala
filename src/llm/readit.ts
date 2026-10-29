// READ IT: today's menu or event lines from the place's own page, each one
// checked against the page text. Anything absent, or an allergen or health
// claim, is dropped; with nothing left the caller shows the menu link only.

import { isReadableLink, pageText } from "../rules/pages";
import type { Env } from "../types";
import { structured, writeWorking } from "./client";

export interface ReadMenu {
  items: string[];
  hours: string | null;
  kind: "menu" | "event" | "hours";
}

const SYSTEM = `You read a place's own page and pull out what matters today: at most 3 menu or event lines, and the opening hours if shown.
Copy every item almost word for word from the page; never invent dishes, prices or times. Never allergen or health claims.
Answer with the JSON schema only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: { type: "array", items: { type: "string" } },
    hours: { type: ["string", "null"] },
    kind: { type: "string", enum: ["menu", "event", "hours"] },
  },
  required: ["items", "hours", "kind"],
};

const HEALTH = ["allergen", "gluten", "lactose", "calorie", "diet", "healthy", "health", "medicine", "vitamin", "doctor"];

export function validateReadIt(value: unknown, page: string): ReadMenu | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (!Array.isArray(r.items) || (r.hours !== null && typeof r.hours !== "string")) return null;
  if (r.kind !== "menu" && r.kind !== "event" && r.kind !== "hours") return null;
  const lower = page.toLowerCase();
  const items = (r.items as unknown[])
    .filter((i): i is string => typeof i === "string" && i.length > 0 && i.length <= 80)
    .filter((i) => lower.includes(i.toLowerCase()))
    .filter((i) => !HEALTH.some((w) => i.toLowerCase().includes(w)))
    .slice(0, 3);
  const hours = typeof r.hours === "string" && r.hours.length > 0 && r.hours.length <= 40 && lower.includes(r.hours.toLowerCase()) ? r.hours : null;
  if (!items.length && !hours) return null;
  return { items, hours, kind: r.kind };
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(5000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    return pageText(await res.text(), 20000) || null;
  } catch {
    return null;
  }
}

export async function readIt(env: Env, userId: string, url: string, placeName: string, dateLabel: string): Promise<{ menu: ReadMenu; source: string } | null> {
  if (!isReadableLink(url)) return null;
  const page = await fetchPageText(url);
  if (!page) return null;
  const res = await structured<ReadMenu>(env, {
    purpose: "read_it",
    system: SYSTEM,
    user: `Place: ${placeName}. Today: ${dateLabel}.\nPage:\n${page}`,
    schemaName: "read_menu",
    schema: SCHEMA,
    validate: (v) => validateReadIt(v, page),
    effort: "low",
    timeoutMs: 8000,
    maxTokens: 600,
  });
  if (!res.ok) return null;
  await writeWorking(env, { userId, fn: "read_it", tools: [], verdict: "approved", effort: "low" });
  return { menu: res.value, source: new URL(url).hostname };
}
