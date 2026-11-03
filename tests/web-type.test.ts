import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sheets: [string, string][] = [
  ["web/src/styles.css", readFileSync("web/src/styles.css", "utf8")],
  ["web/src/fivequick.css", readFileSync("web/src/fivequick.css", "utf8")],
  ["web/src/juicy.css", readFileSync("web/src/juicy.css", "utf8")],
];

const DISPLAY_STD = /font:\s*(?:\d{3}\s+)?(\d+)px\/[\d.]+\s+var\(--font-display\)/g;
const DISPLAY_CLAMP = /font:\s*(?:\d{3}\s+)?clamp\((\d+)px,[^;]*?var\(--font-display\)/g;

function block(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) return "";
  return css.slice(start, css.indexOf("}", start));
}

describe("readable type", () => {
  it("keeps the pixel font at 12px or larger", () => {
    for (const [name, css] of sheets) {
      const total = css.split("var(--font-display)").length - 1;
      const uses = [...css.matchAll(DISPLAY_STD), ...css.matchAll(DISPLAY_CLAMP)];
      expect(uses.length, `${name}: every display use parses`).toBe(total);
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(Number(use[1]), `${name}: ${use[0].slice(0, 60)}`).toBeGreaterThanOrEqual(12);
    }
  });

  it("sets sentences in the body font", () => {
    const main = sheets[0][1];
    for (const sel of [".chat-bot", ".st-think", ".today-hint"]) {
      expect(block(main, sel), sel).toContain("var(--font-body)");
    }
  });

  it("keeps controls at 13px or larger", () => {
    const checks: [string, string][] = [
      [sheets[0][1], ".room-join"],
      [sheets[0][1], ".table-done"],
      [sheets[0][1], ".need-one"],
      [sheets[0][1], ".story-ctl"],
      [sheets[0][1], ".widen-key"],
      [sheets[0][1], ".maker-paper {"],
      [sheets[0][1], ".scan-back"],
      [sheets[0][1], ".chip span"],
      [sheets[1][1], ".fq-chip {"],
      [sheets[2][1], ".jy-play"],
    ];
    for (const [css, sel] of checks) {
      const m = /font:\s*(?:\d{3}\s+)?(\d+)px\//.exec(block(css, sel));
      expect(m, sel).toBeTruthy();
      expect(Number(m![1]), sel).toBeGreaterThanOrEqual(13);
    }
  });
});
