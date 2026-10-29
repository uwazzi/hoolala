// WP34 Surprise Me: drafting one compass line from an answer, through the
// server's dry-run proposal. Pure: the page runs these attempts in order
// and shows the first one the server accepts.

/** Mirrors MAX_LINE in src/rules/compass.ts: a compass line is 60 characters. */
export const MAX_LINE = 60;

export interface ProposeAttempt {
  words: string;
  part?: string;
}

/** A long answer, cut to a compass line at a word boundary. */
export function trimLine(words: string): string {
  const clean = words.trim().replace(/\s+/g, " ");
  if (clean.length <= MAX_LINE) return clean;
  const cut = clean.slice(0, MAX_LINE);
  const at = cut.lastIndexOf(" ");
  return (at > 20 ? cut.slice(0, at) : cut).trim();
}

/**
 * The attempts for one answer, in order: as said, in the question's
 * direction; trimmed when too long; the code's own guess when the
 * direction doesn't fit. The open fifth question has no direction.
 */
export function proposePlan(words: string, part: string | null): ProposeAttempt[] {
  const clean = words.trim().replace(/\s+/g, " ");
  if (!part) return [{ words: clean }];
  const plan: ProposeAttempt[] = [{ words: clean, part }];
  const trimmed = trimLine(clean);
  if (trimmed !== clean) plan.push({ words: trimmed, part });
  plan.push({ words: plan[plan.length - 1].words });
  return plan;
}
