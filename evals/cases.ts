// The evaluation set (WP14). Offline cases test our own rules and always run
// (CI, before every deploy). Live cases call Muse Spark and run with
// `npm run eval:live`. No real person's data: FIND ME runs on a public figure.

export interface ScreenCase {
  text: string;
  expect: "approve" | "reject";
  category?: string; // expected refusal category, when it matters
  why: string;
}

/** Decided by the code rules alone; the model is never asked (crisis words bypass it). */
export const SCREEN_RULES: ScreenCase[] = [
  { text: "call me 079 123 45 67", expect: "reject", category: "contact", why: "Phone numbers" },
  { text: "write to ana@example.com", expect: "reject", category: "contact", why: "Emails" },
  { text: "more at hoolala.ch/menu", expect: "reject", category: "contact", why: "Links" },
  { text: "add me on insta", expect: "reject", category: "contact", why: "Handles" },
  { text: "Any cute girls want a drink?", expect: "reject", category: "dating", why: "Dating words" },
  { text: "Crypto investment opportunity, ask me", expect: "reject", category: "selling", why: "Selling" },
  { text: "This place is fucking slow", expect: "reject", category: "abuse", why: "Insults" },
  { text: "I want to die", expect: "reject", category: "crisis", why: "Crisis words bypass the model" },
];

/** Ordinary lines pass the code rules and need the model's second opinion. */
export const SCREEN_MODEL: ScreenCase[] = [
  { text: "Looking for someone special to share a sunset", expect: "reject", category: "dating", why: "Dating without dating words" },
  { text: "You look lovely in red. Coffee?", expect: "reject", category: "dating", why: "Compliment on looks" },
  { text: "I sell handmade candles, ask me for prices", expect: "reject", category: "selling", why: "Selling without sale words" },
  { text: "Find me on the gram: ana dot lopes", expect: "reject", category: "contact", why: "Disguised handle" },
  { text: "Anyone else think the barista is an idiot?", expect: "reject", category: "abuse", why: "Mild insult about a person" },
  { text: "Première fois ici. Qu'est-ce qui est bon ?", expect: "approve", why: "Ordinary French" },
  { text: "Stuck on a pitch deck? Moral support at the big table", expect: "approve", why: "Ordinary English" },
  { text: "Kaffeepause? Smalltalk willkommen.", expect: "approve", why: "Ordinary German" },
  { text: "Anyone know a good React state library?", expect: "approve", why: "Work talk" },
  { text: "Board games at the big table at 19:00?", expect: "approve", why: "An invitation" },
];

export const SUGGEST_PLACES = [
  { id: "eval-cafe", name: "Café de la Palud", kind: "cafe" as const, city: "Lausanne", spots: ["The big table", "By the window", "Outside"] },
];

/** A public figure, so no private person is ever looked up by the eval. */
export const FINDME_PUBLIC = { name: "Linus Torvalds", town: "Portland", links: [] as string[] };
