import { describe, expect, it } from "vitest";
import { openLabel, openState, resolveTimeZone } from "../src/rules/hours";

const ZURICH = "Europe/Zurich";
// Thursday 29 Oct 2026, 13:00 in Zurich.
const THU = new Date("2026-10-29T12:00:00.000Z");
// Sunday 1 Nov 2026, 13:00 in Zurich.
const SUN = new Date("2026-11-01T12:00:00.000Z");

describe("opening hours", () => {
  it("reads the common shapes", () => {
    expect(openState("24/7", THU, ZURICH)).toMatchObject({ state: "open", today: "24/7" });
    expect(openState("Mo-Fr 09:00-18:00", THU, ZURICH)).toMatchObject({ state: "open", today: "09:00-18:00" });
    expect(openState("Mo-Fr 09:00-12:00,14:00-18:00", THU, ZURICH)).toMatchObject({ state: "closed", opensAt: "14:00" });
    expect(openState("Sa-Su 10:00-16:00", THU, ZURICH).state).toBe("unknown");
    expect(openState("Su off", SUN, ZURICH)).toMatchObject({ state: "closed", opensAt: null });
    expect(openState("Su off", THU, ZURICH).state).toBe("unknown");
  });

  it("follows overnight hours past midnight", () => {
    const hours = "Fr-Sa 18:00-02:00";
    expect(openState(hours, new Date("2026-10-30T22:00:00.000Z"), ZURICH).state).toBe("open"); // Fri 23:00
    expect(openState(hours, new Date("2026-10-31T00:00:00.000Z"), ZURICH).state).toBe("open"); // Sat 01:00
    expect(openState(hours, new Date("2026-10-31T02:00:00.000Z"), ZURICH)).toMatchObject({ state: "closed", opensAt: "18:00" }); // Sat 03:00
  });

  it("fails open to unknown, never to closed", () => {
    for (const h of [null, "", "fixes needed", "sunrise-sunset", "Mo-Fr", "09:00-18:00", "PH off"]) {
      expect(openState(h, THU, ZURICH).state).toBe("unknown");
    }
  });

  it("evaluates in the place's clock, not the server's", () => {
    const at = new Date("2026-10-29T08:30:00.000Z"); // 09:30 Zurich, 08:30 UTC
    expect(openState("Mo-Fr 09:00-18:00", at, ZURICH).state).toBe("open");
    expect(openState("Mo-Fr 09:00-18:00", at, "UTC").state).toBe("closed");
  });

  it("labels open now and opening within the hour", () => {
    expect(openLabel({ state: "open", opensAt: null, today: "09:00-18:00" }, THU, ZURICH)).toBe("Open now");
    expect(openLabel({ state: "closed", opensAt: "14:00", today: "09:00-12:00,14:00-18:00" }, THU, ZURICH)).toBe("Opens at 14:00");
    expect(openLabel({ state: "closed", opensAt: "15:00", today: "09:00-12:00,15:00-18:00" }, THU, ZURICH)).toBeNull();
    expect(openLabel({ state: "closed", opensAt: null, today: "09:00-18:00" }, THU, ZURICH)).toBeNull();
    expect(openLabel({ state: "unknown", opensAt: null, today: null }, THU, ZURICH)).toBeNull();
  });

  it("resolves the client's time zone or falls back to the pilot's", () => {
    expect(resolveTimeZone("America/New_York")).toBe("America/New_York");
    expect(resolveTimeZone("Mars/Olympus")).toBe("Europe/Zurich");
    expect(resolveTimeZone(null)).toBe("Europe/Zurich");
  });
});
