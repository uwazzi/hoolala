import { describe, expect, it } from "vitest";
import { handleHealth } from "../src/api/health";
import type { Env } from "../src/types";

const env = {} as Env;

describe("GET /api/health", () => {
  it("returns ok with a timestamp", async () => {
    const res = await handleHealth(new Request("https://hoolala.test/api/health"), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { ok: boolean; time: string };
    expect(body.ok).toBe(true);
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });
});
