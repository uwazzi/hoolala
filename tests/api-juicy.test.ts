// WP39 keeping the juicy bits: extraction, the onboard-bits save and the game
// reading the kept bits. The free text is processed and dropped; only kept
// bits are stored, and only after LOOKS RIGHT.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import { SCREEN_MESSAGES } from "../src/rules/screening";
import type { ExecutionContext } from "../src/types";
import worker from "../src/worker";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };
const OFF = { LLM_ENABLED: "false" };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

const Q1F = "Um, so basically it was board games with my brother, like, last Saturday. We argued about the rules for, you know, a whole hour.";
const Q4 = "Honestly I kind of nearly told the barista that I really love the music they play.";
const CHIPS = { q1: "THIS MONTH", q2: ["BARISTA"], q2f: ["DRIVER"], q3: "OK" };

let answers: unknown[];

beforeEach(() => {
  answers = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      const answer = answers.shift() ?? { topics: [], people: [], nearly_said: null };
      return Response.json({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function call(env: Env, method: string, path: string, who?: Person, body?: unknown) {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method,
      headers: { ...(who ? { cookie: who.cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    ctx,
  );
}

async function person(env: Env, name: string): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${name}@example.com`, name, NOW);
  const session = await createSession(env, id, new Date(NOW));
  return { id, cookie: `hoolala_session=${session}` };
}

function rows(env: Env, sql: string, ...params: string[]) {
  return env.DB.sqlite.prepare(sql).all(...params) as Record<string, unknown>[];
}

const JUICY_OUT = {
  topics: ["board games"],
  people: [{ role: "barista", tier: "said" }],
  nearly_said: { line: "I love the music you play", to_role: "barista" },
};
const SCREEN_OK = { verdict: "approve", category: "ok", lang: "en", en: "fine", fr: "bien" };
const SCREEN_NO = { verdict: "reject", category: "dating", lang: "en", en: "", fr: "" };

describe("juicy extract", () => {
  it("needs a signed-in person", async () => {
    const env = testEnv(OFF);
    expect((await call(env, "POST", "/api/me/juicy/extract", undefined, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] })).status).toBe(401);
  });

  it("rejects misshapen bodies", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    const good = { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] };
    expect((await call(env, "POST", "/api/me/juicy/extract", ana, { ...good, q1f: 42 })).status).toBe(400);
    expect((await call(env, "POST", "/api/me/juicy/extract", ana, { ...good, q4: "x".repeat(301) })).status).toBe(400);
    expect((await call(env, "POST", "/api/me/juicy/extract", ana, { ...good, q5: "POLITICS" })).status).toBe(400);
    expect((await call(env, "POST", "/api/me/juicy/extract", ana, { ...good, chips: null })).status).toBe(400);
  });

  it("answers crisis words with the fixed help message, never the model", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "ana");
    const res = await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: null, q4: "I want to die", chips: CHIPS, q5: [] });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "crisis", why: SCREEN_MESSAGES.crisis });
    expect(rows(env, "SELECT * FROM llm_calls")).toEqual([]);
  });

  it("falls back with the model off, in the same shape", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    const res = await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      topics: ["board games", "rules"],
      people: [{ role: "brother", tier: "said" }, { role: "barista", tier: "said" }],
      nearlySaid: { line: "music", toRole: "barista" },
      fallback: true,
    });
    expect(rows(env, "SELECT * FROM llm_calls")).toEqual([]);
  });

  it("extracts with the model on, with one llm row and one workings row", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "ana");
    answers = [JUICY_OUT, SCREEN_OK];
    const res = await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      topics: ["board games"],
      people: [{ role: "barista", tier: "said" }],
      nearlySaid: { line: "I love the music you play", toRole: "barista" },
      fallback: false,
    });
    expect(rows(env, "SELECT purpose, validated FROM llm_calls WHERE purpose = 'juicy'")).toEqual([{ purpose: "juicy", validated: 1 }]);
    expect(rows(env, "SELECT function AS fn, verdict FROM workings")).toEqual([{ fn: "juicy", verdict: "approved" }]);
  });

  it("retries when SCREEN IT rejects the kept bits, then falls back", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "ana");
    answers = [JUICY_OUT, SCREEN_NO, { ...JUICY_OUT, topics: ["music"] }, SCREEN_OK];
    const data = (await (await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] })).json()) as { topics: string[]; fallback: boolean };
    expect(data).toMatchObject({ topics: ["music"], fallback: false });
  });

  it("falls back after two bad drafts", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "ana");
    answers = [
      { topics: "nope", people: [], nearly_said: null },
      { ...JUICY_OUT, topics: ["like"] },
    ];
    const data = (await (await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] })).json()) as { topics: string[]; fallback: boolean };
    expect(data).toMatchObject({ topics: ["board games", "rules"], fallback: true });
    expect(rows(env, "SELECT verdict FROM workings")).toEqual([{ verdict: "rejected: invalid" }]);
  });

  it("never stores the free text anywhere", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    const data = (await (
      await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: "zxqv chat about board games", q4: "zxqv nearly told the barista hi", chips: CHIPS, q5: [] })
    ).json()) as { topics: string[] };
    expect(JSON.stringify(data)).toContain("zxqv");
    for (const table of ["workings", "llm_calls", "onboard_bits", "compass_items", "compass_people"]) {
      expect(JSON.stringify(rows(env, `SELECT * FROM ${table}`)), table).not.toContain("zxqv");
    }
  });

  it("rate-limits extraction", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    for (let i = 0; i < 30; i++) {
      expect((await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] })).status).toBe(200);
    }
    expect((await call(env, "POST", "/api/me/juicy/extract", ana, { q1f: Q1F, q4: Q4, chips: CHIPS, q5: [] })).status).toBe(429);
  });
});

describe("the onboard-bits save", () => {
  const LINES = [
    { part: "interest", words: "Board games" },
    { part: "delivery", words: "Battery ok today" },
  ];
  const BITS = { battery: "OK", offtable: ["POLITICS"], nearlySaid: { line: "I love the music you play", toRole: "barista" } };

  it("stores battery, off-table and nearly-said with the compass", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    const res = await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [{ role: "brother" }], ...BITS });
    expect(res.status).toBe(200);
    expect(rows(env, "SELECT battery, offtable_json, nearly_line, nearly_to_role FROM onboard_bits WHERE user_id = ?", ana.id)).toEqual([
      { battery: "OK", offtable_json: '["POLITICS"]', nearly_line: "I love the music you play", nearly_to_role: "barista" },
    ]);
  });

  it("rejects bad bits and stores nothing", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    expect(((await (await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [], battery: "NOPE", offtable: [], nearlySaid: null })).json()) as { error: string }).error).toBe("bad_bits");
    expect(((await (await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [], battery: "OK", offtable: ["NOPE"], nearlySaid: null })).json()) as { error: string }).error).toBe("bad_bits");
    expect(
      ((await (await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [], battery: "OK", offtable: [], nearlySaid: { line: "x".repeat(61), toRole: null } })).json()) as { error: string }).error,
    ).toBe("bad_bits");
    expect(
      ((await (await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [], battery: "OK", offtable: [], nearlySaid: { line: "Single and ready to flirt", toRole: null } })).json()) as { error: string }).error,
    ).toBe("not_allowed");
    expect(
      ((await (await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [], battery: "OK", offtable: [], nearlySaid: { line: "I told Tom today", toRole: null } })).json()) as { error: string }).error,
    ).toBe("not_allowed");
    expect(rows(env, "SELECT * FROM onboard_bits")).toEqual([]);
  });

  it("drops off-table people and stores juicy roles with their class", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    const res = await call(env, "POST", "/api/me/compass/save", ana, {
      lines: LINES,
      people: [{ role: "brother" }, { role: "colleague" }, { role: "grandparent" }, { role: "waiter" }, { role: "a regular" }],
      battery: "OK",
      offtable: ["FAMILY"],
      nearlySaid: null,
    });
    expect(res.status).toBe(200);
    expect(rows(env, "SELECT role, role_class AS roleClass FROM compass_people WHERE user_id = ? ORDER BY rowid", ana.id)).toEqual([
      { role: "colleague", roleClass: "close" },
      { role: "waiter", roleClass: "service" },
      { role: "a regular", roleClass: "close" },
    ]);
  });

  it("keeps the old bits when a save sends none", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [], ...BITS });
    await call(env, "POST", "/api/me/compass/save", ana, { lines: LINES, people: [] });
    expect(rows(env, "SELECT battery FROM onboard_bits WHERE user_id = ?", ana.id)).toEqual([{ battery: "OK" }]);
  });
});

describe("the game reads the kept bits", () => {
  async function saved(env: Env, ana: Person, bits: Record<string, unknown>, people: unknown[] = [{ role: "brother" }, { role: "barista" }]) {
    const lines = [
      { part: "interest", words: "Board games" },
      { part: "intention", words: "The park on Sundays" },
      { part: "delivery", words: "Battery ok today" },
    ];
    const res = await call(env, "POST", "/api/me/compass/save", ana, { lines, people, ...bits });
    expect(res.status).toBe(200);
  }

  it("carries the off-table list, the pace and the nearly flags, all agreeing", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    await saved(env, ana, { battery: "FULL", offtable: ["POLITICS", "MONEY"], nearlySaid: { line: "I love the music you play", toRole: "barista" } });
    const data = (await (await call(env, "POST", "/api/game", ana, {})).json()) as {
      startTab: number;
      offtable: string[];
      pace: { battery: string | null; cantRemember: boolean };
      tries: { title: string; level: string; kind: string; step: number; nearly: boolean }[];
    };
    expect(data.offtable).toEqual(["POLITICS", "MONEY"]);
    expect(data.pace).toEqual({ battery: "FULL", cantRemember: false });
    expect(data.startTab).toBe(2);
    const bold = data.tries.filter((t) => t.level === "bold");
    expect(bold).toHaveLength(3);
    expect(bold.filter((t) => t.nearly)).toHaveLength(1);
    expect(bold.find((t) => t.nearly)).toMatchObject({
      title: "Say the thing you nearly said to the barista: \u201CI love the music you play\u201D.",
      kind: "kind",
      step: 5,
    });
    expect(bold.some((t) => t.kind === "talk")).toBe(true);
  });

  it("starts GOOD on BRAVE, and CAN'T REMEMBER always on SOFT", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    await saved(env, ana, { battery: "GOOD", offtable: [], nearlySaid: null });
    expect(((await (await call(env, "POST", "/api/game", ana, {})).json()) as { startTab: number }).startTab).toBe(1);
    const bob = await person(env, "bob");
    const res = await call(env, "POST", "/api/me/compass/save", bob, {
      lines: [{ part: "delivery", words: "Battery full today \u00B7 last long chat: can\u2019t remember" }],
      people: [],
      battery: "FULL",
      offtable: [],
      nearlySaid: null,
    });
    expect(res.status).toBe(200);
    const data = (await (await call(env, "POST", "/api/game", bob, {})).json()) as { startTab: number; pace: { battery: string | null; cantRemember: boolean } };
    expect(data.pace).toEqual({ battery: "FULL", cantRemember: true });
    expect(data.startTab).toBe(0);
  });

  it("swaps an off-table draft for a library try", async () => {
    const env = testEnv({ ...AI });
    const ana = await person(env, "ana");
    await saved(env, ana, { battery: "OK", offtable: ["POLITICS"], nearlySaid: null });
    const one = (title: string, level: string, kind: string, who_role: string | null) => ({ title, level, kind, who_role, place_kind: null, why: "Fits." });
    answers = [
      {
        tries: [
          one("Ask someone about politics at the café.", "soft", "talk", null),
          one("Say good morning to your brother.", "soft", "talk", "brother"),
          one("Hold the door for someone at the park.", "soft", "kind", null),
          one("Ask your brother one question about board games.", "brave", "talk", "brother"),
          one("Ask the barista what they would pick today.", "brave", "talk", "barista"),
          one("Tell the barista they did a great job today.", "brave", "kind", "barista"),
          one("Start a two-minute chat about board games at the park.", "bold", "talk", null),
          one("Ask your brother to show you something they are good at.", "bold", "talk", "brother"),
          one("Tell your brother out loud what difference they make.", "bold", "kind", "brother"),
        ],
      },
      {
        tries: [
          one("Smile and nod at three people at the park.", "soft", "talk", null),
          one("Say good morning to your brother.", "soft", "talk", "brother"),
          one("Hold the door for someone at the park.", "soft", "kind", null),
          one("Ask your brother one question about board games.", "brave", "talk", "brother"),
          one("Ask the barista what they would pick today.", "brave", "talk", "barista"),
          one("Tell the barista they did a great job today.", "brave", "kind", "barista"),
          one("Start a two-minute chat about board games at the park.", "bold", "talk", null),
          one("Ask your brother to show you something they are good at.", "bold", "talk", "brother"),
          one("Tell your brother out loud what difference they make.", "bold", "kind", "brother"),
        ],
      },
    ];
    const data = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { tries: { title: string }[] };
    expect(data.tries).toHaveLength(9);
    expect(data.tries.some((t) => t.title.toLowerCase().includes("politics"))).toBe(false);
  });

  it("keeps off-table roles out of people and titles", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    await saved(env, ana, { battery: "OK", offtable: ["FAMILY", "WORK"], nearlySaid: null }, [{ role: "brother" }, { role: "colleague" }, { role: "barista" }]);
    const data = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { people: string[]; tries: { title: string }[] };
    expect(data.people).toEqual(["barista"]);
    expect(data.tries.some((t) => t.title.includes("brother") || t.title.includes("colleague"))).toBe(false);
  });

  it("lets NEW ONE replace the nearly-said try", async () => {
    const env = testEnv(OFF);
    const ana = await person(env, "ana");
    await saved(env, ana, { battery: "OK", offtable: [], nearlySaid: { line: "Nice set today", toRole: null } });
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { gameId: string; tries: { id: string; title: string; level: string; kind: string; nearly: boolean }[] };
    const nearly = game.tries.find((t) => t.nearly)!;
    expect(nearly.level).toBe("bold");
    const res = await call(env, "POST", "/api/game/new-one", ana, { gameId: game.gameId, level: "bold", kind: "kind", exclude: game.tries.map((t) => t.title) });
    expect(res.status).toBe(200);
    const fresh = ((await res.json()) as { try: { title: string; nearly: boolean } }).try;
    expect(fresh.nearly).toBe(false);
    expect(fresh.title).not.toBe(nearly.title);
  });
});
