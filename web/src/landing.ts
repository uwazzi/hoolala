// WP66 landing for signed-out visitors: pure machines for the hero
// headline, the plant loop and the four story squares. The page ticks
// these with timers; tests drive them without timers. Copy is final
// per specs/landing.md. Beat words come from story.ts BEATS so the
// landing and the in-app story can never disagree.

import { BEATS } from "./story";

// Hero lines in order; \n is a line break. Three lines each.
export const LANDING_LINES = [
  "SAY HI.\nSEE WHAT\nHAPPENS.",
  "ONE HELLO\nCOULD MAKE\nYOUR DAY.",
  "SAME FACES.\nTIME FOR A\nFIRST WORD.",
  "THE BEST CHAT\nIS ONE TABLE\nAWAY.",
];

export const HEADLINE_TYPE_MS = 70;
export const HEADLINE_HOLD_MS = 2600;
export const HEADLINE_ERASE_MS = 30;
export const HEADLINE_GAP_MS = 400;

export interface HeadlineState {
  line: number;
  chars: number;
  deleting: boolean;
}

export const startHeadline = (): HeadlineState => ({ line: 0, chars: 0, deleting: false });

export const headlineText = (s: HeadlineState): string => LANDING_LINES[s.line].slice(0, s.chars);

// One step: type or erase a letter, or flip phase at the ends. Returns
// the next state with the wait before the next step.
export function headlineTick(s: HeadlineState, flags: { reduced: boolean }): { state: HeadlineState; delay: number } {
  if (flags.reduced) return { state: { line: 0, chars: LANDING_LINES[0].length, deleting: false }, delay: 0 };
  const phrase = LANDING_LINES[s.line];
  if (!s.deleting) {
    const chars = s.chars + 1;
    if (chars >= phrase.length) return { state: { ...s, chars: phrase.length, deleting: true }, delay: HEADLINE_HOLD_MS };
    return { state: { ...s, chars }, delay: HEADLINE_TYPE_MS };
  }
  const chars = s.chars - 1;
  if (chars <= 0) return { state: { line: (s.line + 1) % LANDING_LINES.length, chars: 0, deleting: false }, delay: HEADLINE_GAP_MS };
  return { state: { ...s, chars }, delay: HEADLINE_ERASE_MS };
}

// The app plant grows 0 to 9 leaves, holds full, then back to bare.
export const PLANT_MAX = 9;
export const PLANT_GROW_MS = 650;
export const PLANT_HOLD_MS = 2800;
export const PLANT_BARE_MS = 500;

export function plantTick(leaves: number, flags: { reduced: boolean }): { leaves: number; delay: number } {
  if (flags.reduced) return { leaves: PLANT_MAX, delay: 0 };
  if (leaves >= PLANT_MAX) return { leaves: 0, delay: PLANT_BARE_MS };
  const next = leaves + 1;
  return { leaves: next, delay: next === PLANT_MAX ? PLANT_HOLD_MS : PLANT_GROW_MS };
}

// The newest leaf pops, as on Today. Still under reduced motion.
export function plantGrew(leaves: number, reduced: boolean): number {
  return reduced ? -1 : leaves - 1;
}

// Four beats stay on screen; one square at a time replays its scene.
// BEATS[1] (THE CATCH) stays out on purpose.
export const LANDING_BEAT_INDEXES = [0, 2, 3, 4];
export const LANDING_BEAT_STEPS = [6, 4, 3, 4];
export const STORY_STEP_MS = 320;
export const STORY_HOLD_MS = 1400;
export const STORY_GAP_MS = 250;

export interface LandingStoryState {
  beat: number;
  sub: number;
}

export const startLandingStory = (): LandingStoryState => ({ beat: 0, sub: 0 });

export function landingStoryTick(
  s: LandingStoryState,
  flags: { reduced: boolean },
): { state: LandingStoryState; delay: number } {
  if (flags.reduced) return { state: { beat: -1, sub: 0 }, delay: 0 };
  const steps = LANDING_BEAT_STEPS[s.beat];
  if (s.sub < steps) {
    const sub = s.sub + 1;
    return { state: { beat: s.beat, sub }, delay: sub === steps ? STORY_HOLD_MS : STORY_STEP_MS };
  }
  return { state: { beat: (s.beat + 1) % LANDING_BEAT_STEPS.length, sub: 0 }, delay: STORY_GAP_MS };
}

// A square that is not playing shows its whole scene.
export function landingStepVisible(beat: number, step: number, s: LandingStoryState): boolean {
  return s.beat !== beat || s.sub >= step;
}

// Beat 4: the cup sits by the giver, halfway, then with the receiver.
export type CoffeePos = "giver" | "middle" | "receiver";

export function landingCoffee(s: LandingStoryState): CoffeePos | null {
  if (s.beat !== 3) return "receiver";
  if (s.sub === 2) return "giver";
  if (s.sub === 3) return "middle";
  if (s.sub >= 4) return "receiver";
  return null;
}

export function landingBeats() {
  return LANDING_BEAT_INDEXES.map((i) => BEATS[i]);
}

export function landingTurn(): string {
  return `${BEATS[5].kicker} ${BEATS[5].head}`;
}

export const LANDING_SOURCES =
  "Sources: WHO 2025 · Tissera et al. 2025 · Wild et al. 2025; Drebing et al. 2025 · Lanser & Eisenberger 2022; Lee et al. 2025";

export function landingBeatLabel(beat: number): string {
  if (beat < 0) return "THE STORY IN 4 BEATS";
  const kicker = BEATS[LANDING_BEAT_INDEXES[beat]].kicker.split("·")[1].trim();
  return `${beat + 1} OF 4 · ${kicker}`;
}
