import { describe, expect, it } from "vitest";
import { SCREEN_MESSAGES, screenText } from "../src/rules/screening";

const ok = (t: string) => expect(screenText(t)).toEqual({ ok: true, category: null });
const no = (t: string, category: string) => expect(screenText(t).category).toBe(category);

describe("screenText", () => {
  it("lets ordinary invitations to talk through", () => {
    ok("Coffee break at 15:00. Small talk welcome, work talk OK.");
    ok("Stuck on a pitch deck? Moral support at the big table");
    ok("Première fois ici. Qu'est-ce qui est bon ?");
    ok("Their flat white is apparently famous. Verdict at 16:00?");
  });

  it("refuses empty and over 60 characters", () => {
    no("", "length");
    no("   ", "length");
    no("a".repeat(61), "length");
    expect(screenText(null).ok).toBe(false);
  });

  it("refuses contact details: links, emails, phones, handles", () => {
    no("see hoolala.ch for more", "contact");
    no("write me at ana@example.com", "contact");
    no("call 079 123 45 67", "contact");
    no("find me @ana_lausanne", "contact");
    no("add me on insta", "contact");
  });

  it("refuses dating and sexual content", () => {
    no("Any cute girls want to grab a drink?", "dating");
    no("Single and ready to mingle", "dating");
    no("Cherche un rencard ce soir", "dating");
  });

  it("refuses selling and abuse", () => {
    no("Crypto investment opportunity, ask me", "selling");
    no("This place is fucking slow", "abuse");
  });

  it("puts crisis first, with a help number, never model text", () => {
    no("I want to die", "crisis");
    expect(SCREEN_MESSAGES.crisis).toContain("143");
  });

  it("allows a longer limit when asked", () => {
    expect(screenText("a".repeat(80), 100).ok).toBe(true);
  });
});
