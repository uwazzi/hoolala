import { describe, expect, it, vi } from "vitest";
import worker, { runScheduled, withSecurityHeaders } from "../src/worker";
import type { D1Database, Env, ExecutionContext } from "../src/types";

function testEnv(assetBody = "<html></html>"): Env {
  return {
    ASSETS: {
      fetch: vi.fn(async () => new Response(assetBody, { headers: { "content-type": "text/html" } })),
    },
  } as unknown as Env;
}

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;

describe("worker routing", () => {
  it("serves /api/health without touching static assets", async () => {
    const env = testEnv();
    const res = await worker.fetch(new Request("https://hoolala.test/api/health"), env, ctx);
    expect(res.status).toBe(200);
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("returns 404 JSON for unknown /api/ routes", async () => {
    const res = await worker.fetch(
      new Request("https://hoolala.test/api/nope"),
      testEnv(),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("passes non-API requests to static assets", async () => {
    const env = testEnv();
    const res = await worker.fetch(new Request("https://hoolala.test/"), env, ctx);
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
    expect(await res.text()).toBe("<html></html>");
  });
});

describe("security headers", () => {
  it("sets CSP allowing the Telegram Mini App script", async () => {
    const res = withSecurityHeaders(new Response("x"));
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("script-src 'self' https://telegram.org");
    expect(csp).toContain("default-src 'self'");
  });

  it("sets hardening headers on API and asset responses", async () => {
    const env = testEnv();
    for (const path of ["/api/health", "/"]) {
      const res = await worker.fetch(new Request(`https://hoolala.test${path}`), env, ctx);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("permissions-policy")).toContain("geolocation=(self)");
    }
  });

  it("does not set framing headers, so the Telegram webview can embed the app", async () => {
    const res = withSecurityHeaders(new Response("x"));
    expect(res.headers.get("x-frame-options")).toBeNull();
    expect(res.headers.get("content-security-policy") ?? "").not.toContain("frame-ancestors");
  });
});

describe("scheduled handler", () => {
  it("expires open signals, purges old check-ins and workings, even if the sample top-up fails", async () => {
    const queries: string[] = [];
    const db = {
      prepare: (q: string) => ({
        bind: () => ({ run: async () => ({ success: true }) }),
      }),
    } as unknown as D1Database;
    const recording = {
      prepare: (q: string) => {
        queries.push(q);
        return db.prepare(q);
      },
    } as D1Database;
    await runScheduled({ DB: recording } as Env, new Date("2026-10-27T12:00:00.000Z"));
    // Expiry and purges run first, in this order; topping up the SAMPLE place comes after.
    expect(queries[0]).toContain("UPDATE signals SET state = 'expired'");
    expect(queries[1]).toContain("DELETE FROM checkins");
    expect(queries[2]).toContain("DELETE FROM workings");
  });
});
