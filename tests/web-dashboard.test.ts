import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("web/src/pages/Dashboard.tsx", "utf8");
const main = readFileSync("web/src/main.tsx", "utf8");

describe("the owner dashboard page", () => {
  it("is routed at /dashboard and reads the counts with the owner token", () => {
    expect(main).toContain('path="/dashboard"');
    expect(page).toContain('fetch("/api/dashboard"');
    expect(page).toContain("Bearer ${token}");
    expect(page).toContain("query.token");
  });

  it("shows users, interactions, leaves and the How did it go breakdown", () => {
    for (const copy of ["Users", "Interactions logged", "Leaves in total", "How did it go", "Went well", "No reply / ghosted", "Awkward but done", "Didn't happen"]) {
      expect(page).toContain(copy);
    }
  });

  it("keeps the token in memory only", () => {
    expect(page).not.toContain("localStorage");
    expect(page).not.toContain("sessionStorage");
  });
});
