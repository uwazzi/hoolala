// TRY IT: the next tiny try, written for this person, place and time.
// Schema-validated, bounds-checked by src/rules/tries.ts, then SCREEN IT.
// Anything failing any gate returns null and the caller uses the library.

import { STEP_NAMES } from "../content/tries";
import { validateTry, type Ask, type GameKind, type GameLevel, type TryDraft } from "../rules/tries";
import type { Env } from "../types";
import { structured, writeWorking } from "./client";
import { screenWithModel } from "./screen";

const SYSTEM = `You write one tiny real-world try: one small thing to try in real life today, at the given step of a 5-step ladder (1 Smile and nod, 2 Say hello, 3 Small question, 4 Short chat, 5 Suggest a coffee).
Public everyday places only. Never flirting or dating, contact details, streaks, reminders, shame, guilt, advice, prices or claims about the place.
Title: at most 48 characters, uppercase, the thing to do. Hint: at most 80 characters, the exact line to say (plain scene-setting when the step stays silent).
words_max: the most words the person must say (0 when silent). minutes: how long it takes. asks_of_other: the most it asks of the other person. why: at most 140 characters, one short reason this try fits now.
Stay inside the bounds given. Answer with the JSON schema only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    hint: { type: "string" },
    step: { type: "integer", minimum: 1, maximum: 5 },
    words_max: { type: "integer", minimum: 0 },
    minutes: { type: "integer", minimum: 1 },
    asks_of_other: { type: "string", enum: ["none", "hello_back", "answer", "short_chat", "join_ok"] },
    place_kind: { type: "string", enum: ["anywhere", "cafe", "work"] },
    why: { type: "string" },
  },
  required: ["title", "hint", "step", "words_max", "minutes", "asks_of_other", "place_kind", "why"],
};

const ASKS = ["none", "hello_back", "answer", "short_chat", "join_ok"];
const PLACES = ["anywhere", "cafe", "work"];

/** Shape only; the bounds themselves are checked by validateTry. */
export function validateDraft(value: unknown): TryDraft | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.title !== "string" || !r.title || typeof r.hint !== "string" || !r.hint || typeof r.why !== "string" || !r.why) return null;
  if (!Number.isInteger(r.step) || (r.step as number) < 1 || (r.step as number) > 5) return null;
  if (!Number.isInteger(r.words_max) || (r.words_max as number) < 0 || !Number.isInteger(r.minutes) || (r.minutes as number) < 1) return null;
  if (!ASKS.includes(r.asks_of_other as string) || !PLACES.includes(r.place_kind as string)) return null;
  return {
    title: r.title,
    hint: r.hint,
    step: r.step as number,
    words_max: r.words_max as number,
    minutes: r.minutes as number,
    asks_of_other: r.asks_of_other as string,
    place_kind: r.place_kind as string,
    why: r.why as string,
  };
}

export function timeOfDay(now: Date): "morning" | "day" | "evening" {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", hourCycle: "h23" }).format(now));
  return hour < 12 ? "morning" : hour < 18 ? "day" : "evening";
}

function boundsLine(ask: Ask): string {
  const cap = ([["none", 0, 2], ["hello_back", 12, 2], ["answer", 25, 4], ["short_chat", null, 6], ["join_ok", null, 12]] as const)[ask.step - 1];
  const talking = cap[1] === null ? "free talking" : cap[1] === 0 ? "silence (0 words)" : `at most ${cap[1]} words said`;
  return `Bounds: ${talking}, at most ${cap[2]} minutes, asks of the other person at most ${cap[0]}. Step and place_kind must be exactly ${ask.step} and "${ask.place}".`;
}

export async function draftTry(env: Env, userId: string, ask: Ask): Promise<TryDraft | null> {
  const res = await structured<TryDraft>(env, {
    purpose: "try_it",
    system: SYSTEM,
    user: `Step: ${ask.step} (${STEP_NAMES[ask.step - 1]}). Place: ${ask.place}. Time of day: ${ask.timeOfDay}. Last tries: ${ask.last.join(", ") || "none yet"}. Interests: ${ask.interests.join(", ") || "unknown"}.\n${boundsLine(ask)}`,
    schemaName: "try",
    schema: SCHEMA,
    validate: validateDraft,
    effort: "low",
    timeoutMs: 8000,
    maxTokens: 600,
  });
  if (!res.ok) return null;
  const verdict = validateTry(res.value, ask);
  if (verdict !== "ok") {
    await writeWorking(env, { userId, fn: "try_it", tools: [], verdict: `rejected: ${verdict}`, effort: "low" });
    return null;
  }
  const ai = await screenWithModel(env, `${res.value.title}. ${res.value.hint}`);
  if (ai?.verdict === "reject") {
    await writeWorking(env, { userId, fn: "try_it", tools: [], verdict: `rejected: screen-${ai.category}`, effort: "low" });
    return null;
  }
  await writeWorking(env, { userId, fn: "try_it", tools: [], verdict: "approved", effort: "low" });
  return res.value;
}

// ---- WP37: the game. One call writes nine tries, or one replacement.
// Shape-checked here; the game rules (src/rules/tries.ts) accept or reject
// each try, and rejected ones become library tries, never rewrites.

export interface GameDraftTry {
  title: string;
  level: GameLevel;
  kind: GameKind;
  who_role: string | null;
  place_kind: string | null;
  step?: unknown;
}

export interface GameInput {
  talkAbout: string | null;
  moreOf: string | null;
  howIGo: string | null;
  lessOf: string[];
  roles: { role: string; roleClass: string }[];
}

const GAME_SYSTEM = `You write a personal game of nine tiny real-world tries: three each in SOFT, BRAVE and BOLD. Each level mixes SMALL TALK (talk) and KIND IT (kind: small acts of kindness). Personalise with the person's topic, place and the people in their days: who_role is a role from their list or null for a stranger (never a name).
Public everyday places only. BOLD stays public. Never flirting or dating, looks or clothing, contact details, touch, following, filming, children other than their own, money or buying, late-night drinking, or private places. Kindness is words, help or something from home, never buying. Service people only in light tries: never about their private life, never asked to leave their work.
UK English, no em dashes. Each title: one try in plain words, at most 24 words. level exactly soft, brave or bold, three of each; kind exactly talk or kind. why: one short reason this try fits them. Never set step: code assigns it. Answer with the JSON schema only.`;

const NEW_ONE_SYSTEM = `You write one replacement tiny real-world try at the given level and kind, never one of the excluded titles. who_role is a role from the person's list or null for a stranger (never a name).
Public everyday places only. Never flirting or dating, looks or clothing, contact details, touch, following, filming, children other than their own, money or buying, late-night drinking, or private places. Kindness is words, help or something from home, never buying. Service people only in light tries: never about their private life, never asked to leave their work.
UK English, no em dashes. The title: one try in plain words, at most 24 words. why: one short reason this try fits them. Never set step: code assigns it. Answer with the JSON schema only.`;

const TRY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    level: { type: "string" },
    kind: { type: "string" },
    who_role: { type: ["string", "null"] },
    place_kind: { type: ["string", "null"] },
    why: { type: "string" },
  },
  required: ["title", "level", "kind", "who_role", "place_kind", "why"],
};

const GAME_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { tries: { type: "array", items: TRY_SCHEMA } },
  required: ["tries"],
};

const LEVELS = ["soft", "brave", "bold"];
const KINDS = ["talk", "kind"];

/** Shape only; the game rules decide each try. */
export function validateGameDraft(value: unknown): GameDraftTry[] | null {
  if (!value || typeof value !== "object") return null;
  const tries = (value as Record<string, unknown>).tries;
  if (!Array.isArray(tries) || tries.length !== 9) return null;
  const out: GameDraftTry[] = [];
  for (const t of tries) {
    if (!t || typeof t !== "object") return null;
    const r = t as Record<string, unknown>;
    if (typeof r.title !== "string" || !r.title.trim()) return null;
    if (!LEVELS.includes(r.level as string) || !KINDS.includes(r.kind as string)) return null;
    if (r.who_role !== null && typeof r.who_role !== "string") return null;
    if (r.place_kind !== null && typeof r.place_kind !== "string") return null;
    if (typeof r.why !== "string" || !r.why.trim()) return null;
    out.push({ title: r.title.trim(), level: r.level as GameLevel, kind: r.kind as GameKind, who_role: r.who_role, place_kind: r.place_kind, step: r.step });
  }
  return out;
}

/** Shape only; the game rules decide the try. */
export function validateNewOneDraft(value: unknown): GameDraftTry | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.title !== "string" || !r.title.trim()) return null;
  if (!LEVELS.includes(r.level as string) || !KINDS.includes(r.kind as string)) return null;
  if (r.who_role !== null && typeof r.who_role !== "string") return null;
  if (r.place_kind !== null && typeof r.place_kind !== "string") return null;
  if (typeof r.why !== "string" || !r.why.trim()) return null;
  return { title: r.title.trim(), level: r.level as GameLevel, kind: r.kind as GameKind, who_role: r.who_role, place_kind: r.place_kind, step: r.step };
}

function gameUser(input: GameInput): string {
  const lines = [
    `TALK ABOUT: ${input.talkAbout ?? "unknown"}.`,
    `MORE OF: ${input.moreOf ?? "unknown"}.`,
    `HOW I GO: ${input.howIGo ?? "unknown"}.`,
    input.lessOf.length > 0 ? `LESS OF (never these): ${input.lessOf.join("; ")}.` : "LESS OF: none.",
    input.roles.length > 0 ? `People: ${input.roles.map((r) => `${r.role} (${r.roleClass})`).join(", ")}.` : "People: none named.",
  ];
  return lines.join("\n");
}

export async function draftGameTries(env: Env, userId: string, input: GameInput): Promise<GameDraftTry[] | null> {
  const res = await structured<GameDraftTry[]>(env, {
    purpose: "try_it",
    system: GAME_SYSTEM,
    user: gameUser(input),
    schemaName: "game",
    schema: GAME_SCHEMA,
    validate: validateGameDraft,
    effort: "low",
    timeoutMs: 8000,
    maxTokens: 1500,
  });
  await writeWorking(env, { userId, fn: "try_it", tools: [], verdict: res.ok ? "approved: shape" : `rejected: ${res.reason}`, effort: "low" });
  return res.ok ? res.value : null;
}

export async function draftNewOneTry(
  env: Env,
  userId: string,
  input: GameInput,
  level: GameLevel,
  kind: GameKind,
  exclude: string[],
): Promise<GameDraftTry | null> {
  const res = await structured<GameDraftTry>(env, {
    purpose: "try_it",
    system: NEW_ONE_SYSTEM,
    user: `${gameUser(input)}\nLevel: ${level}. Kind: ${kind}.\nExcluded titles (never repeat): ${exclude.length > 0 ? exclude.join(" | ") : "none"}.`,
    schemaName: "new_one",
    schema: TRY_SCHEMA,
    validate: validateNewOneDraft,
    effort: "low",
    timeoutMs: 8000,
    maxTokens: 400,
  });
  await writeWorking(env, { userId, fn: "try_it", tools: [], verdict: res.ok ? "approved: shape" : `rejected: ${res.reason}`, effort: "low" });
  return res.ok ? res.value : null;
}
