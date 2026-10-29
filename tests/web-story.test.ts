import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BEATS,
  HOLD_MS,
  localSeen,
  PERSONAL_PATH,
  setLocalSeen,
  startStory,
  storyBack,
  storyDone,
  storyLast,
  storyNext,
  storyTap,
  storyTick,
  TYPING_MS,
} from "../web/src/story";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the story machine", () => {
  it("starts on beat 1 and types one character per tick", () => {
    expect(TYPING_MS).toBe(35);
    let s = startStory();
    expect(s).toEqual({ beat: 0, typed: 0, held: 0 });
    s = storyTick(s, { reduced: false, autoplay: true });
    expect(s.typed).toBe(1);
    expect(storyDone(s)).toBe(false);
  });

  it("holds 4.2 s after the headline, then moves on by itself, except on the last beat", () => {
    expect(HOLD_MS).toBe(4200);
    let s = { beat: 0, typed: BEATS[0].head.length, held: 0 };
    for (let i = 0; i < HOLD_MS / TYPING_MS - 1; i++) s = storyTick(s, { reduced: false, autoplay: true });
    expect(s.beat).toBe(0);
    s = storyTick(s, { reduced: false, autoplay: true });
    expect(s).toEqual({ beat: 1, typed: 0, held: 0 });
    let last = { beat: 5, typed: BEATS[5].head.length, held: 0 };
    for (let i = 0; i < HOLD_MS / TYPING_MS + 10; i++) last = storyTick(last, { reduced: false, autoplay: true });
    expect(last.beat).toBe(5);
    expect(storyLast(last)).toBe(true);
  });

  it("shows the whole headline at once and never auto-advances under reduced motion", () => {
    let s = storyTick(startStory(), { reduced: true, autoplay: true });
    expect(s.typed).toBe(BEATS[0].head.length);
    for (let i = 0; i < HOLD_MS / TYPING_MS + 10; i++) s = storyTick(s, { reduced: true, autoplay: true });
    expect(s.beat).toBe(0);
    s = storyTick(startStory(), { reduced: false, autoplay: false });
    expect(s.typed).toBe(1);
  });

  it("taps complete the headline, then move on; back and next stay in range", () => {
    expect(storyTap(startStory()).typed).toBe(BEATS[0].head.length);
    expect(storyTap({ beat: 0, typed: BEATS[0].head.length, held: 0 })).toEqual({ beat: 1, typed: 0, held: 0 });
    expect(storyTap({ beat: 5, typed: BEATS[5].head.length, held: 0 }).beat).toBe(5);
    expect(storyNext({ beat: 5, typed: 0, held: 0 }).beat).toBe(5);
    expect(storyBack(startStory()).beat).toBe(0);
    expect(storyBack({ beat: 2, typed: 3, held: 4 })).toEqual({ beat: 1, typed: 0, held: 0 });
  });
});

describe("the six beats", () => {
  it("run in the spec order with the final copy", () => {
    expect(BEATS.map((b) => b.pic)).toEqual(["people", "talk", "fear", "hours", "kind", "grow"]);
    expect(BEATS.map((b) => b.head)).toEqual([
      "1 IN 6 OF US FEEL ALONE.",
      "WE EXPECT AWKWARD. IT ISN’T.",
      "WE THINK THEY WON’T LIKE US.",
      "ONE HELLO. A LIFT FOR HOURS.",
      "A SMALL KINDNESS COUNTS.",
      "GET OUTSIDE. MEET PEOPLE. GROW INSIDE.",
    ]);
    expect(BEATS[0].source).toBe("Source: World Health Organization, 2025.");
    expect(BEATS[5].source).toBe("No streaks. No scores. You never know until you go.");
  });

  it("carry no removed figures and no banned words", () => {
    const copy = BEATS.map((b) => `${b.kicker} ${b.head} ${b.body} ${b.source}`).join("\n");
    for (const gone of ["SIX MONTHS", "Boothby", "Epley and Schroeder", "FSO", "Swiss", "CRAZY"]) expect(copy).not.toContain(gone);
    for (const banned of ["lonely", "shy", "anxiety", "therapy", "coach", "dating"]) expect(copy.toLowerCase()).not.toContain(banned);
  });

  it("ends on the get-personal flow", () => {
    expect(PERSONAL_PATH).toBe("/surprise");
  });
});

describe("the signed-out seen flag", () => {
  it("is off without storage and round-trips with it", () => {
    expect(localSeen()).toBe(false);
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    expect(localSeen()).toBe(false);
    setLocalSeen();
    expect(localSeen()).toBe(true);
  });
});
