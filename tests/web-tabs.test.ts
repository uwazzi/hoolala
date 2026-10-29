import { describe, expect, it } from "vitest";
import { tabForPath } from "../web/src/tabs";

describe("softkey trio", () => {
  it("lights exactly one tab on every top-level route", () => {
    expect(tabForPath("/")).toBe("today");
    expect(tabForPath("/compass")).toBe("today");
    expect(tabForPath("/around")).toBe("around");
    expect(tabForPath("/here")).toBe("around");
    expect(tabForPath("/place")).toBe("around");
    expect(tabForPath("/friends")).toBe("friends");
  });

  it("keeps Back for flows and side pages", () => {
    for (const p of ["/arrive", "/meet", "/surprise", "/friends/join", "/signin", "/live", "/privacy", "/start", "/nope"]) {
      expect(tabForPath(p)).toBeNull();
    }
  });
});
