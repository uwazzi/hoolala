import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readIt, validateReadIt } from "../src/llm/readit";
import { numbersOk, templateWhy, validateWhyGo, whyGo, type WhyGoPlace } from "../src/llm/whygo";
import { testEnv } from "./helpers/env";

const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };
const PLACE: WhyGoPlace = {
  id: "cafe",
  name: "Café Longue Table",
  kind: "cafe",
  distance_m: 120,
  facts: [
    { id: "f1", text: "One long shared table" },
    { id: "f2", text: "Open until 18:00" },
  ],
  compass: ["coffee"],
  visits: 7,
  talking: "Often chatty",
};
const ITEM = { place_id: "cafe", why: "On your compass: coffee. One long shared table.", tiny_try: "Ask the person beside you about the coffee.", facts_used: ["f1"] };

let answers: unknown[];
let pageHtml: string;

beforeEach(() => {
  answers = [];
  pageHtml = "";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!String(url).includes("api.meta.test")) {
        return new Response(pageHtml, { headers: { "content-type": "text/html" } });
      }
      const answer = answers.shift();
      if (answer === "timeout") throw new DOMException("The operation timed out.", "TimeoutError");
      const content = answer === "garbage" ? "not json" : JSON.stringify(answer);
      return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function usered() {
  const env = testEnv({ ...AI });
  env.DB.sqlite.prepare("INSERT INTO users (id, first_name, is_adult, created_at) VALUES ('ana', 'Ana', 1, '2026-10-28T14:00:00.000Z')").run();
  return env;
}

describe("WHY GO", () => {
  it("keeps grounded whys, with rows to show for it", async () => {
    const env = usered();
    answers = [{ places: [ITEM] }];
    expect(await whyGo(env, "ana", [PLACE])).toEqual([{ ...ITEM, facts_used: ["f1"] }]);
    const llm = env.DB.sqlite.prepare("SELECT purpose, validated FROM llm_calls").all() as { purpose: string; validated: number }[];
    expect(llm).toEqual([{ purpose: "why_go", validated: 1 }]);
    expect((env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM workings").get() as { n: number }).n).toBe(1);
  });

  it("falls back to nothing on garbage, timeout, or a switched-off model", async () => {
    const env = usered();
    answers = ["garbage"];
    expect(await whyGo(env, "ana", [PLACE])).toBeNull();
    answers = ["timeout"];
    expect(await whyGo(env, "ana", [PLACE])).toBeNull();
    expect(await whyGo(testEnv({ ...AI, LLM_ENABLED: "false" }), "ana", [PLACE])).toBeNull();
  });

  it("drops unknown places, invented numbers, long lines and big tries", () => {
    const valid = { places: [ITEM] };
    expect(validateWhyGo(valid, [PLACE])).toHaveLength(1);
    expect(validateWhyGo({ places: [{ ...ITEM, place_id: "nope" }] }, [PLACE])).toBeNull();
    expect(validateWhyGo({ places: [{ ...ITEM, why: "Menu CHF 99, open until 25:00." }] }, [PLACE])).toBeNull();
    expect(validateWhyGo({ places: [{ ...ITEM, why: "X".repeat(141) }] }, [PLACE])).toBeNull();
    expect(validateWhyGo({ places: [{ ...ITEM, tiny_try: "Ask them for a date." }] }, [PLACE])).toBeNull();
    expect(validateWhyGo({ places: [{ ...ITEM, facts_used: ["zzz"] }] }, [PLACE])).toBeNull();
  });

  it("checks numbers against the input", () => {
    expect(numbersOk("Open until 18:00, 7 visits.", "Open until 18:00 7 Café")).toBe(true);
    expect(numbersOk("Menu CHF 19.", "Open until 18:00 7 Café")).toBe(false);
  });

  it("templates a why from real inputs only", () => {
    expect(templateWhy(PLACE)).toBe("On your compass: coffee. Talking here: Often chatty. 7 Hoolala! visits.");
    expect(templateWhy({ ...PLACE, compass: [], talking: null, visits: 0 })).toBe("Close by. Not on your compass, so it ranks low.");
  });
});

describe("READ IT", () => {
  const PAGE = `<html><head><title>Café Longue Table</title></head><body><nav>Menu</nav><p>Oat flat white, cardamom bun, soup of the day. Open until 18:00.</p></body></html>`;

  it("reads the menu off the place page", async () => {
    const env = usered();
    pageHtml = PAGE;
    answers = [{ items: ["Oat flat white", "Cardamom bun"], hours: "Open until 18:00", kind: "menu" }];
    const menu = await readIt(env, "ana", "https://cafelongue.example/menu", "Café Longue Table", "Thursday 29 October");
    expect(menu?.menu.items).toEqual(["Oat flat white", "Cardamom bun"]);
    expect(menu?.source).toBe("cafelongue.example");
  });

  it("never reads a shady link, and falls back to nothing without the model", async () => {
    const env = usered();
    expect(await readIt(env, "ana", "http://cafelongue.example/menu", "Café", "today")).toBeNull();
    expect(await readIt(testEnv({ ...AI, LLM_ENABLED: "false" }), "ana", "https://cafelongue.example/menu", "Café", "today")).toBeNull();
  });

  it("drops items the page never said, and allergen claims", () => {
    const page = "Oat flat white, cardamom bun. Open until 18:00.";
    expect(validateReadIt({ items: ["Oat flat white", "Truffle croissant"], hours: null, kind: "menu" }, page)?.items).toEqual(["Oat flat white"]);
    expect(validateReadIt({ items: ["Gluten-free bun"], hours: null, kind: "menu" }, "Gluten-free bun, CHF 4.")).toBeNull();
    expect(validateReadIt({ items: ["Truffle croissant"], hours: "Sundays", kind: "menu" }, page)).toBeNull();
    expect(validateReadIt({ items: [], hours: "Open until 18:00", kind: "hours" }, page)?.hours).toBe("Open until 18:00");
  });
});
