// WP39 compass check from the kept bits: the 2x2 grid (N MORE OF, E TALK
// ABOUT, S LESS OF, W HOW I GO), the MORE THAN HI / A NOD SO FAR people box,
// and the LOOKS RIGHT payload with battery, off-table and nearly-said.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkCells, checkHeadline, checkPeopleNod, checkPeopleSaid, checkPeopleSrc, savePayload, type KeptBits } from "../web/src/personal";

const BITS: KeptBits = {
  topics: ["board games", "rules"],
  said: ["barista", "brother"],
  nod: ["colleague", "driver"],
  nearlySaid: { line: "I love the music you play", toRole: "barista" },
  battery: "OK",
  lastChat: "THIS MONTH",
  offtable: ["POLITICS", "MONEY"],
  q5Answered: true,
  answered: 5,
};

const EMPTY: KeptBits = { topics: [], said: [], nod: [], nearlySaid: null, battery: null, lastChat: null, offtable: [], q5Answered: false, answered: 0 };

describe("the compass check", () => {
  it("maps N/E/S/W to the kept bits with their sources", () => {
    expect(checkCells(BITS)).toEqual([
      { pole: "N", name: "MORE OF", value: "Saying it: \u201CI love the music you play\u201D", src: "FROM: WHAT YOU NEARLY SAID" },
      { pole: "E", name: "TALK ABOUT", value: "Board games \u00B7 rules", src: "FROM: YOUR STORY" },
      { pole: "S", name: "LESS OF", value: "Politics \u00B7 money", src: "FROM: KEEP OFF THE TABLE" },
      { pole: "W", name: "HOW I GO", value: "Battery ok today \u00B7 last long chat: this month", src: "FROM: BATTERY CHECK" },
    ]);
  });

  it("leaves empty cells empty, and says so when nothing is off the table", () => {
    expect(checkCells(EMPTY).map((c) => c.value)).toEqual([null, null, null, null]);
    expect(checkCells({ ...EMPTY, offtable: [], q5Answered: true })[2].value).toBe("Nothing. You\u2019re easy.");
    expect(checkCells({ ...EMPTY, battery: "LOW" })[3].value).toBe("Battery low today");
  });

  it("tiers people into MORE THAN HI and A NOD SO FAR", () => {
    expect(checkPeopleSaid(BITS)).toBe("MORE THAN HI: BARISTA \u00B7 BROTHER");
    expect(checkPeopleNod(BITS)).toBe("A NOD SO FAR: COLLEAGUE \u00B7 DRIVER");
    expect(checkPeopleSrc(BITS)).toBe("FROM: YOUR ANSWERS \u00B7 ROLES ONLY, NEVER NAMES");
    expect(checkPeopleSaid(EMPTY)).toBe("MORE THAN HI: nobody yet");
    expect(checkPeopleNod(EMPTY)).toBe("A NOD SO FAR: nobody yet");
    expect(checkPeopleSrc(EMPTY)).toBe("EMPTY FOR NOW. TRIES WILL SAY SOMEONE.");
  });

  it("counts the answered questions in the headline", () => {
    expect(checkHeadline(5)).toBe("THAT'S YOU, IN 5 ANSWERS.");
    expect(checkHeadline(1)).toBe("THAT'S YOU, IN 1 ANSWERS.");
  });

  it("saves lines, people, battery, off-table and nearly-said in one payload", () => {
    expect(savePayload(BITS)).toEqual({
      lines: [
        { part: "intention", words: "Saying it: \u201CI love the music you play\u201D" },
        { part: "interest", words: "Board games \u00B7 rules" },
        { part: "filter", words: "Politics \u00B7 money" },
        { part: "delivery", words: "Battery ok today \u00B7 last long chat: this month" },
      ],
      people: [{ role: "barista" }, { role: "brother" }, { role: "colleague" }, { role: "driver" }],
      battery: "OK",
      offtable: ["POLITICS", "MONEY"],
      nearlySaid: { line: "I love the music you play", toRole: "barista" },
    });
    expect(savePayload(EMPTY)).toEqual({ lines: [], people: [], battery: null, offtable: [], nearlySaid: null });
  });

  it("trims long lines to a word boundary so the save validates", () => {
    const payload = savePayload({ ...BITS, nearlySaid: { line: "I really love the music you play every single morning here", toRole: null } });
    expect(payload.lines[0].words.length).toBeLessThanOrEqual(60);
    expect(payload.lines[0].words).toBe("Saying it: \u201CI really love the music you play every single\u201D");
  });

  it("reuses the WP34 voice UI instead of forking it", () => {
    const src = readFileSync("web/src/pages/Surprise.tsx", "utf8");
    expect(src).toContain('from "../voice"');
    expect(src).toContain('from "../components/PixelBall"');
    expect(src).not.toContain("getUserMedia");
    expect(src).not.toContain("AudioContext");
  });
});
