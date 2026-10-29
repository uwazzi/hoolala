import { describe, expect, it } from "vitest";
import {
  changeRemove,
  cleanRole,
  extractRoles,
  fallbackDraft,
  fitsYou,
  hasBannedLabel,
  partForWords,
  PEOPLE_ROLES,
  proposeFeedback,
  roleClass,
  trimDraft,
  validateDraft,
  validateProposal,
} from "../src/rules/compass";

describe("people in your days: roles only, never names", () => {
  it("reads roles from own words, first mention first, strangers nobody", () => {
    expect(extractRoles("my brother Tom and my sister Ana")).toEqual(["brother", "sister"]);
    expect(extractRoles("coffee with friends, then mum called")).toEqual(["friend", "mum"]);
    expect(extractRoles("a stranger on the train, my mom and my dad")).toEqual(["mum", "dad"]);
    expect(extractRoles("chess and long walks")).toEqual([]);
  });

  it("folds proposed roles to the allow-list or drops them", () => {
    expect([...PEOPLE_ROLES]).toHaveLength(12);
    expect(cleanRole("brother Tom")).toBe("brother");
    expect(cleanRole("friends")).toBe("friend");
    expect(cleanRole("Tom")).toBeNull();
    expect(cleanRole("dog")).toBeNull();
    expect(cleanRole(42)).toBeNull();
  });

  it("knows close roles from service roles", () => {
    for (const role of ["mum", "dad", "brother", "sister", "child", "friend", "neighbour"] as const) expect(roleClass(role)).toBe("close");
    for (const role of ["barista", "boss", "colleague", "teammate", "regular"] as const) expect(roleClass(role)).toBe("service");
  });
});

describe("validateDraft: what happened, never who the person is", () => {
  const good = { part: "interest", line: "Long chats about books", topic: "books", place_kind: "park", pace: "social", people: [{ role: "friend" }] };

  it("accepts a good draft and folds its people", () => {
    expect(validateDraft("interest", good)).toEqual({
      part: "interest",
      line: "Long chats about books",
      topic: "books",
      placeKind: "park",
      pace: "social",
      people: ["friend"],
    });
  });

  it("rejects the wrong part, labels and you-are lines", () => {
    expect(validateDraft("delivery", good)).toBeNull();
    expect(validateDraft("interest", null)).toBeNull();
    expect(validateDraft("interest", { ...good, line: "You are an extrovert" })).toBeNull();
    expect(validateDraft("interest", { ...good, line: "INTJ who loves maps" })).toBeNull();
    expect(validateDraft("interest", { ...good, line: "Single and ready to flirt" })).toBeNull();
    expect(validateDraft("filter", { ...good, part: "filter", line: "No politics, please" })).toMatchObject({ part: "filter" });
  });

  it("trims long lines, caps people at three and falls back gentle", () => {
    const long = validateDraft("interest", { ...good, line: "I love slow Sunday mornings with the papers and a pot of coffee for two" });
    expect(long!.line.length).toBeLessThanOrEqual(60);
    expect(validateDraft("interest", { ...good, line: "x" })).toBeNull();
    expect(validateDraft("interest", { ...good, people: [{ role: "mum" }, { role: "Tom" }, "dad", "friend", "sister"] })!.people).toEqual([
      "mum",
      "dad",
      "friend",
    ]);
    expect(validateDraft("interest", { ...good, pace: "wild", topic: "books!", place_kind: "the park!!" })).toMatchObject({
      pace: "gentle",
      topic: null,
      placeKind: null,
    });
  });

  it("falls back to the trimmed answer with keyword roles", () => {
    expect(fallbackDraft("intention", "I started swimming with my sister")).toEqual({
      part: "intention",
      line: "I started swimming with my sister",
      topic: null,
      placeKind: null,
      pace: "gentle",
      people: ["sister"],
    });
    expect(trimDraft("x".repeat(70))).toBe("x".repeat(60));
  });
});

describe("FITS YOU and banned labels", () => {
  it("marks a topic that shares a word with your interests", () => {
    expect(fitsYou("Chess at the big table?", ["Chess, especially endgames"])).toBe(true);
    expect(fitsYou("Coffee break now", ["Chess, especially endgames"])).toBe(false);
  });

  it("knows a label when it sees one", () => {
    for (const label of ["catholique", "Musulmane pratiquante", "de gauche", "souffre d'anxiété", "homosexuel"]) expect(hasBannedLabel(label)).toBe(true);
    expect(hasBannedLabel("Cycling and climbing")).toBe(false);
  });
});

describe("SAY IT YOUR WAY", () => {
  it("guesses a direction from the person's own words", () => {
    expect(partForWords("more slow mornings")).toBe("intention");
    expect(partForWords("something low-key")).toBe("delivery");
    expect(partForWords("less small talk")).toBe("filter");
    expect(partForWords("I love talking about chess")).toBe("interest");
    expect(partForWords("Just chess")).toBe("interest");
  });

  it("accepts plain words on the picked line, unchanged", () => {
    expect(validateProposal("delivery", "quiet mornings, small groups")).toEqual({
      ok: true,
      line: { part: "delivery", words: "quiet mornings, small groups" },
    });
  });

  it("rejects a dating label with a reason, and overlong or mismatched words", () => {
    const dating = validateProposal("interest", "Single and looking to flirt");
    expect(dating.ok).toBe(false);
    expect(dating.why).toMatch(/talking, not dating/);
    expect(validateProposal("interest", "x".repeat(61))).toMatchObject({ ok: false, error: "too_long" });
    expect(validateProposal("filter", "I love football")).toMatchObject({ ok: false, error: "bad_fit" });
    expect(validateProposal("interest", "Living with ADHD")).toMatchObject({ ok: false, error: "not_allowed" });
    expect(validateProposal("nope", "chess")).toMatchObject({ ok: false, error: "missing_part" });
  });

  it("turns a try debrief into starter words on the matching line", () => {
    expect(proposeFeedback("went_well")).toEqual({ words: "more of this", part: "intention" });
    expect(proposeFeedback("awkward")).toEqual({ words: "gentler next time", part: "delivery" });
    expect(proposeFeedback("no_reply")).toEqual({ words: "something low-key", part: "delivery" });
    expect(proposeFeedback("didnt_happen")).toEqual({ words: "less of this", part: "filter" });
  });

  it("records a REMOVE as before-words with no after", () => {
    expect(changeRemove("work talk")).toEqual({ before: "work talk", after: null });
  });
});
