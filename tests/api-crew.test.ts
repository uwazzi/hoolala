import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.useRealTimers();
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

async function createCrew(env: Env, who: Person, name = "Morning crew") {
  const res = await call(env, "POST", "/api/crew", who, { name });
  expect(res.status).toBe(200);
  return (await res.json()) as { crew: { id: string; name: string; sharedTry: { id: string; step: number; title: string } }; invite: { token: string; path: string; expiresAt: string } };
}

describe("friends: the private crew", () => {
  it("needs a sign-in everywhere except the invite preview", async () => {
    const env = testEnv();
    expect((await call(env, "GET", "/api/crew")).status).toBe(401);
    expect((await call(env, "POST", "/api/crew", undefined, {})).status).toBe(401);
    expect((await call(env, "POST", "/api/crew/join", undefined, {})).status).toBe(401);
    expect((await call(env, "POST", "/api/crew/posts", undefined, {})).status).toBe(401);
    expect((await call(env, "GET", "/api/crew/join/nope")).status).toBe(404);
  });

  it("creates one crew with a shared try and a 7-day invite", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const made = await createCrew(env, ana);
    expect(made.crew.name).toBe("Morning crew");
    expect(made.crew.sharedTry.step).toBe(1);
    expect(made.invite.path).toBe(`/friends/join?token=${made.invite.token}`);
    expect(made.invite.expiresAt).toBe("2026-11-04T14:00:00.000Z");
    const again = await call(env, "POST", "/api/crew", ana, { name: "Second" });
    expect(again.status).toBe(409);
    expect(await (await call(env, "GET", "/api/crew", ana)).json()).toMatchObject({
      crew: { name: "Morning crew" },
      members: [{ name: "Ana", you: true }],
      posts: [],
    });
  });

  it("screens the crew name like a topic", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const res = await call(env, "POST", "/api/crew", ana, { name: "Singles dating club" });
    expect(res.status).toBe(422);
    expect((await call(env, "GET", "/api/crew", ana)).status).toBe(404);
  });

  it("joins by invite link, once, before it expires", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const made = await createCrew(env, ana);
    expect((await call(env, "POST", "/api/crew/join", ben, { token: "nope" })).status).toBe(404);
    const joined = await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token });
    expect(joined.status).toBe(200);
    const view = await (await call(env, "GET", "/api/crew", ben)).json();
    expect(view.members.map((m: { name: string }) => m.name).sort()).toEqual(["Ana", "Ben"]);
    const twice = await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token });
    expect(twice.status).toBe(409);
  });

  it("refuses expired invites", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const made = await createCrew(env, ana);
    env.DB.sqlite.prepare("UPDATE crew_invites SET expires_at = ?").run("2026-10-28T13:00:00.000Z");
    expect((await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token })).status).toBe(404);
    expect((await call(env, "GET", `/api/crew/join/${made.invite.token}`)).status).toBe(404);
  });

  it("previews the dare to link holders without signing in", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const made = await createCrew(env, ana);
    const preview = await (await call(env, "GET", `/api/crew/join/${made.invite.token}`)).json();
    expect(preview).toMatchObject({ crewName: "Morning crew", inviter: "Ana" });
    expect(preview.sharedTry.title).toEqual(expect.any(String));
  });

  it("a new invite replaces the old link", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const made = await createCrew(env, ana);
    const fresh = await (await call(env, "POST", "/api/crew/invite", ana)).json();
    expect(fresh.invite.token).not.toBe(made.invite.token);
    expect((await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token })).status).toBe(404);
    expect((await call(env, "POST", "/api/crew/join", ben, { token: fresh.invite.token })).status).toBe(200);
  });

  it("posts are for members, screened like topics", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const outsider = await person(env, "Out");
    const made = await createCrew(env, ana);
    await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token });
    expect((await call(env, "GET", "/api/crew", outsider)).status).toBe(404);
    expect((await call(env, "POST", "/api/crew/posts", outsider, { text: "Hi", outcome: "went_well" })).status).toBe(404);
    const dirty = await call(env, "POST", "/api/crew/posts", ben, { text: "Hot singles dating club, join now", outcome: "went_well" });
    expect(dirty.status).toBe(422);
    const posted = await call(env, "POST", "/api/crew/posts", ben, { text: "Said morning to the baker.", outcome: "went_well" });
    expect(posted.status).toBe(200);
    const view = await (await call(env, "GET", "/api/crew", ana)).json();
    expect(view.posts).toHaveLength(1);
    expect(view.posts[0]).toMatchObject({ name: "Ben", outcome: "went_well", text: "Said morning to the baker.", nice: [] });
  });

  it("nice one is a toggle between members, never a count per person", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const outsider = await person(env, "Out");
    const made = await createCrew(env, ana);
    await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token });
    const posted = await (await call(env, "POST", "/api/crew/posts", ben, { text: "Nodded at the bus stop.", outcome: "no_reply" })).json();
    expect((await call(env, "POST", `/api/crew/posts/${posted.post.id}/nice`, outsider)).status).toBe(404);
    const first = await (await call(env, "POST", `/api/crew/posts/${posted.post.id}/nice`, ana)).json();
    expect(first).toEqual({ niced: true, nice: [] });
    const names = await (await call(env, "POST", `/api/crew/posts/${posted.post.id}/nice`, ben)).json();
    expect(names).toEqual({ niced: true, nice: ["Ana"] });
    const second = await (await call(env, "POST", `/api/crew/posts/${posted.post.id}/nice`, ana)).json();
    expect(second).toEqual({ niced: false, nice: ["Ben"] });
  });

  it("leaving and removing end access; the last one out closes the crew", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const made = await createCrew(env, ana);
    await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token });
    await call(env, "POST", "/api/crew/posts", ben, { text: "Morning to the lift.", outcome: "went_well" });
    expect((await call(env, "POST", "/api/crew/remove", ana, { userId: ben.id })).status).toBe(200);
    expect((await call(env, "GET", "/api/crew", ben)).status).toBe(404);
    const view = await (await call(env, "GET", "/api/crew", ana)).json();
    expect(view.members).toHaveLength(1);
    expect(view.posts).toHaveLength(0);
    expect((await call(env, "POST", "/api/crew/leave", ana)).status).toBe(200);
    expect((await call(env, "GET", "/api/crew", ana)).status).toBe(404);
    expect((await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token })).status).toBe(404);
  });

  it("delete account leaves the crew clean", async () => {
    const env = testEnv();
    const ana = await person(env, "Ana");
    const ben = await person(env, "Ben");
    const made = await createCrew(env, ana);
    await call(env, "POST", "/api/crew/join", ben, { token: made.invite.token });
    await call(env, "POST", "/api/crew/posts", ben, { text: "Hello at the corner shop.", outcome: "awkward" });
    expect((await call(env, "DELETE", "/api/me", ben)).status).toBe(200);
    const left = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM crew_members WHERE user_id = ?").get(ben.id) as { n: number };
    const posts = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM crew_posts WHERE user_id = ?").get(ben.id) as { n: number };
    expect(left.n).toBe(0);
    expect(posts.n).toBe(0);
    expect((await (await call(env, "GET", "/api/crew", ana)).json()).members).toHaveLength(1);
  });
});
