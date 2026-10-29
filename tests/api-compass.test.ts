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

/** Fake Meta API shaped like the real FIND ME call: site-only citations, specific returned pages. */
let findings: unknown[] = [];
let draft: unknown[] | "fail" = [];
let calls: { url: string; body: string }[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  calls = [];
  findings = [
    { text: "Writes a food blog about Lausanne cafés", url: "https://ana-lopes.example" },
    { text: "Plays in a Lausanne chess club", url: "https://www.chess-lausanne.ch" },
    { text: "Ana Lopes, marathon runner in Porto", url: "https://namesake-runner.example" },
    { text: "Invented award winner", url: "https://made-up.example" },
  ];
  draft = [
    { part: "interest", text: "Lausanne cafés and food writing", source_url: "https://ana-lopes.example/blog" },
    { part: "interest", text: "Chess, especially endgames", source_url: "https://www.chess-lausanne.ch/members/ana" },
    { part: "interest", text: "Marathon running", source_url: "https://namesake-runner.example/ana" },
    { part: "intention", text: "Board game evenings", source_url: null },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      calls.push({ url: String(url), body: String(init.body) });
      if (String(url).endsWith("/responses")) {
        return Response.json({
          output: [
            { type: "message", content: [{ type: "output_text", text: "Searching for this person." }] },
            {
              type: "web_search_call",
              results: [
                { url: "https://ana-lopes.example/blog", title: "Ana's food blog", snippet: "Lausanne cafés, reviews and food writing" },
                { url: "https://www.chess-lausanne.ch/members/ana", title: "Members", snippet: "Ana Lopes, chess club Lausanne" },
                { url: "https://namesake-runner.example/ana", title: "Ana Lopes runner", snippet: "Marathon runner in Porto" },
              ],
            },
            { type: "message", content: [{ type: "output_text", text: JSON.stringify({ findings }) }] },
          ],
          usage: { input_tokens: 14000, output_tokens: 1200 },
        });
      }
      if (draft === "fail") return new Response("{}", { status: 500 });
      return Response.json({ choices: [{ message: { content: JSON.stringify({ compass: draft }) } }], usage: { prompt_tokens: 300, completion_tokens: 150 } });
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
const find = (env: Env, who: Person, body: Record<string, unknown> = {}) =>
  call(env, "POST", "/api/me/find", who, { consent: true, name: "Ana Lopes", town: "Lausanne", links: ["https://ana-lopes.example/blog"], ...body });

describe("FIND ME", () => {
  it("needs consent and looks up only the person", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    expect((await find(env, ana, { consent: false })).status).toBe(400);
    const other = await find(env, ana, { name: "Linus Torvalds" });
    expect(other.status).toBe(403);
    expect(await other.json()).toEqual({ error: "not_you" });
    expect((await find(env, await person(env, null))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("returns grounded findings with their real pages, and stores none of them", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const res = await (await find(env, ana)).json();
    expect(res.findings).toEqual([
      { text: "Writes a food blog about Lausanne cafés", url: "https://ana-lopes.example/blog", source: "ana-lopes.example" },
      { text: "Plays in a Lausanne chess club", url: "https://www.chess-lausanne.ch/members/ana", source: "chess-lausanne.ch" },
      { text: "Ana Lopes, marathon runner in Porto", url: "https://namesake-runner.example/ana", source: "namesake-runner.example" },
    ]);
    // Nothing about the person is written anywhere.
    const everything = JSON.stringify([
      rows(env, "SELECT * FROM compass_items"),
      rows(env, "SELECT * FROM llm_calls"),
      rows(env, "SELECT * FROM workings"),
      [...env.SESSIONS.store.values()],
    ]);
    for (const leak of ["food blog", "chess", "marathon", "ana-lopes.example", "Lopes"]) expect(everything).not.toContain(leak);
    expect(rows(env, "SELECT function, tools_json, grounded_count, total_count FROM workings")).toEqual([
      { function: "findme", tools_json: '["web_search"]', grounded_count: 3, total_count: 4 },
    ]);
    expect(JSON.parse(calls[0].body)).toMatchObject({ max_tool_calls: 3 });
  });

  it("says the AI is off rather than pretending", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env, "Ana");
    expect((await find(env, ana)).status).toBe(503);
  });
});

describe("the compass", () => {
  const kept = [
    { text: "Writes a food blog about Lausanne cafés", url: "https://ana-lopes.example/blog" },
    { text: "Plays in a Lausanne chess club", url: "https://www.chess-lausanne.ch/members/ana" },
  ];

  it("drafts only from ticked findings: a NOT ME source never makes it in, and nothing is saved", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const res = await (await call(env, "POST", "/api/me/compass/draft", ana, { kept, answers: { more: "board games" } })).json();
    expect(res.lines.map((l: { text: string; source: string }) => `${l.text} (${l.source})`)).toEqual([
      "Lausanne cafés and food writing (ana-lopes.example)",
      "Chess, especially endgames (chess-lausanne.ch)",
      "Board game evenings (you said)",
    ]);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
  });

  it("drafts without the model too, and from three answers alone", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env, "Ana");
    const fromFindings = await (await call(env, "POST", "/api/me/compass/draft", ana, { kept })).json();
    expect(fromFindings.source).toBe("rules");
    expect(fromFindings.lines).toHaveLength(2);
    const fromAnswers = await (await call(env, "POST", "/api/me/compass/draft", ana, { answers: { talk: "chess, cycling", avoid: "work talk" } })).json();
    expect(fromAnswers.lines.map((l: { part: string; text: string }) => `${l.part}:${l.text}`)).toEqual(["interest:chess", "interest:cycling", "filter:work talk"]);
  });

  it("saves only on LOOKS RIGHT, and only for the person", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const lines = [
      { part: "interest", text: "Chess, especially endgames", sourceUrl: "https://www.chess-lausanne.ch/members/ana" },
      { part: "intention", text: "Board game evenings", sourceUrl: null },
      { part: "interest", text: "Introvert at heart", sourceUrl: null },
    ];
    const saved = await (await call(env, "POST", "/api/me/compass/confirm", ana, { lines })).json();
    expect(saved.compass.map((l: { text: string }) => l.text)).toEqual(["Chess, especially endgames", "Board game evenings"]);
    expect((await (await call(env, "GET", "/api/me/compass", ben)).json()).compass).toEqual([]);
    expect((await call(env, "GET", "/api/me/compass")).status).toBe(401);
  });

  it("is never in any response to anyone else, and FITS YOU only orders the owner's own view", async () => {
    const env = testEnv(AI);
    env.DB.sqlite.prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café', 'cafe', 'Lausanne', 46.5222, 6.6339, 'active', ?)").run(NOW);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const cleo = await person(env, "Cleo");
    await call(env, "POST", "/api/me/compass/confirm", ana, { lines: [{ part: "interest", text: "Chess, especially endgames", sourceUrl: null }] });
    for (const p of [ana, ben, cleo]) await call(env, "POST", "/api/checkin", p, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
    draft = "fail";
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
      await call(env, "POST", "/api/me/compass/confirm", ana, {
        lines: [
          { part: "interest", text: "Chess", sourceUrl: null },
          { part: "intention", text: "Board games", sourceUrl: null },
        ],
      })
    ).json();
    const after = await (await call(env, "DELETE", `/api/me/compass/${saved.compass[0].id}`, ana)).json();
    expect(after.compass.map((l: { text: string }) => l.text)).toEqual(["Board games"]);
    await call(env, "DELETE", "/api/me", ana);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
  });
});

describe("SAY IT YOUR WAY", () => {
  async function savedCompass(env: Env, ana: Person) {
    return (
      await (
        await call(env, "POST", "/api/me/compass/confirm", ana, {
          lines: [
            { part: "interest", text: "Chess", sourceUrl: null },
            { part: "delivery", text: "Busy evenings", sourceUrl: null },
          ],
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
    expect(rows(env, `SELECT origin FROM compass_items WHERE id = '${compass[0].id}'`)).toEqual([{ origin: "find_me" }]);
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
    await call(env, "POST", "/api/me/compass/confirm", ana, { lines: [{ part: "interest", text: "Chess", sourceUrl: null }] });
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_changes")[0].n).toBe(0);
    expect((await call(env, "POST", "/api/me/compass/undo", ana)).status).toBe(404);
  });
});

describe("SURPRISE ME keeps", () => {
  it("needs a signed-in person", async () => {
    const env = testEnv(AI);
    expect((await call(env, "POST", "/api/me/compass/keep", undefined, { part: "interest", words: "Chess" })).status).toBe(401);
  });

  it("saves one line as 'you said', and nothing before the KEEP tap", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const proposed = await (await call(env, "POST", "/api/me/compass/propose", ana, { part: "interest", words: "Chess, the slower the better" })).json();
    expect(proposed.proposed).toEqual({ part: "interest", words: "Chess, the slower the better", change: { before: null, after: "Chess, the slower the better" } });
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
    const kept = await call(env, "POST", "/api/me/compass/keep", ana, { part: proposed.proposed.part, words: proposed.proposed.words });
    expect(kept.status).toBe(200);
    expect(await kept.json()).toEqual({
      compass: [{ id: expect.any(String), part: "interest", text: "Chess, the slower the better", sourceUrl: null, source: "you said", origin: "questions" }],
    });
  });

  it("refuses invalid lines with the validator's reason, and saves nothing", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    expect(await (await call(env, "POST", "/api/me/compass/keep", ana, { part: "interest", words: "  " })).json()).toMatchObject({ error: "missing_words" });
    expect(await (await call(env, "POST", "/api/me/compass/keep", ana, { part: "interest", words: "x".repeat(61) })).json()).toMatchObject({ error: "too_long" });
    expect(await (await call(env, "POST", "/api/me/compass/keep", ana, { part: "filter", words: "I love football" })).json()).toMatchObject({ error: "bad_fit" });
    expect(await (await call(env, "POST", "/api/me/compass/keep", ana, { part: "interest", words: "Single and ready to flirt" })).json()).toMatchObject({
      error: "not_allowed",
    });
    expect(await (await call(env, "POST", "/api/me/compass/keep", ana, { part: "interest", words: "nothing, I want to die" })).json()).toMatchObject({
      error: "crisis",
    });
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_items")[0].n).toBe(0);
  });

  it("keeps one person's lines from another, with no model and no undo log", async () => {
    const env = testEnv(AI);
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    await call(env, "POST", "/api/me/compass/keep", ana, { part: "interest", words: "Chess" });
    await call(env, "POST", "/api/me/compass/keep", ben, { part: "filter", words: "loud bars" });
    expect(await (await call(env, "GET", "/api/me/compass", ana)).json()).toEqual({
      compass: [{ id: expect.any(String), part: "interest", text: "Chess", sourceUrl: null, source: "you said", origin: "questions" }],
    });
    expect(rows(env, "SELECT COUNT(*) AS n FROM llm_calls")[0].n).toBe(0);
    expect(rows(env, "SELECT COUNT(*) AS n FROM compass_changes")[0].n).toBe(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("works with the model off", async () => {
    const env = testEnv({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env, "Ana");
    const kept = await call(env, "POST", "/api/me/compass/keep", ana, { part: "delivery", words: "quiet mornings" });
    expect(kept.status).toBe(200);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
