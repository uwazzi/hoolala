// Test env: D1 backed by Node's built-in SQLite with every migration applied
// and foreign keys on (as in D1), plus an in-memory KV.

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { vi } from "vitest";
import type { D1Database, D1PreparedStatement, Env, KVNamespace } from "../../src/types";

// Vite drops the "node:" prefix from node:sqlite, so load it at runtime.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = DatabaseSyncType;

type SqlValue = string | number | null;

function statement(sqlite: DatabaseSync, sql: string, params: SqlValue[] = []): D1PreparedStatement & {
  exec(): { changes: number };
} {
  return {
    bind: (...values: unknown[]) => statement(sqlite, sql, values as SqlValue[]),
    first: async <T>(column?: string) => {
      const row = sqlite.prepare(sql).get(...params) as Record<string, unknown> | undefined;
      if (!row) return null;
      return (column ? row[column] : row) as T;
    },
    all: async <T>() => ({ results: sqlite.prepare(sql).all(...params) as T[] }),
    run: async () => ({ success: true, meta: { changes: Number(sqlite.prepare(sql).run(...params).changes) } }),
    exec: () => ({ changes: Number(sqlite.prepare(sql).run(...params).changes) }),
  };
}

export function testDb(): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const file of readdirSync("src/db/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(`src/db/migrations/${file}`, "utf8"));
  }
  return {
    sqlite,
    prepare: (sql: string) => statement(sqlite, sql),
    exec: async (sql: string) => sqlite.exec(sql),
    batch: async (statements: D1PreparedStatement[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = statements.map((s) => (s as ReturnType<typeof statement>).exec());
        sqlite.exec("COMMIT");
        return out;
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
  };
}

export function testKv(): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => void store.set(key, value),
    delete: async (key: string) => void store.delete(key),
  };
}

export function testEnv(overrides: Partial<Env> = {}) {
  const DB = testDb();
  const SESSIONS = testKv();
  const env = {
    DB,
    SESSIONS,
    ASSETS: { fetch: vi.fn(async () => new Response("<html></html>")) },
    EMAIL_API_KEY: "test-key",
    EMAIL_FROM: "Hoolala! <hello@hoolala.test>",
    ...overrides,
  } as Env & { DB: typeof DB; SESSIONS: typeof SESSIONS };
  return env;
}
