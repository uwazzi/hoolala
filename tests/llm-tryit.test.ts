import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftTry, timeOfDay, validateDraft } from "../src/llm/tryit";
import type { Ask } from "../src/rules/tries";
import { testEnv } from "./helpers/env";

const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };
const ASK: Ask = { step: 2, place: "cafe", timeOfDay: "morning", last: ["no_reply"], interests: ["coffee"] };
const DRAFT = {
  title: "SAY MORNING TO THE BARISTA, EYES UP.",
  hint: "MORNING. NICE DAY.",
  step: 2,
  words_max: 3,
  minutes: 1,
  asks_of_other: "hello_back",
  place_kind: "cafe",
  why: "Step 2 fits, and the morning barista is right there.",
};

let answers: unknown[];
let calls: number;

beforeEach(() => {
  answers = [];
  calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      calls++;
      const answer = answers.shift();
      if (answer === "timeout") throw new DOMException("The operation timed out.", "TimeoutError");
      const content = answer === "garbage" ? "not json at all" : JSON.stringify(answer);
      return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const screenOk = { verdict: "approve", category: "none", lang: "en", en: "fine", fr: "bien" };

describe("TRY IT", () => {
  it("returns a draft inside its bounds, with one llm row and one workings row", async () => {
    const env = testEnv({ ...AI });
    env.DB.sqlite.prepare("INSERT INTO users (id, first_name, is_adult, created_at) VALUES ('ana', 'Ana', 1, '2026-10-28T14:00:00.000Z')").run();
    answers = [DRAFT, screenOk];
    const draft = await draftTry(env, "ana", ASK);
    expect(draft).toMatchObject({ title: DRAFT.title, step: 2 });
    const llm = env.DB.sqlite.prepare("SELECT purpose, validated FROM llm_calls").all() as { purpose: string; validated: number }[];
    expect(llm.filter((r) => r.purpose === "try_it")).toEqual([{ purpose: "try_it", validated: 1 }]);
    const workings = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM workings").get() as { n: number };
    expect(workings.n).toBe(1);
  });

  it("falls back to nothing on garbage, timeout, or a switched-off model", async () => {
    const env = testEnv({ ...AI });
    answers = ["garbage"];
    expect(await draftTry(env, "ana", ASK)).toBeNull();
    answers = ["timeout"];
    expect(await draftTry(env, "ana", ASK)).toBeNull();
    expect(await draftTry(testEnv({ ...AI, LLM_ENABLED: "false" }), "ana", ASK)).toBeNull();
  });

  it("drops drafts outside the step without asking SCREEN IT", async () => {
    const env = testEnv({ ...AI });
    answers = [{ ...DRAFT, minutes: 30 }];
    expect(await draftTry(env, "ana", ASK)).toBeNull();
    expect(calls).toBe(1);
  });

  it("drops drafts SCREEN IT rejects", async () => {
    const env = testEnv({ ...AI });
    answers = [DRAFT, { verdict: "reject", category: "dating", lang: "en", en: "", fr: "" }];
    expect(await draftTry(env, "ana", ASK)).toBeNull();
  });

  it("rejects misshapen drafts", () => {
    expect(validateDraft(null)).toBeNull();
    expect(validateDraft({ ...DRAFT, step: 9 })).toBeNull();
    expect(validateDraft({ ...DRAFT, asks_of_other: "marry_me" })).toBeNull();
    expect(validateDraft({ ...DRAFT, title: "" })).toBeNull();
  });

  it("tells morning, day and evening in Zurich", () => {
    expect(timeOfDay(new Date("2026-10-28T08:00:00.000Z"))).toBe("morning");
    expect(timeOfDay(new Date("2026-10-28T12:00:00.000Z"))).toBe("day");
    expect(timeOfDay(new Date("2026-10-28T18:00:00.000Z"))).toBe("evening");
  });
});

describe("TRY IT off the table", () => {
  const INPUT = { talkAbout: "Board games", moreOf: null, howIGo: null, lessOf: [], roles: [], offTable: ["politics", "money"] };

  it("tells the model the off-table themes, or that there are none", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { body?: string }) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as { messages: { content: string }[] };
        seen.push(body.messages.map((m) => m.content).join("\n"));
        const one = { title: "Smile and nod at the park.", level: "soft", kind: "talk", who_role: null, place_kind: null, why: "Soft." };
        return Response.json({ choices: [{ message: { content: JSON.stringify({ tries: [one] }) } }], usage: {} });
      }),
    );
    const { draftGameTries, draftNewOneTry } = await import("../src/llm/tryit");
    await draftGameTries(testEnv({ ...AI }), "ana", INPUT);
    expect(seen[0]).toContain("OFF THE TABLE (never these): politics; money.");
    await draftNewOneTry(testEnv({ ...AI }), "ana", { ...INPUT, offTable: [] }, "soft", "talk", []);
    expect(seen[1]).toContain("OFF THE TABLE: none.");
  });
});
