import { beforeEach, describe, expect, it } from "vitest";
import {
  addMember,
  addReply,
  closeExpiredRooms,
  createRoom,
  currentMemberIds,
  getMembership,
  getRoom,
  joinsLastHour,
  markLeft,
  markRemoved,
  openRoomsByStarter,
  purgeRooms,
  startsToday,
} from "../src/db/rooms";
import { testEnv } from "./helpers/env";

type Env = ReturnType<typeof testEnv>;

const NOW = "2026-11-02T14:00:00.000Z";
const CELL = { lat: 46.52, lng: 6.632 };

let env: Env;
let seq = 0;

beforeEach(() => {
  env = testEnv();
});

async function user(firstName = "Hugo") {
  seq += 1;
  const id = `user-${seq}`;
  await env.DB.prepare("INSERT INTO users (id, email, first_name, is_adult, created_at, current_step) VALUES (?, ?, ?, 1, ?, 1)")
    .bind(id, `${id}@test.ch`, firstName, NOW)
    .run();
  return id;
}

async function makeRoom(starterId: string, over: { opensAt?: string; endsAt?: string; status?: string } = {}) {
  seq += 1;
  const id = `room-${seq}`;
  await createRoom(env.DB, {
    id,
    starterId,
    topic: "Teach me a two-player game?",
    placeText: "Café du Coin, window table",
    cellLat: CELL.lat,
    cellLng: CELL.lng,
    lang: "en",
    translation: null,
    opensAt: over.opensAt ?? NOW,
    endsAt: over.endsAt ?? "2026-11-02T15:00:00.000Z",
    status: (over.status as "open" | "closed" | "expired") ?? "open",
    createdAt: NOW,
  });
  return id;
}

describe("rooms migration", () => {
  it("creates rooms, room_members and room_replies with a snapped cell, never raw coordinates", async () => {
    const columns = async (table: string) => {
      const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
      return results.map((r) => r.name);
    };
    const roomCols = await columns("rooms");
    expect(roomCols).toContain("cell_lat");
    expect(roomCols).toContain("cell_lng");
    for (const table of ["rooms", "room_members", "room_replies"]) {
      const cols = await columns(table);
      for (const col of cols) {
        expect(col).not.toMatch(/^(lat|lng|latitude|longitude|coords|coordinates|distance)$/);
      }
    }
  });

  it("keeps one row per room and person", async () => {
    const starter = await user();
    const id = await makeRoom(starter);
    await addMember(env.DB, { roomId: id, userId: starter, role: "starter", joinedAt: NOW });
    await expect(addMember(env.DB, { roomId: id, userId: starter, role: "starter", joinedAt: NOW })).rejects.toThrow();
  });
});

describe("rooms repository", () => {
  it("reads rooms, members and current ids", async () => {
    const starter = await user("Hugo");
    const lea = await user("Lea");
    const id = await makeRoom(starter);
    await addMember(env.DB, { roomId: id, userId: starter, role: "starter", joinedAt: NOW });
    await addMember(env.DB, { roomId: id, userId: lea, role: "member", line: "I know a quick one", joinedAt: NOW });
    expect((await getRoom(env.DB, id))?.topic).toBe("Teach me a two-player game?");
    expect(await currentMemberIds(env.DB, id)).toEqual(expect.arrayContaining([starter, lea]));
    expect((await getMembership(env.DB, id, lea))?.line).toBe("I know a quick one");
    expect(await openRoomsByStarter(env.DB, starter)).toBe(1);
  });

  it("removes and re-leaves without telling why", async () => {
    const starter = await user();
    const lea = await user();
    const id = await makeRoom(starter);
    await addMember(env.DB, { roomId: id, userId: starter, role: "starter", joinedAt: NOW });
    await addMember(env.DB, { roomId: id, userId: lea, role: "member", joinedAt: NOW });
    expect(await markRemoved(env.DB, id, lea)).toBe(true);
    expect(await markRemoved(env.DB, id, lea)).toBe(false);
    expect(await currentMemberIds(env.DB, id)).toEqual([starter]);
    expect((await getMembership(env.DB, id, lea))?.removed).toBe(1);
    await markLeft(env.DB, id, starter);
    expect(await currentMemberIds(env.DB, id)).toEqual([]);
  });

  it("stores quick replies by code, no free text", async () => {
    const starter = await user();
    const id = await makeRoom(starter);
    await addReply(env.DB, { id: "reply-1", roomId: id, userId: starter, code: "ON_MY_WAY", createdAt: NOW });
    const { results } = await env.DB.prepare("SELECT code FROM room_replies WHERE room_id = ?").bind(id).all<{ code: string }>();
    expect(results.map((r) => r.code)).toEqual(["ON_MY_WAY"]);
  });

  it("counts starts and joins for the limits", async () => {
    const starter = await user();
    const lea = await user();
    const id = await makeRoom(starter);
    await addMember(env.DB, { roomId: id, userId: starter, role: "starter", joinedAt: NOW });
    await addMember(env.DB, { roomId: id, userId: lea, role: "member", joinedAt: NOW });
    expect(await startsToday(env.DB, starter, "2026-11-02")).toBe(1);
    expect(await joinsLastHour(env.DB, lea, "2026-11-02T13:00:00.000Z")).toBe(1);
    expect(await joinsLastHour(env.DB, lea, NOW)).toBe(0);
  });
});

describe("expiry and retention", () => {
  it("closes open rooms past ends_at", async () => {
    const starter = await user();
    const live = await makeRoom(starter);
    const past = await makeRoom(starter, { endsAt: "2026-11-02T13:00:00.000Z" });
    expect(await closeExpiredRooms(env.DB, NOW)).toBe(1);
    expect((await getRoom(env.DB, live))?.status).toBe("open");
    expect((await getRoom(env.DB, past))?.status).toBe("expired");
  });

  it("deletes rooms, members and replies 24 h after ends_at, with the grid cell", async () => {
    const starter = await user();
    const old = await makeRoom(starter, { endsAt: "2026-11-01T13:00:00.000Z" });
    const fresh = await makeRoom(starter, { endsAt: "2026-11-01T15:00:00.000Z" });
    for (const id of [old, fresh]) {
      await addMember(env.DB, { roomId: id, userId: starter, role: "starter", joinedAt: "2026-11-01T12:00:00.000Z" });
      await addReply(env.DB, { id: `reply-${id}`, roomId: id, userId: starter, code: "AT_THE_SPOT", createdAt: "2026-11-01T12:00:00.000Z" });
    }
    await purgeRooms(env.DB, "2026-11-01T14:00:00.000Z");
    expect(await getRoom(env.DB, old)).toBeNull();
    expect(await getRoom(env.DB, fresh)).not.toBeNull();
    const members = await env.DB.prepare("SELECT COUNT(*) AS n FROM room_members WHERE room_id = ?").bind(old).first<{ n: number }>();
    const replies = await env.DB.prepare("SELECT COUNT(*) AS n FROM room_replies WHERE room_id = ?").bind(old).first<{ n: number }>();
    expect(members?.n).toBe(0);
    expect(replies?.n).toBe(0);
  });
});
