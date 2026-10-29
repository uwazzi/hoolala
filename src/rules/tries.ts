// WP29: code owns the step and the leaves (HANDOFF-v6 section 4). TRY IT
// drafts words; this file decides whether a draft fits the requested step.
// Bounds are maximums: a gentler ask than the step's own always passes.

import { GAME_FILL_FALLBACK, ROLE_PHRASE } from "../content/tries";
import { screenText } from "./screening";

export type Step = 1 | 2 | 3 | 4 | 5;
export type Outcome = "went_well" | "no_reply" | "awkward" | "didnt_happen";
export type PlaceKind = "anywhere" | "cafe" | "work";
export type AskOfOther = "none" | "hello_back" | "answer" | "short_chat" | "join_ok";

export interface TryDraft {
  title: string;
  hint: string;
  step: number;
  words_max: number;
  minutes: number;
  asks_of_other: string;
  place_kind: string;
  why: string;
}

export interface Ask {
  step: Step;
  place: PlaceKind;
  timeOfDay: "morning" | "day" | "evening";
  last: Outcome[];
  interests: string[];
}

export type TryVerdict = "ok" | "wrong_step" | "too_much" | "off_limits";

const BOUNDS: Record<Step, { words: number | null; minutes: number; asks: AskOfOther[] }> = {
  1: { words: 0, minutes: 2, asks: ["none"] },
  2: { words: 12, minutes: 2, asks: ["none", "hello_back"] },
  3: { words: 25, minutes: 4, asks: ["none", "hello_back", "answer"] },
  4: { words: null, minutes: 6, asks: ["none", "hello_back", "answer", "short_chat"] },
  5: { words: null, minutes: 12, asks: ["none", "hello_back", "answer", "short_chat", "join_ok"] },
};

// Beyond the shared code rules: no streak pressure, no shame, no advice.
const SHAME = ["streak", "guilt", "guilty", "shame", "ashamed", "coward", "chicken", "loser", "man up", "reminder", "remind"];
const ADVICE = ["doctor", "therapy", "therapist", "invest", "lawyer", "diagnos", "prescription", "antidepress"];

function hasWord(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

export function validateTry(draft: TryDraft, ask: Ask): TryVerdict {
  if (draft.step !== ask.step || draft.place_kind !== ask.place) return "wrong_step";
  const bounds = BOUNDS[ask.step];
  if (!bounds) return "wrong_step";
  if (typeof draft.title !== "string" || !draft.title || draft.title.length > 48) return "too_much";
  if (typeof draft.hint !== "string" || !draft.hint || draft.hint.length > 80) return "too_much";
  if (typeof draft.why !== "string" || !draft.why || draft.why.length > 140) return "too_much";
  if (!Number.isInteger(draft.words_max) || draft.words_max < 0) return "too_much";
  if (bounds.words !== null && draft.words_max > bounds.words) return "too_much";
  if (!Number.isInteger(draft.minutes) || draft.minutes < 1 || draft.minutes > bounds.minutes) return "too_much";
  if (!bounds.asks.includes(draft.asks_of_other as AskOfOther)) return "too_much";
  const text = `${draft.title} ${draft.hint} ${draft.why}`;
  if (!screenText(text, 300).ok) return "off_limits";
  if (hasWord(text, SHAME) || hasWord(text, ADVICE)) return "off_limits";
  return "ok";
}

/** A leaf for every try made, whatever happened. */
export function leafFor(outcome: Outcome): 0 | 1 {
  return outcome === "didnt_happen" ? 0 : 1;
}

/** Rule 14: braver after well, same after no reply or awkward, gentler after missed. */
export function suggestNext(step: Step, last: Outcome): -1 | 0 | 1 {
  const move = last === "went_well" ? 1 : last === "didnt_happen" ? -1 : 0;
  return step + move < 1 || step + move > 5 ? 0 : move;
}

// ---- WP37: the game. TRY IT writes words; this file assigns level, step,
// minutes and START HERE, fills the library from the compass, and rejects
// bad tries. The model never sets the step; rejected tries are swapped for
// library ones, never rewritten.

export type GameLevel = "soft" | "brave" | "bold";
export type GameKind = "talk" | "kind";
export type GameWho = "none" | "any" | "close" | "service";

export interface GameTryInput {
  title: string;
  level: GameLevel;
  kind: GameKind;
  who_role: string | null;
  place_kind: string | null;
  step?: unknown;
}

export interface GameCtx {
  roles: { role: string; roleClass: string }[];
  lessOf: string[];
  exclude?: string[];
}

export type GameVerdict =
  | "ok"
  | "bad_shape"
  | "repeat"
  | "bad_role"
  | "model_step"
  | "too_long"
  | "less_of"
  | "buying"
  | "service_heavy"
  | "off_limits";

const LEVEL_STEPS: Record<GameLevel, Step[]> = { soft: [1, 2], brave: [3, 4], bold: [5] };
const LEVEL_MINUTES: Record<GameLevel, number> = { soft: 1, brave: 2, bold: 5 };
// The spec's per-step words_max cannot fit its own library (step 1 allows 0
// words), so every game try shares one cap: 24 words fits the longest filled
// library row (19) with room for long topics.
const GAME_TITLE_WORDS = 24;

const BUYING = /\bbuy\b|\bbuys\b|\bbought\b|\bbuying\b|\bpay for\b|\bpaid for\b|\bshout\b|treat (them|him|her|you) to/i;
const SERVICE_PRIVATE =
  /\bfamil(y|ies)\b|\bweekend\b|\bkids?\b|\bchild(ren)?\b|\bwife\b|\bhusband\b|\bpartner\b|\bboyfriend\b|\bgirlfriend\b|\bmarried\b|\bdivorced\b|\brelationship\b|\bsalary\b|\bwage\b|\brent\b|\bhome\b|\bhouse\b|\bflat\b|\bapartment\b|\blives\b/i;
const SERVICE_LEAVE =
  /leave (your|their|the) (work|job|shift|post|counter)|come with (me|you)|join (me|you)|step outside|after your shift|take a break|on your break/i;
const CONTACT_ASK = /\bphone\b|their number|your number|\bemail\b|home address|contact details|instagram|follow me|add me|\bsocials\b/i;
const LOOKS =
  /\blooks\b|look (beautiful|great|good|nice|lovely|amazing)|beautiful|handsome|\bpretty\b|gorgeous|\bhot\b|sexy|\boutfit\b|makeup|haircut|compliment (your|their|her|his|the) (look|looks|hair|clothes|smile|eyes)/i;
const TOUCH = /\btouch\b|touched|touching|\bhug\b|hugs|hugged|hugging|\bkiss\b|kisses|massage|stroked?|hold hands|high[- ]five|pat on|fist bump/i;
const FILM = /\bphotos?\b|\bpictures?\b|\bfilms?\b|filming|\bvideos?\b|selfies?|\bcamera\b|record them/i;
const FOLLOW = /\bfollow\b|\bfollowed\b|following (them|him|her|you|someone)|\bstalk\w*\b|wait for them|where they live/i;
const CHILDREN = /\bchild\b|\bchildren\b|\bkids?\b|\bbab(y|ies)\b|\btoddler\b|\bplayground\b|schoolkids?|\bson\b|\bdaughter\b/i;
const YOUR_KID = /your (child|kid|kids|son|daughter)/gi;
const MONEY = /\bmoney\b|\bfrancs?\b|\beuros?\b|\bbucks\b|\bloan\b|price of|\bcosts\b|[£$€]/;
const ALCOHOL = /\bbeers?\b|\bwine\b|\bdrunk\b|\bdrinks?\b|\bshots\b|\bcocktail\b|\bwhisky\b|\bvodka\b/i;
const LATE = /\bmidnight\b|\blate\b|\bnight\b|\bevening\b|after dark|pub crawl/i;
const PRIVATE =
  /\bat home\b|\bback home\b|\bto home\b|(at|to|into|in|back) (my|your|their|his|her|someone's|somebody's|our) (home|house|flat|apartment|garden|car|bedroom)\b|\bbedroom\b|hotel room|come over|come round|(your|their|my) place\b/i;
const US_SPELLING = /\bneighbors?\b|\bfavorites?\b|\bfavor\b|\borganize[sd]?\b|\bcenter\b|\btheaters?\b|\bmoms?\b/i;
const EM_DASH = /—/;
const DAY_MONTH =
  /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)$/i;
const LESS_STOP = new Set(["people", "really", "about", "their", "there", "with", "something", "because", "would", "should", "always", "never", "every", "being"]);

function hasCapitalName(title: string): boolean {
  for (const word of title.split(/\s+/).slice(1)) {
    const clean = word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    if (/^[A-Z][a-z]+$/.test(clean) && !DAY_MONTH.test(clean)) return true;
  }
  return false;
}

function hitsLessOf(titleLow: string, lessOf: string[]): boolean {
  for (const item of lessOf) {
    const low = item.toLowerCase().trim();
    if (!low) continue;
    if (titleLow.includes(low)) return true;
    for (const word of low.split(/[^a-zàâäéèêëîïôöùüûç]+/)) {
      if (word.length >= 6 && !LESS_STOP.has(word) && titleLow.includes(word)) return true;
    }
  }
  return false;
}

/** One try against every game rule. Rejects, never rewrites. */
export function validateGameTry(input: GameTryInput, ctx: GameCtx): GameVerdict {
  if (!input || typeof input.title !== "string" || !input.title.trim()) return "bad_shape";
  if (input.level !== "soft" && input.level !== "brave" && input.level !== "bold") return "bad_shape";
  if (input.kind !== "talk" && input.kind !== "kind") return "bad_shape";
  const title = input.title.trim();
  if (ctx.exclude?.includes(title)) return "repeat";
  let roleClass: string | null = null;
  if (input.who_role !== null && input.who_role !== undefined) {
    const found = ctx.roles.find((r) => r.role === input.who_role);
    if (!found) return "bad_role";
    roleClass = found.roleClass;
  }
  if (input.step !== undefined && input.step !== null) {
    if (!Number.isInteger(input.step) || !LEVEL_STEPS[input.level].includes(input.step as Step)) return "model_step";
  }
  if (title.split(/\s+/).length > GAME_TITLE_WORDS) return "too_long";
  const low = title.toLowerCase();
  if (hitsLessOf(low, ctx.lessOf)) return "less_of";
  if (BUYING.test(title)) return "buying";
  if (roleClass === "service") {
    if (LEVEL_MINUTES[input.level] > 2) return "service_heavy";
    const svc = low.replace(/from home/g, "");
    if (SERVICE_PRIVATE.test(svc) || SERVICE_LEAVE.test(title)) return "service_heavy";
  }
  if (!screenText(title, 200).ok) return "off_limits";
  if (CONTACT_ASK.test(title) || LOOKS.test(title) || TOUCH.test(title) || FILM.test(title) || FOLLOW.test(title)) return "off_limits";
  if (CHILDREN.test(title.replace(YOUR_KID, ""))) return "off_limits";
  if (MONEY.test(title) || US_SPELLING.test(title) || EM_DASH.test(title)) return "off_limits";
  if (ALCOHOL.test(title) && LATE.test(title)) return "off_limits";
  if (PRIVATE.test(title)) return "off_limits";
  if (hasCapitalName(title)) return "off_limits";
  return "ok";
}

/** Talk and kind in every level of the nine. */
export function validateGameMix(tries: { level: GameLevel; kind: GameKind }[]): boolean {
  for (const level of ["soft", "brave", "bold"] as const) {
    const at = tries.filter((t) => t.level === level);
    if (!at.some((t) => t.kind === "talk") || !at.some((t) => t.kind === "kind")) return false;
  }
  return true;
}

/** Code assigns the step: alternate low and high within the level. */
export function stepForLevelSlot(level: GameLevel, slot: number): Step {
  const [low, high] = LEVEL_STEPS[level];
  return slot % 2 === 0 ? low : (high ?? low);
}

/** Minutes are level-set: 1, 2, 5. */
export function minutesForLevel(level: GameLevel): number {
  return LEVEL_MINUTES[level];
}

/** START HERE: gentle stays on SOFT, forward opens BRAVE, never BOLD. */
export function tabForPace(deliveryText: string | null): 0 | 1 {
  if (deliveryText && /straight|fast|quick|dive|direct|bold|just go|walk up/i.test(deliveryText)) return 1;
  return 0;
}

export interface FillContext {
  topic: string;
  rec: string;
  place: string;
}

const TRAILING = /(\s+(with|and|to|for|at|about|of|the|a))+$/i;

function scrubTopic(text: string): string {
  const words = text.split(/\s+/);
  const kept = words.filter((w, i) => {
    if (i === 0) return true;
    const clean = w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    return !/^[A-Z][a-z]+$/.test(clean) || DAY_MONTH.test(clean);
  });
  return kept.join(" ").replace(/\s+/g, " ").replace(TRAILING, "").trim();
}

const PLACE_KEYS: [RegExp, string][] = [
  [/caf[eé]|coffee/i, "the café"],
  [/\bpark\b/i, "the park"],
  [/\bbars?\b|\bpub\b/i, "the bar"],
  [/office|\bwork\b|cowork/i, "work"],
  [/librar/i, "the library"],
  [/gym|swim|\bpool\b/i, "the gym"],
  [/street|square/i, "the street"],
  [/market|\bshops?\b/i, "the shops"],
  [/station|train/i, "the station"],
  [/\bbus\b/i, "the bus"],
  [/cinema|theatre|theater|film|movie/i, "the cinema"],
  [/restaurant/i, "the restaurant"],
  [/museum/i, "the museum"],
  [/church/i, "the church"],
  [/beach/i, "the beach"],
];

/** Topic, rec and place from the compass lines, with safe defaults. */
export function fillContext(lines: { part: string; text: string }[]): FillContext {
  const interest = lines.find((l) => l.part === "interest")?.text ?? "";
  const scrubbed = scrubTopic(interest).toLowerCase();
  const topic = scrubbed || "something you like";
  const intention = lines.find((l) => l.part === "intention")?.text ?? "";
  const place = PLACE_KEYS.find(([re]) => re.test(intention))?.[1] ?? "the café";
  return { topic, rec: `favourite ${topic}`, place };
}

/** One filled template: the role phrase or a someone, plus the compass label. */
export function fillGameTry(
  template: string,
  ctx: FillContext,
  who: GameWho,
  roles: { role: string; roleClass: string }[],
  slot: number,
): { title: string; whoRole: string | null; label: string } {
  let phrase = "someone";
  let whoRole: string | null = null;
  let label = "";
  if (who !== "none") {
    const candidates = who === "any" ? roles : roles.filter((r) => r.roleClass === who);
    const pick = candidates.length > 0 ? candidates[slot % candidates.length] : null;
    if (pick) {
      phrase = ROLE_PHRASE[pick.role] ?? pick.role;
      whoRole = pick.role;
      label = pick.role.toUpperCase();
    } else {
      phrase = GAME_FILL_FALLBACK[who];
    }
  }
  const title = template.replace(/\{who\}/g, phrase).replace(/\{p\}/g, ctx.place).replace(/\{rec\}/g, ctx.rec).replace(/\{topic\}/g, ctx.topic);
  return { title, whoRole, label };
}
