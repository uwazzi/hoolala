import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const signin = readFileSync("web/src/pages/SignIn.tsx", "utf8");
const story = readFileSync("web/src/components/Story.tsx", "utf8");

describe("the account menu", () => {
  it("replays the onboarding story from About Hoolala", () => {
    expect(signin).toContain("About Hoolala");
    expect(signin).toContain('go("story")');
    expect(signin).toContain("<Story onDone=");
    expect(story).toContain("onDone");
  });

  it("keeps the voice restart and leaves check-in to Around", () => {
    expect(signin).toContain("Let's get personal");
    expect(signin).not.toContain("Where are you?");
    expect(signin).not.toContain("Want a head start?");
  });
});
