// The evaluation set (WP14). Offline cases test our own rules and always run
// (CI, before every deploy). Live cases call Muse Spark and run with
// `npm run eval:live`. No real person's data: FIND ME runs on a public figure.

import type { WhyGoPlace } from "../src/llm/whygo";
import type { Ask, TryDraft, TryVerdict } from "../src/rules/tries";

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
// FIND ME removed in v6.2: the compass comes from spoken answers, never search.

export interface TryCase {
  name: string;
  draft: TryDraft;
  ask: Ask;
  expect: TryVerdict;
}

const tryAsk = (step: 1 | 2 | 3 | 4 | 5, place: Ask["place"] = "anywhere"): Ask => ({ step, place, timeOfDay: "morning", last: [], interests: [] });
const tryDraft = (d: Partial<TryDraft> & { step: number; place_kind: string }): TryDraft => ({
  title: "SAY HELLO.",
  hint: "MORNING.",
  words_max: 1,
  minutes: 1,
  asks_of_other: "hello_back",
  why: "Step 2 fits this morning.",
  ...d,
});

/** TRY IT drafts live or die by the validator, never by vibes. */
export const TRY_CASES: TryCase[] = [
  { name: "A step-2 hello fits", draft: tryDraft({ step: 2, place_kind: "anywhere" }), ask: tryAsk(2), expect: "ok" },
  { name: "A silent step-1 nod fits", draft: tryDraft({ step: 1, place_kind: "cafe", words_max: 0, asks_of_other: "none", minutes: 2 }), ask: tryAsk(1, "cafe"), expect: "ok" },
  { name: "A step-5 coffee invitation fits", draft: tryDraft({ step: 5, place_kind: "work", words_max: 40, minutes: 10, asks_of_other: "join_ok" }), ask: tryAsk(5, "work"), expect: "ok" },
  { name: "The wrong step is refused", draft: tryDraft({ step: 3, place_kind: "anywhere", words_max: 20, minutes: 3, asks_of_other: "answer" }), ask: tryAsk(1), expect: "wrong_step" },
  { name: "The wrong place is refused", draft: tryDraft({ step: 2, place_kind: "work" }), ask: tryAsk(2, "cafe"), expect: "wrong_step" },
  { name: "Over the minutes is refused", draft: tryDraft({ step: 2, place_kind: "anywhere", minutes: 5 }), ask: tryAsk(2), expect: "too_much" },
  { name: "Over the words is refused", draft: tryDraft({ step: 3, place_kind: "anywhere", words_max: 40, minutes: 3, asks_of_other: "answer" }), ask: tryAsk(3), expect: "too_much" },
  { name: "Over the ask is refused", draft: tryDraft({ step: 2, place_kind: "anywhere", asks_of_other: "answer" }), ask: tryAsk(2), expect: "too_much" },
  { name: "A title over 48 chars is refused", draft: tryDraft({ step: 2, place_kind: "anywhere", title: "X".repeat(49) }), ask: tryAsk(2), expect: "too_much" },
  { name: "A hint over 80 chars is refused", draft: tryDraft({ step: 2, place_kind: "anywhere", hint: "Y".repeat(81) }), ask: tryAsk(2), expect: "too_much" },
  { name: "A missing why is refused", draft: tryDraft({ step: 2, place_kind: "anywhere", why: "" }), ask: tryAsk(2), expect: "too_much" },
  { name: "Flirting is off limits", draft: tryDraft({ step: 3, place_kind: "anywhere", hint: "Tell him he looks sexy.", words_max: 5, minutes: 2, asks_of_other: "answer" }), ask: tryAsk(3), expect: "off_limits" },
  { name: "Contact exchange is off limits", draft: tryDraft({ step: 4, place_kind: "anywhere", hint: "Ask for her number: 079 123 45 67.", minutes: 2, asks_of_other: "answer" }), ask: tryAsk(4), expect: "off_limits" },
  { name: "Streak shame is off limits", draft: tryDraft({ step: 2, place_kind: "anywhere", hint: "Keep your streak alive, coward." }), ask: tryAsk(2), expect: "off_limits" },
  { name: "Advice is off limits", draft: tryDraft({ step: 4, place_kind: "anywhere", hint: "Ask what his therapist said.", minutes: 2, asks_of_other: "answer" }), ask: tryAsk(4), expect: "off_limits" },
];

/** WHY GO: grounded whys are kept, everything invented or over the line is dropped. -1 means nothing survives. */
export interface WhyGoCase {
  name: string;
  value: unknown;
  keep: number;
}

export const WHYGO_PLACE: WhyGoPlace = {
  id: "cafe",
  name: "Café Longue Table",
  kind: "cafe",
  distance_m: 120,
  facts: [{ id: "f0", text: "Oat flat white and cardamom buns" }],
  compass: ["cardamom buns"],
  visits: 7,
  talking: "Often chatty",
};

const whyItem = (d: Record<string, unknown>) => ({
  place_id: "cafe",
  why: "On your compass: cardamom. Oat flat white and cardamom buns.",
  tiny_try: "Ask about the buns.",
  facts_used: ["f0"],
  ...d,
});

export const WHYGO_CASES: WhyGoCase[] = [
  { name: "A grounded why is kept", value: { places: [whyItem({})] }, keep: 1 },
  { name: "An unknown place is dropped", value: { places: [whyItem({ place_id: "nope" })] }, keep: -1 },
  { name: "An invented price is dropped", value: { places: [whyItem({ why: "Menu CHF 19, open until 25:00." })] }, keep: -1 },
  { name: "A why over the line is dropped", value: { places: [whyItem({ why: "X".repeat(141) })] }, keep: -1 },
  { name: "A flirting try is dropped", value: { places: [whyItem({ tiny_try: "Ask them for a date." })] }, keep: -1 },
  { name: "A contact try is dropped", value: { places: [whyItem({ tiny_try: "Ask for his number." })] }, keep: -1 },
  { name: "A try over the line is dropped", value: { places: [whyItem({ tiny_try: "Y".repeat(81) })] }, keep: -1 },
  { name: "Facts never used are dropped", value: { places: [whyItem({ facts_used: ["zzz"] })] }, keep: -1 },
  { name: "Garbage in, nothing out", value: { places: "nope" }, keep: -1 },
  { name: "One bad apple keeps the good one", value: { places: [whyItem({}), whyItem({ place_id: "nope" })] }, keep: 1 },
];

/** READ IT: only lines the page actually says survive. null means the caller shows the link only. */
export interface ReadItCase {
  name: string;
  value: unknown;
  page: string;
  expect: { items: string[]; hours: string | null } | null;
}

const MENU_PAGE = "Oat flat white, cardamom bun. Open until 18:00.";

/** JUICY BITS: kept bits live or die by the validator, never by vibes. */
export interface JuicyCase {
  name: string;
  value: unknown;
  offtable: string[];
  expect: "ok" | "reject";
}

const juicyBits = (d: Record<string, unknown>) => ({
  topics: ["board games"],
  people: [{ role: "barista", tier: "said" }],
  nearly_said: { line: "I love the music you play", to_role: "barista" },
  ...d,
});

export const JUICY_CASES: JuicyCase[] = [
  { name: "Full bits pass", value: juicyBits({}), offtable: [], expect: "ok" },
  { name: "Topics alone pass", value: juicyBits({ topics: ["music"], people: [], nearly_said: null }), offtable: [], expect: "ok" },
  { name: "No to-role passes", value: juicyBits({ topics: [], people: [{ role: "colleague", tier: "said" }], nearly_said: { line: "Nice set today", to_role: null } }), offtable: [], expect: "ok" },
  {
    name: "Off-table people are filtered, the rest passes",
    value: juicyBits({ topics: ["recipes"], people: [{ role: "brother", tier: "said" }, { role: "driver", tier: "said" }], nearly_said: null }),
    offtable: ["FAMILY"],
    expect: "ok",
  },
  { name: "Three short topics pass", value: juicyBits({ topics: ["board games", "video games", "recipes"], people: [], nearly_said: null }), offtable: [], expect: "ok" },
  { name: "Filler kept is rejected", value: juicyBits({ topics: ["like"] }), offtable: [], expect: "reject" },
  { name: "A name is rejected", value: juicyBits({ topics: ["Tom"] }), offtable: [], expect: "reject" },
  { name: "An off-table topic is rejected", value: juicyBits({ topics: ["politics"] }), offtable: ["POLITICS"], expect: "reject" },
  { name: "A label about the person is rejected", value: juicyBits({ topics: ["introvert"] }), offtable: [], expect: "reject" },
  { name: "An off-list role is rejected", value: juicyBits({ people: [{ role: "stranger", tier: "said" }] }), offtable: [], expect: "reject" },
];

export const READIT_CASES: ReadItCase[] = [
  {
    name: "A menu on the page is kept",
    value: { items: ["Oat flat white", "Cardamom bun"], hours: "Open until 18:00", kind: "menu" },
    page: MENU_PAGE,
    expect: { items: ["Oat flat white", "Cardamom bun"], hours: "Open until 18:00" },
  },
  {
    name: "A dish the page never said is dropped",
    value: { items: ["Oat flat white", "Truffle croissant"], hours: null, kind: "menu" },
    page: MENU_PAGE,
    expect: { items: ["Oat flat white"], hours: null },
  },
  {
    name: "An allergen claim is dropped",
    value: { items: ["Gluten-free bun"], hours: null, kind: "menu" },
    page: "Gluten-free bun, CHF 4.",
    expect: null,
  },
  {
    name: "Hours the page never said fall back to none",
    value: { items: ["Oat flat white"], hours: "Sundays", kind: "menu" },
    page: MENU_PAGE,
    expect: { items: ["Oat flat white"], hours: null },
  },
  {
    name: "A page that says nothing gives nothing",
    value: { items: ["Truffle croissant"], hours: "Sundays", kind: "menu" },
    page: MENU_PAGE,
    expect: null,
  },
];
