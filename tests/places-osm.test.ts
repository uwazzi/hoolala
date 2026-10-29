import { describe, expect, it } from "vitest";
import { osmKind, toMapPlace } from "../src/places/osm";

describe("openstreetmap", () => {
  it("maps cafes, bars, libraries and coworking, nothing else", () => {
    expect(osmKind({ amenity: "cafe" })).toBe("cafe");
    expect(osmKind({ amenity: "bar" })).toBe("bar");
    expect(osmKind({ amenity: "pub" })).toBe("bar");
    expect(osmKind({ amenity: "library" })).toBe("library");
    expect(osmKind({ amenity: "coworking_space" })).toBe("coworking");
    expect(osmKind({ office: "coworking" })).toBe("coworking");
    expect(osmKind({ amenity: "casino" })).toBeNull();
    expect(osmKind({ amenity: "nightclub" })).toBeNull();
    expect(osmKind({ amenity: "brothel" })).toBeNull();
    expect(osmKind({ shop: "supermarket" })).toBeNull();
  });

  it("keeps named places with a point and their website", () => {
    expect(
      toMapPlace({ type: "node", id: 1, lat: 46.5, lon: 6.6, tags: { amenity: "cafe", name: "Real Café", website: "https://real.example" } }),
    ).toEqual({ provider: "osm", id: "node/1", name: "Real Café", kind: "cafe", point: { lat: 46.5, lng: 6.6 }, website: "https://real.example" });
    expect(toMapPlace({ type: "way", id: 2, center: { lat: 46.5, lon: 6.6 }, tags: { amenity: "bar", name: "Way Bar" } })?.point).toEqual({
      lat: 46.5,
      lng: 6.6,
    });
    expect(toMapPlace({ type: "node", id: 3, lat: 46.5, lon: 6.6, tags: { amenity: "cafe" } })).toBeNull();
    expect(toMapPlace({ type: "node", id: 4, lat: 46.5, lon: 6.6, tags: { amenity: "casino", name: "Lucky" } })).toBeNull();
  });
});
