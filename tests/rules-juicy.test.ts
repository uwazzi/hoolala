// WP39 keeping the juicy bits: the validator rejects bad model output (never
// rewrites it) and the code fallback keeps the same shape with the model off.
import { describe, expect, it } from "vitest";
import { fallbackJuicy, hitsOffTable, validateJuicy } from "../src/rules/juicy";
import { buildNearlyTitle, filterRolesForOffTable, isNearlyTitle, tabForBattery, validateGameTry } from "../src/rules/tries";

const Q1F = "Um, so basically it was board games with my brother, like, last Saturday. We argued about the rules for, you know, a whole hour.";
const Q4 = "Honestly I kind of nearly told the barista that I really love the music they play.";

const FULL = {
  topics: ["board games", "rules"],
  people: [{ role: "barista", tier: "said" }],
  nearly_said: { line: "I love the music you play", to_role: "barista" },
};

describe("validateJuicy", () => {
  it("keeps a full set of bits", () => {
    expect(validateJuicy(FULL, { offtable: [] })).toEqual({
      topics: ["board games", "rules"],
      people: [{ role: "barista", tier: "said" }],
      nearlySaid: { line: "I love the music you play", toRole: "barista" },
    });
  });

  it("accepts empty corners: no topics, no people, nothing nearly said", () => {
    expect(validateJuicy({ topics: [], people: [], nearly_said: null }, { offtable: [] })).toEqual({ topics: [], people: [], nearlySaid: null });
    expect(validateJuicy({ topics: ["music"], people: [], nearly_said: { line: "Nice set today", to_role: null } }, { offtable: [] })).toMatchObject({
      topics: ["music"],
      nearlySaid: { line: "Nice set today", toRole: null },
    });
  });

  it("folds roles to the allow-list case", () => {
    expect(validateJuicy({ topics: [], people: [{ role: "Barista", tier: "said" }], nearly_said: null }, { offtable: [] })).toEqual({
      topics: [],
      people: [{ role: "barista", tier: "said" }],
      nearlySaid: null,
    });
  });

  it("rejects filler words kept as topics", () => {
    expect(validateJuicy({ ...FULL, topics: ["board games", "like"] }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, topics: ["basically stuff"] }, { offtable: [] })).toBeNull();
  });

  it("rejects a name in a topic or in the nearly-said line", () => {
    expect(validateJuicy({ ...FULL, topics: ["Tom"] }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, nearly_said: { line: "I told Tom today", to_role: null } }, { offtable: [] })).toBeNull();
  });

  it("rejects an off-table topic", () => {
    expect(validateJuicy({ ...FULL, topics: ["politics"] }, { offtable: ["POLITICS"] })).toBeNull();
    expect(validateJuicy({ ...FULL, topics: ["politics"] }, { offtable: [] })).not.toBeNull();
  });

  it("rejects a label about the person", () => {
    expect(validateJuicy({ ...FULL, topics: ["introvert"] }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, nearly_said: { line: "Living with ADHD", to_role: null } }, { offtable: [] })).toBeNull();
  });

  it("rejects an off-list role or tier", () => {
    expect(validateJuicy({ ...FULL, people: [{ role: "stranger", tier: "said" }] }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, people: [{ role: "barista", tier: "nod" }] }, { offtable: [] })).toBeNull();
  });

  it("rejects misshapen output", () => {
    expect(validateJuicy(null, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, topics: "board games" }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, topics: ["a", "b", "c", "d"] }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, topics: ["one two three four"] }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, nearly_said: { line: "x".repeat(61), to_role: null } }, { offtable: [] })).toBeNull();
    expect(validateJuicy({ ...FULL, nearly_said: { line: "  ", to_role: null } }, { offtable: [] })).toBeNull();
  });

  it("drops people the off-table list removes, and keeps the rest", () => {
    const people = [
      { role: "brother", tier: "said" },
      { role: "barista", tier: "said" },
    ];
    expect(validateJuicy({ ...FULL, people }, { offtable: ["FAMILY"] })?.people).toEqual([{ role: "barista", tier: "said" }]);
    expect(validateJuicy({ ...FULL, people: [{ role: "colleague", tier: "said" }] }, { offtable: ["WORK"] })?.people).toEqual([]);
  });
});

describe("fallbackJuicy", () => {
  it("keeps topics, roles and a nearly-said line with the model off", () => {
    expect(fallbackJuicy(Q1F, Q4, [])).toEqual({
      topics: ["board games", "rules"],
      people: [{ role: "brother", tier: "said" }, { role: "barista", tier: "said" }],
      nearlySaid: { line: "music", toRole: "barista" },
    });
  });

  it("never keeps filler, names or screened words", () => {
    const bits = fallbackJuicy("Board games with Anna, like, honestly", "Ask the singles about Anna", []);
    expect(bits.topics).toEqual(["board games"]);
    for (const word of ["like", "honestly", "anna", "singles"]) {
      expect(JSON.stringify(bits)).not.toContain(word);
    }
  });

  it("keeps at most three topics and three nearly-said words, and honours the off-table list", () => {
    const bits = fallbackJuicy("Board games, video games, recipes, running routes", "Politics shows with friends nightly", ["POLITICS"]);
    expect(bits.topics.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(bits)).not.toContain("politics");
    expect(fallbackJuicy(null, null, [])).toEqual({ topics: [], people: [], nearlySaid: null });
  });
});

describe("hitsOffTable", () => {
  it("matches theme words with boundaries, whatever the case", () => {
    expect(hitsOffTable("No politics at the table", ["POLITICS"])).toBe(true);
    expect(hitsOffTable("My job interview went well", ["WORK"])).toBe(true);
    expect(hitsOffTable("The network is down again", ["WORK"])).toBe(false);
    expect(hitsOffTable("Board games", ["POLITICS", "MONEY"])).toBe(false);
  });
});

describe("the kept-bits game rules", () => {
  it("starts FULL on BOLD, GOOD on BRAVE, the rest on SOFT, and CAN'T REMEMBER always on SOFT", () => {
    expect(tabForBattery("LOW", false)).toBe(0);
    expect(tabForBattery("OK", false)).toBe(0);
    expect(tabForBattery("GOOD", false)).toBe(1);
    expect(tabForBattery("FULL", false)).toBe(2);
    expect(tabForBattery("FULL", true)).toBe(0);
    expect(tabForBattery(null, false)).toBe(0);
  });

  it("removes family roles for FAMILY and colleagues for WORK", () => {
    const roles = [
      { role: "brother", roleClass: "close" },
      { role: "colleague", roleClass: "service" },
      { role: "barista", roleClass: "service" },
    ];
    expect(filterRolesForOffTable(roles, ["FAMILY"]).map((r) => r.role)).toEqual(["colleague", "barista"]);
    expect(filterRolesForOffTable(roles, ["WORK"]).map((r) => r.role)).toEqual(["brother", "barista"]);
    expect(filterRolesForOffTable(roles, [])).toHaveLength(3);
  });

  it("writes the nearly-said try in the person's voice, or to them", () => {
    expect(buildNearlyTitle("I love the music you play", "barista")).toBe("Say the thing you nearly said to the barista: \u201CI love the music you play\u201D.");
    expect(buildNearlyTitle("Nice set today", null)).toBe("Say the thing you nearly said to them: \u201CNice set today\u201D.");
    expect(isNearlyTitle("Say the thing you nearly said to them: \u201CHi\u201D.")).toBe(true);
    expect(isNearlyTitle("Say good morning to your brother.")).toBe(false);
  });

  it("lets the nearly-said slot keep plain capitals, since names were already excluded", () => {
    const title = buildNearlyTitle("Nice set today", null);
    const input = { title, level: "bold" as const, kind: "kind" as const, who_role: null, place_kind: null };
    expect(validateGameTry(input, { roles: [], lessOf: [] })).toBe("off_limits");
    expect(validateGameTry(input, { roles: [], lessOf: [] }, { skipNameCheck: true })).toBe("ok");
  });

  it("rejects off-table themes in a try", () => {
    const ctx = { roles: [], lessOf: [], offTable: ["POLITICS"] };
    expect(validateGameTry({ title: "Ask someone about politics at the café.", level: "soft", kind: "talk", who_role: null, place_kind: null }, ctx)).toBe("less_of");
    expect(validateGameTry({ title: "Ask someone about the network at the café.", level: "soft", kind: "talk", who_role: null, place_kind: null }, { roles: [], lessOf: [], offTable: ["WORK"] })).toBe("ok");
  });
});
