// Table rebuilds must survive real data: parents with check-ins and signals
// referencing them. Regression test for the staging freeze of 29 Oct 2026,
// when rebuilding places failed on its foreign keys and stopped the release.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

const files = readdirSync("src/db/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

describe("migrations with data", () => {
  it("rebuilds keep every row and its references", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    const split = files.findIndex((f) => f >= "0011_place_kinds.sql");
    for (const f of files.slice(0, split)) db.exec(readFileSync(`src/db/migrations/${f}`, "utf8"));
    db.exec("INSERT INTO users (id, first_name, is_adult, created_at) VALUES ('u1', 'Ana', 1, 't')");
    db.exec("INSERT INTO places (id, slug, name, kind, status, created_at) VALUES ('p1', 's1', 'Café', 'cafe', 'active', 't')");
    db.exec("INSERT INTO checkins (id, user_id, place_id, method, started_at, ends_at) VALUES ('c1', 'u1', 'p1', 'location', 't', 't2')");
    db.exec("INSERT INTO signals (id, owner_id, audience, place_id, topic, created_at, expires_at) VALUES ('s1', 'u1', 'place', 'p1', 'Hi', 't', 't2')");
    for (const f of files.slice(split)) db.exec(readFileSync(`src/db/migrations/${f}`, "utf8"));
    expect((db.prepare("SELECT COUNT(*) AS n FROM places").get() as { n: number }).n).toBe(1);
    expect((db.prepare("SELECT COUNT(*) AS n FROM checkins").get() as { n: number }).n).toBe(1);
    expect((db.prepare("SELECT COUNT(*) AS n FROM signals").get() as { n: number }).n).toBe(1);
    expect((db.prepare("PRAGMA foreign_key_check").all() as unknown[]).length).toBe(0);
    db.prepare("INSERT INTO places (id, slug, name, kind, created_at) VALUES ('p2', 's2', 'Cinema', 'culture', 't')").run();
  });
});
