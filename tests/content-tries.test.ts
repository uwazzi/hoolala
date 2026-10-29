import { describe, expect, it } from "vitest";
import { GAME_LIBRARY, ROLE_PHRASE, TRY_LIBRARY, triesFor, tryById } from "../src/content/tries";

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

describe("the 24-try game library", () => {
  it("holds 8 tries per level with talk and kind in each", () => {
    expect(GAME_LIBRARY).toHaveLength(24);
    for (const level of ["soft", "brave", "bold"] as const) {
      const at = GAME_LIBRARY.filter((t) => t.level === level);
      expect(at).toHaveLength(8);
      expect(at.some((t) => t.kind === "talk")).toBe(true);
      expect(at.some((t) => t.kind === "kind")).toBe(true);
    }
  });

  it("steps stay inside the level and placeholders are known", () => {
    const steps: Record<string, number[]> = { soft: [1, 2], brave: [3, 4], bold: [5] };
    for (const t of GAME_LIBRARY) {
      expect(steps[t.level]).toContain(t.step);
      expect(["none", "any", "close", "service"]).toContain(t.who);
      for (const m of t.template.matchAll(/\{([a-z]+)\}/g)) {
        expect(["p", "topic", "rec", "who"]).toContain(m[1]);
      }
      expect(t.template.includes("{who}")).toBe(t.who !== "none");
    }
  });

  it("names every compass role in plain words", () => {
    for (const role of ["barista", "boss", "brother", "child", "colleague", "dad", "friend", "mum", "neighbour", "regular", "sister", "teammate"] as const) {
      expect(ROLE_PHRASE[role]).toMatch(/^[a-z]/);
    }
  });
});
