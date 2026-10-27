import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readdirSync("src/db/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(`src/db/migrations/${f}`, "utf8"))
  .join("\n");

const TABLES = [
  "users",
  "sessions",
  "login_tokens",
  "compass_items",
  "compass_changes",
  "places",
  "place_facts",
  "place_contributions",
  "checkins",
  "checkin_attempts",
  "signals",
  "signal_responses",
  "quick_replies",
  "meeting_points",
  "blocks",
  "reports",
  "meet_exchanges",
  "interactions",
  "stay_in_touch",
  "friendships",
  "moments",
  "workings",
  "llm_calls",
  "metrics_daily",
];

describe("D1 schema", () => {
  it("creates every table from the build plan", () => {
    for (const table of TABLES) {
      expect(schema).toContain(`CREATE TABLE ${table} (`);
    }
  });

  it("keeps user ids and coordinates out of checkin_attempts", () => {
    const block = schema.slice(
      schema.indexOf("CREATE TABLE checkin_attempts ("),
      schema.indexOf("CREATE TABLE signals ("),
    );
    expect(block).not.toMatch(/user_id|lat|lng|coordinate/i);
  });

  it("keeps coordinates out of checkins", () => {
    const block = schema.slice(
      schema.indexOf("CREATE TABLE checkins ("),
      schema.indexOf("CREATE TABLE checkin_attempts ("),
    );
    expect(block).not.toMatch(/lat|lng|coordinate/i);
  });

  it("counts each pair once a day on the Live page", () => {
    expect(schema).toContain("UNIQUE (kind, user_a, user_b, day)");
  });

  it("limits confirms to one per fact per person per month", () => {
    expect(schema).toContain("UNIQUE (user_id, fact_id, action, month)");
  });

  it("tracks per-call tokens on llm_calls", () => {
    expect(schema).toContain("ADD COLUMN prompt_tokens INTEGER");
    expect(schema).toContain("ADD COLUMN completion_tokens INTEGER");
  });
});
