import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const join = readFileSync("web/src/pages/PosterJoin.tsx", "utf8");
const auth = readFileSync("src/api/auth.ts", "utf8");

describe("poster onboarding choice", () => {
  it("ends on a choice between looking around and posting", () => {
    expect(join).toContain('"choice"');
    expect(join).toContain('setPhase("choice")');
    expect(join).toContain("YOU'RE IN.");
    expect(join).toContain("Look around");
    expect(join).toContain("Post your own");
    expect(join).toContain('href="/around"');
  });

  it("keeps the place prefill for the post path only", () => {
    expect(join).toContain("poster-place");
    expect(join).toContain("?place=");
    expect(join).toContain("postUrl");
  });

  it("funnels every signed-in scan through the claim, never straight to post", () => {
    expect(join).toContain('route("/p/claim")');
    expect(join).not.toContain("route(next)");
  });

  it("brings email-link users back through the claim", () => {
    expect(auth).toContain('redirect("/p/claim"');
  });
});

describe("poster copy", () => {
  it("avoids banned words and em dashes", () => {
    for (const banned of ["lonely", "shy", "anxiety", "therapy", "coach"]) {
      expect(join.toLowerCase()).not.toContain(banned);
    }
    expect(join).not.toContain("—");
  });

  it("mentions dating only as Not a dating app", () => {
    const lower = join.toLowerCase();
    const hits = lower.split("dating").length - 1;
    const allowed = lower.split("not a dating app").length - 1;
    expect(hits).toBe(allowed);
  });
});
