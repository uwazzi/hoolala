// WP24 Personal Compass rules. Pure. The compass is the person's own words
// about what they like talking about: private, never shown to anyone else,
// never used to match or rank people. Every line has a ticked source or is
// "you said". Never a personality type, score or a health, political,
// religious or sexuality label.

import type { CompassPart } from "../types";
import { canonicalUrl } from "./grounding";

export const PARTS: readonly CompassPart[] = ["interest", "talk_about", "more_of", "filter"];
export const MAX_LINES = 8;
export const MAX_FINDINGS = 6;
export const MAX_LINKS = 3;

// Labels about a person we never keep. A "filter" line (what they'd rather not
// talk about) may name such a topic: "no politics" is a choice, not a label.
const BANNED = new RegExp(
  [
    // personality types and scores
    "introvert", "extrovert", "ambivert", "\\b[ie][ns][tf][jp]\\b", "enneagram", "narcissis", "psychopath", "\\biq\\b",
    // health
    "depress", "anxiet", "anxious", "anxieu", "adhd", "tdah", "autis", "bipolar", "diabet", "cancer", "pregnan", "enceinte", "disabilit", "disabled", "handicap", "therapy", "therapie", "mental health", "sante mentale", "illness", "maladie", "diagnos",
    // politics
    "left[- ]wing", "right[- ]wing", "de gauche", "de droite", "liberal", "conservat", "socialist", "socialiste", "communist", "republican", "democrat", "\\bsvp\\b", "\\budc\\b",
    // religion
    "christian", "chretien", "muslim", "musulman", "islam", "jewish", "judaism", "\\bjuif", "\\bjuive", "hindu", "hindou", "buddhis", "bouddhis", "atheis", "athee", "catholi", "protestant", "church", "eglise", "mosque", "mosquee", "synagogue",
    // sexuality
    "\\bgay\\b", "lesbian", "lesbienne", "bisexual", "bisexuel", "\\bqueer\\b", "heterosexu", "homosexu", "lgbt", "transgender", "transgenre", "sexual orientation", "orientation sexuelle",
  ].join("|"),
  "i",
);

export function hasBannedLabel(text: string): boolean {
  return BANNED.test(text.normalize("NFKD").replace(/[̀-ͯ]/g, ""));
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** FIND ME looks up only the person: the name searched must contain their own first name. */
export function isOwnName(searchName: string, firstName: string | null): boolean {
  if (!firstName) return false;
  const tokens = fold(searchName).split(/[^a-z0-9']+/).filter(Boolean);
  const first = fold(firstName).split(/[\s-]+/)[0];
  return tokens.includes(first);
}

export function normalizeSearchName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  if (!/^\p{L}[\p{L}\p{M} .'’-]*$/u.test(name)) return null;
  return name;
}

/** Up to 3 public https links the person chooses; nothing else. */
export function normalizeLinks(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_LINKS) return null;
  const links: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string" || r.length > 300) return null;
    let u: URL;
    try {
      u = new URL(r.trim());
    } catch {
      return null;
    }
    if (u.protocol !== "https:") return null;
    links.push(u.toString());
  }
  return links;
}

export interface CompassLine {
  part: CompassPart;
  text: string;
  sourceUrl: string | null; // null means "you said"
}

/**
 * The lines that may be shown in a draft and saved: a known part, 2 to 80
 * characters, no banned label (except as a filter), and either a source the
 * person ticked or "you said" when they answered questions. Max 8, no repeats.
 */
export function cleanCompass(lines: { part: unknown; text: unknown; source_url?: unknown; sourceUrl?: unknown }[], tickedUrls: string[], answered: boolean): CompassLine[] {
  const ticked = new Map(tickedUrls.map((u) => [canonicalUrl(u), u]));
  const seen = new Set<string>();
  const out: CompassLine[] = [];
  for (const l of lines) {
    if (!PARTS.includes(l.part as CompassPart) || typeof l.text !== "string") continue;
    const text = l.text.trim().replace(/\s+/g, " ");
    if (text.length < 2 || text.length > 80) continue;
    if (l.part !== "filter" && hasBannedLabel(text)) continue;
    const raw = (l.source_url ?? l.sourceUrl ?? null) as string | null;
    let sourceUrl: string | null = null;
    if (raw) {
      const known = ticked.get(canonicalUrl(raw));
      if (!known) continue;
      sourceUrl = known;
    } else if (!answered) {
      continue;
    }
    const key = `${l.part}:${fold(text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ part: l.part as CompassPart, text, sourceUrl });
    if (out.length === MAX_LINES) break;
  }
  return out;
}

export interface Answers {
  talk?: string;
  more?: string;
  avoid?: string;
}

/** NO, I'LL TELL YOU: three questions straight to compass lines. No model. */
export function compassFromAnswers(a: Answers): CompassLine[] {
  const split = (s: string | undefined) => (s ?? "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  const lines = [
    ...split(a.talk).map((text) => ({ part: "talk_about", text })),
    ...split(a.more).map((text) => ({ part: "more_of", text })),
    ...split(a.avoid).map((text) => ({ part: "filter", text })),
  ];
  return cleanCompass(lines, [], true);
}

export function hasAnswers(a: Answers | undefined): boolean {
  return Boolean(a && [a.talk, a.more, a.avoid].some((x) => typeof x === "string" && x.trim()));
}

/**
 * FITS YOU: whether a signal's topic shares a word with the viewer's own
 * interests. Only orders and marks what the viewer already sees; never
 * shown to anyone else, never used to match or rank people.
 */
export function fitsYou(topic: string, compassTexts: string[]): boolean {
  const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  const mine = new Set(compassTexts.flatMap(words));
  return words(topic).some((w) => mine.has(w));
}
