// Table rebuilds must survive real data: parents with rows referencing them
// at every level. Regression test for the staging freeze of 29 Oct 2026,
// when rebuilding places failed on its foreign keys and stopped the release.
// Every table in the closure holds a row before the rebuilds run.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

const files = readdirSync("src/db/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

const CLOSURE = [
  "places",
  "place_facts",
  "place_contributions",
  "checkins",
  "checkin_attempts",
  "signals",
  "signal_responses",
  "quick_replies",
  "meeting_points",
  "reports",
  "meet_exchanges",
  "interactions",
  "stay_in_touch",
  "moments",
  "metrics_daily",
  "place_ratings",
];

describe("migrations with data", () => {
  it("rebuilds keep every row and its references", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    const split = files.findIndex((f) => f >= "0011_place_kinds.sql");
    for (const f of files.slice(0, split)) db.exec(readFileSync(`src/db/migrations/${f}`, "utf8"));
    db.exec("INSERT INTO users (id, first_name, is_adult, created_at) VALUES ('u1', 'Ana', 1, 't'), ('u2', 'Tom', 1, 't')");
    db.exec("INSERT INTO places (id, slug, name, kind, status, created_at) VALUES ('p1', 's1', 'Café', 'cafe', 'active', 't')");
    db.exec("INSERT INTO place_facts (id, place_id, field, value, source, state, updated_at) VALUES ('f1', 'p1', 'hours', 'Open late', 'people', 'confirmed', 't')");
    db.exec("INSERT INTO place_contributions (id, user_id, place_id, fact_id, action, month, created_at) VALUES ('c1', 'u1', 'p1', 'f1', 'confirm_fact', '2026-10', 't')");
    db.exec("INSERT INTO checkins (id, user_id, place_id, method, started_at, ends_at) VALUES ('c2', 'u1', 'p1', 'location', 't', 't2')");
    db.exec("INSERT INTO checkin_attempts (id, place_id, method, ok, created_at) VALUES ('a1', 'p1', 'location', 1, 't')");
    db.exec("INSERT INTO signals (id, owner_id, audience, place_id, topic, created_at, expires_at) VALUES ('s1', 'u1', 'place', 'p1', 'Hi', 't', 't2')");
    db.exec("INSERT INTO signal_responses (id, signal_id, responder_id, created_at) VALUES ('r1', 's1', 'u2', 't')");
    db.exec("INSERT INTO quick_replies (id, signal_id, user_id, kind, created_at) VALUES ('q1', 's1', 'u1', 'on_my_way', 't')");
    db.exec("INSERT INTO meeting_points (signal_id, proposed_by) VALUES ('s1', 'person')");
    db.exec("INSERT INTO reports (id, reporter_id, signal_id, reason, created_at) VALUES ('rep1', 'u1', 's1', 'spam', 't')");
    db.exec("INSERT INTO meet_exchanges (id, initiator_id, token_hash, expires_at, signal_id) VALUES ('e1', 'u1', 'h', 't2', 's1')");
    db.exec("INSERT INTO interactions (id, kind, user_a, user_b, place_id, signal_id, day, confirmed_at) VALUES ('i1', 'here', 'u1', 'u2', 'p1', 's1', '2026-10-29', 't')");
    db.exec("INSERT INTO stay_in_touch (user_id, other_id, signal_id, chosen_at) VALUES ('u1', 'u2', 's1', 't')");
    db.exec("INSERT INTO moments (id, user_id, interaction_id, label) VALUES ('m1', 'u1', 'i1', 'First hello')");
    db.exec("INSERT INTO metrics_daily (place_id, day) VALUES ('p1', '2026-10-29')");
    db.exec("INSERT INTO place_ratings (place_id, user_id, value, visit_date, week, created_at) VALUES ('p1', 'u1', 3, '2026-10-29', '2026-W44', 't')");
    db.exec("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES ('l1', 'u1', 'talk_about', 'Chess', 'find_me', 1, 't'), ('l2', 'u1', 'more_of', 'Slow mornings', 'questions', 1, 't')");
    db.exec("INSERT INTO compass_changes (id, user_id, before, after, words, confirmed_at) VALUES ('ch1', 'u1', 'Busy evenings', 'Slow mornings', 'slow mornings', 't')");
    for (const f of files.slice(split)) db.exec(readFileSync(`src/db/migrations/${f}`, "utf8"));
    for (const table of CLOSURE) {
      expect((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n, table).toBe(1);
    }
    // WP33: old parts land on the v6.1 lines, origins and the undo log survive.
    expect(db.prepare("SELECT part, origin FROM compass_items ORDER BY id").all()).toEqual([
      { part: "interest", origin: "find_me" },
      { part: "intention", origin: "questions" },
    ]);
    expect(db.prepare("SELECT kind, before, proposed_at, confirmed_at FROM compass_changes").all()).toEqual([
      { kind: "line", before: "Busy evenings", proposed_at: "t", confirmed_at: "t" },
    ]);
    expect((db.prepare("PRAGMA foreign_key_check").all() as unknown[]).length).toBe(0);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '_mig_backup_%'").all()).toEqual([]);
    db.prepare("INSERT INTO places (id, slug, name, kind, created_at) VALUES ('p2', 's2', 'Cinema', 'culture', 't')").run();
  });
});
