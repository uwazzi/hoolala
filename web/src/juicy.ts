// WP39 keeping the juicy bits, web side: the token marks for the trimming
// view, the kept list for the Snake ticker, the compass-check merge and one
// pure Snake tick. The lists mirror design/screens/Onboard.dc.html; the
// server keeps its own copies in src/rules/juicy.ts. Names never survive:
// capitalised words past the first are stripped from keywords, so a name in
// the free text never appears anywhere, ticker included.
import type { KeptBits } from "./personal";

export const FILLER = ["um", "uh", "er", "erm", "so", "basically", "like", "honestly", "really", "just", "actually", "literally", "well", "anyway", "kind", "sort", "guess", "mean"];
export const STOPWORDS = ["i", "a", "an", "the", "and", "or", "but", "it", "its", "was", "were", "is", "to", "of", "for", "with", "my", "me", "we", "you", "they", "them", "their", "that", "this", "about", "at", "in", "on", "last", "whole", "told", "nearly", "said", "think", "love", "play", "played", "argued", "talked", "asked", "went", "some", "very", "have", "had", "what", "when", "didnt", "didn’t", "know", "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "hour", "hours", "week", "month", "today", "yesterday", "minutes", "time", "thing", "things"];
export const PHRASES = ["board games", "video games", "the music"];

/** chip roles: [phrase, label, class, place], as drawn. */
export const CHIP_ROLES: Record<string, [string, string, "close" | "service", string]> = {
  BARISTA: ["the barista", "BARISTA", "service", "the café"],
  NEIGHBOUR: ["your neighbour", "NEIGHBOUR", "close", "your building"],
  COLLEAGUE: ["a colleague", "COLLEAGUE", "close", "work"],
  DRIVER: ["the bus driver", "DRIVER", "service", "the bus stop"],
  "SHOP STAFF": ["the person at the shop counter", "SHOP STAFF", "service", "the shop"],
  "A REGULAR": ["a regular you always see", "A REGULAR", "close", "your usual spot"],
};

/** roles found in free text: [pattern, phrase, label, class, family], as drawn. */
export const ROLE_PATTERNS: [RegExp, string, string, "close" | "service", number][] = [
  [/\b(mum|mother|mom)\b/i, "your mum", "MUM", "close", 1],
  [/\b(dad|father)\b/i, "your dad", "DAD", "close", 1],
  [/\bbrother\b/i, "your brother", "BROTHER", "close", 1],
  [/\bsister\b/i, "your sister", "SISTER", "close", 1],
  [/\b(gran|grandma|grandad|grandpa)\b/i, "your grandparent", "GRANDPARENT", "close", 1],
  [/\b(cousin|aunt|uncle)\b/i, "someone in your family", "FAMILY", "close", 1],
  [/\b(colleague|co-?worker|teammate)\b/i, "a colleague", "COLLEAGUE", "close", 0],
  [/\bneighbou?r\b/i, "your neighbour", "NEIGHBOUR", "close", 0],
  [/\bflatmate\b/i, "your flatmate", "FLATMATE", "close", 0],
  [/\b(waiter|waitress)\b/i, "the waiter", "WAITER", "service", 0],
  [/\bbarista\b/i, "the barista", "BARISTA", "service", 0],
  [/\b(driver)\b/i, "the bus driver", "DRIVER", "service", 0],
  [/\b(cashier|shopkeeper)\b/i, "the cashier", "CASHIER", "service", 0],
];

export const CANT_REMEMBER = "CAN\u2019T REMEMBER";
export const NOTHING_EASY = "NOTHING, I\u2019M EASY";
export const FAMILY_ROLES = ["mum", "dad", "brother", "sister", "grandparent", "family"];

export interface JuicyToken {
  w: string;
  cls: "filler" | "stop" | "key";
  key: string | null;
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z’']/g, "");
const DAY_MONTH = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)$/i;
const CAPITAL = /^[A-Z][a-z]+$/;

export function tokenize(text: string): JuicyToken[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const out: JuicyToken[] = [];
  for (let k = 0; k < words.length; k++) {
    const raw = words[k];
    const w = clean(raw);
    const pair = k + 1 < words.length ? `${w} ${words[k + 1].toLowerCase().replace(/[^a-z]/g, "")}` : "";
    if (PHRASES.indexOf(pair) >= 0) {
      out.push({ w: `${raw} ${words[k + 1]}`, cls: "key", key: pair.replace(/^the /, "") });
      k++;
      continue;
    }
    const prev = k > 0 ? words[k - 1].toLowerCase().replace(/[^a-z]/g, "") : "";
    const isFiller = FILLER.indexOf(w) >= 0 || (w === "know" && prev === "you");
    const isRole = ROLE_PATTERNS.some((r) => r[0].test(w));
    const cls = isFiller ? "filler" : isRole ? "key" : STOPWORDS.indexOf(w) >= 0 || w.length < 4 ? "stop" : "key";
    out.push({ w: raw, cls, key: cls === "key" ? w : null });
  }
  return out;
}

/** Capitalised words past the first, lowercased: stripped from keywords. */
function nameForms(text: string): Set<string> {
  const out = new Set<string>();
  const words = text.split(/\s+/).filter(Boolean);
  words.forEach((raw, i) => {
    const word = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    const sentenceStart = i === 0 || /[.?!]$/.test(words[i - 1]);
    if (!sentenceStart && CAPITAL.test(word) && !DAY_MONTH.test(word)) out.add(word.toLowerCase());
  });
  return out;
}

export function keywordsOf(text: string | null): string[] {
  if (!text) return [];
  const names = nameForms(text);
  const seen: string[] = [];
  for (const t of tokenize(text)) {
    if (t.key && seen.indexOf(t.key) < 0 && !names.has(t.key)) seen.push(t.key);
  }
  return seen;
}

export interface JuicyAnswers {
  q1f: string | null;
  q4: string | null;
  q2: string[];
  q2f: string[];
  q5: string[];
}

export interface JuicyRole {
  phrase: string;
  label: string;
  cls: "close" | "service";
  tier: "said" | "nod";
  place?: string;
  family?: number;
}

export function topicsOf(q1f: string | null): string[] {
  if (!q1f) return [];
  return keywordsOf(q1f)
    .filter((k) => !ROLE_PATTERNS.some((r) => r[0].test(k)))
    .slice(0, 3);
}

export function nearlySaidOf(q4: string | null): string | null {
  if (!q4) return null;
  const words = keywordsOf(q4).filter((k) => !ROLE_PATTERNS.some((r) => r[0].test(k))).slice(0, 3);
  return words.length > 0 ? words.join(" · ") : null;
}

export function nearlyRoleOf(q4: string | null): JuicyRole | null {
  const r = ROLE_PATTERNS.filter((x) => x[0].test(q4 || ""))[0];
  return r ? { phrase: r[1], label: r[2], cls: r[3], tier: "said" } : null;
}

export function offTableOf(q5: string[]): string[] {
  return q5.filter((x) => x !== NOTHING_EASY);
}

export function rolesOf(a: JuicyAnswers): JuicyRole[] {
  const off = offTableOf(a.q5);
  const out: JuicyRole[] = [];
  const add = (r: JuicyRole) => {
    if (!out.some((o) => o.label === r.label)) out.push(r);
  };
  a.q2.forEach((c) => {
    const r = CHIP_ROLES[c];
    if (r) add({ phrase: r[0], label: r[1], cls: r[2], place: r[3], tier: "said" });
  });
  [a.q1f, a.q4].forEach((t) => {
    if (!t) return;
    ROLE_PATTERNS.forEach((r) => {
      if (r[0].test(t)) add({ phrase: r[1], label: r[2], cls: r[3], family: r[4], tier: "said", place: (CHIP_ROLES[r[2]] || [])[3] });
    });
  });
  a.q2f.forEach((c) => {
    const r = CHIP_ROLES[c];
    if (r && !out.some((o) => o.label === r[1])) out.push({ phrase: r[0], label: r[1], cls: r[2], place: r[3], tier: "nod" });
  });
  return out.filter((r) => !(off.indexOf("FAMILY") >= 0 && r.family) && !(off.indexOf("WORK") >= 0 && r.label === "COLLEAGUE"));
}

export function keptListOf(a: JuicyAnswers, q3: string | null): string[] {
  const list: string[] = [];
  topicsOf(a.q1f).forEach((t) => list.push(t.toUpperCase()));
  rolesOf(a).forEach((r) => list.push(r.label + (r.tier === "nod" ? " (NOD)" : "")));
  if (nearlySaidOf(a.q4)) list.push("NEARLY SAID");
  if (q3) list.push(`BATTERY ${q3}`);
  offTableOf(a.q5).forEach((o) => list.push(`NOT: ${o}`));
  return list;
}

/** START HERE from the battery: LOW and OK stay SOFT, GOOD opens BRAVE, FULL opens BOLD. CAN'T REMEMBER always stays SOFT. */
export function startPace(q3: string | null, q1: string | null): 0 | 1 | 2 {
  if (q1 === CANT_REMEMBER || q1 === "CAN'T REMEMBER") return 0;
  if (q3 === "FULL") return 2;
  if (q3 === "GOOD") return 1;
  return 0;
}

// ---- The compass-check merge: chip roles plus the extracted bits.

export interface ExtractedBits {
  topics: string[];
  people: { role: string }[];
  nearlySaid: { line: string; toRole: string | null } | null;
}

export interface FullAnswers extends JuicyAnswers {
  q1: string | null;
  q2extra: string | null;
  q2fextra: string | null;
  q3: string | null;
}

function chipRole(label: string): string | null {
  return CHIP_ROLES[label] ? label.toLowerCase() : null;
}

function filterOff(roles: string[], offtable: string[]): string[] {
  return roles.filter((r) => !(offtable.indexOf("FAMILY") >= 0 && FAMILY_ROLES.indexOf(r) >= 0) && !(offtable.indexOf("WORK") >= 0 && r === "colleague"));
}

export function mergeKept(a: FullAnswers, ex: ExtractedBits): KeptBits {
  const offtable = offTableOf(a.q5);
  const said: string[] = [];
  for (const c of a.q2) {
    const role = chipRole(c);
    if (role && said.indexOf(role) < 0) said.push(role);
  }
  for (const p of ex.people) {
    if (p.role && said.indexOf(p.role) < 0) said.push(p.role);
  }
  const nod: string[] = [];
  for (const c of a.q2f) {
    const role = chipRole(c);
    if (role && said.indexOf(role) < 0 && nod.indexOf(role) < 0) nod.push(role);
  }
  const answered = [a.q1, a.q2, a.q3, a.q4, a.q5].filter((k) => k && (!Array.isArray(k) || k.length)).length;
  return {
    topics: ex.topics,
    said: filterOff(said, offtable),
    nod: filterOff(nod, offtable),
    nearlySaid: ex.nearlySaid,
    battery: a.q3,
    lastChat: a.q1,
    offtable,
    q5Answered: a.q5.length > 0,
    answered,
  };
}

// ---- Snake, one pure tick. The board wraps; a self-hit holds OOPS for 1.2 s, then a fresh snake.

export const SNAKE_COLS = 19;
export const SNAKE_ROWS = 12;
export const OOPS_MS = 1200;

export interface SnakeState {
  body: [number, number][];
  dir: [number, number];
  next: [number, number];
  food: [number, number];
  eaten: number;
  oops: number | false;
}

export function newSnake(): SnakeState {
  return { body: [[9, 6], [8, 6], [7, 6]], dir: [1, 0], next: [1, 0], food: [14, 6], eaten: 0, oops: false };
}

/** A reverse turn is ignored. */
export function steerSnake(s: SnakeState, d: [number, number]): SnakeState {
  if (s.dir[0] === -d[0] && s.dir[1] === -d[1]) return s;
  return { ...s, next: d };
}

export function stepSnake(s: SnakeState, nowMs: number): SnakeState {
  if (s.oops !== false) {
    if (nowMs - s.oops > OOPS_MS) return newSnake();
    return s;
  }
  const head: [number, number] = [(s.body[0][0] + s.next[0] + SNAKE_COLS) % SNAKE_COLS, (s.body[0][1] + s.next[1] + SNAKE_ROWS) % SNAKE_ROWS];
  if (s.body.some((b) => b[0] === head[0] && b[1] === head[1])) return { ...s, oops: nowMs };
  const body = [head].concat(s.body);
  let food = s.food;
  let eaten = s.eaten;
  if (head[0] === food[0] && head[1] === food[1]) {
    eaten++;
    do {
      food = [Math.floor(Math.random() * SNAKE_COLS), Math.floor(Math.random() * SNAKE_ROWS)];
    } while (body.some((b) => b[0] === food[0] && b[1] === food[1]));
  } else {
    body.pop();
  }
  return { body, dir: s.next, next: s.next, food, eaten, oops: false as const };
}

export const TICKER_FIRST = "EAT A PIXEL. EACH ONE IS A JUICY BIT. ARROW KEYS WORK TOO.";

export function tickerFor(eaten: number, kept: string[], oops: boolean): string {
  if (oops) return "";
  if (eaten > 0 && kept.length > 0) return `+ ${kept[(eaten - 1) % kept.length]}`;
  return TICKER_FIRST;
}

/** SHOW ME WHAT YOU KEPT appears only after extraction AND the typed headline. */
export function showMeReady(extractDone: boolean, headlineDone: boolean): boolean {
  return extractDone && headlineDone;
}
