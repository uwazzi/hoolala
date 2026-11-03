import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEATS } from "../web/src/story";
import {
  HEADLINE_ERASE_MS,
  HEADLINE_GAP_MS,
  HEADLINE_HOLD_MS,
  HEADLINE_TYPE_MS,
  headlineText,
  headlineTick,
  LANDING_BEAT_INDEXES,
  LANDING_BEAT_STEPS,
  landingBeatLabel,
  landingBeats,
  landingCoffee,
  landingStepVisible,
  landingStoryTick,
  landingTurn,
  LANDING_LINES,
  LANDING_SOURCES,
  plantGrew,
  plantTick,
  PLANT_BARE_MS,
  PLANT_GROW_MS,
  PLANT_HOLD_MS,
  PLANT_MAX,
  startHeadline,
  startLandingStory,
  STORY_GAP_MS,
  STORY_HOLD_MS,
  STORY_STEP_MS,
} from "../web/src/landing";

const homeView = readFileSync("web/src/pages/Home.tsx", "utf8");
const landingView = readFileSync("web/src/pages/Landing.tsx", "utf8");
const landingLogic = readFileSync("web/src/landing.ts", "utf8");

describe("WP66 routing", () => {
  it("renders Landing, not Story, for signed-out visitors", () => {
    expect(homeView).toContain("shouldShowStory(auth, me?.introSeen ?? null, seenLocal)");
    expect(homeView).toContain("Landing");
    expect(homeView).toContain("<Landing");
    expect(homeView).not.toContain("<Story guest");
  });

  it("keeps Story for signed-in first-timers and Today for everyone else signed in", () => {
    expect(homeView).toContain("<Story");
    expect(homeView).toContain('auth === "in"');
    expect(homeView).toContain("TODAY'S TRY");
  });
});

describe("WP66 beats and sources", () => {
  it("takes four beat headlines and sources from story.ts, skipping THE CATCH", () => {
    expect(LANDING_BEAT_INDEXES).toEqual([0, 2, 3, 4]);
    expect(landingBeats().map((b) => b.head)).toEqual([
      BEATS[0].head,
      BEATS[2].head,
      BEATS[3].head,
      BEATS[4].head,
    ]);
    expect(landingBeats().map((b) => b.source)).toEqual([
      BEATS[0].source,
      BEATS[2].source,
      BEATS[3].source,
      BEATS[4].source,
    ]);
    expect(BEATS[3].head).toBe("ONE HELLO. A LIFT FOR HOURS.");
  });

  it("builds the turn bar from BEATS[5]", () => {
    expect(landingTurn()).toBe("SO, HOOLALA! GET OUTSIDE. MEET PEOPLE. GROW INSIDE.");
    expect(landingTurn()).toContain(BEATS[5].head);
    expect(landingTurn()).toContain(BEATS[5].kicker);
  });

  it("joins the four sources into the final line", () => {
    expect(LANDING_SOURCES).toBe(
      "Sources: WHO 2025 · Tissera et al. 2025 · Wild et al. 2025; Drebing et al. 2025 · Lanser & Eisenberger 2022; Lee et al. 2025",
    );
  });

  it("labels beats from the story kickers", () => {
    expect([
      landingBeatLabel(0),
      landingBeatLabel(1),
      landingBeatLabel(2),
      landingBeatLabel(3),
    ]).toEqual([
      "1 OF 4 · THE NUMBERS",
      "2 OF 4 · THE LIKING GAP",
      "3 OF 4 · THE GOOD NEWS",
      "4 OF 4 · GIVING HELPS TOO",
    ]);
    expect(landingBeatLabel(-1)).toBe("THE STORY IN 4 BEATS");
  });
});

describe("WP66 headline rotation", () => {
  it("rotates four final lines", () => {
    expect(LANDING_LINES).toEqual([
      "SAY HI.\nSEE WHAT\nHAPPENS.",
      "ONE HELLO\nCOULD MAKE\nYOUR DAY.",
      "SAME FACES.\nTIME FOR A\nFIRST WORD.",
      "THE BEST CHAT\nIS ONE TABLE\nAWAY.",
    ]);
    expect(HEADLINE_TYPE_MS).toBe(70);
    expect(HEADLINE_HOLD_MS).toBe(2600);
    expect(HEADLINE_ERASE_MS).toBe(30);
    expect(HEADLINE_GAP_MS).toBe(400);
  });

  it("types letter by letter, holds, erases and moves to the next line", () => {
    let s = startHeadline();
    expect(s).toEqual({ line: 0, chars: 0, deleting: false });
    let next = headlineTick(s, { reduced: false });
    expect(next.state).toEqual({ line: 0, chars: 1, deleting: false });
    expect(next.delay).toBe(70);
    expect(headlineText(next.state)).toBe(LANDING_LINES[0].slice(0, 1));
    s = { line: 0, chars: LANDING_LINES[0].length - 1, deleting: false };
    next = headlineTick(s, { reduced: false });
    expect(next.state.deleting).toBe(true);
    expect(next.delay).toBe(2600);
    expect(headlineText(next.state)).toBe(LANDING_LINES[0]);
    next = headlineTick(next.state, { reduced: false });
    expect(next.state.chars).toBe(LANDING_LINES[0].length - 1);
    expect(next.delay).toBe(30);
    s = { line: 0, chars: 1, deleting: true };
    next = headlineTick(s, { reduced: false });
    expect(next.state).toEqual({ line: 1, chars: 0, deleting: false });
    expect(next.delay).toBe(400);
  });

  it("wraps from line 4 back to line 1", () => {
    const last = LANDING_LINES.length - 1;
    const next = headlineTick({ line: last, chars: 1, deleting: true }, { reduced: false });
    expect(next.state.line).toBe(0);
    expect(next.state.chars).toBe(0);
  });

  it("shows line 1 complete under reduced motion", () => {
    const next = headlineTick(startHeadline(), { reduced: true });
    expect(next.state.line).toBe(0);
    expect(headlineText(next.state)).toBe(LANDING_LINES[0]);
  });
});

describe("WP66 plant loop", () => {
  it("grows 0 to 9 leaves then back to the bare pot", () => {
    expect(PLANT_MAX).toBe(9);
    expect(PLANT_GROW_MS).toBe(650);
    expect(PLANT_HOLD_MS).toBe(2800);
    expect(PLANT_BARE_MS).toBe(500);
    expect(plantTick(0, { reduced: false })).toEqual({ leaves: 1, delay: 650 });
    expect(plantTick(8, { reduced: false })).toEqual({ leaves: 9, delay: 2800 });
    expect(plantTick(9, { reduced: false })).toEqual({ leaves: 0, delay: 500 });
  });

  it("pops the newest leaf, and stays still and full under reduced motion", () => {
    for (let leaves = 0; leaves <= 9; leaves++) expect(plantGrew(leaves, false)).toBe(leaves - 1);
    expect(plantGrew(9, true)).toBe(-1);
    expect(plantTick(3, { reduced: true })).toEqual({ leaves: 9, delay: 0 });
  });
});

describe("WP66 story loop", () => {
  it("replays one square at a time with 6, 4, 3, 4 steps and wraps", () => {
    expect(LANDING_BEAT_STEPS).toEqual([6, 4, 3, 4]);
    expect(STORY_STEP_MS).toBe(320);
    expect(STORY_HOLD_MS).toBe(1400);
    expect(STORY_GAP_MS).toBe(250);
    expect(startLandingStory()).toEqual({ beat: 0, sub: 0 });
    let next = landingStoryTick({ beat: 0, sub: 0 }, { reduced: false });
    expect(next).toEqual({ state: { beat: 0, sub: 1 }, delay: 320 });
    next = landingStoryTick({ beat: 0, sub: 5 }, { reduced: false });
    expect(next).toEqual({ state: { beat: 0, sub: 6 }, delay: 1400 });
    next = landingStoryTick({ beat: 0, sub: 6 }, { reduced: false });
    expect(next).toEqual({ state: { beat: 1, sub: 0 }, delay: 250 });
    next = landingStoryTick({ beat: 3, sub: 4 }, { reduced: false });
    expect(next.state).toEqual({ beat: 0, sub: 0 });
  });

  it("shows complete scenes everywhere except the playing square", () => {
    const playing = { beat: 1, sub: 2 };
    for (let beat = 0; beat < 4; beat++) {
      for (let step = 1; step <= LANDING_BEAT_STEPS[beat]; step++) {
        expect(landingStepVisible(beat, step, playing)).toBe(beat !== 1 || step <= 2);
      }
    }
  });

  it("travels the kindness coffee from giver to receiver", () => {
    expect(landingCoffee({ beat: 3, sub: 0 })).toBeNull();
    expect(landingCoffee({ beat: 3, sub: 1 })).toBeNull();
    expect(landingCoffee({ beat: 3, sub: 2 })).toBe("giver");
    expect(landingCoffee({ beat: 3, sub: 3 })).toBe("middle");
    expect(landingCoffee({ beat: 3, sub: 4 })).toBe("receiver");
    expect(landingCoffee({ beat: 0, sub: 3 })).toBe("receiver");
  });

  it("shows everything complete and still under reduced motion", () => {
    const next = landingStoryTick(startLandingStory(), { reduced: true });
    expect(next.state.beat).toBe(-1);
    for (let beat = 0; beat < 4; beat++) {
      for (let step = 1; step <= LANDING_BEAT_STEPS[beat]; step++) {
        expect(landingStepVisible(beat, step, next.state)).toBe(true);
      }
    }
    expect(landingCoffee(next.state)).toBe("receiver");
  });
});

describe("WP66 copy", () => {
  const copy = `${landingView}\n${landingLogic}`;

  it("avoids banned words and em dashes", () => {
    for (const banned of ["lonely", "shy", "anxiety", "therapy", "coach"]) {
      expect(copy.toLowerCase()).not.toContain(banned);
    }
    expect(copy).not.toContain("—");
  });

  it("mentions dating only as NOT A DATING APP", () => {
    const lower = copy.toLowerCase();
    const hits = lower.split("dating").length - 1;
    const allowed = lower.split("not a dating app").length - 1;
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBe(allowed);
  });

  it("keeps the final hero, steps, trust and close copy", () => {
    for (const line of [
      "One tiny thing to try in real life, each day.",
      "EVERY TRY GROWS A LEAF.",
      "TELL US A LITTLE",
      "Two minutes.",
      "GET ONE TINY TRY",
      "Soft, brave or bold.",
      "GO. PHONE DOWN.",
      "Your plant grows.",
      "FIRST NAMES ONLY",
      "NOT A DATING APP",
      "NO STREAKS",
      "YOU NEVER KNOW UNTIL YOU GO.",
    ]) {
      expect(copy).toContain(line);
    }
  });
});

describe("WP66 links and access", () => {
  it("sends LET'S GO and SIGN IN to sign-in, footer to posters and privacy", () => {
    expect(landingView.match(/LET'S GO/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(landingView).toContain("SIGN IN");
    expect(landingView.match(/href="\/signin"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(landingView).toContain('href="/posters"');
    expect(landingView).toContain('href="/privacy"');
    expect(landingView).toContain("hg-labs.io");
    expect(landingView).toContain("Muse Spark by Meta");
  });

  it("marks the visit only on tap, never on view", () => {
    expect(landingView).toContain("setLocalSeen");
    expect(landingView).not.toMatch(/useEffect\(\(\) => \{\s*setLocalSeen/);
  });

  it("keeps one labelled h1, decorative art hidden and real link keys", () => {
    expect(landingView.match(/<h1/g)?.length).toBe(1);
    expect(landingView).toContain('aria-label="Say hi. See what happens."');
    expect(landingView).toContain("aria-hidden");
    expect(landingView).toContain("<a ");
    expect(landingView).toContain("prefers-reduced-motion");
    expect(landingView).toContain("visibilityState");
  });
});
