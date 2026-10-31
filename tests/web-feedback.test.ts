import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sayhi = readFileSync("web/src/pages/SayHi.tsx", "utf8");
const screen = readFileSync("web/src/components/Screen.tsx", "utf8");
const log = readFileSync("web/src/log.ts", "utf8");
const api = readFileSync("web/src/api.ts", "utf8");
const dashboard = readFileSync("web/src/pages/Dashboard.tsx", "utf8");
const main = readFileSync("web/src/main.tsx", "utf8");

describe("say hi", () => {
  it("sends screen, message and log from its own page", () => {
    expect(main).toContain('path="/say-hi"');
    expect(sayhi).toContain('"/api/feedback"');
    expect(sayhi).toContain("takeLog()");
    expect(sayhi).toContain("query.from");
  });

  it("is one tap away in the footer", () => {
    expect(screen).toContain("Say hi");
    expect(screen).toContain("/say-hi?from=");
  });

  it("logs API outcomes only, never bodies", () => {
    expect(api).toContain("pushLog");
    expect(log).toContain("never bodies");
  });

  it("shows recent hellos on the owner dashboard", () => {
    expect(dashboard).toContain('"/api/feedback"');
    expect(dashboard).toContain("Latest hellos");
  });
});
