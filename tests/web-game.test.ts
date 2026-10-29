import { describe, expect, it } from "vitest";
import { BUILD_LINES, BUILD_TICK_MS, buildTick, peopleLine, startBuild, tryInfo } from "../web/src/game";

describe("the build ticker", () => {
  it("ticks one line per 450 ms, the first at once", () => {
    expect(BUILD_TICK_MS).toBe(450);
    expect(BUILD_LINES).toBe(5);
    let s = startBuild();
    expect(s).toEqual({ ticked: 1, done: false });
    s = buildTick(s, true, false);
    s = buildTick(s, true, false);
    s = buildTick(s, true, false);
    expect(s).toEqual({ ticked: 4, done: false });
  });

  it("waits on the last line until the game arrives", () => {
    let s = { ticked: 4, done: false };
    s = buildTick(s, false, false);
    expect(s).toEqual({ ticked: 4, done: false });
    s = buildTick(s, true, false);
    expect(s).toEqual({ ticked: 5, done: true });
    expect(buildTick(s, true, false)).toEqual(s);
  });

  it("ticks everything at once with reduced motion, once the game is there", () => {
    expect(buildTick(startBuild(), false, true)).toEqual({ ticked: 1, done: false });
    expect(buildTick(startBuild(), true, true)).toEqual({ ticked: 5, done: true });
  });

  it("names the people in line two, or says tries say someone", () => {
    expect(peopleLine(null)).toBe("ADDING YOUR PEOPLE...");
    expect(peopleLine(["brother", "neighbour"])).toBe("ADDING YOUR PEOPLE: BROTHER · NEIGHBOUR");
    expect(peopleLine([])).toBe("NO PEOPLE NAMED: TRIES SAY SOMEONE");
  });

  it("writes the info line with kind, step, minutes and the compass role", () => {
    expect(tryInfo("talk", 2, 1, null)).toBe("SMALL TALK · STEP 2 · 1 MIN");
    expect(tryInfo("kind", 4, 2, "neighbour")).toBe("KIND IT · STEP 4 · 2 MIN · FROM YOUR COMPASS: NEIGHBOUR");
  });
});
