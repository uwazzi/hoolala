import { describe, expect, it } from "vitest";
import { TRY_LIBRARY, triesFor, tryById } from "../src/content/tries";

describe("the 15-try library", () => {
  it("holds 3 tries per step, one per place", () => {
    expect(TRY_LIBRARY).toHaveLength(15);
    for (let step = 1; step <= 5; step++) {
      const at = TRY_LIBRARY.filter((t) => t.step === step);
      expect(at).toHaveLength(3);
      expect(at.map((t) => t.place).sort()).toEqual(["anywhere", "cafe", "work"]);
    }
  });

  it("has unique ids and fits the bounds TRY IT must keep", () => {
    const ids = TRY_LIBRARY.map((t) => t.id);
    expect(new Set(ids).size).toBe(15);
    for (const t of TRY_LIBRARY) {
      expect(t.title.length).toBeLessThanOrEqual(48);
      expect(t.hint.length).toBeLessThanOrEqual(80);
      expect(t.meta.length).toBeGreaterThan(0);
    }
  });

  it("picks the requested place first, anywhere as backup", () => {
    expect(triesFor(1, "cafe")[0].place).toBe("cafe");
    expect(triesFor(1, "cafe")).toHaveLength(2);
    expect(triesFor(1, "anywhere")).toHaveLength(3);
    expect(tryById("missing")).toBeNull();
  });
});
