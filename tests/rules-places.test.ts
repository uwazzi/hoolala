import { describe, expect, it } from "vitest";
import { bearingDeg, compassOverlap, compassWords, confirmProblem, fitFor, haversineM, isFactField, normalizeFactValue, POINTS, settles, talkingLabel, talkingWord, templateTry, underCap, webFactsStale, weekKey, workingsLine } from "../src/rules/places";

const now = new Date("2026-10-28T14:00:00.000Z");

describe("points", () => {
  it("are 10 for a place, 5 for a detail or a fix, 2 for a confirm", () => {
    expect(POINTS).toEqual({ add_place: 10, add_fact: 5, fix_fact: 5, confirm_fact: 2 });
  });

  it("stop at 30 a day", () => {
    expect(underCap(0, 10)).toBe(10);
    expect(underCap(26, 5)).toBe(4);
    expect(underCap(30, 2)).toBe(0);
  });
});

describe("confirmProblem", () => {
  const fact = { added_by: "ana", state: "found" };

  it("lets someone else at the place confirm once a month", () => {
    expect(confirmProblem(fact, "ben", true, false)).toBeNull();
    expect(confirmProblem(fact, "ben", true, true)).toBe("already");
  });

  it("never for your own detail, never from elsewhere, never on a disputed one", () => {
    expect(confirmProblem(fact, "ana", true, false)).toBe("own");
    expect(confirmProblem(fact, "ben", false, false)).toBe("not_here");
    expect(confirmProblem({ ...fact, state: "disputed" }, "ben", true, false)).toBe("gone");
  });

  it("lets anyone confirm what the web found (no one added it)", () => {
    expect(confirmProblem({ added_by: null, state: "found" }, "ana", true, false)).toBeNull();
  });
});

describe("small formats", () => {
  it("knows the detail fields", () => {
    expect(isFactField("hours")).toBe(true);
    expect(isFactField("owner_phone")).toBe(false);
  });

  it("takes one short line", () => {
    expect(normalizeFactValue("  Flat white  CHF 5.20 ")).toBe("Flat white CHF 5.20");
    expect(normalizeFactValue("x")).toBeNull();
    expect(normalizeFactValue("x".repeat(81))).toBeNull();
  });

  it("looks again after 30 days", () => {
    expect(webFactsStale(null, now)).toBe(true);
    expect(webFactsStale("2026-10-20T00:00:00.000Z", now)).toBe(false);
    expect(webFactsStale("2026-09-01T00:00:00.000Z", now)).toBe(true);
  });
});


describe("around me", () => {
  it("measures metres and bearings", () => {
    expect(haversineM(46.5222, 6.6339, 46.5222, 6.6339)).toBe(0);
    expect(haversineM(46.5222, 6.6339, 46.5232, 6.6339)).toBeGreaterThan(100);
    expect(haversineM(46.5222, 6.6339, 46.5232, 6.6339)).toBeLessThan(125);
    expect(bearingDeg(46.5222, 6.6339, 46.5232, 6.6339)).toBeCloseTo(0, 0);
    expect(bearingDeg(46.5222, 6.6339, 46.5222, 6.6349)).toBeCloseTo(90, 0);
  });

  it("matches compass words of 4 letters or more", () => {
    expect(compassOverlap(["coffee", "chess"], "Café serving coffee, board games inside")).toBe(true);
    expect(compassOverlap(["tea"], "Café with board games")).toBe(false);
    expect(compassOverlap([], "Café")).toBe(false);
  });

  it("fits on compass plus features or visits", () => {
    expect(fitFor({ compass: true, features: true, visits: 0 })).toBe("GOOD");
    expect(fitFor({ compass: true, features: false, visits: 7 })).toBe("GOOD");
    expect(fitFor({ compass: true, features: false, visits: 0 })).toBe("OK");
    expect(fitFor({ compass: false, features: true, visits: 0 })).toBe("OK");
    expect(fitFor({ compass: false, features: false, visits: 0 })).toBe("LOW");
  });

  it("names the compass words it matched", () => {
    expect(compassWords(["coffee and slow mornings"], "Café for slow mornings, coffee served")).toEqual(["mornings", "coffee", "slow"]);
    expect(compassWords(["tea"], "Café with board games")).toEqual([]);
  });

  it("labels talking 1 to 5 from 3 ratings in 90 days, else nothing", () => {
    const day = "2026-10-20";
    const r = (values: number[], date = day) => values.map((value) => ({ value, visit_date: date }));
    expect(talkingLabel(r([5, 5, 4]), now.toISOString())).toBe(5);
    expect(talkingLabel(r([1, 1, 2]), now.toISOString())).toBe(1);
    expect(talkingLabel(r([3, 3, 3]), now.toISOString())).toBe(3);
    expect(talkingLabel(r([4, 4, 5, 5]), now.toISOString())).toBe(5);
    expect(talkingLabel(r([5, 5]), now.toISOString())).toBeNull();
    expect(talkingLabel([...r([5, 5]), { value: 5, visit_date: "2026-01-01" }], now.toISOString())).toBeNull();
    expect([1, 2, 3, 4, 5].map((l) => talkingWord(l as 1 | 2 | 3 | 4 | 5))).toEqual([
      "mostly quiet",
      "a little",
      "sometimes chatty",
      "often chatty",
      "very chatty",
    ]);
  });

  it("keys a week for one rating a week", () => {
    expect(weekKey("2026-01-01")).toBe("2026-W01");
    expect(weekKey("2026-01-04")).toBe("2026-W01");
    expect(weekKey("2026-01-05")).toBe("2026-W02");
    expect(weekKey("2025-12-29")).toBe("2026-W01");
    expect(weekKey("2026-10-26")).toBe(weekKey("2026-10-29"));
    expect(weekKey("2026-11-02")).not.toBe(weekKey("2026-10-29"));
  });

  it("templates a tiny try per place, deterministically", () => {
    const a = templateTry("cafe-longue");
    expect(templateTry("cafe-longue")).toBe(a);
    expect(new Set(["a", "bb", "ccc", "dddd", "eeeee", "ffffff"].map(templateTry)).size).toBeGreaterThan(1);
  });

  it("composes the workings line from real inputs only", () => {
    expect(workingsLine({ compass: ["coffee", "mornings"], feature: "One long shared table", talking: "often chatty", visits: 7, fit: "GOOD" })).toBe(
      "Why this one: compass (coffee, mornings) + One long shared table + rated often chatty by 7 Hoolala! visits.",
    );
    expect(workingsLine({ compass: [], feature: null, talking: null, visits: 2, fit: "OK" })).toBe("Why this one: 2 Hoolala! visits.");
    expect(workingsLine({ compass: [], feature: null, talking: null, visits: 0, fit: "LOW" })).toBe(
      "Why this one: close by. Not on your compass, so it ranks low.",
    );
  });
});

it("count when someone else confirms, or after a day without a dispute", () => {
  const c = { created_at: "2026-10-28T10:00:00.000Z" };
  expect(settles(c, { state: "found", confirmations: 1 }, now)).toBe("count");
  expect(settles(c, { state: "found", confirmations: 0 }, now)).toBe("wait");
  expect(settles(c, { state: "found", confirmations: 0 }, new Date("2026-10-29T10:00:00.000Z"))).toBe("count");
  expect(settles(c, { state: "disputed", confirmations: 3 }, now)).toBe("reject");
  expect(settles(c, null, now)).toBe("reject");
});
