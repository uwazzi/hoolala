import { describe, expect, it, vi } from "vitest";
import { osmKind, osmNearby, toMapPlace } from "../src/places/osm";

describe("openstreetmap", () => {
  it("maps cafes, bars, libraries, coworking, food, shops and outdoors, nothing else", () => {
    expect(osmKind({ amenity: "cafe" })).toBe("cafe");
    expect(osmKind({ amenity: "bar" })).toBe("bar");
    expect(osmKind({ amenity: "pub" })).toBe("bar");
    expect(osmKind({ amenity: "library" })).toBe("library");
    expect(osmKind({ amenity: "coworking_space" })).toBe("coworking");
    expect(osmKind({ office: "coworking" })).toBe("coworking");
    expect(osmKind({ amenity: "restaurant" })).toBe("food");
    expect(osmKind({ amenity: "fast_food" })).toBe("food");
    expect(osmKind({ shop: "supermarket" })).toBe("shop");
    expect(osmKind({ shop: "bakery" })).toBe("shop");
    expect(osmKind({ leisure: "park" })).toBe("outdoors");
    expect(osmKind({ amenity: "cinema" })).toBe("culture");
    expect(osmKind({ tourism: "museum" })).toBe("culture");
    expect(osmKind({ amenity: "marketplace" })).toBe("shop");
    expect(osmKind({ leisure: "swimming_pool" })).toBe("sport");
    expect(osmKind({ amenity: "casino" })).toBeNull();
    expect(osmKind({ amenity: "nightclub" })).toBeNull();
    expect(osmKind({ amenity: "brothel" })).toBeNull();
    expect(osmKind({ shop: "adult" })).toBeNull();
    expect(osmKind({ shop: "tobacco" })).toBeNull();
  });

  it("keeps named places with a point and their website", () => {
    expect(
      toMapPlace({ type: "node", id: 1, lat: 46.5, lon: 6.6, tags: { amenity: "cafe", name: "Real Café", website: "https://real.example", phone: "+41 21 1", opening_hours: "Mo-Fr 09:00-18:00" } }),
    ).toEqual({
      provider: "osm",
      id: "node/1",
      name: "Real Café",
      kind: "cafe",
      point: { lat: 46.5, lng: 6.6 },
      website: "https://real.example",
      phone: "+41 21 1",
      hours: "Mo-Fr 09:00-18:00",
    });
    expect(toMapPlace({ type: "way", id: 2, center: { lat: 46.5, lon: 6.6 }, tags: { amenity: "bar", name: "Way Bar" } })?.point).toEqual({
      lat: 46.5,
      lng: 6.6,
    });
    expect(toMapPlace({ type: "node", id: 3, lat: 46.5, lon: 6.6, tags: { amenity: "cafe" } })).toBeNull();
    expect(toMapPlace({ type: "node", id: 4, lat: 46.5, lon: 6.6, tags: { amenity: "casino", name: "Lucky" } })).toBeNull();
  });

  it("asks for food, shops and outdoors too", async () => {
    let query = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        query = String(init?.body ?? "");
        return Response.json({ elements: [] });
      }),
    );
    try {
      expect(await osmNearby({ lat: 46.5, lng: 6.6 }, 500)).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
    for (const kind of ["restaurant", "fast_food", "supermarket", "bakery", "park", "cinema", "museum", "swimming_pool", "marketplace"]) {
      expect(query).toContain(kind);
    }
    expect(query).not.toContain("casino");
  });
});
