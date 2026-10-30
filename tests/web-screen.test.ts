import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screen = readFileSync("web/src/components/Screen.tsx", "utf8");
const styles = readFileSync("web/src/styles.css", "utf8");

describe("the app footer", () => {
  it("credits hg-labs.io with a link on every screen", () => {
    expect(screen).toContain("Powered by");
    expect(screen).toContain('href="https://hg-labs.io"');
    expect(styles).toContain(".brand-footer");
  });
});
