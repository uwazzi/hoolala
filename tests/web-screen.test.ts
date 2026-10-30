import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screen = readFileSync("web/src/components/Screen.tsx", "utf8");
const styles = readFileSync("web/src/styles.css", "utf8");

describe("the header brand link", () => {
  it("links Hoolala! home from every screen", () => {
    expect(screen).toContain('<a class="brand-bar-name" href="/">Hoolala!</a>');
    expect(styles).toContain(".brand-bar-name { font: 700 18px/1 var(--font-display); text-decoration: none; }");
  });
});

describe("the app footer", () => {
  it("credits hg-labs.io with a link on every screen", () => {
    expect(screen).toContain("Powered by");
    expect(screen).toContain('href="https://hg-labs.io"');
    expect(styles).toContain(".brand-footer");
  });
});
