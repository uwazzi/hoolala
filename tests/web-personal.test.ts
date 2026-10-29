import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkCells, checkHeadline, checkPeople, savePayload, type KeptDraft } from "../web/src/personal";

const DRAFTS: KeptDraft[] = [
  { part: "interest", line: "Long chats over cardamom buns", people: ["brother"], viaTyped: false },
  { part: "intention", line: "Slow Saturday mornings", people: ["brother", "friend"], viaTyped: true },
  { part: "delivery", line: "Just show up after lunch", people: [], viaTyped: false },
];

describe("the compass check", () => {
  it("maps N/E/S/W to intention/interest/filter/delivery, like the compass needle", () => {
    const cells = checkCells(DRAFTS);
    expect(cells.map((c) => [c.pole, c.part])).toEqual([
      ["N", "intention"],
      ["E", "interest"],
      ["S", "filter"],
      ["W", "delivery"],
    ]);
    expect(cells[1]).toMatchObject({ line: "Long chats over cardamom buns", viaTyped: false });
    expect(cells[2]).toMatchObject({ line: null });
  });

  it("dedupes people across drafts and honours removals", () => {
    expect(checkPeople(DRAFTS, [])).toEqual(["brother", "friend"]);
    expect(checkPeople(DRAFTS, ["brother"])).toEqual(["friend"]);
  });

  it("counts the kept lines in the headline, or says nothing was kept", () => {
    expect(checkHeadline(3)).toBe("A FIRST SKETCH OF YOU, IN 3 LINES.");
    expect(checkHeadline(1)).toBe("A FIRST SKETCH OF YOU, IN 1 LINE.");
    expect(checkHeadline(0)).toBe("NOTHING KEPT THIS TIME.");
  });

  it("saves lines and surviving people in one payload", () => {
    expect(savePayload(DRAFTS, ["friend"])).toEqual({
      lines: [
        { part: "interest", words: "Long chats over cardamom buns" },
        { part: "intention", words: "Slow Saturday mornings" },
        { part: "delivery", words: "Just show up after lunch" },
      ],
      people: [{ role: "brother" }],
    });
    expect(savePayload([], [])).toEqual({ lines: [], people: [] });
  });

  it("reuses the WP34 voice UI instead of forking it", () => {
    const src = readFileSync("web/src/pages/Surprise.tsx", "utf8");
    expect(src).toContain('from "../voice"');
    expect(src).toContain('from "../components/PixelBall"');
    expect(src).not.toContain("getUserMedia");
    expect(src).not.toContain("AudioContext");
  });
});
