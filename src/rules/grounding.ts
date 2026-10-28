// Grounding rules for AI ideas. Pure. An idea that names an event must cite a
// URL the model's own web search returned in that same call; otherwise it is
// dropped. Citations not in that set are removed. Nothing the model claims
// about the world reaches people without a source they can open.

export const MAX_IDEAS = 3;

export interface RawIdea {
  topic: string;
  why: string;
  kind: "event" | "general";
  citation_url: string | null;
}

export interface Idea {
  topic: string;
  why: string;
  citationUrl: string | null;
}

/** Same page, whatever the trailing slash, fragment or tracking parameters. */
export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/i.test(key)) u.searchParams.delete(key);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return null;
  }
}

export interface GroundingResult {
  ideas: Idea[];
  grounded: number;
  total: number;
}

/**
 * Keeps at most three ideas: events only with a citation the search returned,
 * general ideas without any citation the search didn't return. Drops repeats.
 */
export function ground(raw: RawIdea[], returnedUrls: string[]): GroundingResult {
  const returned = new Map(returnedUrls.map((u) => [canonicalUrl(u), u]).filter((e): e is [string, string] => e[0] !== null));
  const seen = new Set<string>();
  const ideas: Idea[] = [];
  let grounded = 0;
  for (const r of raw) {
    const topic = r.topic.trim().replace(/\s+/g, " ");
    const key = topic.toLowerCase();
    if (!topic || seen.has(key)) continue;
    const cited = r.citation_url ? canonicalUrl(r.citation_url) : null;
    const known = cited ? returned.get(cited) ?? null : null;
    if (r.kind === "event" && !known) continue;
    if (known) grounded++;
    seen.add(key);
    ideas.push({ topic, why: r.why.trim().replace(/\s+/g, " ").slice(0, 120), citationUrl: known });
    if (ideas.length === MAX_IDEAS) break;
  }
  return { ideas, grounded, total: raw.length };
}

/** The domain to show under a cited idea, e.g. "lausanne-tourisme.ch". */
export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Fixed ideas when the model is off or fails. Labelled IDEA, not AI. */
export function starterIdeas(hour: number): Idea[] {
  const slot = hour < 11 ? "morning" : hour < 14 ? "lunch" : hour < 18 ? "afternoon" : "evening";
  const first: Record<string, string> = {
    morning: "Morning coffee at the big table. Small talk welcome.",
    lunch: "Lunch break soon. Anyone want company?",
    afternoon: "Afternoon slump. Coffee and a chat in 10 minutes?",
    evening: "Wrapping up the day. One drink and a chat?",
  };
  return [
    { topic: first[slot], why: "A time that fits right now.", citationUrl: null },
    { topic: "First time here? Ask me what's good.", why: "Easy to answer for anyone.", citationUrl: null },
    { topic: "Working on something fun? Show and tell.", why: "People here often are.", citationUrl: null },
  ];
}
