import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "../src/api/session";
import worker from "../src/worker";
import type { ExecutionContext } from "../src/types";
import { testEnv } from "./helpers/env";

const BASE = "https://hoolala.test";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext;
const NOW = "2026-10-28T14:00:00.000Z";
const AI = { LLM_ENABLED: "true", META_API_KEY: "test-meta-key", META_API_BASE: "https://api.meta.test/v1", MUSE_SPARK_MODEL: "muse-spark-1.3" };

type Env = ReturnType<typeof testEnv>;
type Person = { id: string; cookie: string };

/** Fake agent: round 1 calls two tools in parallel, round 2 drafts with `final`. */
let final: Record<string, unknown> = {};
let planRequests: Record<string, unknown>[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  planRequests = [];
  final = { spot: "Outside", time: "2026-10-28T14:12:00.000Z", why: "Quieter, and easy to spot." };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (!String(url).includes("api.meta.test")) return Response.json({ elements: [] });
      const body = JSON.parse(String(init.body));
      if (!body.tools) {
        // SCREEN IT on posting: approve.
        const text = body.messages[1].content;
        return Response.json({ choices: [{ message: { content: JSON.stringify({ verdict: "approve", category: "ok", lang: "en", en: text, fr: text }) } }] });
      }
      planRequests.push(body);
      const round = planRequests.length;
      const toolCalls =
        round === 1
          ? [
              { id: "c1", type: "function", function: { name: "get_signal", arguments: "{}" } },
              { id: "c2", type: "function", function: { name: "get_place_spots", arguments: "{}" } },
            ]
          : [{ id: "c3", type: "function", function: { name: "draft_meeting_point", arguments: JSON.stringify(final) } }];
      return Response.json({ choices: [{ message: { role: "assistant", content: null, tool_calls: toolCalls }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 400, completion_tokens: 60 } });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

/** Ana posts, Ben is accepted, Cleo is around. */
async function scene(envVars: Record<string, string> = AI, accept = true) {
  const env = testEnv(envVars);
  env.DB.sqlite.prepare("INSERT INTO places (id, slug, name, kind, city, lat, lng, status, created_at) VALUES ('cafe', 'cafe', 'Café', 'cafe', 'Lausanne', 46.5222, 6.6339, 'active', ?)").run(NOW);
  const ana = await person(env, "Ana");
  const ben = await person(env, "Ben");
  const cleo = await person(env, "Cleo");
  for (const p of [ana, ben, cleo]) await call(env, "POST", "/api/checkin", p, { placeId: "cafe", lat: 46.5222, lng: 6.63442 });
  const signalId = (await (await call(env, "POST", "/api/here/signals", ana, { topic: "Chess?", when: "in30", spot: "The big table", capacity: 1 })).json()).signal.id;
  await call(env, "POST", `/api/here/signals/${signalId}/curious`, ben);
  if (accept) {
    const req = (await (await call(env, "GET", "/api/here", ana)).json()).mine[0].requests[0];
    await call(env, "POST", `/api/here/responses/${req.id}/accept`, ana);
  }
  return { env, ana, ben, cleo, signalId };
}

const plan = (env: Env, who: Person, id: string) => call(env, "POST", `/api/here/signals/${id}/plan`, who);

describe("PLAN IT drafts", () => {
  it("reads through its tools (two at once), then drafts a real spot and time", async () => {
    const { env, ana, signalId } = await scene();
    const res = await (await plan(env, ana, signalId)).json();
    expect(res).toMatchObject({ source: "ai", draft: { spot: "Outside", time: "2026-10-28T14:15:00.000Z", why: "Quieter, and easy to spot." }, confirmationToken: expect.any(String) });
    expect(planRequests[0]).toMatchObject({ tool_choice: "auto", parallel_tool_calls: true, reasoning_effort: "medium" });
    // Round 2 carries both tool results back, with no names in them.
    const toolMessages = (planRequests[1].messages as { role: string; tool_call_id?: string; content: string }[]).filter((m) => m.role === "tool");
    expect(toolMessages.map((m) => m.tool_call_id)).toEqual(["c1", "c2"]);
    expect(JSON.stringify(planRequests)).not.toMatch(/Ana|Ben|Cleo/);
    const w = env.DB.sqlite.prepare("SELECT function, tools_json, verdict, reasoning_effort FROM workings WHERE function = 'plan'").get();
    expect(w).toEqual({ function: "plan", tools_json: '["get_signal","get_place_spots","draft_meeting_point"]', verdict: "draft", reasoning_effort: "medium" });
    // Drafting saved nothing.
    expect(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM meeting_points").get()).toEqual({ n: 0 });
  });

  it("never invents a spot: a made-up one falls back to the poster's own", async () => {
    const { env, ana, signalId } = await scene();
    final = { spot: "Rooftop bar", time: "2026-10-28T14:20:00.000Z", why: "Views." };
    const res = await (await plan(env, ana, signalId)).json();
    expect(res).toMatchObject({ source: "rules", draft: { spot: "The big table", time: "2026-10-28T14:30:00.000Z", why: null } });
  });

  it("drops a 'why' that claims it sent or confirmed anything", async () => {
    const { env, ana, signalId } = await scene();
    final = { spot: "Outside", time: "2026-10-28T14:20:00.000Z", why: "Sent to Ben and confirmed." };
    const res = await (await plan(env, ana, signalId)).json();
    expect(res.draft).toMatchObject({ spot: "Outside", why: null });
  });

  it("works without the model: the poster's own spot and time", async () => {
    const { env, ben, signalId } = await scene({ ...AI, LLM_ENABLED: "false" });
    const res = await (await plan(env, ben, signalId)).json();
    expect(res).toMatchObject({ source: "rules", draft: { spot: "The big table", time: "2026-10-28T14:30:00.000Z" }, workingsId: null });
    expect(planRequests).toHaveLength(0);
  });

  it("is only for the pair, and only after acceptance", async () => {
    const { env, cleo, signalId } = await scene();
    expect((await plan(env, cleo, signalId)).status).toBe(404);
    const before = await scene(AI, false);
    expect((await plan(before.env, before.ana, before.signalId)).status).toBe(404);
    expect((await plan(before.env, before.ben, before.signalId)).status).toBe(404);
  });
});

describe("confirming the meeting point", () => {
  it("CONFIRM saves exactly the draft, once, and only for the person it was drafted for", async () => {
    const { env, ana, ben, signalId } = await scene();
    const { draft, confirmationToken } = await (await plan(env, ana, signalId)).json();
    const confirm = (who: Person, body: Record<string, unknown>) => call(env, "POST", `/api/here/signals/${signalId}/meeting-point`, who, body);
    expect((await confirm(ana, { ...draft, spot: "The big table", confirmationToken })).status).toBe(409);
    expect((await confirm(ben, { ...draft, confirmationToken })).status).toBe(409);
    const ok = await (await confirm(ana, { ...draft, confirmationToken })).json();
    expect(ok.meetingPoint).toEqual({ spot: "Outside", time: "2026-10-28T14:15:00.000Z", proposedBy: "agent" });
    expect((await confirm(ana, { ...draft, confirmationToken })).status).toBe(409);
  });

  it("CHANGE lets a person pick a real spot and time themselves", async () => {
    const { env, ben, signalId } = await scene();
    const mp = (body: Record<string, unknown>) => call(env, "POST", `/api/here/signals/${signalId}/meeting-point`, ben, body);
    expect((await mp({ spot: "My flat", time: "2026-10-28T14:20:00.000Z" })).status).toBe(400);
    expect((await mp({ spot: "Outside", time: "2026-10-28T19:00:00.000Z" })).status).toBe(400);
    expect((await (await mp({ spot: "By the window", time: "2026-10-28T14:20:00.000Z" })).json()).meetingPoint).toEqual({
      spot: "By the window",
      time: "2026-10-28T14:20:00.000Z",
      proposedBy: "person",
    });
  });

  it("shows the meeting point to the pair only", async () => {
    const { env, ana, ben, cleo, signalId } = await scene();
    await call(env, "POST", `/api/here/signals/${signalId}/meeting-point`, ana, { spot: "Outside", time: "2026-10-28T14:20:00.000Z" });
    expect((await (await call(env, "GET", "/api/here", ana)).json()).mine[0].meetingPoint).toMatchObject({ spot: "Outside" });
    expect((await (await call(env, "GET", "/api/here", ben)).json()).joined[0].meetingPoint).toMatchObject({ spot: "Outside" });
    // Cleo's screen lists the place's spots for her own posts, but no one's meeting point.
    const cleoView = await (await call(env, "GET", "/api/here", cleo)).json();
    expect(JSON.stringify(cleoView)).not.toMatch(/"meetingPoint":\{/);
    expect(cleoView.discover).toEqual([]);
    expect((await call(env, "POST", `/api/here/signals/${signalId}/meeting-point`, cleo, { spot: "Outside", time: "2026-10-28T14:20:00.000Z" })).status).toBe(404);
  });
});
