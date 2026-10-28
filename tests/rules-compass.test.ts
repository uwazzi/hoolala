import { describe, expect, it } from "vitest";
import { cleanCompass, compassFromAnswers, fitsYou, hasBannedLabel, isOwnName, normalizeLinks, normalizeSearchName } from "../src/rules/compass";

const TICKED = ["https://ana.example/blog", "https://en.wikipedia.org/wiki/Chess"];

describe("isOwnName: FIND ME only looks up the person", () => {
  it("accepts names that contain the person's first name", () => {
    expect(isOwnName("Ana Lopes", "Ana")).toBe(true);
    expect(isOwnName("ANA lopes-martin", "Ana")).toBe(true);
    expect(isOwnName("Zoé Martin", "Zoe")).toBe(true);
    expect(isOwnName("Anne-Sophie Roy", "Anne-Sophie")).toBe(true);
  });

  it("refuses someone else's name, or no first name on file", () => {
    expect(isOwnName("Linus Torvalds", "Ana")).toBe(false);
    expect(isOwnName("Anabel Ruiz", "Ana")).toBe(false);
    expect(isOwnName("Ana Lopes", null)).toBe(false);
  });

  it("reads names and links", () => {
    expect(normalizeSearchName("  Ana   Lopes ")).toBe("Ana Lopes");
    expect(normalizeSearchName("ana@example.com")).toBeNull();
    expect(normalizeLinks(["https://ana.example/blog"])).toEqual(["https://ana.example/blog"]);
    expect(normalizeLinks(["http://ana.example"])).toBeNull();
    expect(normalizeLinks(["a", "b", "c", "d"])).toBeNull();
    expect(normalizeLinks(undefined)).toEqual([]);
  });
});

describe("cleanCompass", () => {
  it("keeps lines with a ticked source, and 'you said' only when the person answered", () => {
    const lines = [
      { part: "interest", text: "Chess, especially endgames", source_url: "https://en.wikipedia.org/wiki/Chess" },
      { part: "talk_about", text: "Writing a food blog", source_url: "https://ana.example/blog/" },
      { part: "more_of", text: "Board game evenings", source_url: null },
    ];
    expect(cleanCompass(lines, TICKED, false).map((l) => l.text)).toEqual(["Chess, especially endgames", "Writing a food blog"]);
    expect(cleanCompass(lines, TICKED, true).map((l) => [l.text, l.sourceUrl])).toEqual([
      ["Chess, especially endgames", "https://en.wikipedia.org/wiki/Chess"],
      ["Writing a food blog", "https://ana.example/blog"],
      ["Board game evenings", null],
    ]);
  });

  it("drops lines whose source the person didn't tick (NOT ME)", () => {
    const lines = [{ part: "interest", text: "Marathon running", source_url: "https://namesake.example/ana" }];
    expect(cleanCompass(lines, TICKED, true)).toEqual([]);
  });

  it("drops personality, health, political, religious and sexuality labels", () => {
    for (const text of ["Introvert who loves maps", "INTJ thinker", "Living with ADHD", "Conservative values", "Active in her church", "Proudly queer"]) {
      expect(cleanCompass([{ part: "interest", text, source_url: null }], [], true)).toEqual([]);
    }
  });

  it("lets a filter name a topic to avoid", () => {
    expect(cleanCompass([{ part: "filter", text: "No politics, please", source_url: null }], [], true)).toHaveLength(1);
  });

  it("refuses unknown parts, empty or long text, repeats, and more than 8 lines", () => {
    expect(cleanCompass([{ part: "secret", text: "x y", source_url: null }], [], true)).toEqual([]);
    expect(cleanCompass([{ part: "interest", text: "a".repeat(81), source_url: null }], [], true)).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => ({ part: "interest", text: `Topic number ${i}`, source_url: null }));
    expect(cleanCompass([...many, many[0]], [], true)).toHaveLength(8);
  });
});

describe("questions and FITS YOU", () => {
  it("turns three answers into 'you said' lines", () => {
    expect(compassFromAnswers({ talk: "chess, cycling", more: "board games", avoid: "work talk" })).toEqual([
      { part: "talk_about", text: "chess", sourceUrl: null },
      { part: "talk_about", text: "cycling", sourceUrl: null },
      { part: "more_of", text: "board games", sourceUrl: null },
      { part: "filter", text: "work talk", sourceUrl: null },
    ]);
  });

  it("marks a topic that shares a word with your interests", () => {
    expect(fitsYou("Chess at the big table?", ["Chess, especially endgames"])).toBe(true);
    expect(fitsYou("Coffee break now", ["Chess, especially endgames"])).toBe(false);
  });

  it("knows a label when it sees one", () => {
    for (const label of ["catholique", "Musulmane pratiquante", "de gauche", "souffre d'anxiété", "homosexuel"]) expect(hasBannedLabel(label)).toBe(true);
    expect(hasBannedLabel("Cycling and climbing")).toBe(false);
  });
});
