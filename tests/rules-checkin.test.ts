import { describe, expect, it } from "vitest";
import {
  checkinEnds,
  cityFor,
  distanceBand,
  distanceM,
  isActive,
  isCity,
  isPlaceKind,
  normalizeCode,
  normalizeQuery,
  parsePoint,
  placeNameProblem,
  slugify,
  withinRadius,
} from "../src/rules/checkin";

// Lausanne, Place de la Palud, and a point about 100 m east.
const palud = { lat: 46.5222, lng: 6.6339 };
const east100 = { lat: 46.5222, lng: 6.63521 };

describe("distance and radius", () => {
  it("measures metres", () => {
    expect(distanceM(palud, palud)).toBe(0);
    expect(distanceM(palud, east100)).toBeGreaterThan(95);
    expect(distanceM(palud, east100)).toBeLessThan(105);
  });

  it("accepts within 150 m, refuses beyond", () => {
    expect(withinRadius(palud, east100)).toBe(true);
    expect(withinRadius(palud, { lat: 46.5222, lng: 6.6365 })).toBe(false);
  });

  it("gives a band, never an exact distance", () => {
    expect(distanceBand(10)).toBe("here");
    expect(distanceBand(120)).toBe("next_door");
  });
});

describe("parsePoint", () => {
  it("keeps real coordinates", () => {
    expect(parsePoint(46.5, 6.6)).toEqual({ lat: 46.5, lng: 6.6 });
  });

  it("refuses strings, NaN and out-of-range values", () => {
    for (const [lat, lng] of [["46.5", 6.6], [NaN, 6.6], [91, 0], [0, 181], [null, null]]) {
      expect(parsePoint(lat, lng)).toBeNull();
    }
  });
});

describe("cities", () => {
  it("finds the city from coordinates", () => {
    expect(cityFor(palud)).toBe("lausanne");
    expect(cityFor({ lat: 47.37, lng: 8.54 })).toBe("zurich");
  });

  it("returns null outside every supported city", () => {
    expect(cityFor({ lat: 46.8, lng: 7.15 })).toBeNull(); // Fribourg
  });

  it("knows which cities exist", () => {
    expect(isCity("lausanne")).toBe(true);
    expect(isCity("paris")).toBe(false);
  });
});

describe("check-in time", () => {
  it("lasts 4 hours", () => {
    expect(checkinEnds(new Date("2026-10-28T12:00:00.000Z"))).toBe("2026-10-28T16:00:00.000Z");
  });

  it("is active until it ends or the person leaves", () => {
    const row = { ends_at: "2026-10-28T16:00:00.000Z", left_at: null };
    expect(isActive(row, new Date("2026-10-28T15:59:59.000Z"))).toBe(true);
    expect(isActive(row, new Date("2026-10-28T16:00:00.000Z"))).toBe(false);
    expect(isActive({ ...row, left_at: "2026-10-28T13:00:00.000Z" }, new Date("2026-10-28T13:30:00.000Z"))).toBe(false);
  });
});

describe("placeNameProblem: public places only", () => {
  it("accepts café, bar and coworking names", () => {
    for (const name of ["Café de Grancy", "Le Bourg", "Impact Hub Lausanne", "Bibliothèque de Chauderon", "42 Café"]) {
      expect(placeNameProblem(name)).toBeNull();
    }
  });

  it("refuses homes", () => {
    for (const name of ["My place", "chez moi", "Hugo's home", "Wohnung Müller"]) {
      expect(placeNameProblem(name)).toBe("home");
    }
  });

  it("refuses street addresses", () => {
    for (const name of ["Rue de Bourg 12", "12 Avenue de la Gare", "Bahnhofstrasse 5"]) {
      expect(placeNameProblem(name)).toBe("address");
    }
  });

  it("refuses links, emails and phone numbers", () => {
    for (const name of ["cafe.ch/menu", "www.cafe.ch", "me@cafe.ch", "Call 079 123 45 67"]) {
      expect(placeNameProblem(name)).toBe("contact");
    }
  });

  it("refuses too short or too long", () => {
    expect(placeNameProblem("A")).toBe("length");
    expect(placeNameProblem("a".repeat(61))).toBe("length");
    expect(placeNameProblem(3)).toBe("length");
  });
});

describe("small formats", () => {
  it("slugs names", () => {
    expect(slugify("Café de Grancy!", "x1y2")).toBe("cafe-de-grancy-x1y2");
    expect(slugify("???", "x1y2")).toBe("place-x1y2");
  });

  it("reads four-letter codes", () => {
    expect(normalizeCode(" grnc ")).toBe("GRNC");
    expect(normalizeCode("GRN")).toBeNull();
    expect(normalizeCode("GRN1")).toBeNull();
  });

  it("reads search text", () => {
    expect(normalizeQuery("  grancy ")).toBe("grancy");
    expect(normalizeQuery("g")).toBeNull();
  });

  it("knows place kinds", () => {
    expect(isPlaceKind("coworking")).toBe(true);
    expect(isPlaceKind("home")).toBe(false);
  });
});
