// WP36 five quick ones: the drawn voice script as data, plus the pure rules
// the answers feed. Held in memory only; nothing is stored before LOOKS
// RIGHT on the compass check (WP39). Copy matches
// docs/handover/HOOLALA_V6.3/design/screens/Onboard.dc.html byte for byte
// (curly quotes and apostrophes written as escapes so they cannot drift).

export interface OnboardAnswers {
  q1: string | null;
  q1f: string | null;
  q2: string[];
  q2extra: string | null;
  q2f: string[];
  q2fextra: string | null;
  q3: string | null;
  q4: string | null;
  q5: string[];
}

export type StepType = "one" | "many" | "text";

export interface OnboardStep {
  id: "q1" | "q1f" | "q2" | "q2f" | "q3" | "q4" | "q5";
  /** The progress dot, 1 to 5; follow-ups keep their question's dot. */
  n: 1 | 2 | 3 | 4 | 5;
  follow?: boolean;
  q: string;
  type: StepType;
  chips?: string[];
  replies?: Record<string, string>;
  /** A chip that skips the next step (Q1 CAN'T REMEMBER skips the follow-up). */
  skipFollow?: string;
  /** The exclusive chip on a many step (NOBODY YET, NOBODY, NOTHING, I'M EASY). */
  none?: string;
  hint: string;
  placeholder: string;
}

const PEOPLE = ["BARISTA", "NEIGHBOUR", "COLLEAGUE", "DRIVER", "SHOP STAFF", "A REGULAR"];

export const STEPS: OnboardStep[] = [
  {
    id: "q1",
    n: 1,
    q: "When did you last lose track of time talking to someone?",
    type: "one",
    chips: ["THIS WEEK", "THIS MONTH", "AGES AGO", "CAN’T REMEMBER"],
    replies: { "CAN’T REMEMBER": "Fair. We’ll start gentle." },
    skipFollow: "CAN’T REMEMBER",
    hint: "TAP ONE, OR HOLD THE MIC",
    placeholder: "Type your answer",
  },
  {
    id: "q1f",
    n: 1,
    follow: true,
    q: "Nice. What was it about? Ramble if you like. I’ll keep the good bits.",
    type: "text",
    hint: "HOLD THE MIC AND RAMBLE, OR TYPE",
    placeholder: "Ramble away",
  },
  {
    id: "q2",
    n: 2,
    q: "Who did you say more than “hi” to this week?",
    type: "many",
    chips: [...PEOPLE, "NOBODY YET"],
    none: "NOBODY YET",
    hint: "TAP ANY, OR HOLD THE MIC",
    placeholder: "Someone else? Type it",
  },
  {
    id: "q2f",
    n: 2,
    follow: true,
    q: "And who did you only nod at?",
    type: "many",
    chips: [...PEOPLE, "NOBODY"],
    none: "NOBODY",
    hint: "TAP ANY, OR HOLD THE MIC",
    placeholder: "Someone else? Type it",
  },
  {
    id: "q3",
    n: 3,
    q: "Battery check. How’s yours today?",
    type: "one",
    chips: ["LOW", "OK", "GOOD", "FULL"],
    replies: {
      LOW: "Soft tries today. Noted.",
      OK: "Steady does it.",
      GOOD: "Good. Room for a brave one.",
      FULL: "Full battery. Bold it is.",
    },
    hint: "TAP ONE, OR HOLD THE MIC",
    placeholder: "Type your answer",
  },
  {
    id: "q4",
    n: 4,
    q: "What did you nearly say to someone lately, but didn’t?",
    type: "text",
    hint: "HOLD THE MIC AND RAMBLE, OR TYPE",
    placeholder: "Ramble away",
  },
  {
    id: "q5",
    n: 5,
    q: "Last one. Anything to keep off the table?",
    type: "many",
    chips: ["POLITICS", "WORK", "FAMILY", "HEALTH", "MONEY", "LOOKS", "NOTHING, I’M EASY"],
    none: "NOTHING, I’M EASY",
    hint: "TAP ANY, OR HOLD THE MIC",
    placeholder: "Someone else? Type it",
  },
];

export const INTRO = {
  head: "HELLO, HUMAN.",
  sub: "Five quick ones, then you’re out of here.",
  how: "Tap an answer, hold the mic and talk, or type.",
  privacy: "Heard, then forgotten. Your voice becomes words, and only the useful bits are kept, after you check them.",
} as const;

export const HEARD_NOTE = "Heard, then forgotten. Only the useful bits are kept, after you check them.";

export const CONFIRM_LINE = "I’ll keep the good bits at the end. Ramble away.";

export const CLOSING = "Got it. Give me a moment to keep the juicy bits.";

/** In-memory handoff to /juicy only. Never storage: nothing is stored before LOOKS RIGHT. */
let held: OnboardAnswers | null = null;

export function saveOnboardAnswers(a: OnboardAnswers): void {
  held = a;
}

export function takeOnboardAnswers(): OnboardAnswers | null {
  const a = held;
  held = null;
  return a;
}

/** Many-chip toggling with one exclusive chip, as drawn. */
export function toggleMany(sel: string[], chip: string, none: string): string[] {
  if (chip === none) return sel.includes(chip) ? [] : [chip];
  const rest = sel.filter((c) => c !== none);
  return rest.includes(chip) ? rest.filter((c) => c !== chip) : [...rest, chip];
}

const KEYWORDS: Record<string, string[]> = {
  "THIS WEEK": ["THIS WEEK", "WEEK"],
  "THIS MONTH": ["THIS MONTH", "MONTH"],
  "AGES AGO": ["AGES AGO", "AGES", "LONG TIME", "LONG AGO"],
  "CAN’T REMEMBER": ["CAN'T REMEMBER", "CANT REMEMBER", "DON'T REMEMBER", "DONT REMEMBER", "FORGOT", "NO IDEA", "CAN'T RECALL"],
  BARISTA: ["BARISTA", "COFFEE"],
  NEIGHBOUR: ["NEIGHBOUR", "NEIGHBOR"],
  COLLEAGUE: ["COLLEAGUE", "COWORKER", "CO WORKER", "TEAMMATE"],
  DRIVER: ["BUS DRIVER", "DRIVER", "TAXI", "UBER", "BUS"],
  "SHOP STAFF": ["SHOP STAFF", "SHOPKEEPER", "CASHIER", "COUNTER", "TILL", "SHOP"],
  "A REGULAR": ["REGULAR", "USUAL"],
  "NOBODY YET": ["NOBODY YET", "NOBODY", "NO ONE", "NOONE"],
  NOBODY: ["NOBODY", "NO ONE", "NOONE"],
  LOW: ["LOW", "EMPTY", "DRAINED", "FLAT", "TIRED"],
  OK: ["OK", "OKAY", "FINE", "ALRIGHT", "SO SO", "NOT BAD"],
  GOOD: ["GOOD", "DECENT", "PRETTY GOOD", "WELL"],
  FULL: ["FULL", "GREAT", "BRILLIANT", "CHARGED"],
  POLITICS: ["POLITICS", "POLITICAL"],
  WORK: ["WORK", "JOB", "BOSS", "OFFICE"],
  FAMILY: ["FAMILY", "MUM", "MOM", "DAD", "BROTHER", "SISTER", "PARENTS", "KIDS"],
  HEALTH: ["HEALTH", "ILLNESS", "DOCTOR"],
  MONEY: ["MONEY", "PAY", "FINANCES", "COST OF LIVING"],
  LOOKS: ["LOOKS", "APPEARANCE", "WEIGHT", "CLOTHES"],
  "NOTHING, I’M EASY": ["NOTHING", "EASY", "NOPE", "NONE"],
};

function normalise(s: string): string {
  return ` ${s
    .toUpperCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^A-Z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/** Matches dictation to chips by code (role and word match), in chip order. */
export function matchChips(transcript: string, chips: string[]): string[] {
  const t = normalise(transcript);
  return chips.filter((chip) => {
    const keys = KEYWORDS[chip] ?? [chip.toUpperCase().split(/[^A-Z]+/).filter((w) => w.length > 1)[0] ?? chip];
    return keys.some((k) => {
      const key = normalise(k).trim();
      return key.length > 0 && t.includes(` ${key} `);
    });
  });
}

export type StartLevel = "SOFT" | "BRAVE" | "BOLD";

/** START HERE from the battery, unless Q1 was CAN'T REMEMBER (always SOFT). */
export function startHere(q1: string | null, q3: string | null): StartLevel {
  if (q1 === "CAN’T REMEMBER") return "SOFT";
  if (q3 === "GOOD") return "BRAVE";
  if (q3 === "FULL") return "BOLD";
  return "SOFT";
}

const FAMILY_ROLES = [
  "MUM",
  "MOM",
  "MOTHER",
  "DAD",
  "FATHER",
  "BROTHER",
  "SISTER",
  "GRANDPARENT",
  "GRAN",
  "GRANDMA",
  "GRANDAD",
  "GRANDPA",
  "COUSIN",
  "AUNT",
  "UNCLE",
  "FAMILY",
];

/** Off-table answers filter roles: FAMILY removes family roles, WORK removes COLLEAGUE. */
export function applyOffTable(roles: string[], q5: string[]): string[] {
  let out = roles.slice();
  if (q5.includes("FAMILY")) out = out.filter((r) => !FAMILY_ROLES.includes(r));
  if (q5.includes("WORK")) out = out.filter((r) => r !== "COLLEAGUE");
  return out;
}

const PLACES: Record<string, string> = {
  BARISTA: "the café",
  NEIGHBOUR: "your building",
  COLLEAGUE: "work",
  DRIVER: "the bus stop",
  "SHOP STAFF": "the shop",
  "A REGULAR": "your usual spot",
};

/** The first said role's place fills {p}; default the café. */
export function placeFor(saidRoles: string[]): string {
  for (const r of saidRoles) {
    if (PLACES[r]) return PLACES[r];
  }
  return "the café";
}
