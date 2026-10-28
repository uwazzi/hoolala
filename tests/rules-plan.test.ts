import { describe, expect, it } from "vitest";
import { checkDraft, claimsAction, fallbackDraft, roundUp } from "../src/rules/plan";

const now = new Date("2026-10-28T14:02:00.000Z");
const ctx = { spots: ["Terrace", "The big table"], now, expiresAt: "2026-10-28T15:00:00.000Z" };

describe("checkDraft", () => {
  it("accepts a real spot and a time before the signal ends, on 5-minute steps", () => {
    expect(checkDraft("Terrace", "2026-10-28T14:07:00.000Z", ctx)).toEqual({ spot: "Terrace", time: "2026-10-28T14:10:00.000Z" });
  });

  it("refuses spots the place doesn't have", () => {
    expect(checkDraft("My flat", "2026-10-28T14:10:00.000Z", ctx)).toBeNull();
    expect(checkDraft("terrace", "2026-10-28T14:10:00.000Z", ctx)).toBeNull();
  });

  it("refuses the past, after the signal ends, and nonsense", () => {
    expect(checkDraft("Terrace", "2026-10-28T13:30:00.000Z", ctx)).toBeNull();
    expect(checkDraft("Terrace", "2026-10-28T15:30:00.000Z", ctx)).toBeNull();
    expect(checkDraft("Terrace", "soon", ctx)).toBeNull();
    expect(checkDraft(null, "2026-10-28T14:10:00.000Z", ctx)).toBeNull();
  });
});

describe("fallbackDraft", () => {
  it("proposes the poster's own spot at their time", () => {
    expect(fallbackDraft({ spot: "The big table", when_at: "2026-10-28T14:30:00.000Z", expires_at: ctx.expiresAt }, ctx)).toEqual({
      spot: "The big table",
      time: "2026-10-28T14:30:00.000Z",
    });
  });

  it("uses 10 minutes from now when the time has passed, and a real spot", () => {
    expect(fallbackDraft({ spot: "Gone spot", when_at: "2026-10-28T13:00:00.000Z", expires_at: ctx.expiresAt }, ctx)).toEqual({
      spot: "Terrace",
      time: "2026-10-28T14:15:00.000Z",
    });
  });
});

describe("helpers", () => {
  it("rounds up to 5 minutes", () => {
    expect(roundUp(new Date("2026-10-28T14:10:00.000Z")).toISOString()).toBe("2026-10-28T14:10:00.000Z");
    expect(roundUp(new Date("2026-10-28T14:10:01.000Z")).toISOString()).toBe("2026-10-28T14:15:00.000Z");
  });

  it("spots a draft that claims to have acted", () => {
    expect(claimsAction("Sent to Ben: terrace at 15:10")).toBe(true);
    expect(claimsAction("The terrace is quieter and close to the counter")).toBe(false);
  });
});
