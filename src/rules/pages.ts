// Reading pages people point us at: their own links (FIND ME) and a place's
// own page (READ IT). Pure. Only public https pages; anything behind a login
// (LinkedIn, Instagram...) is left to the web search.

export const MAX_PAGE_TEXT = 5000;

const LOGIN_WALLED = ["linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "threads.net"];

export function isLoginWalled(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return LOGIN_WALLED.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** A public https page on a real host name: never an IP address, localhost or an internal name. */
export function isReadableLink(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":")) return false;
  if (/\.(local|internal|lan|home)$/.test(host)) return false;
  return !isLoginWalled(url);
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", hellip: "…",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", icirc: "î", ugrave: "ù",
  auml: "ä", ouml: "ö", uuml: "ü", Eacute: "É",
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? ENTITIES[n.toLowerCase()] ?? m);
}

/** Title, description and visible text of a page, as one short plain text. */
export function pageText(html: string, max = MAX_PAGE_TEXT): string {
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
  const description = decode(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ??
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ??
      "",
  ).trim();
  const body = decode(
    html
      .replace(/<head[\s\S]*?<\/head>/i, " ")
      .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(nav|footer)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  return [title, description, body].filter(Boolean).join("\n").slice(0, max);
}
