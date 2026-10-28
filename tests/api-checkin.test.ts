import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, sha256Hex } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T12:00:00.000Z";

// Lausanne: a café at Place de la Palud, a person 40 m away, another 400 m away.
const CAFE = { lat: 46.5222, lng: 6.6339 };
const NEAR = { lat: 46.5222, lng: 6.63442 };
const FAR = { lat: 46.5222, lng: 6.6392 };

type Env = ReturnType<typeof testEnv>;

/** Map provider fake: Overpass answers with these elements; Google with these places. */
let overpass: unknown[] = [];
let google: unknown[] = [];
let providerCalls: string[] = [];

beforeEach(() => {
  overpass = [];
  google = [];
  providerCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      providerCalls.push(String(url));
      if (String(url).includes("overpass")) {
        const query = decodeURIComponent(String(init?.body ?? "").replace(/^data=/, ""));
        const byId = /^\[out:json\]\[timeout:5\];(node|way|relation)\((\d+)\)/.exec(query);
        const elements = byId
          ? (overpass as { type: string; id: number }[]).filter((e) => e.type === byId[1] && String(e.id) === byId[2])
          : overpass;
        return Response.json({ elements });
      }
      if (String(url).includes("places.googleapis.com")) {
        if (String(url).endsWith(":searchNearby")) return Response.json({ places: google });
        const id = String(url).split("/places/")[1];
        const found = (google as { id: string }[]).find((p) => p.id === id);
        return found ? Response.json(found) : new Response("{}", { status: 404 });
      }
      return new Response("{}", { status: 500 });
    }),
  );
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function person(env: Env, name = "Ana") {
  const id = crypto.randomUUID();
  env.DB.sqlite
    .prepare("INSERT INTO users (id, email, first_name, is_adult, created_at) VALUES (?, ?, ?, 1, ?)")
    .run(id, `${id}@example.com`, name, NOW);
  const token = await createSession(env, id, new Date(NOW));
  return { id, cookie: `hoolala_session=${token}` };
}

function addCafe(env: Env, extra: Record<string, unknown> = {}) {
  const row = { id: "p-cafe", slug: "cafe-palud", name: "Café de la Palud", kind: "cafe", city: "lausanne", ...CAFE, code: null, poster_key_hash: null, osm_id: null, ...extra };
  env.DB.sqlite
    .prepare(
      "INSERT INTO places (id, slug, name, kind, city, lat, lng, code, poster_key_hash, osm_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)",
    )
    .run(row.id, row.slug, row.name, row.kind, row.city, row.lat, row.lng, row.code, row.poster_key_hash, row.osm_id, NOW);
  return row;
}

function call(env: Env, method: string, path: string, cookie?: string, body?: unknown) {
  return worker.fetch(
    new Request(`${BASE}${path}`, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    ctx,
  );
}

const rows = (env: Env, sql: string) => env.DB.sqlite.prepare(sql).all() as Record<string, unknown>[];

/** True when no stored value in the database matches the person's coordinates. */
function noPersonCoordinates(env: Env, p: { lat: number; lng: number }) {
  for (const table of ["checkins", "checkin_attempts", "users", "sessions"]) {
    const dump = JSON.stringify(rows(env, `SELECT * FROM ${table}`));
    expect(dump).not.toContain(String(p.lat));
    expect(dump).not.toContain(String(p.lng));
  }
  for (const key of env.SESSIONS.store.keys()) {
    expect(env.SESSIONS.store.get(key)).not.toContain(String(p.lng));
  }
}

describe("signed out", () => {
  it("refuses every check-in endpoint", async () => {
    const env = testEnv();
    for (const [m, path] of [["POST", "/api/places/nearby"], ["GET", "/api/places/search?q=ca&city=lausanne"], ["POST", "/api/places"], ["POST", "/api/checkin"], ["GET", "/api/checkin"], ["POST", "/api/checkin/leave"]]) {
      expect((await call(env, m, path, undefined, m === "POST" ? {} : undefined)).status).toBe(401);
    }
  });
});

describe("POST /api/places/nearby", () => {
  it("lists Hoolala! places first, then map places, by band and never with coordinates", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    overpass = [{ type: "node", id: 42, lat: 46.52235, lon: 6.63395, tags: { amenity: "bar", name: "Le Bourg" } }];
    const res = await call(env, "POST", "/api/places/nearby", ana.cookie, NEAR);
    const body = await res.json();
    expect(body.city).toBe("lausanne");
    expect(body.places.map((p: { name: string }) => p.name)).toEqual(["Café de la Palud", "Le Bourg"]);
    expect(body.places[0]).toEqual({ ref: { id: "p-cafe" }, name: "Café de la Palud", kind: "cafe", band: "here", source: "hoolala" });
    expect(body.places[1].ref).toEqual({ provider: "osm", externalId: "node/42" });
    expect(JSON.stringify(body)).not.toMatch(/"lat"|"lng"/);
    noPersonCoordinates(env, NEAR);
  });

  it("leaves out places beyond 150 m and map places already in Hoolala!", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env, { osm_id: "node/7" });
    overpass = [
      { type: "node", id: 7, lat: CAFE.lat, lon: CAFE.lng, tags: { amenity: "cafe", name: "Café de la Palud" } },
      { type: "node", id: 8, lat: 46.5222, lon: 6.6445, tags: { amenity: "cafe", name: "Far away" } },
    ];
    const body = await (await call(env, "POST", "/api/places/nearby", ana.cookie, FAR)).json();
    expect(body.places).toEqual([]);
  });

  it("still answers when the map is down", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("down"); }));
    const body = await (await call(env, "POST", "/api/places/nearby", ana.cookie, NEAR)).json();
    expect(body.places).toHaveLength(1);
  });

  it("refuses coordinates that aren't numbers", async () => {
    const env = testEnv();
    const ana = await person(env);
    expect((await call(env, "POST", "/api/places/nearby", ana.cookie, { lat: "46.5", lng: 6.6 })).status).toBe(400);
  });
});

describe("POST /api/checkin by location", () => {
  it("checks in within the radius for 4 hours, storing no coordinates", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    const res = await call(env, "POST", "/api/checkin", ana.cookie, { placeId: "p-cafe", ...NEAR });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkin).toEqual({
      place: { id: "p-cafe", slug: "cafe-palud", name: "Café de la Palud", kind: "cafe" },
      method: "location",
      endsAt: "2026-10-28T16:00:00.000Z",
    });
    noPersonCoordinates(env, NEAR);
  });

  it("refuses out of radius and logs only method, ok and reason", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    const res = await call(env, "POST", "/api/checkin", ana.cookie, { placeId: "p-cafe", ...FAR });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "too_far" });
    expect(rows(env, "SELECT COUNT(*) AS n FROM checkins")[0].n).toBe(0);
    const attempts = rows(env, "SELECT * FROM checkin_attempts");
    expect(attempts).toHaveLength(1);
    expect(Object.keys(attempts[0]).sort()).toEqual(["created_at", "id", "method", "ok", "place_id", "reason"]);
    expect(attempts[0]).toMatchObject({ method: "location", ok: 0, reason: "no_places_nearby" });
  });

  it("keeps one active check-in per person and hides their signals at the old place", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    addCafe(env, { id: "p-two", slug: "two", name: "Second Café", lat: 46.52225, lng: 6.6340 });
    await call(env, "POST", "/api/checkin", ana.cookie, { placeId: "p-cafe", ...NEAR });
    env.DB.sqlite
      .prepare("INSERT INTO signals (id, owner_id, audience, place_id, topic, capacity, created_at, expires_at, state) VALUES ('s1', ?, 'place', 'p-cafe', 'Chess?', 2, ?, '2026-10-28T13:00:00.000Z', 'open')")
      .run(ana.id, NOW);
    await call(env, "POST", "/api/checkin", ana.cookie, { placeId: "p-two", ...NEAR });
    const open = rows(env, "SELECT place_id FROM checkins WHERE left_at IS NULL");
    expect(open).toEqual([{ place_id: "p-two" }]);
    expect(rows(env, "SELECT state FROM signals")[0].state).toBe("expired");
    expect((await (await call(env, "GET", "/api/checkin", ana.cookie)).json()).checkin.place.id).toBe("p-two");
  });
});

describe("picking a map place", () => {
  it("re-fetches an OSM place by id and saves OSM's own coordinates, not the person's", async () => {
    const env = testEnv();
    const ana = await person(env);
    overpass = [{ type: "node", id: 42, lat: 46.52235, lon: 6.63395, tags: { amenity: "bar", name: "Le Bourg" } }];
    const res = await call(env, "POST", "/api/checkin", ana.cookie, { external: { provider: "osm", id: "node/42" }, ...NEAR });
    expect(res.status).toBe(200);
    const place = rows(env, "SELECT name, kind, city, lat, lng, osm_id, google_place_id, added_by FROM places")[0];
    expect(place).toEqual({ name: "Le Bourg", kind: "bar", city: "lausanne", lat: 46.52235, lng: 6.63395, osm_id: "node/42", google_place_id: null, added_by: null });
    noPersonCoordinates(env, NEAR);
  });

  it("ignores a name or location the client invents", async () => {
    const env = testEnv();
    const ana = await person(env);
    overpass = [{ type: "node", id: 42, lat: 46.52235, lon: 6.63395, tags: { amenity: "bar", name: "Le Bourg" } }];
    await call(env, "POST", "/api/checkin", ana.cookie, { external: { provider: "osm", id: "node/42", name: "Fake" }, ...NEAR });
    expect(rows(env, "SELECT name FROM places")[0].name).toBe("Le Bourg");
    const far = await call(env, "POST", "/api/checkin", (await person(env, "Ben")).cookie, { external: { provider: "osm", id: "node/99" }, ...NEAR });
    expect(far.status).toBe(404);
  });

  it("stores only the Google place id, never Google's name source or coordinates", async () => {
    const env = testEnv({ PLACES_PROVIDER: "google", GOOGLE_MAPS_KEY: "test-google-key" });
    const ana = await person(env);
    google = [{ id: "ChIJgoogleplace01", displayName: { text: "Café Romand" }, primaryType: "cafe", location: { latitude: 46.52221, longitude: 6.63401 } }];
    const res = await call(env, "POST", "/api/checkin", ana.cookie, { external: { provider: "google", id: "ChIJgoogleplace01" }, ...NEAR });
    expect(res.status).toBe(200);
    const place = rows(env, "SELECT lat, lng, google_place_id FROM places")[0];
    expect(place.google_place_id).toBe("ChIJgoogleplace01");
    // The place sits where the person stood, never at Google's coordinates.
    expect(place.lat).toBe(NEAR.lat);
    expect(place.lng).toBe(NEAR.lng);
    expect(JSON.stringify(rows(env, "SELECT * FROM places"))).not.toContain("6.63401");
    // The key travelled in a header, never in a URL.
    expect(providerCalls.join(" ")).not.toContain("test-google-key");
  });
});

describe("ADD THIS PLACE", () => {
  it("saves the place at the person's location, pending points, and checks in", async () => {
    const env = testEnv();
    const ana = await person(env);
    const res = await call(env, "POST", "/api/places", ana.cookie, { name: "Impact Hub", kind: "coworking", ...NEAR });
    expect(res.status).toBe(200);
    expect((await res.json()).checkin.method).toBe("add");
    expect(rows(env, "SELECT name, city, lat, lng, added_by, status FROM places")[0]).toEqual({
      name: "Impact Hub", city: "lausanne", lat: NEAR.lat, lng: NEAR.lng, added_by: ana.id, status: "new",
    });
    expect(rows(env, "SELECT action, points, state FROM place_contributions")).toEqual([{ action: "add_place", points: 10, state: "pending" }]);
  });

  it("refuses homes, addresses and contacts", async () => {
    const env = testEnv();
    const ana = await person(env);
    for (const [name, error] of [["My place", "name_home"], ["Rue de Bourg 12", "name_address"], ["www.cafe.ch", "name_contact"]]) {
      const res = await call(env, "POST", "/api/places", ana.cookie, { name, kind: "cafe", ...NEAR });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(error);
    }
    expect(rows(env, "SELECT COUNT(*) AS n FROM places")[0].n).toBe(0);
  });

  it("checks in at the existing place instead of adding a twin", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    await call(env, "POST", "/api/places", ana.cookie, { name: "café de la palud", kind: "cafe", ...NEAR });
    expect(rows(env, "SELECT COUNT(*) AS n FROM places")[0].n).toBe(1);
  });

  it("activates the place on someone else's first check-in, not the adder's", async () => {
    const env = testEnv();
    const ana = await person(env);
    await call(env, "POST", "/api/places", ana.cookie, { name: "Impact Hub", kind: "coworking", ...NEAR });
    const placeId = rows(env, "SELECT id FROM places")[0].id;
    await call(env, "POST", "/api/checkin", ana.cookie, { placeId, ...NEAR });
    expect(rows(env, "SELECT status FROM places")[0].status).toBe("new");
    const ben = await person(env, "Ben");
    await call(env, "POST", "/api/checkin", ben.cookie, { placeId, ...NEAR });
    expect(rows(env, "SELECT status, first_other_checkin_at FROM places")[0]).toEqual({ status: "active", first_other_checkin_at: NOW });
  });
});

describe("search by name", () => {
  it("finds places only within the chosen city", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    addCafe(env, { id: "p-zh", slug: "zh", name: "Café Zurich", city: "zurich", lat: 47.37, lng: 8.54 });
    const res = await (await call(env, "GET", "/api/places/search?q=caf%C3%A9&city=lausanne", ana.cookie)).json();
    expect(res.places.map((p: { id: string }) => p.id)).toEqual(["p-cafe"]);
    expect((await call(env, "GET", "/api/places/search?q=caf&city=paris", ana.cookie)).status).toBe(400);
  });

  it("checks in without coordinates, but refuses a place outside the city", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    addCafe(env, { id: "p-zh", slug: "zh", name: "Café Zurich", city: "zurich", lat: 47.37, lng: 8.54 });
    expect((await call(env, "POST", "/api/checkin", ana.cookie, { method: "search", placeId: "p-cafe", city: "lausanne" })).status).toBe(200);
    const out = await call(env, "POST", "/api/checkin", ana.cookie, { method: "search", placeId: "p-zh", city: "lausanne" });
    expect(out.status).toBe(403);
    expect(rows(env, "SELECT reason FROM checkin_attempts WHERE ok = 0")[0].reason).toBe("out_of_city");
  });
});

describe("partner code and poster", () => {
  it("checks in with the right code or key only", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env, { code: "PALU", poster_key_hash: await sha256Hex("poster-secret") });
    expect((await call(env, "POST", "/api/checkin", ana.cookie, { code: "palu" })).status).toBe(200);
    expect((await call(env, "POST", "/api/checkin", ana.cookie, { code: "NOPE" })).status).toBe(403);
    expect((await call(env, "POST", "/api/checkin", ana.cookie, { slug: "cafe-palud", key: "poster-secret" })).status).toBe(200);
    expect((await call(env, "POST", "/api/checkin", ana.cookie, { slug: "cafe-palud", key: "guess" })).status).toBe(403);
    expect(rows(env, "SELECT reason FROM checkin_attempts WHERE ok = 0").map((r) => r.reason)).toEqual(["wrong_code", "bad_key"]);
  });
});

describe("leave and peek", () => {
  it("I'M LEAVING ends the check-in", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    await call(env, "POST", "/api/checkin", ana.cookie, { placeId: "p-cafe", ...NEAR });
    await call(env, "POST", "/api/checkin/leave", ana.cookie);
    expect((await (await call(env, "GET", "/api/checkin", ana.cookie)).json()).checkin).toBeNull();
  });

  it("peek is public and shows up to 3 open topics, never people", async () => {
    const env = testEnv();
    const ana = await person(env);
    addCafe(env);
    const insert = env.DB.sqlite.prepare(
      "INSERT INTO signals (id, owner_id, audience, place_id, topic, capacity, created_at, expires_at, state) VALUES (?, ?, 'place', 'p-cafe', ?, 2, ?, ?, ?)",
    );
    for (const [id, topic, exp, state] of [
      ["a", "Chess?", "2026-10-28T13:00:00.000Z", "open"],
      ["b", "Running club", "2026-10-28T13:00:00.000Z", "open"],
      ["c", "Old one", "2026-10-28T11:00:00.000Z", "open"],
      ["d", "Cancelled", "2026-10-28T13:00:00.000Z", "cancelled"],
    ]) insert.run(id, ana.id, topic, NOW, exp, state);
    const res = await call(env, "GET", "/api/places/cafe-palud/peek");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ place: { name: "Café de la Palud", kind: "cafe" }, topics: expect.arrayContaining(["Chess?", "Running club"]) });
    expect(body.topics).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain("Ana");
    expect((await call(env, "GET", "/api/places/nowhere/peek")).status).toBe(404);
  });
});
