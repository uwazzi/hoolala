// WP5 MEET rules. Pure: no I/O, no clock, no randomness.
// Two people who accepted each other on a signal confirm they met: one shows
// a QR (or a short code), the other opens it, both agree. Only then does the
// Live number move. No model involved, on purpose.

export const MEET_MINUTES = 10;
/** No 0/O or 1/I/L, so a code read aloud or typed is hard to get wrong. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function meetExpiry(now: Date): string {
  return new Date(now.getTime() + MEET_MINUTES * 60 * 1000).toISOString();
}

/** Turns random bytes into a code. The randomness comes from the caller. */
export function codeFromBytes(bytes: Uint8Array): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export function normalizeMeetCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  for (const c of code) if (!CODE_ALPHABET.includes(c)) return null;
  return code;
}

/** The people who may meet over a signal: its owner and everyone accepted on it. */
export function signalParty(ownerId: string, acceptedIds: string[]): Set<string> {
  return new Set([ownerId, ...acceptedIds]);
}

export type JoinProblem = "expired" | "taken" | "self" | "blocked" | "not_party";

/** Whether this person may open this exchange. Same answer shape for every refusal. */
export function joinProblem(
  ex: { initiator_id: string; joiner_id: string | null; expires_at: string },
  joinerId: string,
  party: Set<string>,
  ownerId: string,
  blocked: boolean,
  now: Date,
): JoinProblem | null {
  // Who's asking comes first, so an outsider learns nothing about the code.
  if (!party.has(joinerId) || !party.has(ex.initiator_id)) return "not_party";
  // Only owner and responder saw each other's names; two responders never did.
  if (ex.initiator_id !== joinerId && ex.initiator_id !== ownerId && joinerId !== ownerId) return "not_party";
  if (blocked) return "blocked";
  if (Date.parse(ex.expires_at) <= now.getTime()) return "expired";
  if (ex.initiator_id === joinerId) return "self";
  if (ex.joiner_id && ex.joiner_id !== joinerId) return "taken";
  return null;
}

/** Interactions are stored once per pair per day, in a fixed order. */
export function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function dayOf(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export const MOMENT_LABEL = "You met an actual human.";

/** Collective numbers for the Live page. Never per person. */
export function connectionRate(acceptedSignals: number, metSignals: number): { met: number; of: number; percent: number | null } {
  const met = Math.min(metSignals, acceptedSignals);
  return { met, of: acceptedSignals, percent: acceptedSignals ? Math.round((met / acceptedSignals) * 100) : null };
}
