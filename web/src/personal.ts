// WP36 compass check: the pure view model behind the check screen. The kept
// drafts become the 2x2 grid (N MORE OF, E TALK ABOUT, S LESS OF, W HOW I GO,
// matching the compass needle), the people box (roles only, minus removals),
// and the LOOKS RIGHT payload. No DOM here, so the tests run in node.
export interface KeptDraft {
  part: string;
  line: string;
  people: string[];
  viaTyped: boolean;
}

export interface CheckCell {
  pole: string;
  part: string;
  line: string | null;
  viaTyped: boolean;
}

export const CHECK_DIRS = [
  { pole: "N", part: "intention" },
  { pole: "E", part: "interest" },
  { pole: "S", part: "filter" },
  { pole: "W", part: "delivery" },
];

export function checkCells(drafts: KeptDraft[]): CheckCell[] {
  return CHECK_DIRS.map((dir) => {
    const line = drafts.find((d) => d.part === dir.part);
    return { pole: dir.pole, part: dir.part, line: line ? line.line : null, viaTyped: line ? line.viaTyped : false };
  });
}

export function checkPeople(drafts: KeptDraft[], dropped: string[]): string[] {
  return [...new Set(drafts.flatMap((d) => d.people))].filter((r) => !dropped.includes(r));
}

export function checkHeadline(kept: number): string {
  return kept > 0 ? `A FIRST SKETCH OF YOU, IN ${kept} ${kept === 1 ? "LINE" : "LINES"}.` : "NOTHING KEPT THIS TIME.";
}

export function savePayload(drafts: KeptDraft[], dropped: string[]): { lines: { part: string; words: string }[]; people: { role: string }[] } {
  return {
    lines: drafts.map((d) => ({ part: d.part, words: d.line })),
    people: checkPeople(drafts, dropped).map((role) => ({ role })),
  };
}
