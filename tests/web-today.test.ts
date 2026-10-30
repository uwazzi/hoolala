import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("web/src/pages/Home.tsx", "utf8");
const flow = readFileSync("web/src/components/TryFlow.tsx", "utf8");

describe("Today, simplified", () => {
  it("shows one try with one primary key and two text links", () => {
    for (const copy of ["TODAY'S TRY", "LET'S GO", "ANOTHER ONE", "NOT TODAY", "My compass", "Your plant. It only grows."]) {
      expect(home).toContain(copy);
    }
    // One primary on the hero: LET'S GO (guests get the story, not a sign-in screen).
    expect(home.match(/lcd-key--primary/g)?.length ?? 0).toBe(1);
    expect(home.match(/link-button/g)?.length ?? 0).toBe(2);
  });

  it("drops the motto, compass box, friend dare, chips and here links from the signed-in hero", () => {
    for (const gone of ["Invite a friend", "Where are you?", "See who here", "hero-display", "hero-line"]) {
      expect(home).not.toContain(gone);
    }
  });

  it("shows the onboarding story from the first paint while auth loads", () => {
    expect(home).toContain("shouldShowStory(auth, me?.introSeen ?? null, seenLocal)");
  });

  it("keeps account reachable for signed-in users", () => {
    expect(home).toContain("ACCOUNT");
    expect(home).toContain('href="/signin">ACCOUNT');
  });

  it("keeps the flow for going out, telling and next time, without the offer screen", () => {
    for (const kept of ["Off you go", "How did it go?", "Next time", "/compass?fix=", "No problem. Your plant waits."]) {
      expect(flow).toContain(kept);
    }
    for (const gone of ["Tell my friends", "See who here", "Where?", "I’m in. Off I go", "TELL MY FRIENDS"]) {
      expect(flow).not.toContain(gone);
    }
  });

  it("records game tries through the game branch", () => {
    expect(flow).toContain('source === "game"');
    expect(flow).toContain("/api/game/another");
  });
});
