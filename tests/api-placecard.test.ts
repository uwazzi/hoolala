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

let placeCalls = 0;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  placeCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      if (String(url).endsWith("/responses")) {
        placeCalls++;
        const facts = [
          { field: "hours", value: "Mon to Sat 7:30 to 19:00", url: "cafe-palud.example" },
          { field: "menu_item", value: "Flat white CHF 5.20", url: "https://cafe-palud.example/menu" },
          { field: "menu_item", value: "Truffle croissant CHF 9", url: "https://made-up.example/menu" },
          { field: "wifi", value: "Free wifi, ask for the code", url: "https://cafe-palud.example" },
          { field: "rule", value: "call 079 123 45 67 to book", url: "https://cafe-palud.example" },
        ];
        return Response.json({
          output: [
            { type: "web_search_call", results: [{ url: "https://cafe-palud.example/", title: "Café de la Palud", snippet: "Opening hours, menu, wifi" }, { url: "https://cafe-palud.example/menu", title: "Menu", snippet: "Flat white" }] },
            { type: "message", content: [{ type: "output_text", text: JSON.stringify({ facts }) }] },
          ],
          usage: { input_tokens: 4000, output_tokens: 800 },
        });
      }
      const text = JSON.parse(String(init.body)).messages[1].content;
      return Response.json({ choices: [{ message: { content: JSON.stringify({ verdict: "approve", category: "ok", lang: "en", en: text, fr: text }) } }] });
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

async function person(env: Env, name: string, checkIn = true): Promise<Person> {
  const id = crypto.randomUUID();
  env.DB.sqlite.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)").run(id, `${name}@example.com`, name, NOW);
  const who = { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
  if (checkIn) await call(env, "POST", "/api/checkin", who, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
  return who;
}

function scene(vars: Record<string, string> = AI) {
  const env = testEnv(vars);
  env.DB.sqlite
    .prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café de la Palud', 'cafe', 'Lausanne', 46.5222, 6.6339, 'active', ?)")
    .run(NOW);
  return env;
}

const rows = (env: Env, sql: string) => env.DB.sqlite.prepare(sql).all() as Record<string, unknown>[];
const card = async (env: Env, who: Person) => (await call(env, "GET", "/api/places/cafe/card", who)).json();
const addFact = (env: Env, who: Person, body: Record<string, unknown>) => call(env, "POST", "/api/places/cafe/facts", who, body);

describe("the place card", () => {
  it("needs a check-in at that place", async () => {
    const env = scene();
    const away = await person(env, "Away", false);
    expect((await call(env, "GET", "/api/places/cafe/card", away)).status).toBe(403);
    expect((await call(env, "GET", "/api/places/cafe/card")).status).toBe(401);
    expect((await addFact(env, away, { field: "wifi", value: "Fast wifi" })).status).toBe(403);
  });

  it("PLACE IT keeps only sourced, screened details, as AI / FOUND, once a month", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    expect((await card(env, ana)).canFetch).toBe(true);
    const res = await (await call(env, "POST", "/api/places/cafe/fetch", ana)).json();
    expect(res.facts.map((f: { value: string; sourceDomain: string }) => `${f.value} (${f.sourceDomain})`).sort()).toEqual([
      "Flat white CHF 5.20 (cafe-palud.example)",
      "Free wifi, ask for the code (cafe-palud.example)",
      "Mon to Sat 7:30 to 19:00 (cafe-palud.example)",
    ]);
    expect(res.facts.every((f: { source: string; state: string }) => f.source === "web" && f.state === "found")).toBe(true);
    expect(res.workingsId).toEqual(expect.any(String));
    // No Google rows, no invented croissant, no phone number.
    expect(rows(env, "SELECT COUNT(*) AS n FROM place_facts WHERE source = 'google'")[0].n).toBe(0);
    expect(JSON.stringify(rows(env, "SELECT * FROM place_facts"))).not.toMatch(/croissant|079/i);
    // Once a month: a second visit doesn't search again.
    expect((await card(env, ana)).canFetch).toBe(false);
    await call(env, "POST", "/api/places/cafe/fetch", ana);
    expect(placeCalls).toBe(1);
  });

  it("works without the model: people's own details only", async () => {
    const env = scene({ ...AI, LLM_ENABLED: "false" });
    const ana = await person(env, "Ana");
    expect((await card(env, ana)).canFetch).toBe(false);
    expect((await addFact(env, ana, { field: "sockets", value: "Sockets under the big table" })).status).toBe(200);
    expect(placeCalls).toBe(0);
  });

  it("screens what people write", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    const res = await addFact(env, ana, { field: "rule", value: "text the owner on 079 123 45 67" });
    expect(res.status).toBe(422);
    expect((await addFact(env, ana, { field: "secret", value: "x y" })).status).toBe(400);
  });
});

describe("place points", () => {
  it("wait for someone else's confirm, which also earns them 2", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const added = await (await addFact(env, ana, { field: "spot", value: "Quiet corner by the stairs" })).json();
    expect(added.points).toEqual({ counted: 0, pending: 5 });
    const factId = added.facts[0].id;
    expect((await call(env, "POST", `/api/places/facts/${factId}/confirm`, ana)).status).toBe(409);
    expect((await (await call(env, "POST", `/api/places/facts/${factId}/confirm`, ben)).json()).points).toEqual({ counted: 2, pending: 0 });
    expect((await call(env, "POST", `/api/places/facts/${factId}/confirm`, ben)).status).toBe(409);
    expect((await (await call(env, "GET", "/api/me/points", ana)).json())).toEqual({ counted: 5, pending: 0 });
    expect(rows(env, "SELECT state FROM place_facts")[0].state).toBe("confirmed");
  });

  it("count after a quiet day, but never after a dispute", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    await addFact(env, ana, { field: "quiet", value: "Quiet before 10:00" });
    const second = await (await addFact(env, ana, { field: "wifi", value: "Wifi drops at lunch" })).json();
    const disputed = second.facts.find((f: { value: string }) => f.value === "Wifi drops at lunch").id;
    await call(env, "POST", `/api/places/facts/${disputed}/dispute`, ben);
    vi.setSystemTime(new Date("2026-10-29T15:00:00.000Z"));
    // Ana is still checked in (4 h is long gone in real life; the points endpoint doesn't need a check-in).
    expect((await (await call(env, "GET", "/api/me/points", ana)).json())).toEqual({ counted: 5, pending: 0 });
    expect(rows(env, "SELECT state FROM place_contributions ORDER BY created_at").map((r) => r.state)).toEqual(["counted", "rejected"]);
  });

  it("stop at 30 a day", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    const insert = env.DB.sqlite.prepare("INSERT INTO place_facts (id, place_id, field, value, source, state, confirmations, updated_at) VALUES (?, 'cafe', 'menu_item', ?, 'people', 'found', 0, ?)");
    const ids = Array.from({ length: 16 }, (_, i) => {
      const id = crypto.randomUUID();
      insert.run(id, `Item ${i}`, NOW);
      return id;
    });
    for (const id of ids) await call(env, "POST", `/api/places/facts/${id}/confirm`, ana);
    expect((await (await call(env, "GET", "/api/me/points", ana)).json()).counted).toBe(30);
  });

  it("are private: never in anyone else's answer, never on the Live page", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const added = await (await addFact(env, ana, { field: "spot", value: "Window seats" })).json();
    await call(env, "POST", `/api/places/facts/${added.facts[0].id}/confirm`, ben);
    expect((await card(env, ben)).points).toEqual({ counted: 2, pending: 0 });
    const live = JSON.stringify(await (await call(env, "GET", "/api/live")).json());
    expect(live).not.toMatch(/points/i);
    const benCard = await card(env, ben);
    expect(benCard.facts[0]).toMatchObject({ value: "Window seats", mine: false });
    expect(JSON.stringify(benCard)).not.toContain(ana.id);
  });

  it("NOT ANY MORE sends a confirmed detail back to found", async () => {
    const env = scene();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const added = await (await addFact(env, ana, { field: "hours", value: "Open till 22:00" })).json();
    const id = added.facts[0].id;
    await call(env, "POST", `/api/places/facts/${id}/confirm`, ben);
    const after = await (await call(env, "POST", `/api/places/facts/${id}/dispute`, ben)).json();
    expect(after.facts[0]).toMatchObject({ value: "Open till 22:00", state: "found", confirmations: 0 });
  });
});
