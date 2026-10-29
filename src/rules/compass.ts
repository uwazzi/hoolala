// WP24 Personal Compass rules. Pure. The compass is the person's own words
// about what they like talking about: private, never shown to anyone else,
// never used to match or rank people. Every line has a ticked source or is
// "you said". Never a personality type, score or a health, political,
// religious or sexuality label.

import type { CompassPart } from "../types";
import { canonicalUrl } from "./grounding";
import { SCREEN_MESSAGES, screenText } from "./screening";

export const PARTS: readonly CompassPart[] = ["interest", "intention", "filter", "delivery", "action"];
export const MAX_LINES = 8;
export const MAX_LINE = 60;
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
 * The lines that may be shown in a draft and saved: a known part, 2 to 60
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
    if (text.length < 2 || text.length > MAX_LINE) continue;
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
    ...split(a.talk).map((text) => ({ part: "interest", text })),
    ...split(a.more).map((text) => ({ part: "intention", text })),
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

// ---- v6.1: SAY IT YOUR WAY. The person's words are never edited by the
// model: they pick the compass line, or the code guesses a direction from
// their words (shown first, changeable before confirming).

const LESS_WORDS = ["less", "fewer", "stop", "quit", "never", "avoid", "rather not", "not talk", "no more", "less of"];
const MORE_WORDS = ["more", "want", "again", "often", "keep"];
const HOW_WORDS = ["gentl", "low-key", "lowkey", "quiet", "calm", "slow", "mornings", "morning", "evenings", "evening", "weekends", "weekend", "walk", "near", "alone", "group", "small", "how i go"];
const LIKE_WORDS = ["like", "love", "into", "about", "talk", "chat"];

/** Code's first guess at a direction from the person's own words. */
export function partForWords(words: string): CompassPart {
  const w = fold(words);
  if (LESS_WORDS.some((k) => w.includes(k))) return "filter";
  if (MORE_WORDS.some((k) => new RegExp(`\\b${k}`).test(w))) return "intention";
  if (HOW_WORDS.some((k) => w.includes(k))) return "delivery";
  if (LIKE_WORDS.some((k) => new RegExp(`\\b${k}`).test(w))) return "interest";
  return "interest";
}

/** A mismatch between the picked line and the person's words, with a reason. Null when fine. */
export function mismatchReason(part: CompassPart, words: string): string | null {
  const w = fold(words);
  const has = (keys: string[]) => keys.some((k) => w.includes(k));
  if (part === "filter" && has(LIKE_WORDS.filter((k) => k === "like" || k === "love" || k === "into"))) {
    return "Likes belong on TALK ABOUT, not LESS OF.";
  }
  if (part === "intention" && has(["change", "different", "stop", "start", "quit"])) {
    return "MORE OF is for what you want more of, not how you go.";
  }
  if (part === "delivery" && (has(MORE_WORDS) || has(["like", "love"]))) {
    return "HOW I GO is about the way you go, not what you want.";
  }
  if (part === "action" && has(["more", "less", "quiet", "morning", "evening", "weekend", "walk"])) {
    return "NEXT TIME is for a try, not a direction.";
  }
  return null;
}

export interface ProposalCheck {
  ok: boolean;
  line?: { part: CompassPart; words: string };
  error?: string;
  why?: string;
}

/** SAY IT YOUR WAY, code first: shape, banned labels, screening, fit. The model never rewrites. */
export function validateProposal(part: unknown, words: unknown): ProposalCheck {
  if (!PARTS.includes(part as CompassPart)) return { ok: false, error: "missing_part", why: "Pick a compass line first." };
  if (typeof words !== "string" || !words.trim()) return { ok: false, error: "missing_words", why: "Say it in your own words first." };
  const clean = words.trim().replace(/\s+/g, " ");
  if (clean.length < 2) return { ok: false, error: "missing_words", why: "Say it in your own words first." };
  if (clean.length > MAX_LINE) return { ok: false, error: "too_long", why: `Keep it under ${MAX_LINE} characters.` };
  if (part !== "filter" && hasBannedLabel(clean)) {
    return { ok: false, error: "not_allowed", why: "A compass line is about what you like, not who people are." };
  }
  const screen = screenText(clean, MAX_LINE);
  if (!screen.ok) {
    if (screen.category === "crisis") return { ok: false, error: "crisis", why: SCREEN_MESSAGES.crisis };
    if (screen.category === "dating") return { ok: false, error: "not_allowed", why: "A compass line is about talking, not dating." };
    return { ok: false, error: "not_allowed", why: "Hmm, that is not compass-shaped. Try it in your own plain words?" };
  }
  const mismatch = mismatchReason(part as CompassPart, clean);
  if (mismatch) return { ok: false, error: "bad_fit", why: mismatch };
  return { ok: true, line: { part: part as CompassPart, words: clean } };
}

export type TryFeedback = "went_well" | "awkward" | "no_reply" | "didnt_happen";

/** A try debrief becomes starter words; the direction follows the same word rule. */
export function proposeFeedback(feedback: TryFeedback): { words: string; part: CompassPart } {
  const words =
    feedback === "went_well" ? "more of this"
    : feedback === "awkward" ? "gentler next time"
    : feedback === "no_reply" ? "something low-key"
    : "less of this";
  return { words, part: partForWords(words) };
}

/** REMOVEs and edits are recorded before/after so UNDO restores exactly the last edit. */
export function changeRemove(words: string): { before: string; after: null } {
  return { before: words, after: null };
}
