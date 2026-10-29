import { describe, expect, it } from "vitest";
import { GAME_LIBRARY } from "../src/content/tries";
import {
  fillContext,
  fillGameTry,
  leafFor,
  minutesForLevel,
  stepForLevelSlot,
  suggestNext,
  tabForPace,
  validateGameMix,
  validateGameTry,
  validateTry,
  type Ask,
  type GameCtx,
  type GameTryInput,
  type TryDraft,
} from "../src/rules/tries";

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

const gameCtx: GameCtx = {
  roles: [
    { role: "brother", roleClass: "close" },
    { role: "neighbour", roleClass: "close" },
    { role: "barista", roleClass: "service" },
  ],
  lessOf: ["crowded bars"],
};
const gameTry: GameTryInput = {
  title: "Ask your brother one question about board games.",
  level: "brave",
  kind: "talk",
  who_role: "brother",
  place_kind: null,
};
const tweakGame = (t: Partial<GameTryInput>): GameTryInput => ({ ...gameTry, ...t });

describe("validateGameTry", () => {
  it("accepts a good try with a compass role, or no role", () => {
    expect(validateGameTry(gameTry, gameCtx)).toBe("ok");
    expect(validateGameTry(tweakGame({ who_role: null, title: "Smile and nod at three people at the café." }), gameCtx)).toBe("ok");
  });

  it("rejects a bad level, kind or empty title", () => {
    expect(validateGameTry(tweakGame({ level: "wild" as never }), gameCtx)).toBe("bad_shape");
    expect(validateGameTry(tweakGame({ kind: "sing" as never }), gameCtx)).toBe("bad_shape");
    expect(validateGameTry(tweakGame({ title: "  " }), gameCtx)).toBe("bad_shape");
  });

  it("only names roles from the compass, never names", () => {
    expect(validateGameTry(tweakGame({ who_role: "mum" }), gameCtx)).toBe("bad_role");
    expect(validateGameTry(tweakGame({ title: "Ask Tom to show you his board games." }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Say hello to Tom Smith at the café." }), gameCtx)).toBe("off_limits");
  });

  it("keeps service roles light: public, quick, never personal", () => {
    expect(validateGameTry(tweakGame({ title: "Ask the barista what they would pick today, and why.", who_role: "barista" }), gameCtx)).toBe("ok");
    expect(validateGameTry(tweakGame({ title: "Ask the barista about their family this weekend.", who_role: "barista" }), gameCtx)).toBe("service_heavy");
    expect(validateGameTry(tweakGame({ title: "Ask the barista to leave their shift and join you.", who_role: "barista" }), gameCtx)).toBe("service_heavy");
    expect(validateGameTry(tweakGame({ title: "Learn the café from the barista for five minutes.", level: "bold", who_role: "barista" }), gameCtx)).toBe(
      "service_heavy",
    );
  });

  it("never buys anything; from home is fine", () => {
    expect(validateGameTry(tweakGame({ title: "Buy a coffee for the person behind you.", kind: "kind" }), gameCtx)).toBe("buying");
    expect(validateGameTry(tweakGame({ title: "Make your brother a drink or bring a snack from home.", kind: "kind" }), gameCtx)).toBe("ok");
  });

  it("keeps LESS OF out", () => {
    expect(validateGameTry(tweakGame({ title: "Ask someone at a crowded bar for a tip.", who_role: null }), gameCtx)).toBe("less_of");
    expect(validateGameTry(tweakGame({ title: "Ask someone at the café for a tip.", who_role: null }), gameCtx)).toBe("ok");
  });

  it("fits the card: 24 words", () => {
    expect(validateGameTry(tweakGame({ title: "Ask your brother one question about board games, then listen properly." }), gameCtx)).toBe("ok");
    expect(
      validateGameTry(
        tweakGame({
          title: "Ask your brother one long question about board games, then listen properly and ask a second and a third question too, taking all your time today.",
        }),
        gameCtx,
      ),
    ).toBe("too_long");
  });

  it("refuses contact asks, looks, touch, filming, following and other people's children", () => {
    expect(validateGameTry(tweakGame({ title: "Ask your brother for their phone number." }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Tell your neighbour she looks beautiful today." }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Give your brother a hug hello.", kind: "kind" }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Take a photo with your brother at the café." }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Follow your neighbour to the shops and say hello." }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Chat with the kids at the next table.", who_role: null }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Lend your brother 5 francs until Friday.", kind: "kind" }), gameCtx)).toBe("off_limits");
  });

  it("allows your own child, a drink with no late night, and bringing something from home", () => {
    const kid = { roles: [{ role: "child", roleClass: "close" }], lessOf: [] };
    expect(validateGameTry({ ...gameTry, title: "Ask your child what made them laugh today.", who_role: "child" }, kid)).toBe("ok");
    expect(validateGameTry(tweakGame({ title: "Make your brother a drink, no reason needed.", kind: "kind" }), gameCtx)).toBe("ok");
    expect(validateGameTry(tweakGame({ title: "Have a beer with your brother at midnight.", who_role: null }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Bring a snack from home for your neighbour.", kind: "kind", who_role: "neighbour" }), gameCtx)).toBe("ok");
  });

  it("stays out of private places", () => {
    expect(validateGameTry(tweakGame({ title: "Visit your brother at home this week.", level: "bold" }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Ask someone at their home for a chat.", level: "bold", who_role: null }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Invite your neighbour to come over for tea.", level: "bold" }), gameCtx)).toBe("off_limits");
  });

  it("wants UK English and no em dashes", () => {
    expect(validateGameTry(tweakGame({ title: "Ask your neighbor about their favorite game." }), gameCtx)).toBe("off_limits");
    expect(validateGameTry(tweakGame({ title: "Ask your neighbour — gently — about their week." }), gameCtx)).toBe("off_limits");
  });

  it("ignores a model step inside the level, rejects one outside it", () => {
    expect(validateGameTry(tweakGame({ step: 4 }), gameCtx)).toBe("ok");
    expect(validateGameTry(tweakGame({ step: 5 }), gameCtx)).toBe("model_step");
    expect(validateGameTry(tweakGame({ step: 2 }), gameCtx)).toBe("model_step");
  });

  it("never repeats a title already shown", () => {
    expect(validateGameTry(gameTry, { ...gameCtx, exclude: ["Ask your brother one question about board games."] })).toBe("repeat");
    expect(validateGameTry(gameTry, { ...gameCtx, exclude: ["Something else."] })).toBe("ok");
  });
});

describe("the game around each try", () => {
  it("wants talk and kind in every level", () => {
    const full = (["soft", "brave", "bold"] as const).flatMap((level) => [
      { level, kind: "talk" as const },
      { level, kind: "kind" as const },
      { level, kind: "talk" as const },
    ]);
    expect(validateGameMix(full)).toBe(true);
    expect(validateGameMix(full.map((t) => (t.level === "soft" ? { ...t, kind: "talk" as const } : t)))).toBe(false);
  });

  it("assigns steps and minutes by level, never from the model", () => {
    expect([0, 1, 2].map((i) => stepForLevelSlot("soft", i))).toEqual([1, 2, 1]);
    expect([0, 1, 2].map((i) => stepForLevelSlot("brave", i))).toEqual([3, 4, 3]);
    expect([0, 1, 2].map((i) => stepForLevelSlot("bold", i))).toEqual([5, 5, 5]);
    expect(minutesForLevel("soft")).toBe(1);
    expect(minutesForLevel("brave")).toBe(2);
    expect(minutesForLevel("bold")).toBe(5);
  });

  it("starts gentle people on SOFT, forward people on BRAVE, never BOLD", () => {
    expect(tabForPace(null)).toBe(0);
    expect(tabForPace("Gently: easier when the other person starts")).toBe(0);
    expect(tabForPace("I just walk up and dive straight in")).toBe(1);
  });

  it("reads topic, rec and place from the compass, scrubbed of names", () => {
    expect(fillContext([])).toEqual({ topic: "something you like", rec: "favourite something you like", place: "the café" });
    const ctx = fillContext([
      { part: "interest", text: "Board games with Tom" },
      { part: "intention", text: "Slow Saturday mornings" },
    ]);
    expect(ctx.topic).toBe("board games");
    expect(ctx.rec).toBe("favourite board games");
    expect(ctx.place).toBe("the café");
    expect(fillContext([{ part: "intention", text: "The park on Sundays" }]).place).toBe("the park");
  });

  it("fills who from the compass, or a someone when nobody fits", () => {
    const ctx = { topic: "board games", rec: "favourite board game", place: "the café" };
    expect(fillGameTry("Say hello to {who} at {p}.", ctx, "close", gameCtx.roles, 0)).toEqual({
      title: "Say hello to your brother at the café.",
      whoRole: "brother",
      label: "BROTHER",
    });
    expect(fillGameTry("Say hello to {who}.", ctx, "service", gameCtx.roles, 0).title).toBe("Say hello to the barista.");
    expect(fillGameTry("Say hello to {who}.", ctx, "close", [], 0)).toEqual({
      title: "Say hello to someone you see every day.",
      whoRole: null,
      label: "",
    });
    expect(fillGameTry("Smile at {p}.", ctx, "none", [], 0).title).toBe("Smile at the café.");
  });

  it("keeps every hand-written try inside the rules", () => {
    expect(GAME_LIBRARY).toHaveLength(24);
    const ctx = { topic: "board games", rec: "favourite board game", place: "the café" };
    GAME_LIBRARY.forEach((row, i) => {
      const filled = fillGameTry(row.template, ctx, row.who, [], i);
      expect(validateGameTry({ title: filled.title, level: row.level, kind: row.kind, who_role: filled.whoRole, place_kind: null }, { roles: [], lessOf: [] })).toBe(
        "ok",
      );
    });
  });
});
