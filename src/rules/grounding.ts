// Grounding rules for AI output. Pure. A claim about the world (an event for
// SUGGEST IT) must cite a page the model's own web search returned in that
// same call (or a link the person gave); otherwise it
// is dropped. Nothing the model claims reaches people without a source they
// can open.

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

/** A page the search returned (structural copy of SearchResult, kept pure here). */
export interface ReturnedPage {
  url: string;
  title: string;
  snippet: string;
}

const STOP = new Set(["about", "after", "their", "there", "these", "this", "that", "with", "from", "have", "your", "what", "when", "where", "which", "while", "will", "into", "they", "them", "were", "been", "also", "more", "most", "some", "here", "just", "like", "than", "then", "over", "very"]);

function words(text: string): Set<string> {
  return new Set(
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

function host(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The page a claim really comes from, or null. Exact match with a returned
 * page (or a link the person gave) first. Models often cite only the site
 * ("https://en.wikipedia.org"); then the returned page on that site whose
 * title and snippet share the most words with the claim is used, if any does.
 * A site the search never returned is never accepted.
 */
export function resolveCitation(
  rawCited: string | null,
  claim: string,
  pages: ReturnedPage[],
  given: string[] = [],
  opts: { sameSiteFallback?: boolean } = {},
): string | null {
  if (!rawCited) return null;
  // Models also cite a bare domain ("en.wikipedia.org"); read it as that site.
  const cited = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawCited.trim()) ? rawCited.trim() : `https://${rawCited.trim()}`;
  const c = canonicalUrl(cited);
  if (!c) return null;
  for (const u of [...pages.map((p) => p.url), ...given]) if (canonicalUrl(u) === c) return u;
  const h = host(cited);
  if (!h) return null;
  const claimWords = words(claim);
  let best: { url: string; score: number } | null = null;
  for (const p of pages) {
    if (host(p.url) !== h) continue;
    const pageWords = words(`${p.title} ${p.snippet}`);
    let score = 0;
    for (const w of claimWords) if (pageWords.has(w)) score++;
    if (score > 0 && (!best || score > best.score)) best = { url: p.url, score };
  }
  if (best) return best.url;
  const own = given.find((g) => host(g) === h);
  if (own) return own;
  // Person-confirmed findings only: the person confirmed each finding, so a
  // returned page on the cited site is an honest source even when the wording
  // differs.
  if (opts.sameSiteFallback) return pages.find((p) => host(p.url) === h)?.url ?? null;
  return null;
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
export function ground(raw: RawIdea[], pages: ReturnedPage[]): GroundingResult {
  const seen = new Set<string>();
  const ideas: Idea[] = [];
  let grounded = 0;
  for (const r of raw) {
    const topic = r.topic.trim().replace(/\s+/g, " ");
    const key = topic.toLowerCase();
    if (!topic || seen.has(key)) continue;
    const known = resolveCitation(r.citation_url, `${topic} ${r.why}`, pages);
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
