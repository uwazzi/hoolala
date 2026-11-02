import { describe, expect, it, vi, afterEach } from "vitest";
import { hhmm, locate } from "../web/src/around";

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
