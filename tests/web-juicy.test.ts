// WP39 keeping the juicy bits, web side: the kept-bits derivation, the Snake
// tick, the ticker and the SHOW ME gate. Pure logic is unit-tested; the board
// (focus, key handling, timers) is pinned by source checks below and was
// reviewed by code inspection against design/screens/Onboard.dc.html, since
// these tests run in node without a DOM.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILLER as SERVER_FILLER, PHRASES as SERVER_PHRASES, STOPWORDS as SERVER_STOPWORDS } from "../src/rules/juicy";
import {
  FILLER,
  keptListOf,
  keywordsOf,
  mergeKept,
  nearlyRoleOf,
  nearlySaidOf,
  newSnake,
  offTableOf,
  PHRASES,
  rolesOf,
  showMeReady,
  startPace,
  stepSnake,
  steerSnake,
  STOPWORDS,
  tickerFor,
  tokenize,
  topicsOf,
} from "../web/src/juicy";

const Q1F = "Um, so basically it was board games with my brother, like, last Saturday. We argued about the rules for, you know, a whole hour.";
const Q4 = "Honestly I kind of nearly told the barista that I really love the music they play.";

describe("tokenize", () => {
  it("marks filler, stop words and keywords, and keeps phrases whole", () => {
    expect(tokenize("Um board games you know")).toEqual([
      { w: "Um", cls: "filler", key: null },
      { w: "board games", cls: "key", key: "board games" },
      { w: "you", cls: "stop", key: null },
      { w: "know", cls: "filler", key: null },
    ]);
    expect(tokenize("the music they play")).toEqual([
      { w: "the music", cls: "key", key: "music" },
      { w: "they", cls: "stop", key: null },
      { w: "play", cls: "stop", key: null },
    ]);
  });

  it("lights role words as keywords", () => {
    expect(tokenize("with my brother")[2]).toEqual({ w: "brother", cls: "key", key: "brother" });
  });
});

describe("keywords and topics", () => {
  it("dedupes keywords and drops names", () => {
    expect(keywordsOf("Board games and board games with Anna")).toEqual(["board games"]);
    expect(keywordsOf(Q1F)).toEqual(["board games", "brother", "rules"]);
  });

  it("takes three non-role topics from the story", () => {
    expect(topicsOf(Q1F)).toEqual(["board games", "rules"]);
    expect(topicsOf(null)).toEqual([]);
  });
});

describe("roles", () => {
  const ANSWERS = { q1f: Q1F, q4: null, q2: ["BARISTA", "NEIGHBOUR"], q2f: ["COLLEAGUE", "DRIVER"], q5: [] as string[] };

  it("tiers chips as said and nodded, and finds roles in free text", () => {
    expect(rolesOf(ANSWERS)).toEqual([
      { phrase: "the barista", label: "BARISTA", cls: "service", place: "the café", tier: "said" },
      { phrase: "your neighbour", label: "NEIGHBOUR", cls: "close", place: "your building", tier: "said" },
      { phrase: "your brother", label: "BROTHER", cls: "close", family: 1, tier: "said", place: undefined },
      { phrase: "a colleague", label: "COLLEAGUE", cls: "close", place: "work", tier: "nod" },
      { phrase: "the bus driver", label: "DRIVER", cls: "service", place: "the bus stop", tier: "nod" },
    ]);
  });

  it("never lists the same role twice, and prefers said over nodded", () => {
    const roles = rolesOf({ q1f: null, q4: null, q2: ["BARISTA"], q2f: ["BARISTA"], q5: [] });
    expect(roles).toEqual([{ phrase: "the barista", label: "BARISTA", cls: "service", place: "the café", tier: "said" }]);
  });

  it("removes family roles for FAMILY and colleagues for WORK", () => {
    expect(rolesOf({ ...ANSWERS, q5: ["FAMILY"] }).map((r) => r.label)).toEqual(["BARISTA", "NEIGHBOUR", "COLLEAGUE", "DRIVER"]);
    expect(rolesOf({ ...ANSWERS, q5: ["WORK"] }).map((r) => r.label)).toEqual(["BARISTA", "NEIGHBOUR", "BROTHER", "DRIVER"]);
  });
});

describe("nearly said and off the table", () => {
  it("reads the nearly-said words and who they were for", () => {
    expect(nearlySaidOf(Q4)).toBe("music");
    expect(nearlySaidOf(null)).toBeNull();
    expect(nearlyRoleOf(Q4)).toEqual({ phrase: "the barista", label: "BARISTA", cls: "service", tier: "said" });
    expect(nearlyRoleOf(null)).toBeNull();
  });

  it("drops NOTHING, I\u2019M EASY from the off-table list", () => {
    expect(offTableOf(["POLITICS", "NOTHING, I\u2019M EASY"])).toEqual(["POLITICS"]);
    expect(offTableOf([])).toEqual([]);
  });
});

describe("keptListOf", () => {
  it("orders topics, said, nodded, NEARLY SAID, battery and NOTs", () => {
    expect(
      keptListOf({ q1f: Q1F, q4: Q4, q2: ["BARISTA", "NEIGHBOUR"], q2f: ["COLLEAGUE", "DRIVER"], q5: ["POLITICS", "MONEY"] }, "OK"),
    ).toEqual(["BOARD GAMES", "RULES", "BARISTA", "NEIGHBOUR", "BROTHER", "COLLEAGUE (NOD)", "DRIVER (NOD)", "NEARLY SAID", "BATTERY OK", "NOT: POLITICS", "NOT: MONEY"]);
  });
});

describe("mergeKept", () => {
  it("merges chip roles with the extracted bits for the compass check", () => {
    expect(
      mergeKept(
        { q1: "THIS MONTH", q1f: Q1F, q2: ["BARISTA"], q2extra: null, q2f: ["DRIVER"], q2fextra: null, q3: "OK", q4: Q4, q5: ["POLITICS"] },
        { topics: ["board games"], people: [{ role: "brother" }], nearlySaid: { line: "I love the music you play", toRole: "barista" } },
      ),
    ).toEqual({
      topics: ["board games"],
      said: ["barista", "brother"],
      nod: ["driver"],
      nearlySaid: { line: "I love the music you play", toRole: "barista" },
      battery: "OK",
      lastChat: "THIS MONTH",
      offtable: ["POLITICS"],
      q5Answered: true,
      answered: 5,
    });
  });

  it("filters off-table roles and counts the answered questions", () => {
    const bits = mergeKept(
      { q1: null, q1f: null, q2: [], q2extra: null, q2f: ["COLLEAGUE"], q2fextra: null, q3: "FULL", q4: null, q5: ["WORK", "FAMILY"] },
      { topics: [], people: [{ role: "brother" }], nearlySaid: null },
    );
    expect(bits.said).toEqual([]);
    expect(bits.nod).toEqual([]);
    expect(bits.answered).toBe(2);
  });
});

describe("startPace", () => {
  it("maps the battery to a tab, with CAN\u2019T REMEMBER always on SOFT", () => {
    expect(startPace("LOW", "THIS WEEK")).toBe(0);
    expect(startPace("OK", "THIS WEEK")).toBe(0);
    expect(startPace("GOOD", "THIS WEEK")).toBe(1);
    expect(startPace("FULL", "THIS WEEK")).toBe(2);
    expect(startPace("FULL", "CAN\u2019T REMEMBER")).toBe(0);
    expect(startPace("FULL", "CAN'T REMEMBER")).toBe(0);
    expect(startPace(null, null)).toBe(0);
  });
});

describe("stepSnake", () => {
  it("starts in the centre, length 3, moving right with fixed first food", () => {
    expect(newSnake()).toEqual({ body: [[9, 6], [8, 6], [7, 6]], dir: [1, 0], next: [1, 0], food: [14, 6], eaten: 0, oops: false });
  });

  it("moves one cell and wraps around the walls", () => {
    const moved = stepSnake(newSnake(), 1000);
    expect(moved.body[0]).toEqual([10, 6]);
    expect(moved.body).toHaveLength(3);
    const wrapped = stepSnake({ ...newSnake(), body: [[18, 6], [17, 6], [16, 6]], food: [0, 0] }, 1000);
    expect(wrapped.body[0]).toEqual([0, 6]);
  });

  it("grows by one on food and moves the food to a free cell", () => {
    const after = stepSnake({ ...newSnake(), body: [[13, 6], [12, 6], [11, 6]], food: [14, 6] }, 1000);
    expect(after.body).toHaveLength(4);
    expect(after.eaten).toBe(1);
    expect(after.body.some((b) => b[0] === after.food[0] && b[1] === after.food[1])).toBe(false);
  });

  it("shows OOPS on a self-hit, then a fresh snake after 1.2 s", () => {
    const hit = stepSnake({ ...newSnake(), body: [[5, 5], [5, 6], [6, 6], [6, 5]], dir: [0, 1], next: [0, 1] }, 1000);
    expect(hit.oops).toBe(1000);
    expect(stepSnake(hit, 1500).oops).toBe(1000);
    expect(stepSnake(hit, 2201)).toEqual(newSnake());
  });

  it("ignores a reverse turn", () => {
    expect(steerSnake(newSnake(), [-1, 0]).next).toEqual([1, 0]);
    expect(steerSnake(newSnake(), [0, -1]).next).toEqual([0, -1]);
  });
});

describe("tickerFor and showMeReady", () => {
  const FIRST = "EAT A PIXEL. EACH ONE IS A JUICY BIT. ARROW KEYS WORK TOO.";

  it("invites first, then cycles the kept bits", () => {
    expect(tickerFor(0, ["BOARD GAMES"], false)).toBe(FIRST);
    expect(tickerFor(1, ["BOARD GAMES", "BARISTA"], false)).toBe("+ BOARD GAMES");
    expect(tickerFor(3, ["BOARD GAMES", "BARISTA"], false)).toBe("+ BOARD GAMES");
    expect(tickerFor(1, ["BOARD GAMES"], true)).toBe("");
  });

  it("shows SHOW ME only when extraction is done and the headline is typed", () => {
    expect(showMeReady(true, true)).toBe(true);
    expect(showMeReady(true, false)).toBe(false);
    expect(showMeReady(false, true)).toBe(false);
  });
});

describe("the Snake screen as drawn", () => {
  const snake = readFileSync("web/src/components/Snake.tsx", "utf8");
  const juicy = readFileSync("web/src/pages/Juicy.tsx", "utf8");

  it("has no score, counter or stored result anywhere", () => {
    for (const src of [snake, juicy]) {
      expect(src).not.toMatch(/\bscore\b/i);
      expect(src).not.toMatch(/\bcounter\b/i);
      expect(src).not.toMatch(/localStorage|sessionStorage/);
    }
  });

  it("steers on the focused board only, with arrows and WASD", () => {
    expect(snake).toContain("tabIndex={0}");
    expect(snake).toContain("preventDefault");
    for (const key of ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight", '"a"', '"w"', '"s"', '"d"']) {
      expect(snake).toContain(key);
    }
    expect(snake).not.toContain("addEventListener");
    expect(snake).toContain("preventScroll");
    expect(snake).toContain("Snake controls");
  });

  it("runs at 170 ms, 260 ms with reduced motion, and cleans up", () => {
    expect(snake).toContain("170");
    expect(snake).toContain("260");
    expect(snake).toContain("clearInterval");
    expect(snake).toContain("OOPS. GO AGAIN.");
  });

  it("gates SHOW ME WHAT YOU KEPT on extraction and the typed headline", () => {
    expect(juicy).toContain("SHOW ME WHAT YOU KEPT");
    expect(juicy).toContain("STILL KEEPING THE JUICY BITS");
    expect(juicy).toContain("showMeReady(");
    expect(juicy).toContain("STOP PLAYING");
    expect(juicy).toContain("Nothing to trim. Just your taps.");
    expect(juicy).toContain("LOOKS RIGHT. MAKE MY GAME");
    expect(juicy).toContain("CHANGE SOMETHING");
  });
});

describe("the web and server word lists", () => {
  it("match exactly, so trimming and validation agree", () => {
    expect(FILLER).toEqual(SERVER_FILLER);
    expect(STOPWORDS).toEqual(SERVER_STOPWORDS);
    expect(PHRASES).toEqual(SERVER_PHRASES);
  });
});
