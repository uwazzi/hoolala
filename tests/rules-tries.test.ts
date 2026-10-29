import { describe, expect, it } from "vitest";
import { leafFor, suggestNext, validateTry, type Ask, type TryDraft } from "../src/rules/tries";

const ask: Ask = { step: 2, place: "cafe", timeOfDay: "morning", last: ["no_reply"], interests: ["coffee"] };
const draft: TryDraft = {
  title: "SAY HELLO TO THE BARISTA, EYES UP.",
  hint: "LOOK UP FROM THE PHONE. HI, HOW IS IT GOING?",
  step: 2,
  words_max: 8,
  minutes: 1,
  asks_of_other: "hello_back",
  place_kind: "cafe",
  why: "Step 2 fits, and the barista is right there.",
};
const tweak = (d: Partial<TryDraft>): TryDraft => ({ ...draft, ...d });

describe("validateTry", () => {
  it("accepts a draft inside its step", () => {
    expect(validateTry(draft, ask)).toBe("ok");
    expect(validateTry({ ...draft, step: 1, words_max: 0, minutes: 2, asks_of_other: "none", place_kind: "cafe" }, { ...ask, step: 1 })).toBe("ok");
  });

  it("allows a gentler ask than the step's own", () => {
    expect(validateTry(tweak({ asks_of_other: "none" }), ask)).toBe("ok");
  });

  it("rejects the wrong step or place", () => {
    expect(validateTry(tweak({ step: 3 }), ask)).toBe("wrong_step");
    expect(validateTry(tweak({ place_kind: "work" }), ask)).toBe("wrong_step");
  });

  it("rejects tries over the step's bounds", () => {
    expect(validateTry(tweak({ words_max: 20 }), ask)).toBe("too_much");
    expect(validateTry(tweak({ minutes: 3 }), ask)).toBe("too_much");
    expect(validateTry(tweak({ asks_of_other: "answer" }), ask)).toBe("too_much");
    expect(validateTry(tweak({ title: "X".repeat(49) }), ask)).toBe("too_much");
    expect(validateTry(tweak({ hint: "Y".repeat(81) }), ask)).toBe("too_much");
    expect(validateTry(tweak({ why: "" }), ask)).toBe("too_much");
  });

  it("keeps step 1 silent and step 4 within six minutes", () => {
    const one: Ask = { ...ask, step: 1 };
    expect(validateTry({ ...draft, step: 1, words_max: 3, minutes: 1, asks_of_other: "none" }, one)).toBe("too_much");
    expect(validateTry({ ...draft, step: 4, words_max: 100, minutes: 7, asks_of_other: "short_chat" }, { ...ask, step: 4 })).toBe("too_much");
    expect(validateTry({ ...draft, step: 4, words_max: 100, minutes: 6, asks_of_other: "short_chat" }, { ...ask, step: 4 })).toBe("ok");
  });

  it("rejects flirting, contacts, streak shame and advice", () => {
    expect(validateTry(tweak({ hint: "Tell her she looks sexy tonight." }), ask)).toBe("off_limits");
    expect(validateTry(tweak({ hint: "Ask for their number: 079 123 45 67." }), ask)).toBe("off_limits");
    expect(validateTry(tweak({ hint: "Do not break your streak, coward." }), ask)).toBe("off_limits");
    expect(validateTry(tweak({ hint: "Ask what they invest in." }), ask)).toBe("off_limits");
  });
});

describe("leaves and next steps", () => {
  it("counts a leaf for every try made", () => {
    expect(leafFor("went_well")).toBe(1);
    expect(leafFor("no_reply")).toBe(1);
    expect(leafFor("awkward")).toBe(1);
    expect(leafFor("didnt_happen")).toBe(0);
  });

  it("suggests braver, same or gentler, never outside the ladder", () => {
    expect(suggestNext(3, "went_well")).toBe(1);
    expect(suggestNext(3, "no_reply")).toBe(0);
    expect(suggestNext(3, "awkward")).toBe(0);
    expect(suggestNext(3, "didnt_happen")).toBe(-1);
    expect(suggestNext(5, "went_well")).toBe(0);
    expect(suggestNext(1, "didnt_happen")).toBe(0);
  });
});
