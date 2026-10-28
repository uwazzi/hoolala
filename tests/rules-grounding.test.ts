import { describe, expect, it } from "vitest";
import { canonicalUrl, ground, resolveCitation, sourceDomain, starterIdeas } from "../src/rules/grounding";

const page = (url: string, title = "", snippet = "") => ({ url, title, snippet });
const returned = [page("https://www.lausanne-tourisme.ch/fr/agenda/jazz-onze-plus/?utm_source=x", "Jazz Onze+ festival", "Jazz in Lausanne"), page("https://example.org/talk")];

describe("ground", () => {
  it("keeps an event only with a citation the search returned", () => {
    const res = ground(
      [
        { topic: "Jazz Onze+ tonight. Anyone going?", why: "Festival on today.", kind: "event", citation_url: "https://www.lausanne-tourisme.ch/fr/agenda/jazz-onze-plus" },
        { topic: "Big concert at the Beaulieu tonight?", why: "Invented.", kind: "event", citation_url: "https://made-up.example/concert" },
        { topic: "Marathon today, who's running?", why: "No source.", kind: "event", citation_url: null },
        { topic: "Coffee break now. Small talk welcome.", why: "Fits the hour.", kind: "general", citation_url: null },
      ],
      returned,
    );
    expect(res.ideas.map((i) => i.topic)).toEqual(["Jazz Onze+ tonight. Anyone going?", "Coffee break now. Small talk welcome."]);
    expect(res.ideas[0].citationUrl).toBe(returned[0].url);
    expect(res.grounded).toBe(1);
    expect(res.total).toBe(4);
  });

  it("strips a citation the search didn't return from a general idea", () => {
    const res = ground([{ topic: "Board games?", why: "Rainy day.", kind: "general", citation_url: "https://not-returned.example" }], returned);
    expect(res.ideas).toEqual([{ topic: "Board games?", why: "Rainy day.", citationUrl: null }]);
  });

  it("keeps three at most and drops repeats", () => {
    const raw = ["A", "a", "B", "C", "D"].map((t) => ({ topic: t, why: "", kind: "general" as const, citation_url: null }));
    expect(ground(raw, []).ideas.map((i) => i.topic)).toEqual(["A", "B", "C"]);
  });
});

describe("helpers", () => {
  it("treats the same page as the same, whatever tracking or trailing slash", () => {
    expect(canonicalUrl("https://WWW.Example.org/a/?utm_source=x#top")).toBe(canonicalUrl("https://www.example.org/a"));
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("not a url")).toBeNull();
  });

  it("shows a short source domain", () => {
    expect(sourceDomain("https://www.lausanne-tourisme.ch/fr/agenda")).toBe("lausanne-tourisme.ch");
  });

  it("has fixed starter ideas for each time of day, all within 60 characters", () => {
    for (const hour of [8, 12, 15, 20]) {
      const ideas = starterIdeas(hour);
      expect(ideas).toHaveLength(3);
      for (const i of ideas) expect(i.topic.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("resolveCitation", () => {
  // Shaped like the real FIND ME call on 28 Oct: the model cited only the site.
  const pages = [
    page("https://en.wikipedia.org/wiki/Linus_Torvalds", "Linus Torvalds - Wikipedia", "Finnish software engineer, creator of the Linux kernel; lives in Portland, Oregon"),
    page("https://en.wikipedia.org/wiki/Git", "Git - Wikipedia", "Git is a distributed version control system created by Linus Torvalds in 2005"),
    page("https://www.linuxfoundation.org/about/leadership", "Leadership", "Linux Foundation Fellow"),
  ];

  it("keeps an exact match", () => {
    expect(resolveCitation("https://en.wikipedia.org/wiki/Git/", "Git", pages)).toBe("https://en.wikipedia.org/wiki/Git");
  });

  it("repairs a site-only citation to the returned page that matches the claim", () => {
    expect(resolveCitation("https://en.wikipedia.org", "Created the distributed version control system Git", pages)).toBe("https://en.wikipedia.org/wiki/Git");
    expect(resolveCitation("https://en.wikipedia.org", "Moved to Portland, Oregon", pages)).toBe("https://en.wikipedia.org/wiki/Linus_Torvalds");
    expect(resolveCitation("https://linuxfoundation.org", "Linux Foundation Fellow", pages)).toBe("https://www.linuxfoundation.org/about/leadership");
  });

  it("never accepts a site the search didn't return, or a page that shares nothing with the claim", () => {
    expect(resolveCitation("https://bbntimes.com", "Created Git", pages)).toBeNull();
    expect(resolveCitation("https://en.wikipedia.org", "Plays the cello", pages)).toBeNull();
    expect(resolveCitation(null, "anything", pages)).toBeNull();
  });

  it("accepts the person's own links", () => {
    expect(resolveCitation("https://ana.example/blog/", "Writes about chess", [], ["https://ana.example/blog"])).toBe("https://ana.example/blog");
    expect(resolveCitation("https://ana.example", "Writes about chess", [], ["https://ana.example/blog"])).toBe("https://ana.example/blog");
  });
});
