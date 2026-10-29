import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-29T12:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };
// Café Longue Table, Lausanne: 46.5197, 6.6323.
const HERE = { consent: true, lat: 46.5197, lng: 6.6323 };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

let answers: unknown[];
let pageHtml: string;
let overpass: unknown[] | "down";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  answers = [];
  pageHtml = "";
  overpass = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("overpass")) {
        if (overpass === "down") throw new Error("overpass down");
        return Response.json({ elements: overpass });
      }
      if (!u.includes("api.meta.test")) {
        return new Response(pageHtml, { headers: { "content-type": "text/html" } });
      }
      const content = JSON.stringify(answers.shift());
      return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 50 } });
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
  return { id, cookie: `hoolala_session=${await createSession(env, id, new Date(NOW))}` };
}

function seedPlace(env: Env, over: Record<string, unknown> = {}) {
  const p = { id: "cafe", slug: "cafe-longue", name: "Café Longue Table", kind: "cafe", lat: 46.5199, lng: 6.6325, status: "active", ...over };
  env.DB.sqlite
    .prepare("INSERT INTO places (id, slug, name, kind, lat, lng, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(p.id, p.slug, p.name, p.kind, p.lat, p.lng, p.status, NOW);
  return p;
}

function checkin(env: Env, who: Person, placeId: string) {
  env.DB.sqlite
    .prepare("INSERT INTO checkins (id, user_id, place_id, method, started_at, ends_at, left_at) VALUES (?, ?, ?, 'location', ?, ?, NULL)")
    .run(crypto.randomUUID(), who.id, placeId, NOW, "2026-10-29T16:00:00.000Z");
}

describe("around me", () => {
  it("needs a sign-in everywhere", async () => {
    const env = testEnv();
    expect((await call(env, "POST", "/api/around/scan", undefined, HERE)).status).toBe(401);
    expect((await call(env, "POST", "/api/around/rate", undefined, {})).status).toBe(401);
  });

  it("needs consent, a real spot and a sane widening", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    expect(await (await call(env, "POST", "/api/around/scan", ana, { lat: 1, lng: 2 })).json()).toMatchObject({ error: "needs_consent" });
    expect(await (await call(env, "POST", "/api/around/scan", ana, { ...HERE, lat: 91 })).json()).toMatchObject({ error: "bad_location" });
    expect(await (await call(env, "POST", "/api/around/scan", ana, { ...HERE, widen: 3 })).json()).toMatchObject({ error: "bad_widen" });
  });

  it("scans nearby places with template whys offline, and stores nothing", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    seedPlace(env);
    seedPlace(env, { id: "far", slug: "far", name: "Far Away", lat: 46.6, lng: 6.7 });
    seedPlace(env, { id: "shut", slug: "shut", name: "Shut Down", status: "hidden" });
    const res = await call(env, "POST", "/api/around/scan", ana, HERE);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.radius_m).toBe(500);
    expect(body.places).toHaveLength(1);
    expect(body.places[0]).toMatchObject({
      name: "Café Longue Table",
      why_source: "template",
      talking: null,
      read: null,
      here_now: 0,
      lat: 46.5199,
      lng: 6.6325,
    });
    expect(body.places[0].distance_m).toBeLessThan(100);
    expect(body.places[0].tiny_try).toMatch(/Smile|Sit|Ask/);
    expect(body.places[0].workings).toContain("Why this one:");
    expect((env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM checkins").get() as { n: number }).n).toBe(0);
    expect((env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM place_ratings").get() as { n: number }).n).toBe(0);
    expect((env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM llm_calls").get() as { n: number }).n).toBe(0);
  });

  it("sorts by fit, then talking, then distance", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    env.DB.sqlite
      .prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, 'interest', 'cardamom buns', 'questions', 1, ?)")
      .run(crypto.randomUUID(), ana.id, NOW);
    seedPlace(env, { id: "near", slug: "near", name: "Near But Dull" });
    seedPlace(env, { id: "far-fit", slug: "far-fit", name: "Worth The Walk", lat: 46.5222 });
    env.DB.sqlite
      .prepare("INSERT INTO place_facts (id, place_id, field, value, source, state, updated_at) VALUES ('ff1', 'far-fit', 'menu_item', 'Cardamom buns daily', 'people', 'confirmed', ?)")
      .run(NOW);
    const body = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    expect(body.places.map((p: { id: string }) => p.id)).toEqual(["far-fit", "near"]);
    expect(body.places[0].fit).toBe("GOOD");
    expect(body.places[1].fit).toBe("LOW");
  });

  it("merges live map places the database doesn't know", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    overpass = [
      { type: "node", id: 1, lat: 46.5199, lon: 6.6325, tags: { amenity: "cafe", name: "Real Café" } },
      { type: "node", id: 2, lat: 46.5199, lon: 6.6325, tags: { amenity: "bar" } },
      { type: "node", id: 3, lat: 46.5199, lon: 6.6325, tags: { amenity: "casino", name: "Lucky" } },
      { type: "node", id: 4, lat: 46.6, lon: 6.7, tags: { amenity: "cafe", name: "Far Café" } },
    ];
    const body = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    expect(body.places).toHaveLength(1);
    expect(body.places[0]).toMatchObject({
      id: "osm:node/1",
      name: "Real Café",
      kind: "cafe",
      source: "osm",
      external: { provider: "osm", id: "node/1" },
      why_source: "template",
      talking: null,
      visits: 0,
      here_now: 0,
      read: null,
    });
    expect(body.places[0].tiny_try).toBeTruthy();
  });

  it("the database wins over the map for places it knows", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    seedPlace(env);
    env.DB.sqlite.prepare("UPDATE places SET osm_id = 'node/1' WHERE id = 'cafe'").run();
    overpass = [{ type: "node", id: 1, lat: 46.5199, lon: 6.6325, tags: { amenity: "cafe", name: "Café Longue Table" } }];
    const body = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    expect(body.places).toHaveLength(1);
    expect(body.places[0]).toMatchObject({ id: "cafe", source: "hoolala" });
  });

  it("a map website gets read too", async () => {
    const env = testEnv({ ...AI });
    const ana = await person(env, "Ana");
    overpass = [
      { type: "node", id: 1, lat: 46.5199, lon: 6.6325, tags: { amenity: "cafe", name: "Real Café", website: "https://real.example/menu" } },
    ];
    answers = [{ places: [] }, { items: ["Oat flat white"], hours: null, kind: "menu" }];
    pageHtml = "<html><body><p>Oat flat white, baked daily.</p></body></html>";
    const body = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    expect(body.places[0].read).toMatchObject({ items: ["Oat flat white"], source: "real.example" });
  });

  it("the map being down leaves the database standing", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    seedPlace(env);
    overpass = "down";
    const body = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    expect(body.places).toHaveLength(1);
    expect(body.places[0]).toMatchObject({ id: "cafe", source: "hoolala" });
  });

  it("widening reaches further, taps only", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    seedPlace(env, { lat: 46.5257 }); // about 670 m north
    const near = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    expect(near.places).toHaveLength(0);
    const wide = await (await call(env, "POST", "/api/around/scan", ana, { ...HERE, widen: 1 })).json();
    expect(wide.radius_m).toBe(1000);
    expect(wide.places).toHaveLength(1);
  });

  it("fits the compass, labels talking crowds, reads the menu when the model is on", async () => {
    const env = testEnv({ ...AI });
    const ana = await person(env, "Ana");
    seedPlace(env);
    env.DB.sqlite
      .prepare("INSERT INTO compass_items (id, user_id, part, text, origin, active, created_at) VALUES (?, ?, 'interest', 'cardamom buns', 'questions', 1, ?)")
      .run(crypto.randomUUID(), ana.id, NOW);
    env.DB.sqlite
      .prepare(
        "INSERT INTO place_facts (id, place_id, field, value, source, source_url, state, updated_at) VALUES (?, 'cafe', 'menu_item', ?, 'people', 'https://cafelongue.example/menu', 'confirmed', ?)",
      )
      .run("f1", "Oat flat white and cardamom buns", NOW);
    for (const v of [4, 5, 5]) {
      const rater = await person(env, `Rater${v}${Math.random()}`);
      checkin(env, rater, "cafe");
      await call(env, "POST", "/api/around/rate", rater, { place_id: "cafe", value: v });
    }
    env.DB.sqlite
      .prepare(
        "INSERT INTO signals (id, owner_id, audience, place_id, topic, created_at, expires_at, state) VALUES (?, ?, 'place', 'cafe', 'Board games?', ?, ?, 'open')",
      )
      .run(crypto.randomUUID(), ana.id, NOW, "2026-10-29T14:00:00.000Z");
    answers = [
      { places: [{ place_id: "cafe", why: "On your compass: cardamom. Oat flat white and cardamom buns.", tiny_try: "Ask about the buns.", facts_used: ["f0"] }] },
      { items: ["Oat flat white"], hours: "Open until 18:00", kind: "menu" },
    ];
    pageHtml = "<html><body><p>Oat flat white and cardamom buns. Open until 18:00.</p></body></html>";
    const body = await (await call(env, "POST", "/api/around/scan", ana, HERE)).json();
    const cafe = body.places[0];
    expect(cafe.fit).toBe("GOOD");
    expect(cafe.talking).toEqual({ level: 5, word: "very chatty" });
    expect(cafe.why_source).toBe("why_go");
    expect(cafe.why).toContain("cardamom");
    expect(cafe.tiny_try).toBe("Ask about the buns.");
    expect(cafe.workings).toContain("compass (cardamom, buns)");
    expect(cafe.here_now).toBe(1);
    expect(cafe.read).toMatchObject({ items: ["Oat flat white"], hours: "Open until 18:00", source: "cafelongue.example" });
  });

  it("rates only where you are checked in, once a week", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    seedPlace(env);
    expect(await (await call(env, "POST", "/api/around/rate", ana, { place_id: "nope", value: 4 })).json()).toMatchObject({ error: "unknown_place" });
    expect(await (await call(env, "POST", "/api/around/rate", ana, { place_id: "cafe", value: 9 })).json()).toMatchObject({ error: "bad_value" });
    expect((await call(env, "POST", "/api/around/rate", ana, { place_id: "cafe", value: 4 })).status).toBe(403);
    checkin(env, ana, "cafe");
    expect((await call(env, "POST", "/api/around/rate", ana, { place_id: "cafe", value: 4 })).status).toBe(200);
    expect(await (await call(env, "POST", "/api/around/rate", ana, { place_id: "cafe", value: 5 })).json()).toMatchObject({ error: "rated_this_week" });
    const rows = env.DB.sqlite.prepare("SELECT value FROM place_ratings").all() as { value: number }[];
    expect(rows).toEqual([{ value: 4 }]);
  });

  it("ten scans an hour, then it rests", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    seedPlace(env);
    for (let i = 0; i < 10; i++) expect((await call(env, "POST", "/api/around/scan", ana, HERE)).status).toBe(200);
    expect((await call(env, "POST", "/api/around/scan", ana, HERE)).status).toBe(429);
  });
});
