import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyOffTable,
  CLOSING,
  matchChips,
  placeFor,
  saveOnboardAnswers,
  STEPS,
  startHere,
  takeOnboardAnswers,
  toggleMany,
  type OnboardAnswers,
} from "../web/src/onboard";

const APOS = "’";
const CANT = `CAN${APOS}T REMEMBER`;
const EASY = `NOTHING, I${APOS}M EASY`;

const BLANK: OnboardAnswers = {
  q1: null,
  q1f: null,
  q2: [],
  q2extra: null,
  q2f: [],
  q2fextra: null,
  q3: null,
  q4: null,
  q5: [],
};

describe("spec 1: the step order and copy match the drawn script", () => {
  it("runs intro, Q1, follow-up, Q2, follow-up, Q3, Q4, Q5", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["q1", "q1f", "q2", "q2f", "q3", "q4", "q5"]);
    expect(STEPS.map((s) => s.n)).toEqual([1, 1, 2, 2, 3, 4, 5]);
    expect(STEPS.map((s) => s.type)).toEqual(["one", "text", "many", "many", "one", "text", "many"]);
    expect(STEPS.filter((s) => s.follow).map((s) => s.id)).toEqual(["q1f", "q2f"]);
  });

  it("asks the drawn questions, word for word", () => {
    expect(STEPS.map((s) => s.q)).toEqual([
      "When did you last lose track of time talking to someone?",
      `Nice. What was it about? Ramble if you like. I${APOS}ll keep the good bits.`,
      "Who did you say more than “hi” to this week?",
      "And who did you only nod at?",
      `Battery check. How${APOS}s yours today?`,
      `What did you nearly say to someone lately, but didn${APOS}t?`,
      "Last one. Anything to keep off the table?",
    ]);
  });

  it("shows the drawn chips, with the drawn exclusive ones", () => {
    const chips = Object.fromEntries(STEPS.filter((s) => s.chips).map((s) => [s.id, s.chips]));
    expect(chips.q1).toEqual(["THIS WEEK", "THIS MONTH", "AGES AGO", CANT]);
    expect(chips.q2).toEqual(["BARISTA", "NEIGHBOUR", "COLLEAGUE", "DRIVER", "SHOP STAFF", "A REGULAR", "NOBODY YET"]);
    expect(chips.q2f).toEqual(["BARISTA", "NEIGHBOUR", "COLLEAGUE", "DRIVER", "SHOP STAFF", "A REGULAR", "NOBODY"]);
    expect(chips.q3).toEqual(["LOW", "OK", "GOOD", "FULL"]);
    expect(chips.q5).toEqual(["POLITICS", "WORK", "FAMILY", "HEALTH", "MONEY", "LOOKS", EASY]);
    expect(STEPS.find((s) => s.id === "q2")?.none).toBe("NOBODY YET");
    expect(STEPS.find((s) => s.id === "q2f")?.none).toBe("NOBODY");
    expect(STEPS.find((s) => s.id === "q5")?.none).toBe(EASY);
  });

  it("hints and placeholders match the drawn voice stage", () => {
    const one = STEPS.find((s) => s.id === "q1")!;
    const many = STEPS.find((s) => s.id === "q2")!;
    const text = STEPS.find((s) => s.id === "q1f")!;
    expect(one.hint).toBe("TAP ONE, OR HOLD THE MIC");
    expect(many.hint).toBe("TAP ANY, OR HOLD THE MIC");
    expect(text.hint).toBe("HOLD THE MIC AND RAMBLE, OR TYPE");
    expect(one.placeholder).toBe("Type your answer");
    expect(many.placeholder).toBe("Someone else? Type it");
    expect(text.placeholder).toBe("Ramble away");
  });

  it("keeps the same dot on follow-ups and shows FOLLOW-UP", () => {
    const src = readFileSync("web/src/pages/Surprise.tsx", "utf8");
    expect(src).toContain("OF 5");
    expect(src).toContain("· FOLLOW-UP");
  });

  it("closes with the drawn line before the juicy bits", () => {
    expect(CLOSING).toBe("Got it. Give me a moment to keep the juicy bits.");
  });
});

describe("spec 2: CAN'T REMEMBER and SKIP skip the follow-up", () => {
  it("replies Fair. We'll start gentle. and skips Q1's follow-up", () => {
    const q1 = STEPS.find((s) => s.id === "q1")!;
    expect(q1.replies?.[CANT]).toBe(`Fair. We${APOS}ll start gentle.`);
    expect(q1.skipFollow).toBe(CANT);
  });

  it("holds the reply 1.7 s, and SKIP on Q1 also skips the follow-up", () => {
    const src = readFileSync("web/src/pages/Surprise.tsx", "utf8");
    expect(src).toContain("skipFollow");
    expect(src).toContain("1700");
    expect(src).toMatch(/skip[\s\S]{0,400}q1/);
  });
});

describe("spec 3: exclusive chips clear the others and vice versa", () => {
  const NONE = "NOBODY YET";

  it("toggles ordinary chips on and off without touching each other", () => {
    expect(toggleMany([], "BARISTA", NONE)).toEqual(["BARISTA"]);
    expect(toggleMany(["BARISTA"], "COLLEAGUE", NONE)).toEqual(["BARISTA", "COLLEAGUE"]);
    expect(toggleMany(["BARISTA", "COLLEAGUE"], "BARISTA", NONE)).toEqual(["COLLEAGUE"]);
  });

  it("lets the exclusive chip clear the rest, and the rest clear it", () => {
    expect(toggleMany(["BARISTA", "COLLEAGUE"], NONE, NONE)).toEqual([NONE]);
    expect(toggleMany([NONE], "BARISTA", NONE)).toEqual(["BARISTA"]);
    expect(toggleMany([NONE], NONE, NONE)).toEqual([]);
  });

  it("treats NOBODY and NOTHING, I'M EASY the same way", () => {
    expect(toggleMany(["DRIVER"], "NOBODY", "NOBODY")).toEqual(["NOBODY"]);
    expect(toggleMany(["NOBODY"], "DRIVER", "NOBODY")).toEqual(["DRIVER"]);
    expect(toggleMany(["POLITICS"], EASY, EASY)).toEqual([EASY]);
    expect(toggleMany([EASY], "POLITICS", EASY)).toEqual(["POLITICS"]);
  });
});

describe("spec 4: battery replies and START HERE", () => {
  it("replies the exact drawn lines", () => {
    const q3 = STEPS.find((s) => s.id === "q3")!;
    expect(q3.replies).toEqual({
      LOW: "Soft tries today. Noted.",
      OK: "Steady does it.",
      GOOD: "Good. Room for a brave one.",
      FULL: "Full battery. Bold it is.",
    });
  });

  it("maps LOW/OK to SOFT, GOOD to BRAVE, FULL to BOLD", () => {
    expect(startHere(null, "LOW")).toBe("SOFT");
    expect(startHere(null, "OK")).toBe("SOFT");
    expect(startHere(null, "GOOD")).toBe("BRAVE");
    expect(startHere(null, "FULL")).toBe("BOLD");
    expect(startHere(null, null)).toBe("SOFT");
  });

  it("lets CAN'T REMEMBER override even a FULL battery", () => {
    expect(startHere(CANT, "FULL")).toBe("SOFT");
    expect(startHere(CANT, "GOOD")).toBe("SOFT");
    expect(startHere("THIS WEEK", "FULL")).toBe("BOLD");
  });
});

describe("spec 5: off-table answers filter people and tries", () => {
  it("removes BROTHER when FAMILY is off the table", () => {
    expect(applyOffTable(["BROTHER", "BARISTA"], ["FAMILY"])).toEqual(["BARISTA"]);
    expect(applyOffTable(["MUM", "SISTER", "NEIGHBOUR"], ["FAMILY", "POLITICS"])).toEqual(["NEIGHBOUR"]);
  });

  it("removes COLLEAGUE when WORK is off the table", () => {
    expect(applyOffTable(["COLLEAGUE", "BARISTA"], ["WORK"])).toEqual(["BARISTA"]);
  });

  it("leaves people alone when nothing relevant is off the table", () => {
    expect(applyOffTable(["BROTHER", "COLLEAGUE"], [])).toEqual(["BROTHER", "COLLEAGUE"]);
    expect(applyOffTable(["BROTHER", "COLLEAGUE"], [EASY])).toEqual(["BROTHER", "COLLEAGUE"]);
  });
});

describe("dictation matches chips by code", () => {
  const q2 = ["BARISTA", "NEIGHBOUR", "COLLEAGUE", "DRIVER", "SHOP STAFF", "A REGULAR", "NOBODY YET"];

  it("finds the people named out loud", () => {
    expect(matchChips("The barista and, er, my neighbour.", q2)).toEqual(["BARISTA", "NEIGHBOUR"]);
    expect(matchChips("A colleague. And the bus driver.", q2)).toEqual(["COLLEAGUE", "DRIVER"]);
  });

  it("matches whole words, so broke is not OK", () => {
    expect(matchChips("OK, I guess.", ["LOW", "OK", "GOOD", "FULL"])).toEqual(["OK"]);
    expect(matchChips("I am broke and tired.", ["LOW", "OK", "GOOD", "FULL"])).toEqual(["LOW"]);
  });

  it("hears can't remember on Q1", () => {
    expect(matchChips(`I can${APOS}t remember, honestly.`, ["THIS WEEK", "THIS MONTH", "AGES AGO", CANT])).toEqual([CANT]);
    expect(matchChips("This month, I think.", ["THIS WEEK", "THIS MONTH", "AGES AGO", CANT])).toEqual(["THIS MONTH"]);
  });

  it("fills the place from the first said role, defaulting to the café", () => {
    expect(placeFor(["COLLEAGUE"])).toBe("work");
    expect(placeFor(["DRIVER", "BARISTA"])).toBe("the bus stop");
    expect(placeFor([])).toBe("the café");
    expect(placeFor(["NOBODY YET"])).toBe("the café");
  });
});

describe("spec 6: one voice component renders every step", () => {
  it("keeps the mic thumb row in exactly one page", () => {
    const pages = readdirSync("web/src/pages").filter((f) => f.endsWith(".tsx"));
    const withVoice = pages.filter((f) => readFileSync(`web/src/pages/${f}`, "utf8").includes("sm-thumb"));
    expect(withVoice).toEqual(["Surprise.tsx"]);
  });

  it("reuses the shared voice UI instead of forking it", () => {
    const src = readFileSync("web/src/pages/Surprise.tsx", "utf8");
    expect(src).toContain('from "../voice"');
    expect(src).toContain('from "../components/PixelBall"');
    expect(src).not.toContain("getUserMedia");
    expect(src).not.toContain("AudioContext");
  });
});

describe("spec 7: nothing is stored before LOOKS RIGHT", () => {
  it("holds answers in memory only, taken once", () => {
    const answers: OnboardAnswers = { ...BLANK, q1: "THIS WEEK", q3: "FULL" };
    saveOnboardAnswers(answers);
    expect(takeOnboardAnswers()).toEqual(answers);
    expect(takeOnboardAnswers()).toBeNull();
  });

  it("writes to no storage from the voice stage or its script", () => {
    for (const file of ["web/src/onboard.ts", "web/src/pages/Surprise.tsx"]) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toContain("localStorage");
      expect(src).not.toContain("sessionStorage");
      expect(src).not.toContain("console.log");
    }
  });

  it("calls no compass endpoint and imports no personal module", () => {
    const src = readFileSync("web/src/pages/Surprise.tsx", "utf8");
    expect(src).not.toContain("/compass");
    expect(src).not.toContain("personal");
    expect(src).not.toContain("draft-line");
    expect(src).not.toContain("savePayload");
    expect(src).toContain("saveOnboardAnswers");
    expect(src).toContain('route("/juicy")');
  });
});
