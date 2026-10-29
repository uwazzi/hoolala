import { describe, expect, it } from "vitest";
import { proposePlan, trimLine } from "../web/src/surprise";

describe("drafting one line from an answer", () => {
  it("trims a long answer to 60 characters at a word boundary", () => {
    expect(trimLine("Chess, the slower the better")).toBe("Chess, the slower the better");
    expect(trimLine("  slow   evenings  ")).toBe("slow evenings");
    const long = "I love slow Sunday mornings with the papers and a pot of coffee for two";
    const trimmed = trimLine(long);
    expect(trimmed.length).toBeLessThanOrEqual(60);
    expect(long.startsWith(trimmed)).toBe(true);
    expect(trimmed.endsWith(" ")).toBe(false);
    expect(trimLine("x".repeat(70))).toBe("x".repeat(60));
  });

  it("first tries the answer as said, in the question's direction", () => {
    expect(proposePlan("Chess, the slower the better", "interest")).toEqual([
      { words: "Chess, the slower the better", part: "interest" },
      { words: "Chess, the slower the better" },
    ]);
  });

  it("falls back to the trimmed answer, then to the code's own guess", () => {
    const long = "I love slow Sunday mornings with the papers and a pot of coffee for two";
    const plan = proposePlan(long, "delivery");
    expect(plan).toHaveLength(3);
    expect(plan[0]).toEqual({ words: long, part: "delivery" });
    expect(plan[1]).toEqual({ words: trimLine(long), part: "delivery" });
    expect(plan[2]).toEqual({ words: trimLine(long) });
  });

  it("leaves the open question's direction to the guess", () => {
    expect(proposePlan("I cook for far too many people", null)).toEqual([{ words: "I cook for far too many people" }]);
  });
});
