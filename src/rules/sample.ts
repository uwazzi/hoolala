// WP9 SAMPLE place: a clearly labelled demo café where Sample Sophie always
// has a signal open and says yes, so a judge alone can do the whole loop.
// Pure: no I/O, no clock. Nothing here is ever counted on the Live page.

export const SAMPLE_PLACE = {
  id: "sample-place",
  slug: "sample-cafe",
  name: "SAMPLE: The Demo Café",
  kind: "cafe" as const,
  city: "Sample",
  code: "DEMO",
};

export const SAMPLE_PERSON = { id: "sample-sophie", firstName: "Sample Sophie" };

export const SAMPLE_TOPICS = [
  "First time here? Ask me what's good on the menu.",
  "Their flat white is apparently famous. Verdict?",
  "Coffee break now. Small talk welcome.",
];

/** Keep Sophie checked in with at least an hour to go. */
export function sampleNeedsCheckin(endsAt: string | null, now: Date): boolean {
  return !endsAt || Date.parse(endsAt) - now.getTime() < 60 * 60 * 1000;
}

/** Keep one open signal of hers with at least 15 minutes to go. */
export function sampleNeedsSignal(expiresAt: string | null, now: Date): boolean {
  return !expiresAt || Date.parse(expiresAt) - now.getTime() < 15 * 60 * 1000;
}

/** A different topic every half hour, so the demo doesn't look frozen. */
export function sampleTopic(now: Date): string {
  return SAMPLE_TOPICS[Math.floor(now.getTime() / (30 * 60 * 1000)) % SAMPLE_TOPICS.length];
}
