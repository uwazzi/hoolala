// WP29: code owns the step and the leaves (HANDOFF-v6 section 4). TRY IT
// drafts words; this file decides whether a draft fits the requested step.
// Bounds are maximums: a gentler ask than the step's own always passes.

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
