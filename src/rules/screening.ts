// Code screening for everything people write to each other: topics, curious
// lines, place names later. Pure. Decides alone when the model is off or late;
// SCREEN IT (WP23) adds a second opinion, it never overrules a refusal here.
// It approves or refuses with a reason; it never changes anyone's words.

export type ScreenCategory = "length" | "contact" | "dating" | "selling" | "abuse" | "crisis";

export interface ScreenResult {
  ok: boolean;
  category: ScreenCategory | null;
}

const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(ch|com|net|org|io|app|me|fr|de|co|info|link|ly)\b/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /\+?\d[\d\s().-]{7,}\d/;
const HANDLE = /(^|\s)@[A-Za-z0-9_.]{3,}|\b(insta|instagram|snap|snapchat|whatsapp|telegram|tiktok|linkedin)\b/i;

// Short and deliberate. Words in English and French, the pilot's languages.
const DATING =
  /\b(date|dating|hook ?up|single|singles|flirt|flirting|sexy|cute (girls?|guys?)|girlfriend|boyfriend|tinder|bumble|hinge|celibataire|célibataire|rencard|draguer|drague|plan cul)\b/i;
const SEXUAL = /\b(sex|sexual|nude|nudes|naked|horny|onlyfans|porn)\b/i;
const SELLING =
  /\b(buy now|for sale|discount|promo code|crypto|bitcoin|investment opportunity|mlm|dm me|follow me|subscribe|à vendre|a vendre)\b/i;
const ABUSE = /\b(fuck|fucking|bitch|whore|slut|retard|connard|connasse|salope|pute|enculé|encule|pd)\b/i;
// Crisis words get the fixed help message (src/rules/safety.ts, WP9), never model text.
const CRISIS = /\b(suicide|suicidal|kill myself|end my life|want to die|self[- ]harm|me suicider|en finir)\b/i;

export function screenText(raw: unknown, maxLength = 60): ScreenResult {
  if (typeof raw !== "string") return { ok: false, category: "length" };
  const text = raw.trim();
  if (text.length < 1 || text.length > maxLength) return { ok: false, category: "length" };
  if (CRISIS.test(text)) return { ok: false, category: "crisis" };
  if (LINK.test(text) || EMAIL.test(text) || PHONE.test(text) || HANDLE.test(text)) return { ok: false, category: "contact" };
  if (DATING.test(text) || SEXUAL.test(text)) return { ok: false, category: "dating" };
  if (SELLING.test(text)) return { ok: false, category: "selling" };
  if (ABUSE.test(text)) return { ok: false, category: "abuse" };
  return { ok: true, category: null };
}

/** The reason in Hoolala! voice, shown with EDIT. Never repeats the text back. */
export const SCREEN_MESSAGES: Record<ScreenCategory, string> = {
  length: "Keep it to one short line, up to 60 characters.",
  contact: "No links, handles, emails or numbers. You'll meet in person.",
  dating: "That sounds more like a date than a coffee break. Try again?",
  selling: "Signals are for talking, not selling. Try again?",
  abuse: "Let's keep it friendly. Try again?",
  crisis:
    "It sounds like things are hard right now. You don't have to go through it alone: in Switzerland, call 143 (La Main Tendue) any time, or 144 in an emergency.",
};
