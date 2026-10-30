// Owner dashboard rules. Pure: no I/O, no clock, no randomness.

/** Constant-time compare for the owner token, so misses reveal nothing about the mark. */
export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
