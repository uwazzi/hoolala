import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const live = readFileSync("web/src/pages/Live.tsx", "utf8");

describe("the public Live page", () => {
  it("shows users, interactions, leaves and sentiment, refreshed every 4 hours", () => {
    for (const copy of ["Users", "Interactions logged", "Leaves in total", "How did it go", "Went well", "No reply / ghosted", "Awkward but done", "Didn't happen"]) {
      expect(live).toContain(copy);
    }
    expect(live).toContain("4 * 60 * 60_000");
    expect(live).not.toContain(", 60_000)");
  });
});
