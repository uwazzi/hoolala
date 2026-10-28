// WP23 PLAN IT rules. Pure. The agent only drafts a meeting point; these
// rules decide whether a draft is allowed at all (a real spot, a time between
// now and the signal's end), and what to propose without a model.

export const PLAN_TOKEN_TTL_S = 10 * 60;
const STEP_MS = 5 * 60 * 1000;

/** Times are proposed on 5-minute steps: "15:10", never "15:07". */
export function roundUp(date: Date): Date {
  return new Date(Math.ceil(date.getTime() / STEP_MS) * STEP_MS);
}

export interface DraftContext {
  spots: string[];
  now: Date;
  /** The signal's end: a meeting point after it makes no sense. */
  expiresAt: string;
}

/**
 * A draft the person may confirm: one of the place's real spots and a time
 * from now to the signal's end, rounded to 5 minutes. Null for anything else.
 */
export function checkDraft(spot: unknown, time: unknown, ctx: DraftContext): { spot: string; time: string } | null {
  if (typeof spot !== "string" || !ctx.spots.includes(spot)) return null;
  if (typeof time !== "string") return null;
  const t = Date.parse(time);
  if (Number.isNaN(t)) return null;
  const rounded = roundUp(new Date(t));
  const earliest = ctx.now.getTime() - 60 * 1000;
  if (rounded.getTime() < earliest || rounded.getTime() > Date.parse(ctx.expiresAt)) return null;
  return { spot, time: rounded.toISOString() };
}

/** Without a model: the poster's own spot, at their time or in 10 minutes. */
export function fallbackDraft(
  signal: { spot: string | null; when_at: string | null; expires_at: string },
  ctx: DraftContext,
): { spot: string; time: string } | null {
  const spot = signal.spot && ctx.spots.includes(signal.spot) ? signal.spot : ctx.spots[0];
  const when = signal.when_at && Date.parse(signal.when_at) > ctx.now.getTime() ? new Date(signal.when_at) : new Date(ctx.now.getTime() + 10 * 60 * 1000);
  return checkDraft(spot, when.toISOString(), ctx) ?? checkDraft(spot, ctx.now.toISOString(), ctx);
}

/** Words the agent's draft text must never use: it doesn't send or confirm. */
export function claimsAction(text: string): boolean {
  return /\b(sent|confirmed|booked|reserved|notified|told them|messaged)\b/i.test(text);
}
