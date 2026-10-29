import { describe, expect, it } from "vitest";
import { displayLink, isLoginWalled, isReadableLink, pageText } from "../src/rules/pages";

describe("which links FIND ME may read", () => {
  it("reads people's own public pages", () => {
    for (const u of ["https://ana-lopes.example/blog", "https://github.com/analopes", "https://analopes.substack.com"]) expect(isReadableLink(u)).toBe(true);
  });

  it("never logs in: profiles behind a login are left to the search", () => {
    for (const u of ["https://www.linkedin.com/in/ana", "https://instagram.com/ana", "https://x.com/ana", "https://m.facebook.com/ana"]) {
      expect(isLoginWalled(u)).toBe(true);
      expect(isReadableLink(u)).toBe(false);
    }
  });

  it("refuses anything that isn't a public https page", () => {
    for (const u of ["http://ana.example", "https://localhost/x", "https://127.0.0.1/", "https://10.0.0.1/", "https://intranet/x", "https://printer.local/", "https://user:pw@ana.example", "not a url"]) {
      expect(isReadableLink(u)).toBe(false);
    }
  });
});

describe("listing links on the card", () => {
  it("shows http and https pages under their domain", () => {
    expect(displayLink("https://real.example/menu")).toEqual({ href: "https://real.example/menu", label: "real.example" });
    expect(displayLink("http://www.cafe.example/"))?.toMatchObject({ label: "cafe.example" });
  });

  it("shows nothing for javascript, bare hosts and garbage", () => {
    for (const u of ["javascript:alert(1)", "www.cafe.example", "not a url", "", null, undefined]) {
      expect(displayLink(u)).toBeNull();
    }
  });
});

describe("pageText", () => {
  it("keeps the title, description and visible text, not scripts or menus", () => {
    const html = `<html><head><title>Ana Lopes &amp; friends</title><meta name="description" content="Food writer in Lausanne"><style>p{}</style></head>
      <body><nav>Home About</nav><h1>Hi, I'm Ana</h1><p>I write about caf&eacute;s and play chess.</p><script>track()</script><footer>© 2026</footer></body></html>`;
    expect(pageText(html)).toBe("Ana Lopes & friends\nFood writer in Lausanne\nHi, I'm Ana I write about cafés and play chess.");
  });

  it("is capped", () => {
    expect(pageText(`<p>${"word ".repeat(5000)}</p>`, 100)).toHaveLength(100);
  });
});
