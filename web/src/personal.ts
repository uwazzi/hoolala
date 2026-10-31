// WP39 compass check from the kept bits: the pure view model behind the check
// stage. The kept topics, people, nearly-said line, battery and off-table
// list become the 2x2 grid (N MORE OF, E TALK ABOUT, S LESS OF, W HOW I GO),
// the MORE THAN HI / A NOD SO FAR people box, and the LOOKS RIGHT payload.
// No DOM here, so the tests run in node.
export interface KeptBits {
  topics: string[];
  said: string[];
  nod: string[];
  nearlySaid: { line: string; toRole: string | null } | null;
  battery: string | null;
  lastChat: string | null;
  offtable: string[];
  q5Answered: boolean;
  answered: number;
}

export interface CheckCell {
  pole: string;
  name: string;
  value: string | null;
  src: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A long line cut to 60 characters at a word boundary, so the save validates. */
function trimLine(words: string): string {
  const clean = words.trim().replace(/\s+/g, " ");
  if (clean.length <= 60) return clean;
  const cut = clean.slice(0, 60);
  const at = cut.lastIndexOf(" ");
  return (at > 20 ? cut.slice(0, at) : cut).trim();
}

function northLine(bits: KeptBits): string | null {
  if (!bits.nearlySaid) return null;
  const room = 60 - "Saying it: “”".length;
  const line = trimLine(bits.nearlySaid.line).slice(0, room);
  const cut = line.length >= room ? line.slice(0, Math.max(0, line.lastIndexOf(" ") > 20 ? line.lastIndexOf(" ") : room)).trim() : line;
  return `Saying it: “${cut}”`;
}

function eastLine(bits: KeptBits): string | null {
  return bits.topics.length > 0 ? trimLine(cap(bits.topics.join(" · "))) : null;
}

function southLine(bits: KeptBits): string | null {
  if (bits.offtable.length > 0) return trimLine(cap(bits.offtable.join(" · ").toLowerCase()));
  return bits.q5Answered ? "Nothing. You’re easy." : null;
}

function westLine(bits: KeptBits): string | null {
  if (!bits.battery) return null;
  const last = bits.lastChat ? ` · last long chat: ${bits.lastChat.toLowerCase()}` : "";
  return trimLine(`Battery ${bits.battery.toLowerCase()} today${last}`);
}

export function checkCells(bits: KeptBits): CheckCell[] {
  const values: [string, string, string | null, string][] = [
    ["N", "MORE OF", northLine(bits), "FROM: WHAT YOU NEARLY SAID"],
    ["E", "TALK ABOUT", eastLine(bits), "FROM: YOUR STORY"],
    ["S", "LESS OF", southLine(bits), "FROM: KEEP OFF THE TABLE"],
    ["W", "HOW I GO", westLine(bits), "FROM: BATTERY CHECK"],
  ];
  return values.map(([pole, name, value, src]) => ({ pole, name, value, src }));
}

export function checkPeopleSaid(bits: KeptBits): string {
  return bits.said.length > 0 ? `MORE THAN HI: ${bits.said.map((r) => r.toUpperCase()).join(" · ")}` : "MORE THAN HI: nobody yet";
}

export function checkPeopleNod(bits: KeptBits): string {
  return bits.nod.length > 0 ? `A NOD SO FAR: ${bits.nod.map((r) => r.toUpperCase()).join(" · ")}` : "A NOD SO FAR: nobody yet";
}

export function checkPeopleSrc(bits: KeptBits): string {
  return bits.said.length + bits.nod.length > 0 ? "FROM: YOUR ANSWERS · ROLES ONLY, NEVER NAMES" : "EMPTY FOR NOW. TRIES WILL SAY SOMEONE.";
}

export function checkHeadline(answered: number): string {
  return `THAT'S YOU, IN ${answered} ANSWERS.`;
}

export interface SavePayload {
  lines: { part: string; words: string }[];
  people: { role: string }[];
  battery: string | null;
  offtable: string[];
  nearlySaid: { line: string; toRole: string | null } | null;
}

/** LOOKS RIGHT: the checked lines plus the bits the game reads. */
export function savePayload(bits: KeptBits): SavePayload {
  const parts = ["intention", "interest", "filter", "delivery"];
  const lines = checkCells(bits)
    .map((cell, i) => ({ part: parts[i], words: cell.value }))
    .filter((l): l is { part: string; words: string } => l.words !== null);
  const seen: string[] = [];
  for (const role of [...bits.said, ...bits.nod]) {
    if (seen.indexOf(role) < 0) seen.push(role);
  }
  return { lines, people: seen.map((role) => ({ role })), battery: bits.battery, offtable: bits.offtable, nearlySaid: bits.nearlySaid };
}
