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

/** Fake Meta API: queued structured drafts, in order; an empty queue fails. */
let drafts: unknown[] = [];
let calls: { url: string; body: string }[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  calls = [];
  drafts = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      calls.push({ url: String(url), body: String(init.body) });
      const next = drafts.length ? drafts.shift() : "fail";
      if (next === "fail") return new Response("{}", { status: 500 });
      return Response.json({ choices: [{ message: { content: JSON.stringify(next) } }], usage: { prompt_tokens: 300, completion_tokens: 150 } });
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

async function person(env: Env, firstName: string | null): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${id}@example.com`, firstName, NOW);
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

const rows = (env: Env, sql: string) => env.DB.sqlite.prepare(sql).all() as Record<string, unknown>[];

const DRAFT = {
  part: "interest",
  line: "Long chats about books",
  topic: "books",
  place_kind: "park",
  pace: "social",
  people: [{ role: "friend" }],
};

describe("GET PERSONAL drafting", () => {
  it("needs a signed-in person and a real question and answer", async () => {
    const env = testEnv(AI);
    expect((await call(env, "POST", "/api/me/compass/draft-line", undefined, { questionId: "q1", answer: "chess" })).status).toBe(401);
    const ana = await person(env, "Ana");
    const draft = (body: unknown) => call(env, "POST", "/api/me/compass/draft-line", ana, body);
    expect((await draft({ questionId: "q9", answer: "chess" })).status).toBe(400);
    expect((await draft({ questionId: "q1", answer: "  " })).status).toBe(400);
    expect((await draft({ questionId: "q1", answer: "x".repeat(301) })).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("drafts a line with topic, place, pace and people, and saves nothing", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    drafts = [DRAFT];
    const res = await (await call(env, "POST", "/api/me/compass/draft-line", ana, { questionId: "q1", answer: "Long chats about books" })).json();
    expect(res).toEqual({
      draft: { part: "interest", line: "Long chats about books", topic: "books", placeKind: "park", pace: "social", people: ["friend"] },
      fallback: false,
    });
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_people")[0].n).toBe(0);
    expect(rows(env, "SELECT function, verdict FROM workings")).toEqual([{ function: "compassdraft", verdict: "approved" }]);
  });

  it("screens answers before the model ever sees them", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    drafts = [DRAFT];
    expect(await (await call(env, "POST", "/api/me/compass/draft-line", ana, { questionId: "q1", answer: "nothing, I want to die" })).json()).toMatchObject({
      error: "crisis",
    });
    expect(await (await call(env, "POST", "/api/me/compass/draft-line", ana, { questionId: "q1", answer: "Single and ready to flirt" })).json()).toMatchObject({
      error: "not_allowed",
    });
    expect(calls).toHaveLength(0);
  });

  it("retries a bad draft once, then falls back to the trimmed answer", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    drafts = [{ ...DRAFT, part: "delivery" }, "fail"];
    const res = await (
      await call(env, "POST", "/api/me/compass/draft-line", ana, { questionId: "q1", answer: "Long talks about football with my brother Tom" })
    ).json();
    expect(res).toEqual({
      draft: {
        part: "interest",
        line: "Long talks about football with my brother Tom",
        topic: null,
        placeKind: null,
        pace: "gentle",
        people: ["brother"],
      },
      fallback: true,
    });
    expect(calls).toHaveLength(2);
  });

  it("works with the model off and stores no transcripts", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env, "Ana");
    const said = "bananas about ballroom zebras with my sister";
    const res = await (await call(env, "POST", "/api/me/compass/draft-line", ana, { questionId: "q2", answer: said })).json();
    expect(res.fallback).toBe(true);
    expect(res.draft).toMatchObject({ part: "intention", people: ["sister"] });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    for (const table of ["compass_items", "compass_people", "llm_calls", "workings"]) {
      expect(JSON.stringify(rows(env, `SELECT * FROM ${table}`))).not.toMatch(/zebras/);
    }
  });
});

describe("the compass", () => {
  it("saves only on LOOKS RIGHT, and only for the person", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const lines = [
      { part: "interest", words: "Chess, especially endgames" },
      { part: "intention", words: "Board game evenings" },
    ];
    const saved = await (await call(env, "POST", "/api/me/compass/save", ana, { lines, people: [{ role: "friend" }, "mum"] })).json();
    expect(saved.compass.map((l: { text: string }) => l.text)).toEqual(["Chess, especially endgames", "Board game evenings"]);
    expect(saved.people).toEqual([{ role: "friend" }, { role: "mum" }]);
    expect((await (await call(env, "GET", "/api/me/compass", ben)).json()).compass).toEqual([]);
    expect((await call(env, "GET", "/api/me/compass")).status).toBe(401);
  });

  it("is never in any response to anyone else, and FITS YOU only orders the owner's own view", async () => {
    const env = testEnv(AI);
    env.DB.sqlite.prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café', 'cafe', 'Lausanne', 46.5222, 6.6339, 'active', ?)").run(NOW);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const cleo = await person(env, "Cleo");
    await call(env, "POST", "/api/me/compass/save", ana, { lines: [{ part: "interest", words: "Chess, especially endgames" }], people: [] });
    for (const p of [ana, ben, cleo]) await call(env, "POST", "/api/checkin", p, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
    await call(env, "POST", "/api/here/signals", ben, { topic: "Coffee break now?", when: "now", spot: "The big table", capacity: 1 });
    await call(env, "POST", "/api/here/signals", cleo, { topic: "Chess at the big table?", when: "now", spot: "The big table", capacity: 1 });

    const anaView = await (await call(env, "GET", "/api/here", ana)).json();
    expect(anaView.discover.map((s: { topic: string; fitsYou: boolean }) => [s.topic, s.fitsYou])).toEqual([
      ["Chess at the big table?", true],
      ["Coffee break now?", false],
    ]);
    // Ben and Cleo never see Ana's compass, or that she fits.
    for (const p of [ben, cleo]) {
      const text = JSON.stringify(await (await call(env, "GET", "/api/here", p)).json());
      expect(text).not.toContain("endgames");
    }
  });

  it("can be removed line by line or all at once, and goes with the account", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const saved = await (
      await call(env, "POST", "/api/me/compass/save", ana, {
        lines: [
          { part: "interest", words: "Chess" },
          { part: "intention", words: "Board games" },
        ],
        people: [{ role: "friend" }],
      })
    ).json();
    const after = await (await call(env, "DELETE", `/api/me/compass/${saved.compass[0].id}`, ana)).json();
    expect(after.compass.map((l: { text: string }) => l.text)).toEqual(["Board games"]);
    await call(env, "DELETE", "/api/me", ana);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_people")[0].n).toBe(0);
  });
});

describe("SAY IT YOUR WAY", () => {
  async function savedCompass(env: Env, ana: Person) {
    return (
      await (
        await call(env, "POST", "/api/me/compass/save", ana, {
          lines: [
            { part: "interest", words: "Chess" },
            { part: "delivery", words: "Busy evenings" },
          ],
          people: [],
        })
      ).json()
    ).compass as { id: string; part: string; text: string }[];
  }

  it("proposes a line from the person's words and never saves the dry run", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const compass = await savedCompass(env, ana);
    const res = await (
      await call(env, "POST", "/api/me/compass/propose", ana, { lineId: compass[1].id, words: "quiet mornings, small groups" })
    ).json();
    expect(res.proposed).toEqual({
      part: "delivery",
      words: "quiet mornings, small groups",
      change: { before: "Busy evenings", after: "quiet mornings, small groups" },
    });
    expect(res.saw).toEqual([]);
    // The dry run changed nothing.
    expect(rows(env, "SELECT text FROM compass_items ORDER BY text")).toEqual([{ text: "Busy evenings" }, { text: "Chess" }]);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_changes")[0].n).toBe(0);
  });

  it("echoes reviewed lines and marks where they were checked", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const compass = await savedCompass(env, ana);
    const res = await (
      await call(env, "POST", "/api/me/compass/propose", ana, {
        words: "quiet mornings",
        reviewed: [compass[1].id, "00000000-0000-0000-0000-000000000000"],
        source: "delivery",
      })
    ).json();
    expect(res.saw).toEqual([{ part: "delivery", words: "Busy evenings" }]);
    expect(rows(env, `SELECT origin FROM compass_items WHERE id = '${compass[1].id}'`)).toEqual([{ origin: "delivery" }]);
    expect(rows(env, `SELECT origin FROM compass_items WHERE id = '${compass[0].id}'`)).toEqual([{ origin: "questions" }]);
  });

  it("turns feedback names into starter words", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    await savedCompass(env, ana);
    const res = await (await call(env, "POST", "/api/me/compass/propose", ana, { feedback: "awkward" })).json();
    expect(res.proposed.part).toBe("delivery");
    expect(res.proposed.words).toBe("gentler next time");
    expect((await call(env, "POST", "/api/me/compass/propose", ana, { feedback: "nailed_it" })).status).toBe(400);
  });

  it("confirms exactly the person's words, and rejects a dating label with a reason", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const compass = await savedCompass(env, ana);
    const bad = await call(env, "POST", "/api/me/compass/confirm_line", ana, { lineId: compass[0].id, part: "interest", words: "Single and looking to flirt" });
    expect(bad.status).toBe(422);
    expect((await bad.json()).why).toMatch(/talking, not dating/);
    const ok = await (
      await call(env, "POST", "/api/me/compass/confirm_line", ana, {
        lineId: compass[1].id,
        part: "delivery",
        words: "quiet mornings",
        source: "feedback",
        tryId: "11111111-1111-1111-1111-111111111111",
      })
    ).json();
    expect(ok.compass.find((l: { id: string }) => l.id === compass[1].id)).toMatchObject({ part: "delivery", text: "quiet mornings" });
    expect(rows(env, "SELECT kind, words, feedback_ref AS ref FROM compass_changes")).toEqual([
      { kind: "line", words: "quiet mornings", ref: "11111111-1111-1111-1111-111111111111" },
    ]);
    expect(rows(env, `SELECT origin FROM compass_items WHERE id = '${compass[1].id}'`)).toEqual([{ origin: "feedback" }]);
  });

  it("UNDO once restores exactly the last edit, and refuses when there is none", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    expect((await call(env, "POST", "/api/me/compass/undo", ana)).status).toBe(404);
    const compass = await savedCompass(env, ana);
    await call(env, "POST", "/api/me/compass/confirm_line", ana, { lineId: compass[1].id, part: "delivery", words: "quiet mornings" });
    await call(env, "DELETE", `/api/me/compass/${compass[0].id}`, ana);
    const undone = await (await call(env, "POST", "/api/me/compass/undo", ana)).json();
    expect(undone.restored).toEqual({ part: "interest", words: "Chess" });
    expect(undone.compass.map((l: { text: string }) => l.text).sort()).toEqual(["Chess", "quiet mornings"]);
    const undoneAgain = await (await call(env, "POST", "/api/me/compass/undo", ana)).json();
    expect(undoneAgain.restored).toEqual({ part: "delivery", words: "Busy evenings" });
    expect((await call(env, "POST", "/api/me/compass/undo", ana)).status).toBe(404);
  });

  it("lists the last three changes with before and after, owner only", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    expect((await call(env, "GET", "/api/me/compass/changes")).status).toBe(401);
    expect(((await (await call(env, "GET", "/api/me/compass/changes", ben)).json()) as { changes: unknown[] }).changes).toEqual([]);
    const compass = await savedCompass(env, ana);
    await call(env, "POST", "/api/me/compass/confirm_line", ana, { lineId: compass[1].id, part: "delivery", words: "quiet mornings" });
    await call(env, "DELETE", `/api/me/compass/${compass[0].id}`, ana);
    const seen = await (await call(env, "GET", "/api/me/compass/changes", ana)).json();
    expect(seen.changes).toEqual([
      { id: seen.changes[0].id, kind: "remove", words: "Chess", before: "Chess", after: null, undone: false },
      { id: seen.changes[1].id, kind: "line", words: "quiet mornings", before: "Busy evenings", after: "quiet mornings", undone: false },
    ]);
    await call(env, "POST", "/api/me/compass/undo", ana);
    const after = await (await call(env, "GET", "/api/me/compass/changes", ana)).json();
    expect(after.changes[0].undone).toBe(true);
    expect(after.changes[1].undone).toBe(false);
  });

  it("a fresh LOOKS RIGHT clears the undo log, and nobody undoes anyone else's lines", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const compass = await savedCompass(env, ana);
    await call(env, "POST", "/api/me/compass/confirm_line", ana, { lineId: compass[0].id, part: "interest", words: "Chess club" });
    expect((await call(env, "POST", "/api/me/compass/undo", ben)).status).toBe(404);
    await call(env, "POST", "/api/me/compass/save", ana, { lines: [{ part: "interest", words: "Chess" }], people: [] });
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_changes")[0].n).toBe(0);
    expect((await call(env, "POST", "/api/me/compass/undo", ana)).status).toBe(404);
  });
});

describe("LOOKS RIGHT validation", () => {
  it("needs a signed-in person and well-formed lines and roles", async () => {
    const env = testEnv(AI);
    expect((await call(env, "POST", "/api/me/compass/save", undefined, { lines: [], people: [] })).status).toBe(401);
    const ana = await person(env, "Ana");
    const save = (body: unknown) => call(env, "POST", "/api/me/compass/save", ana, body);
    expect((await save({ lines: "nope", people: [] })).status).toBe(400);
    expect((await save({ lines: [], people: "nope" })).status).toBe(400);
    expect(await (await save({ lines: [{ part: "interest", words: "  " }], people: [] })).json()).toMatchObject({ error: "missing_words" });
    expect(await (await save({ lines: [{ part: "interest", words: "x".repeat(61) }], people: [] })).json()).toMatchObject({ error: "too_long" });
    expect(await (await save({ lines: [{ part: "interest", words: "Single and ready to flirt" }], people: [] })).json()).toMatchObject({
      error: "not_allowed",
    });
    expect(await (await save({ lines: [{ part: "interest", words: "Chess" }], people: ["Tom"] })).json()).toMatchObject({ error: "bad_role" });
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_people")[0].n).toBe(0);
  });

  it("drops the name but keeps the role, and replaces on a second save", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const first = await (
      await call(env, "POST", "/api/me/compass/save", ana, { lines: [{ part: "interest", words: "Chess" }], people: ["brother Tom", "friend"] })
    ).json();
    expect(first.people).toEqual([{ role: "brother" }, { role: "friend" }]);
    expect(JSON.stringify(rows(env, "SELECT * FROM compass_people"))).not.toContain("Tom");
    const second = await (await call(env, "POST", "/api/me/compass/save", ana, { lines: [], people: [] })).json();
    expect(second.compass).toEqual([]);
    expect(second.people).toEqual([]);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
  });

  it("works with the model off and touches no model", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env, "Ana");
    const saved = await call(env, "POST", "/api/me/compass/save", ana, { lines: [{ part: "delivery", words: "quiet mornings" }], people: [] });
    expect(saved.status).toBe(200);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(rows(env, "SELECT COUNT(*) AS n FROM llm_calls")[0].n).toBe(0);
  });
});

describe("people in your days", () => {
  it("lists only the owner's roles", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    expect((await call(env, "GET", "/api/me/compass/people")).status).toBe(401);
    await call(env, "POST", "/api/me/compass/save", ana, { lines: [], people: ["mum", "barista"] });
    expect(await (await call(env, "GET", "/api/me/compass/people", ana)).json()).toEqual({ people: [{ role: "mum" }, { role: "barista" }] });
    expect(await (await call(env, "GET", "/api/me/compass/people", ben)).json()).toEqual({ people: [] });
  });

  it("removes one role at a time, and only the owner's", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    await call(env, "POST", "/api/me/compass/save", ana, { lines: [], people: ["mum", "barista"] });
    expect((await call(env, "DELETE", "/api/me/compass/people/mum")).status).toBe(401);
    expect((await call(env, "DELETE", "/api/me/compass/people/mum", ben)).status).toBe(404);
    expect((await call(env, "DELETE", "/api/me/compass/people/dog", ana)).status).toBe(400);
    const after = await (await call(env, "DELETE", "/api/me/compass/people/mum", ana)).json();
    expect(after).toEqual({ people: [{ role: "barista" }] });
    expect((await call(env, "DELETE", "/api/me/compass/people/mum", ana)).status).toBe(404);
  });
});
