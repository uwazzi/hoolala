// WP35 onboarding story: six fixed beats with sourced findings. Pure: the
// page ticks this machine and renders the state. Copy is final per the spec.

export type BeatPic = "people" | "talk" | "fear" | "hours" | "kind" | "grow";

export interface Beat {
  kicker: string;
  head: string;
  body: string;
  source: string;
  pic: BeatPic;
}

export const TYPING_MS = 35;
export const HOLD_MS = 6200;

export const BEATS: Beat[] = [
  {
    kicker: "WHY GO? · THE NUMBERS",
    head: "1 IN 6 OF US FEEL ALONE.",
    body: "Around the world, about one person in six. Rates are highest among young people.",
    source: "Source: World Health Organization, 2025.",
    pic: "people",
  },
  {
    kicker: "WHY GO? · THE CATCH",
    head: "WE EXPECT AWKWARD. IT ISN’T.",
    body: "People expect chats with strangers to be more awkward than they are, and expect others to care less than they really do.",
    source: "Source: Kardas, Kumar and Epley, 2022.",
    pic: "talk",
  },
  {
    kicker: "WHY GO? · THE LIKING GAP",
    head: "WE THINK THEY WON’T LIKE US.",
    body: "After a chat, people think the other person liked them less than they did. The gap is widest for people who feel less sure of themselves.",
    source: "Source: Tissera et al., 2025.",
    pic: "fear",
  },
  {
    kicker: "WHY GO? · THE GOOD NEWS",
    head: "ONE HELLO. A LIFT FOR HOURS.",
    body: "A face-to-face chat predicts feeling less alone a few hours later. Brief contacts with familiar faces lift mood and belonging.",
    source: "Sources: Wild et al., 2025; Drebing et al., 2025.",
    pic: "hours",
  },
  {
    kicker: "WHY GO? · GIVING HELPS TOO",
    head: "A SMALL KINDNESS COUNTS.",
    body: "Small acts of kindness ease feeling alone in the moment and lift mood. Kindness to familiar faces helped more than to strangers.",
    source: "Sources: Lanser and Eisenberger, 2022; Lee et al., 2025.",
    pic: "kind",
  },
  {
    kicker: "SO, HOOLALA!",
    head: "GET OUTSIDE. MEET PEOPLE. GROW INSIDE.",
    body: "A hello, a kindness, a chat. A few quick questions, then your own game of tiny tries. Soft, brave or bold: you pick.",
    source: "No streaks. No scores. You never know until you go.",
    pic: "grow",
  },
];

export interface StoryState {
  beat: number;
  typed: number;
  held: number;
}

export const startStory = (): StoryState => ({ beat: 0, typed: 0, held: 0 });

export const storyDone = (s: StoryState): boolean => s.typed >= BEATS[s.beat].head.length;
export const storyLast = (s: StoryState): boolean => s.beat >= BEATS.length - 1;

/** One 35 ms tick: types a character, then holds, then moves on (never past the last beat, never under reduced motion or paused play). */
export function storyTick(s: StoryState, flags: { reduced: boolean; autoplay: boolean }): StoryState {
  if (!storyDone(s)) return { ...s, typed: flags.reduced ? BEATS[s.beat].head.length : s.typed + 1 };
  if (flags.reduced || !flags.autoplay || storyLast(s)) return { ...s, held: Math.min(s.held + TYPING_MS, HOLD_MS) };
  const held = s.held + TYPING_MS;
  return held >= HOLD_MS ? { beat: s.beat + 1, typed: 0, held: 0 } : { ...s, held };
}

/** A tap while typing completes the headline; a tap after it moves on. */
export function storyTap(s: StoryState): StoryState {
  if (!storyDone(s)) return { ...s, typed: BEATS[s.beat].head.length };
  return storyNext(s);
}

export function storyNext(s: StoryState): StoryState {
  return storyLast(s) ? s : { beat: s.beat + 1, typed: 0, held: 0 };
}

export function storyBack(s: StoryState): StoryState {
  return s.beat <= 0 ? s : { beat: s.beat - 1, typed: 0, held: 0 };
}

/** Whether the home screen shows the onboarding story. Guests always get
 * the animation. While the sign-in check loads, the local flag decides, so
 * the animation starts straight away without flashing the story at
 * returning users. Once signed in, the account flag rules. */
export function shouldShowStory(
  auth: "loading" | "in" | "out",
  introSeen: boolean | null,
  seenLocal: boolean,
): boolean {
  if (auth === "in") return introSeen === false;
  if (auth === "out") return true;
  return !seenLocal;
}

/** Where LET'S GO and SKIP open: the get-personal voice flow (WP36 reconfigures this route). */
export const PERSONAL_PATH = "/surprise";

const SEEN_KEY = "hoolala.intro.seen";

/** The seen flag for signed-out visitors; the account flag rules once signed in. */
export function localSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLocalSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // A preference, not a promise.
  }
}
