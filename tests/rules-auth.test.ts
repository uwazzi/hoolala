import { describe, expect, it } from "vitest";
import {
  clearSessionCookie,
  isOverLimit,
  loginTokenExpiry,
  loginTokenState,
  normalizeEmail,
  normalizeFirstName,
  readCookie,
  sessionCookie,
} from "../src/rules/auth";

const now = new Date("2026-10-27T12:00:00.000Z");

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Hugo@Example.COM ")).toBe("hugo@example.com");
  });

  it("refuses things that aren't emails", () => {
    for (const bad of ["", "hugo", "hugo@", "@example.com", "a b@example.com", 42, null]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
    expect(normalizeEmail(`${"a".repeat(250)}@x.io`)).toBeNull();
  });
});

describe("loginTokenState", () => {
  const row = { token_hash: "h", email: "a@b.co", expires_at: loginTokenExpiry(now), used_at: null };

  it("accepts a fresh, unused token", () => {
    expect(loginTokenState(row, now)).toBe("ok");
  });

  it("refuses a missing token", () => {
    expect(loginTokenState(null, now)).toBe("missing");
  });

  it("refuses a used token", () => {
    expect(loginTokenState({ ...row, used_at: now.toISOString() }, now)).toBe("used");
  });

  it("refuses a token after 15 minutes", () => {
    const later = new Date(now.getTime() + 15 * 60 * 1000);
    expect(loginTokenState(row, later)).toBe("expired");
    expect(loginTokenState(row, new Date(later.getTime() - 1))).toBe("ok");
  });
});

describe("isOverLimit", () => {
  it("blocks at the limit", () => {
    expect(isOverLimit(2, 3)).toBe(false);
    expect(isOverLimit(3, 3)).toBe(true);
  });
});

describe("normalizeFirstName", () => {
  it("keeps real first names", () => {
    expect(normalizeFirstName("  Hugo ")).toBe("Hugo");
    expect(normalizeFirstName("Anne-Sophie")).toBe("Anne-Sophie");
    expect(normalizeFirstName("Zoë")).toBe("Zoë");
    expect(normalizeFirstName("D'Arcy")).toBe("D'Arcy");
  });

  it("refuses empty, long, digits, links and handles", () => {
    for (const bad of ["", "   ", "a".repeat(31), "Hugo2", "@hugo", "hugo.io/x", "<b>", 7]) {
      expect(normalizeFirstName(bad)).toBeNull();
    }
  });
});

describe("cookies", () => {
  it("sets HttpOnly, Secure, SameSite=Lax on the web", () => {
    const c = sessionCookie("tok");
    expect(c).toContain("hoolala_session=tok");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
  });

  it("uses SameSite=None inside Telegram", () => {
    expect(sessionCookie("tok", { telegram: true })).toContain("SameSite=None");
  });

  it("clears with Max-Age=0", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });

  it("reads one cookie from a header", () => {
    expect(readCookie("a=1; hoolala_session=xyz; b=2", "hoolala_session")).toBe("xyz");
    expect(readCookie("a=1", "hoolala_session")).toBeNull();
    expect(readCookie(null, "hoolala_session")).toBeNull();
  });
});
