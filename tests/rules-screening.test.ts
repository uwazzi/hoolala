import { describe, expect, it } from "vitest";
import { SCREEN_MESSAGES, screenPlaceText, screenText } from "../src/rules/screening";

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

describe("v6.4 room screening", () => {
  it("refuses insults and slurs in English and French", () => {
    no("Anyone else think the barista is an idiot?", "abuse");
    no("Ta gueule, imbécile", "abuse");
    expect(SCREEN_MESSAGES.abuse).toBe("That could hurt someone. Try something kinder?");
  });

  it("refuses sexual content on its own, not as dating", () => {
    no("Anyone sexy here tonight?", "sexual");
    no("Show me your seins", "sexual");
    expect(SCREEN_MESSAGES.sexual).toBe("Let's keep it friendly, not flirty. Try again?");
  });

  it("keeps dating phrases on the date refusal", () => {
    no("Looking for a date tonight?", "dating");
    no("A drink with me, cutie?", "dating");
    expect(SCREEN_MESSAGES.dating).toBe("That sounds more like a date than a coffee break. Try again?");
  });

  it("refuses numbers and handles with the meet-first line", () => {
    no("Call 079 123 45 67", "contact");
    expect(SCREEN_MESSAGES.contact).toBe("Let's keep phone numbers and handles out of it. Meet first.");
  });

  it("refuses selling with the off-the-clock line", () => {
    no("Buy my course, 50 percent off", "selling");
    no("We are hiring closers, DM me", "selling");
    expect(SCREEN_MESSAGES.selling).toBe("Selling something? This one's off the clock.");
  });

  it("refuses homes and street numbers in place text only", () => {
    expect(screenPlaceText("My flat, second floor").category).toBe("home");
    expect(screenPlaceText("Café du Coin, rue 12").category).toBe("street");
    expect(screenPlaceText("Café du Coin, window table").ok).toBe(true);
    // A topic may mention home; only the place must be public.
    expect(screenText("Best soup in town? Let's compare notes").ok).toBe(true);
    expect(SCREEN_MESSAGES.home).toBe("Somewhere public, please. A café, a library, a park. Never anyone's home.");
    expect(SCREEN_MESSAGES.street).toBe("No street numbers. Just the place's name and where inside it.");
  });

  it("returns the fixed help message with every help number on crisis words", () => {
    no("I want to die", "crisis");
    for (const number of ["143", "147", "112", "988", "116 123"]) {
      expect(SCREEN_MESSAGES.crisis).toContain(number);
    }
  });
});
