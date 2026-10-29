import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.useRealTimers();
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
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

function setStep(env: Env, who: Person, step: number) {
  env.DB.sqlite.prepare("UPDATE users SET current_step = ? WHERE id = ?").run(step, who.id);
}

describe("tiny tries", () => {
  it("needs a sign-in everywhere", async () => {
    const env = testEnv();
    expect((await call(env, "GET", "/api/tries/today")).status).toBe(401);
    expect((await call(env, "POST", "/api/tries", undefined, {})).status).toBe(401);
    expect((await call(env, "POST", "/api/tries/step", undefined, {})).status).toBe(401);
    expect((await call(env, "GET", "/api/me/plant")).status).toBe(401);
  });

  it("offers a step-1 try first, the requested place first, another on skip", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const first = await (await call(env, "GET", "/api/tries/today", ana)).json();
    expect(first.step).toBe(1);
    expect(first.try.step).toBe(1);
    expect(first.try.source).toBe("library");
    const cafe = await (await call(env, "GET", "/api/tries/today?place=cafe", ana)).json();
    expect(cafe.try.place).toBe("cafe");
    const other = await (await call(env, "GET", "/api/tries/today?skip=1", ana)).json();
    expect(other.try.id).not.toBe(first.try.id);
    expect((await call(env, "GET", "/api/tries/today?place=club", ana)).status).toBe(400);
  });

  it("stores the code-assigned step, never one the client claims", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    setStep(env, ana, 3);
    const today = await (await call(env, "GET", "/api/tries/today", ana)).json();
    expect(today.step).toBe(3);
    const res = await call(env, "POST", "/api/tries", ana, { libraryId: "1-anywhere", placeKind: "anywhere", outcome: "went_well" });
    expect(res.status).toBe(200);
    const row = env.DB.sqlite.prepare("SELECT step, source, outcome FROM tries WHERE user_id = ?").get(ana.id) as { step: number; source: string; outcome: string };
    expect(row).toEqual({ step: 3, source: "library", outcome: "went_well" });
  });

  it("refuses bad outcomes, tries and choices", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    expect((await call(env, "POST", "/api/tries", ana, { libraryId: "1-anywhere", outcome: "nailed_it" })).status).toBe(400);
    expect((await call(env, "POST", "/api/tries", ana, { libraryId: "9-nowhere", outcome: "went_well" })).status).toBe(400);
    expect((await call(env, "POST", "/api/tries/step", ana, { choice: 2 })).status).toBe(400);
  });

  it("suggests braver after well, same after no reply or awkward, gentler after missed", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    setStep(env, ana, 3);
    const suggest = async (outcome: string) =>
      (await (await call(env, "POST", "/api/tries", ana, { libraryId: "3-anywhere", outcome })).json()).suggestion;
    expect(await suggest("went_well")).toBe(1);
    expect(await suggest("no_reply")).toBe(0);
    expect(await suggest("awkward")).toBe(0);
    expect(await suggest("didnt_happen")).toBe(-1);
  });

  it("never suggests outside the ladder", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    setStep(env, ana, 5);
    const top = await (await call(env, "POST", "/api/tries", ana, { libraryId: "5-anywhere", outcome: "went_well" })).json();
    expect(top.suggestion).toBe(0);
    setStep(env, ana, 1);
    const bottom = await (await call(env, "POST", "/api/tries", ana, { libraryId: "1-anywhere", outcome: "didnt_happen" })).json();
    expect(bottom.suggestion).toBe(0);
  });

  it("moves the step only through the person's tap, clamped to the ladder", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    expect(await (await call(env, "POST", "/api/tries/step", ana, { choice: 1 })).json()).toEqual({ step: 2 });
    expect(await (await call(env, "POST", "/api/tries/step", ana, { choice: -1 })).json()).toEqual({ step: 1 });
    expect(await (await call(env, "POST", "/api/tries/step", ana, { choice: -1 })).json()).toEqual({ step: 1 });
  });

  it("counts leaves for tries made, whatever happened, and only your own", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    for (const outcome of ["went_well", "no_reply", "awkward", "didnt_happen"]) {
      await call(env, "POST", "/api/tries", ana, { libraryId: "1-anywhere", outcome });
    }
    await call(env, "POST", "/api/tries", ben, { libraryId: "1-anywhere", outcome: "went_well" });
    expect(await (await call(env, "GET", "/api/me/plant", ana)).json()).toEqual({ tries: 4, leaves: 3, step: 1 });
    expect(await (await call(env, "GET", "/api/me/plant", ben)).json()).toEqual({ tries: 1, leaves: 1, step: 1 });
  });

  describe("with the model on", () => {
    const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };
    const DRAFT = {
      title: "SMILE AT THREE PEOPLE.",
      hint: "A SMILE IS ENOUGH. A NOD COUNTS TOO.",
      step: 1,
      words_max: 0,
      minutes: 2,
      asks_of_other: "none",
      place_kind: "anywhere",
      why: "Step 1 keeps it silent-friendly.",
    };
    const SCREEN_OK = { verdict: "approve", category: "none", lang: "en", en: "fine", fr: "bien" };
    let answers: unknown[];

    beforeEach(() => {
      answers = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
          const answer = answers.shift();
          const content = answer === "garbage" ? "not json" : JSON.stringify(answer);
          return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
        }),
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("offers a fresh try with its why, else today's library try", async () => {
      const env = testEnv({ ...AI });
      const ana = await person(env, "Ana");
      answers = [DRAFT, SCREEN_OK];
      const fresh = await (await call(env, "GET", "/api/tries/today", ana)).json();
      expect(fresh.try.source).toBe("try_it");
      expect(fresh.try.why).toBe(DRAFT.why);
      answers = ["garbage"];
      const fallback = await (await call(env, "GET", "/api/tries/today", ana)).json();
      expect(fallback.try.source).toBe("library");
    });

    it("stores try_it drafts re-checked, with the code-assigned step", async () => {
      const env = testEnv({ ...AI });
      const ana = await person(env, "Ana");
      setStep(env, ana, 3);
      const res = await call(env, "POST", "/api/tries", ana, { source: "try_it", draft: { ...DRAFT, step: 3, place_kind: "anywhere" }, outcome: "went_well" });
      expect(res.status).toBe(200);
      const row = env.DB.sqlite.prepare("SELECT step, source, title, why FROM tries WHERE user_id = ?").get(ana.id) as {
        step: number;
        source: string;
        title: string;
        why: string;
      };
      expect(row).toEqual({ step: 3, source: "try_it", title: DRAFT.title, why: DRAFT.why });
      expect((await call(env, "POST", "/api/tries", ana, { source: "try_it", draft: { ...DRAFT, step: 3, minutes: 30 }, outcome: "went_well" })).status).toBe(400);
      expect(
        (await call(env, "POST", "/api/tries", ana, { source: "try_it", draft: { ...DRAFT, step: 3, hint: "Tell her she looks sexy." }, outcome: "went_well" })).status,
      ).toBe(422);
    });
  });

  it("delete account removes the tries", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    await call(env, "POST", "/api/tries", ana, { libraryId: "1-anywhere", outcome: "went_well" });
    expect((await call(env, "DELETE", "/api/me", ana)).status).toBe(200);
    const count = (env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM tries WHERE user_id = ?").get(ana.id) as { n: number }).n;
    expect(count).toBe(0);
  });
});
