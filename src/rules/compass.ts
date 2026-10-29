// Personal Compass rules. Pure. The compass is the person's own words
// about what they like talking about: private, never shown to anyone else,
// never used to match or rank people. Every line is "you said" (v6.2: spoken
// answers only, FIND ME removed). Never a personality type, score or a health,
// political, religious or sexuality label. People appear as roles, never names.

import type { CompassPart } from "../types";
import { SCREEN_MESSAGES, screenText } from "./screening";

export const PARTS: readonly CompassPart[] = ["interest", "intention", "filter", "delivery", "action"];
export const MAX_LINES = 8;
export const MAX_LINE = 60;

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

export interface CompassLine {
  part: CompassPart;
  text: string;
  sourceUrl: string | null; // null means "you said"
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

// ---- v6.2: PEOPLE IN YOUR DAYS. Roles only, never names.

export const PEOPLE_ROLES = [
  "barista",
  "boss",
  "brother",
  "child",
  "colleague",
  "dad",
  "friend",
  "mum",
  "neighbour",
  "regular",
  "sister",
  "teammate",
] as const;

export type PeopleRole = (typeof PEOPLE_ROLES)[number];

const CLOSE_ROLES: readonly string[] = ["brother", "child", "dad", "friend", "mum", "neighbour", "sister"];

/** Close roles (family, friends, neighbours) can appear anywhere; service roles stay light and public. */
export function roleClass(role: PeopleRole): "close" | "service" {
  return CLOSE_ROLES.includes(role) ? "close" : "service";
}

const ROLE_WORDS: [RegExp, PeopleRole][] = [
  [/\bbarista\b/i, "barista"],
  [/\bboss\b/i, "boss"],
  [/\bbrother\b/i, "brother"],
  [/\b(child|children|kid|son|daughter)\b/i, "child"],
  [/\bcolleague\b/i, "colleague"],
  [/\b(dad|father)\b/i, "dad"],
  [/\bfriends?\b/i, "friend"],
  [/\b(mum|mom|mother)\b/i, "mum"],
  [/\bneighbou?r\b/i, "neighbour"],
  [/\bregular\b/i, "regular"],
  [/\bsister\b/i, "sister"],
  [/\bteammate\b/i, "teammate"],
];

/** Roles named in own words, first mention first. Strangers are nobody. */
export function extractRoles(answer: string): PeopleRole[] {
  const found: { role: PeopleRole; at: number }[] = [];
  for (const [re, role] of ROLE_WORDS) {
    const at = answer.search(re);
    if (at >= 0) found.push({ role, at });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.role);
}

/** A proposed role folded to the allow-list, or dropped. Names never survive. */
export function cleanRole(raw: unknown): PeopleRole | null {
  if (typeof raw !== "string") return null;
  return extractRoles(raw)[0] ?? null;
}

// ---- v6.2: COMPASS DRAFT. One structured call per spoken answer.

export type DraftPace = "gentle" | "social" | "bold";

export interface CompassDraft {
  part: CompassPart;
  line: string;
  topic: string | null;
  placeKind: string | null;
  pace: DraftPace;
  people: PeopleRole[];
}

const SHORT = /^[a-z][a-z ]{0,23}$/i;
const IS_LINE = /^(you are|you're|you\u2019re|i am|i'm|i\u2019m)\b/i;

/** A long answer cut to a compass line at a word boundary. */
export function trimDraft(words: string): string {
  const clean = words.trim().replace(/\s+/g, " ");
  if (clean.length <= MAX_LINE) return clean;
  const cut = clean.slice(0, MAX_LINE);
  const at = cut.lastIndexOf(" ");
  return (at > 20 ? cut.slice(0, at) : cut).trim();
}

/**
 * A model-drafted line: the question's part, 2 to 60 characters, about what
 * happened (never a label, never you-are). Roles fold to the allow-list;
 * topic and place are short plain words or dropped; pace falls back gentle.
 * Null when the draft is unusable (the caller retries once, then falls back).
 */
export function validateDraft(expected: CompassPart, value: unknown): CompassDraft | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.part !== expected) return null;
  if (typeof v.line !== "string") return null;
  const line = trimDraft(v.line);
  if (line.length < 2) return null;
  if (IS_LINE.test(line)) return null;
  if (expected !== "filter" && hasBannedLabel(line)) return null;
  if (!screenText(line, MAX_LINE).ok) return null;
  const short = (x: unknown): string | null => (typeof x === "string" && SHORT.test(x.trim()) ? x.trim().toLowerCase() : null);
  const pace: DraftPace = v.pace === "social" || v.pace === "bold" ? v.pace : "gentle";
  const people: PeopleRole[] = [];
  if (Array.isArray(v.people)) {
    for (const p of v.people) {
      const role = cleanRole(typeof p === "string" ? p : (p as { role?: unknown })?.role);
      if (role && !people.includes(role)) people.push(role);
      if (people.length === 3) break;
    }
  }
  return { part: expected, line, topic: short(v.topic), placeKind: short(v.place_kind), pace, people };
}

/** No model, or two bad drafts: the answer trimmed, keyword roles, gentle pace. */
export function fallbackDraft(expected: CompassPart, answer: string): CompassDraft {
  return { part: expected, line: trimDraft(answer), topic: null, placeKind: null, pace: "gentle", people: extractRoles(answer).slice(0, 3) };
}
