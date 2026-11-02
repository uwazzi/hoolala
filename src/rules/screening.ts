// Code screening for everything people write to each other: topics, place
// texts, joining lines, suggestions, feedback. Pure. Decides alone when the
// model is off or late; SCREEN IT (WP23) adds a second opinion, it never
// overrules a refusal here. It approves or refuses with a reason; it never
// changes anyone's words. Refused text is never shown to anyone else.

export type ScreenCategory = "length" | "contact" | "dating" | "sexual" | "selling" | "abuse" | "home" | "street" | "crisis";

export interface ScreenResult {
  ok: boolean;
  category: ScreenCategory | null;
}

const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(ch|com|net|org|io|app|me|fr|de|co|info|link|ly)\b/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /\+?\d[\d\s().-]{7,}\d/;
const HANDLE = /(^|\s)@[A-Za-z0-9_.]{3,}|\b(insta|instagram|snap|snapchat|whatsapp|telegram|tiktok|linkedin)\b/i;

// Short and deliberate. Words in English and French, the pilot's languages.
// SCREEN IT judges the rest; these are the clear refuses.
const DATING =
  /\b(date|dating|hook ?up|single|singles|flirt|flirting|cute (girls?|guys?)|girlfriend|boyfriend|tinder|bumble|hinge|celibataire|célibataire|rencard|draguer|drague|plan cul|drinks? with me)\b/i;
const SEXUAL = /\b(sex|sexy|sexual|nude|nudes|naked|horny|onlyfans|porn|orgasme|bite|chatte|nichons|seins)\b|\bhot (girls?|guys?|women|men)\b/i;
const SELLING =
  /\b(buy|sell|selling|buy now|for sale|discount|promo( code)?|hiring|recruit(ing|er|ment)?|crypto|bitcoin|investment opportunity|mlm|dm me|follow me|subscribe|à vendre|a vendre)\b/i;
const ABUSE =
  /\b(fuck|fucking|bitch|whore|slut|retard|idiot|moron|stupid|loser|dumb|ugly|shut up|gueule|con|conne|connard|connasse|salope|pute|enculé|encule|salaud|bâtard|batard|crétin|cretin|imbécile|imbecile|débile|debile|abruti|pd)\b/i;
// Place text must name a public place, never a home, never a street number.
const HOME = /\b(home|my place|my flat|my room|my house|chez moi|chez nous|apartment|appartement)\b/i;
const STREET = /\b(rue|route|avenue|boulevard|chemin|impasse|street|road)\s*\d|\d+\s*(rue|route|avenue|boulevard|chemin|impasse|street|road)\b/i;
// Crisis words get the fixed help message, never model text.
const CRISIS = /\b(suicide|suicidal|kill myself|end my life|want to die|self[- ]harm|me suicider|en finir)\b/i;

function lengthOf(raw: unknown, maxLength: number): ScreenResult | null {
  if (typeof raw !== "string") return { ok: false, category: "length" };
  const text = raw.trim();
  if (text.length < 1 || text.length > maxLength) return { ok: false, category: "length" };
  return null;
}

function shared(text: string): ScreenResult | null {
  if (CRISIS.test(text)) return { ok: false, category: "crisis" };
  if (LINK.test(text) || EMAIL.test(text) || PHONE.test(text) || HANDLE.test(text)) return { ok: false, category: "contact" };
  if (SEXUAL.test(text)) return { ok: false, category: "sexual" };
  if (DATING.test(text)) return { ok: false, category: "dating" };
  if (SELLING.test(text)) return { ok: false, category: "selling" };
  if (ABUSE.test(text)) return { ok: false, category: "abuse" };
  return null;
}

export function screenText(raw: unknown, maxLength = 60): ScreenResult {
  return lengthOf(raw, maxLength) ?? shared((raw as string).trim()) ?? { ok: true, category: null };
}

/** Place text (40 characters): public places only, no homes, no street numbers. */
export function screenPlaceText(raw: unknown): ScreenResult {
  const length = lengthOf(raw, 40);
  if (length) return length;
  const text = (raw as string).trim();
  if (CRISIS.test(text)) return { ok: false, category: "crisis" };
  if (LINK.test(text) || EMAIL.test(text) || PHONE.test(text) || HANDLE.test(text)) return { ok: false, category: "contact" };
  if (HOME.test(text)) return { ok: false, category: "home" };
  if (STREET.test(text)) return { ok: false, category: "street" };
  return shared(text) ?? { ok: true, category: null };
}

/** The reason in Hoolala! voice, shown with EDIT. Never repeats the text back. */
export const SCREEN_MESSAGES: Record<ScreenCategory, string> = {
  length: "Keep it to one short line.",
  contact: "Let's keep phone numbers and handles out of it. Meet first.",
  dating: "That sounds more like a date than a coffee break. Try again?",
  sexual: "Let's keep it friendly, not flirty. Try again?",
  selling: "Selling something? This one's off the clock.",
  abuse: "That could hurt someone. Try something kinder?",
  home: "Somewhere public, please. A café, a library, a park. Never anyone's home.",
  street: "No street numbers. Just the place's name and where inside it.",
  crisis:
    "It sounds like things are hard right now. You don't have to go through it alone: in Switzerland, call 143 (La Main Tendue) or 147 any time, 112 or 144 in an emergency. In the US, call or text 988. In the UK, call Samaritans on 116 123.",
};
