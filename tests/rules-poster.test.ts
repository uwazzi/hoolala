import { describe, expect, it } from "vitest";
import { posterPlaceName, wrapHook } from "../src/rules/poster";

describe("wrapHook", () => {
  it("wraps an own hook to uppercase lines of at most 16 characters", () => {
    expect(wrapHook("Same coffee, every morning. Hi?")).toEqual(["SAME COFFEE,", "EVERY MORNING.", "HI?"]);
  });

  it("never returns more than 3 lines and no line over 16 characters", () => {
    const lines = wrapHook("One two three four five six seven");
    expect(Array.isArray(lines)).toBe(true);
    for (const line of lines as string[]) expect(line.length).toBeLessThanOrEqual(16);
    expect(wrapHook("one two three four five six seven eight nine ten eleven twelve")).toEqual({ fits: false });
    expect(wrapHook("supercalifragilistic hook")).toEqual({ fits: false });
  });

  it("refuses empty text with a reason", () => {
    expect(wrapHook("")).toEqual({ fits: false, reason: "empty" });
    expect(wrapHook("   ")).toEqual({ fits: false, reason: "empty" });
  });
});

describe("posterPlaceName", () => {
  it("renders a blank place as this place", () => {
    expect(posterPlaceName("")).toBe("this place");
    expect(posterPlaceName("   ")).toBe("this place");
    expect(posterPlaceName("Café du Coin")).toBe("Café du Coin");
  });
});
