// WP39 keeping the juicy bits: what the model may keep from the two free-text
// answers, and the code fallback when the model is off or twice wrong. Pure:
// validates, never rewrites. Topics and the nearly-said line are screened,
// checked against the off-table list, and never about the person; people are
// roles from the allow-list, never names.

import { hasBannedLabel } from "./compass";
import { screenText } from "./screening";

export const JUICY_ROLES = [
  "mum",
  "dad",
  "brother",
  "sister",
  "grandparent",
  "family",
  "colleague",
  "neighbour",
  "flatmate",
  "friend",
  "waiter",
  "barista",
  "driver",
  "cashier",
  "librarian",
  "shop staff",
  "a regular",
] as const;
export type JuicyRole = (typeof JUICY_ROLES)[number];

export const OFFTABLE_CHIPS = ["POLITICS", "WORK", "FAMILY", "HEALTH", "MONEY", "LOOKS"] as const;

export const MAX_TOPICS = 3;
export const MAX_LINE = 60;

// The display copy of these three lists lives in web/src/juicy.ts; a test
// pins them equal so trimming and validation agree.
export const FILLER = ["um", "uh", "er", "erm", "so", "basically", "like", "honestly", "really", "just", "actually", "literally", "well", "anyway", "kind", "sort", "guess", "mean"];
export const STOPWORDS = ["i", "a", "an", "the", "and", "or", "but", "it", "its", "was", "were", "is", "to", "of", "for", "with", "my", "me", "we", "you", "they", "them", "their", "that", "this", "about", "at", "in", "on", "last", "whole", "told", "nearly", "said", "think", "love", "play", "played", "argued", "talked", "asked", "went", "some", "very", "have", "had", "what", "when", "didnt", "didn’t", "know", "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "hour", "hours", "week", "month", "today", "yesterday", "minutes", "time", "thing", "things"];
export const PHRASES = ["board games", "video games", "the music"];

const ROLE_PATTERNS: [RegExp, JuicyRole][] = [
  [/\b(mum|mother|mom)\b/i, "mum"],
  [/\b(dad|father)\b/i, "dad"],
  [/\bbrother\b/i, "brother"],
  [/\bsister\b/i, "sister"],
  [/\b(gran|grandma|grandad|grandpa)\b/i, "grandparent"],
  [/\b(cousin|aunt|uncle|family)\b/i, "family"],
  [/\b(colleague|co-?worker|teammate)\b/i, "colleague"],
  [/\bneighbou?r\b/i, "neighbour"],
  [/\bflatmate\b/i, "flatmate"],
  [/\bfriends?\b/i, "friend"],
  [/\b(waiter|waitress)\b/i, "waiter"],
  [/\bbarista\b/i, "barista"],
  [/\bdriver\b/i, "driver"],
  [/\b(cashier|shopkeeper)\b/i, "cashier"],
  [/\blibrarian\b/i, "librarian"],
  [/\bshop staff\b/i, "shop staff"],
  [/\bregular\b/i, "a regular"],
];

// What each off-table chip bans, in plain words. Matched on word boundaries.
const OFFTABLE_WORDS: Record<string, string[]> = {
  POLITICS: ["politics", "political", "politician", "election", "vote", "voting", "parliament", "minister", "president"],
  WORK: ["work", "job", "office", "boss", "colleague", "coworker", "meeting", "deadline", "salary", "overtime"],
  FAMILY: ["family", "mum", "dad", "mother", "father", "brother", "sister", "grandparent", "cousin", "aunt", "uncle"],
  HEALTH: ["health", "doctor", "hospital", "illness", "disease", "therapy", "diet", "exercise", "gym", "symptom"],
  MONEY: ["money", "francs", "euros", "bucks", "salary", "wage", "rent", "price", "costs", "loan", "debt"],
  LOOKS: ["looks", "beautiful", "handsome", "pretty", "gorgeous", "outfit", "makeup", "haircut", "weight", "clothes"],
};

export function hitsOffTable(text: string, offtable: string[]): boolean {
  for (const chip of offtable) {
    for (const word of OFFTABLE_WORDS[chip] ?? []) {
      if (new RegExp(`\\b${word}\\b`, "i").test(text)) return true;
    }
  }
  return false;
}

const DAY_MONTH = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)$/i;
const CAPITAL = /^[A-Z][a-z]+$/;

/** A capitalised word where sentence case cannot explain it. The first word of a longer text may just start a sentence. */
export function hasJuicyName(text: string): boolean {
  const words = text.split(/\s+/).map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""));
  const rest = words.length > 1 ? words.slice(1) : words;
  return rest.some((w) => CAPITAL.test(w) && !DAY_MONTH.test(w));
}

export interface JuicyPerson {
  role: JuicyRole;
  tier: "said";
}

export interface JuicyNearly {
  line: string;
  toRole: JuicyRole | null;
}

export interface JuicyBits {
  topics: string[];
  people: JuicyPerson[];
  nearlySaid: JuicyNearly | null;
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z’']/g, "");

function foldRole(raw: unknown): JuicyRole | null {
  if (typeof raw !== "string") return null;
  const low = raw.trim().toLowerCase();
  return (JUICY_ROLES as readonly string[]).includes(low) ? (low as JuicyRole) : null;
}

/** FAMILY removes family roles and WORK removes colleagues, wherever people are kept. */
export function filterJuicyPeople(people: JuicyPerson[], offtable: string[]): JuicyPerson[] {
  const family: string[] = ["mum", "dad", "brother", "sister", "grandparent", "family"];
  return people.filter((p) => !(offtable.includes("FAMILY") && family.includes(p.role)) && !(offtable.includes("WORK") && p.role === "colleague"));
}

/**
 * The model's kept bits: at most 3 short topics, allow-list roles, and a
 * short nearly-said line. Rejects (null), never rewrites: filler in topics,
 * names, off-table themes, labels about the person, off-list roles.
 */
export function validateJuicy(value: unknown, ctx: { offtable: string[] }): JuicyBits | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.topics) || v.topics.length > MAX_TOPICS) return null;
  const topics: string[] = [];
  for (const t of v.topics) {
    if (typeof t !== "string") return null;
    const topic = t.trim().replace(/\s+/g, " ");
    const words = topic.split(" ").filter(Boolean);
    if (words.length < 1 || words.length > 3 || topic.length > 30) return null;
    if (words.some((w) => FILLER.includes(clean(w)))) return null;
    if (!screenText(topic, 30).ok || hasBannedLabel(topic) || hasJuicyName(topic)) return null;
    if (hitsOffTable(topic, ctx.offtable)) return null;
    topics.push(topic);
  }
  if (!Array.isArray(v.people) || v.people.length > 6) return null;
  const people: JuicyPerson[] = [];
  for (const p of v.people) {
    const role = foldRole((p as { role?: unknown } | null)?.role ?? p);
    if (!role || (p as { tier?: unknown })?.tier !== "said") return null;
    if (!people.some((x) => x.role === role)) people.push({ role, tier: "said" });
  }
  let nearlySaid: JuicyNearly | null = null;
  if (v.nearly_said !== null && v.nearly_said !== undefined) {
    const n = v.nearly_said as Record<string, unknown>;
    if (typeof n.line !== "string") return null;
    const line = n.line.trim().replace(/\s+/g, " ");
    if (line.length < 2 || line.length > MAX_LINE) return null;
    if (!screenText(line, MAX_LINE).ok || hasBannedLabel(line) || hasJuicyName(line)) return null;
    if (hitsOffTable(line, ctx.offtable)) return null;
    const toRole = n.to_role === null || n.to_role === undefined ? null : foldRole(n.to_role);
    if (n.to_role !== null && n.to_role !== undefined && !toRole) return null;
    nearlySaid = { line, toRole };
  }
  return { topics, people: filterJuicyPeople(people, ctx.offtable), nearlySaid };
}

// ---- The code fallback: filler and stop words go, 4+ letter words, known
// phrases and allow-list roles stay. Names (capitalised, past the first word)
// are stripped; screened or off-table words never survive.

function rawNameForms(text: string): Set<string> {
  const out = new Set<string>();
  const words = text.split(/\s+/).filter(Boolean);
  words.forEach((raw, i) => {
    const word = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    const sentenceStart = i === 0 || /[.?!]$/.test(words[i - 1]);
    if (!sentenceStart && CAPITAL.test(word) && !DAY_MONTH.test(word)) out.add(word.toLowerCase());
  });
  return out;
}

interface Token {
  key: string | null;
  role: JuicyRole | null;
}

function tokenize(text: string): Token[] {
  const words = text.split(/\s+/).filter(Boolean);
  const names = rawNameForms(text);
  const out: Token[] = [];
  for (let k = 0; k < words.length; k++) {
    const raw = words[k];
    const w = clean(raw);
    const pair = k + 1 < words.length ? `${w} ${clean(words[k + 1]).replace(/[’']/g, "")}` : "";
    if (PHRASES.includes(pair)) {
      out.push({ key: pair.replace(/^the /, ""), role: null });
      k++;
      continue;
    }
    const prev = k > 0 ? clean(words[k - 1]).replace(/[’']/g, "") : "";
    if (FILLER.includes(w) || (w === "know" && prev === "you")) {
      out.push({ key: null, role: null });
      continue;
    }
    const role = ROLE_PATTERNS.find(([re]) => re.test(w))?.[1] ?? null;
    if (role) {
      out.push({ key: w, role });
      continue;
    }
    if (STOPWORDS.includes(w) || w.length < 4 || names.has(w)) {
      out.push({ key: null, role: null });
      continue;
    }
    out.push({ key: w, role: null });
  }
  return out;
}

function keywords(text: string | null): { words: string[]; roles: JuicyRole[] } {
  if (!text) return { words: [], roles: [] };
  const words: string[] = [];
  const roles: JuicyRole[] = [];
  for (const t of tokenize(text)) {
    if (t.role && !roles.includes(t.role)) roles.push(t.role);
    if (t.key && !t.role && !words.includes(t.key)) words.push(t.key);
  }
  return { words, roles };
}

const keepWord = (w: string, offtable: string[]): boolean => screenText(w, 30).ok && !hasBannedLabel(w) && !hitsOffTable(w, offtable);

/** No model, or two bad drafts: the same kept-bits shape from code alone. */
export function fallbackJuicy(q1f: string | null, q4: string | null, offtable: string[]): JuicyBits {
  const story = keywords(q1f);
  const said = keywords(q4);
  const topics = story.words.filter((w) => keepWord(w, offtable)).slice(0, MAX_TOPICS);
  const roles: JuicyRole[] = [];
  for (const r of [...story.roles, ...said.roles]) {
    if (!roles.includes(r)) roles.push(r);
  }
  const people = filterJuicyPeople(
    roles.slice(0, 6).map((role) => ({ role, tier: "said" as const })),
    offtable,
  );
  const line = said.words.filter((w) => keepWord(w, offtable)).slice(0, 3).join(" · ");
  const toRole = said.roles[0] ?? null;
  const nearlySaid = q4 && line ? { line: line.slice(0, MAX_LINE), toRole } : null;
  return { topics, people, nearlySaid };
}
