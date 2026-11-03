import { readFileSync } from "node:fs";
import { describe, expect, it, vi, afterEach } from "vitest";
import { hhmm, locate, locateReason, LOCATION_BLOCKED_NOTE } from "../web/src/around";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("locate", () => {
  it("makes exactly one geolocation request per call", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: 46.5, longitude: 6.6 } } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    await expect(locate()).resolves.toEqual({ lat: 46.5, lng: 6.6 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("rejects when location is unavailable or refused", async () => {
    vi.stubGlobal("navigator", {});
    await expect(locate()).rejects.toThrow("unavailable");
    const getCurrentPosition = vi.fn((_ok: PositionCallback, fail: PositionErrorCallback) =>
      fail({ code: 1, message: "denied" } as GeolocationPositionError),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    await expect(locate()).rejects.toBeTruthy();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe("hhmm", () => {
  it("reads the local hour and minute", () => {
    const d = new Date("2026-11-02T15:30:00.000Z");
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(hhmm(d.toISOString())).toBe(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  });
});

describe("locateReason", () => {
  it("reads the geolocation error code, denied first", () => {
    expect(locateReason({ code: 1, message: "denied" })).toBe("denied");
    expect(locateReason({ code: 2 })).toBe("unavailable");
    expect(locateReason({ code: 3 })).toBe("timeout");
  });

  it("treats a missing API or unknown failure as unsupported", () => {
    expect(locateReason(new Error("unavailable"))).toBe("unsupported");
    expect(locateReason({})).toBe("unsupported");
    expect(locateReason(null)).toBe("unsupported");
    expect(locateReason(undefined)).toBe("unsupported");
  });

  it("keeps one shared blocked note", () => {
    expect(LOCATION_BLOCKED_NOTE).toBe("Location is blocked in your browser. Allow it in the site settings, then try again.");
  });
});

describe("blocked location guidance", () => {
  const around = readFileSync("web/src/pages/Around.tsx", "utf8");
  const compose = readFileSync("web/src/pages/Compose.tsx", "utf8");
  const room = readFileSync("web/src/pages/Room.tsx", "utf8");

  it("tells denied users how to flip location back on, with a retry", () => {
    expect(around).toContain("locateReason");
    expect(around).toContain("LOCATION IS BLOCKED.");
    expect(around).toContain("Website Settings");
    expect(around).toContain("Permissions, Location, Allow");
    expect(around).toContain("TRY AGAIN");
  });

  it("keeps the plain retry for transient failures", () => {
    expect(around).toContain("NO LOCATION, NO PROBLEM.");
  });

  it("uses the shared blocked note when posting and joining", () => {
    for (const view of [compose, room]) {
      expect(view).toContain("locateReason");
      expect(view).toContain("LOCATION_BLOCKED_NOTE");
    }
  });
});
