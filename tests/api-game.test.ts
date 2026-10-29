import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };
interface GameTry {
  id: string;
  level: string;
  step: number;
  kind: string;
  who_role: string | null;
  title: string;
  source: string;
  minutes: number;
}

let answers: unknown[];

beforeEach(() => {
  answers = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      const answer = answers.shift() ?? { tries: [] };
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

function compass(env: Env, userId: string) {
  const db = env.DB.sqlite;
  db.prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, ?, ?, 'questions', 1, ?)").run(
    crypto.randomUUID(),
    userId,
    "interest",
    "Board games",
    NOW,
  );
  db.prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, ?, ?, 'questions', 1, ?)").run(
    crypto.randomUUID(),
    userId,
    "intention",
    "The park on Sundays",
    NOW,
  );
  db.prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, ?, ?, 'questions', 1, ?)").run(
    crypto.randomUUID(),
    userId,
    "delivery",
    "Gently: easier when the other person starts",
    NOW,
  );
  db.prepare("INSERT INTO compass_people (user_id, role, role_class, created_at) VALUES (?, 'brother', 'close', ?), (?, 'barista', 'service', ?)").run(
    userId,
    NOW,
    userId,
    NOW,
  );
}

const AI_GAME = {
  tries: [
    { title: "Smile and nod at three people at the park.", level: "soft", kind: "talk", who_role: null, place_kind: null, why: "Soft and silent." },
    { title: "Say good morning to your brother.", level: "soft", kind: "talk", who_role: "brother", place_kind: null, why: "Soft and short." },
    { title: "Hold the door for someone at the park.", level: "soft", kind: "kind", who_role: null, place_kind: null, why: "Soft and kind." },
    { title: "Ask your brother one question about board games.", level: "brave", kind: "talk", who_role: "brother", place_kind: null, why: "Brave talk." },
    { title: "Ask the barista what they would pick today.", level: "brave", kind: "talk", who_role: "barista", place_kind: null, why: "Brave talk." },
    { title: "Tell the barista they did a great job today.", level: "brave", kind: "kind", who_role: "barista", place_kind: null, why: "Brave kind." },
    { title: "Start a two-minute chat about board games at the park.", level: "bold", kind: "talk", who_role: null, place_kind: null, why: "Bold talk." },
    { title: "Ask your brother to show you something they are good at.", level: "bold", kind: "talk", who_role: "brother", place_kind: null, why: "Bold talk." },
    { title: "Tell your brother out loud what difference they make.", level: "bold", kind: "kind", who_role: "brother", place_kind: null, why: "Bold kind." },
  ],
};

describe("the game", () => {
  it("needs a signed-in person", async () => {
    const env = testEnv();
    expect((await call(env, "POST", "/api/game", undefined, {})).status).toBe(401);
    expect((await call(env, "POST", "/api/game/new-one", undefined, {})).status).toBe(401);
    expect((await call(env, "POST", "/api/game/pick", undefined, {})).status).toBe(401);
  });

  it("writes a library game with the model off: 9 tries, 3 per level, talk and kind in each", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const res = await call(env, "POST", "/api/game", ana, {});
    expect(res.status).toBe(200);
    const data = (await res.json()) as { gameId: string; tries: GameTry[]; startTab: number; people: string[] };
    expect(data.gameId).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.tries).toHaveLength(9);
    expect(data.people).toEqual(["brother", "barista"]);
    expect(data.startTab).toBe(0);
    for (const level of ["soft", "brave", "bold"] as const) {
      const at = data.tries.filter((t) => t.level === level);
      expect(at).toHaveLength(3);
      expect(at.some((t) => t.kind === "talk")).toBe(true);
      expect(at.some((t) => t.kind === "kind")).toBe(true);
      expect(at.every((t) => t.source === "library")).toBe(true);
    }
    expect(data.tries.filter((t) => t.level === "soft").every((t) => t.step === 1 || t.step === 2)).toBe(true);
    expect(data.tries.filter((t) => t.level === "brave").every((t) => t.step === 3 || t.step === 4)).toBe(true);
    expect(data.tries.filter((t) => t.level === "bold").every((t) => t.step === 5)).toBe(true);
    expect(data.tries.find((t) => t.level === "soft")!.minutes).toBe(1);
    expect(data.tries.find((t) => t.level === "brave")!.minutes).toBe(2);
    expect(data.tries.find((t) => t.level === "bold")!.minutes).toBe(5);
    expect(data.tries.some((t) => t.title.includes("the park"))).toBe(true);
    expect(data.tries.some((t) => t.who_role === "brother")).toBe(true);
    const rows = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM game_tries WHERE user_id = ?").get(ana.id) as { n: number };
    expect(rows.n).toBe(9);
  });

  it("starts forward people on BRAVE", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    env.DB.sqlite.prepare("UPDATE compass_items SET text = 'I just walk up and dive straight in' WHERE user_id = ? AND part = 'delivery'").run(ana.id);
    const data = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { startTab: number };
    expect(data.startTab).toBe(1);
  });

  it("writes an AI game with the model on, and ignores the model's steps", async () => {
    const env = testEnv({ ...AI });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const stepped = AI_GAME.tries.map((t, i) => ({ ...t, step: t.level === "soft" ? 2 : t.level === "brave" ? [4, 3, 4][i - 3] : 5 }));
    answers = [{ tries: stepped }];
    const data = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { tries: GameTry[] };
    expect(data.tries).toHaveLength(9);
    expect(data.tries.every((t) => t.source === "ai")).toBe(true);
    // Code assigned the steps (soft 1,2,1), whatever the model said.
    expect(data.tries.filter((t) => t.level === "soft").map((t) => t.step)).toEqual([1, 2, 1]);
    expect(data.tries.filter((t) => t.level === "brave").map((t) => t.step)).toEqual([3, 4, 3]);
    const workings = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM workings WHERE user_id = ?").get(ana.id) as { n: number };
    expect(workings.n).toBe(1);
  });

  it("swaps a twice-rejected draft for a library try", async () => {
    const env = testEnv({ ...AI });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const bad = { ...AI_GAME.tries[0], title: "Buy everyone a coffee at the park." };
    const bad2 = { ...AI_GAME.tries[1], title: "Buy your brother a coffee." };
    answers = [{ tries: [bad, ...AI_GAME.tries.slice(1)] }, { tries: [bad, bad2, ...AI_GAME.tries.slice(2)] }];
    const data = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { tries: GameTry[] };
    expect(data.tries).toHaveLength(9);
    const soft = data.tries.filter((t) => t.level === "soft");
    expect(soft.filter((t) => t.source === "library")).toHaveLength(1);
    expect(data.tries.every((t) => !t.title.includes("Buy"))).toBe(true);
  });

  it("writes NEW ONE at the same level and kind, never shown before", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { gameId: string; tries: GameTry[] };
    const soft = game.tries.filter((t) => t.level === "soft");
    const shown = soft.map((t) => t.title);
    const res = await call(env, "POST", "/api/game/new-one", ana, { gameId: game.gameId, level: "soft", kind: "talk", exclude: shown });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { try: GameTry };
    expect(data.try.level).toBe("soft");
    expect(data.try.kind).toBe("talk");
    expect(shown).not.toContain(data.try.title);
    expect(data.try.source).toBe("library");
  });

  it("keeps NEW ONE to your own game, a real level and kind", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    const bob = await person(env, "bob");
    compass(env, ana.id);
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { gameId: string };
    expect((await call(env, "POST", "/api/game/new-one", bob, { gameId: game.gameId, level: "soft", kind: "talk", exclude: [] })).status).toBe(404);
    expect((await call(env, "POST", "/api/game/new-one", ana, { gameId: game.gameId, level: "wild", kind: "talk", exclude: [] })).status).toBe(400);
    expect((await call(env, "POST", "/api/game/new-one", ana, { gameId: crypto.randomUUID(), level: "soft", kind: "talk", exclude: [] })).status).toBe(404);
  });

  it("falls back to the library after 20 NEW ONE and 3 NEW GAME a day", async () => {
    const env = testEnv({ ...AI });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const single = { title: "Smile and nod at the park.", level: "soft", kind: "talk", who_role: null, place_kind: null, why: "Soft." };
    answers = [AI_GAME, ...Array.from({ length: 20 }, () => single)];
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { gameId: string; tries: GameTry[] };
    let last: GameTry | null = null;
    for (let i = 0; i < 21; i++) {
      const res = await call(env, "POST", "/api/game/new-one", ana, { gameId: game.gameId, level: "soft", kind: "talk", exclude: [] });
      expect(res.status).toBe(200);
      last = ((await res.json()) as { try: GameTry }).try;
    }
    expect(last!.source).toBe("library");
    for (let i = 0; i < 2; i++) {
      answers.push(AI_GAME);
      await call(env, "POST", "/api/game", ana, {});
    }
    answers.push(AI_GAME);
    const fourth = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { tries: GameTry[] };
    expect(fourth.tries.every((t) => t.source === "library")).toBe(true);
  });

  it("needs a signed-in person for ANOTHER ONE", async () => {
    const env = testEnv();
    expect((await call(env, "POST", "/api/game/another", undefined, {})).status).toBe(401);
  });

  it("draws the next unpicked try at the same level, never a repeat", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { gameId: string; tries: GameTry[] };
    const soft = game.tries.filter((t) => t.level === "soft");
    await call(env, "POST", "/api/game/pick", ana, { id: soft[0].id });
    const res = await call(env, "POST", "/api/game/another", ana, { id: soft[0].id });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { gameId: string; try: GameTry };
    expect(data.gameId).toBe(game.gameId);
    expect(data.try.level).toBe("soft");
    expect(data.try.id).not.toBe(soft[0].id);
    expect(soft.map((t) => t.id)).toContain(data.try.id);
    const today = await call(env, "GET", "/api/tries/today", ana);
    expect(((await today.json()) as { try: { title: string } }).try.title).toBe(data.try.title);
  });

  it("writes a new game in the background when the level is used up", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    compass(env, ana.id);
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { gameId: string; tries: GameTry[] };
    const soft = game.tries.filter((t) => t.level === "soft");
    for (const t of soft) await call(env, "POST", "/api/game/pick", ana, { id: t.id });
    const data = (await (await call(env, "POST", "/api/game/another", ana, { id: soft[2].id })).json()) as { gameId: string; try: GameTry };
    expect(data.gameId).not.toBe(game.gameId);
    expect(data.try.level).toBe("soft");
  });

  it("keeps ANOTHER ONE to your own tries", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    const bob = await person(env, "bob");
    compass(env, ana.id);
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { tries: GameTry[] };
    expect((await call(env, "POST", "/api/game/another", ana, {})).status).toBe(400);
    expect((await call(env, "POST", "/api/game/another", ana, { id: crypto.randomUUID() })).status).toBe(404);
    expect((await call(env, "POST", "/api/game/another", bob, { id: game.tries[0].id })).status).toBe(404);
  });

  it("picks one try as today's try, yours only", async () => {
    const env = testEnv({ LLM_ENABLED: "false" });
    const ana = await person(env, "ana");
    const bob = await person(env, "bob");
    compass(env, ana.id);
    const game = (await (await call(env, "POST", "/api/game", ana, {})).json()) as { tries: GameTry[] };
    const res = await call(env, "POST", "/api/game/pick", ana, { id: game.tries[4].id });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { try: GameTry }).try.title).toBe(game.tries[4].title);
    expect((await call(env, "POST", "/api/game/pick", bob, { id: game.tries[4].id })).status).toBe(404);
    const today = await call(env, "GET", "/api/tries/today", ana);
    expect(((await today.json()) as { try: { title: string } }).try.title).toBe(game.tries[4].title);
  });
});
