import { describe, expect, it } from "vitest";
import { TABLE_TOKEN_REFRESH_S, TABLE_TOKEN_WINDOW_S, tableTokenLive, tableTokenPayload } from "../src/rules/table";

describe("table tokens", () => {
  it("lives 60 seconds, refreshing every 30", () => {
    expect(TABLE_TOKEN_WINDOW_S).toBe(60);
    expect(TABLE_TOKEN_REFRESH_S).toBe(30);
    const now = Date.now();
    expect(tableTokenLive(Math.floor(now / 1000) - 59, now)).toBe(true);
    expect(tableTokenLive(Math.floor(now / 1000) - 61, now)).toBe(false);
    expect(tableTokenLive(Math.floor(now / 1000) + 30, now)).toBe(false);
  });

  it("binds the room, the shower and the time in one payload", () => {
    expect(tableTokenPayload("room-1", "user-2", 123)).toBe("room-1.user-2.123");
  });
});
