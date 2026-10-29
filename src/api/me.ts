// WP2: the signed-in person. GET /api/me · PATCH /api/me · DELETE /api/me
// WP35: POST /api/me/intro-seen marks the onboarding story watched or skipped.

import { deleteAccount, markIntroSeen, setFirstName, sessionIdsForUser } from "../db/auth";
import { clearSessionCookie, normalizeFirstName } from "../rules/auth";
import type { Env, MeResponse, UserRow } from "../types";
import { json } from "./health";
import { forgetSessions, getSessionUser } from "./session";

function me(user: UserRow): MeResponse {
  return { id: user.id, firstName: user.first_name, isAdult: user.is_adult === 1, introSeen: user.intro_seen_at !== null };
}

export async function handleIntroSeen(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const seen = now.toISOString();
  await markIntroSeen(env.DB, user.id, seen);
  return json(me({ ...user, intro_seen_at: user.intro_seen_at ?? seen }));
}

export async function handleMe(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);

  if (request.method === "GET") return json(me(user));

  if (request.method === "PATCH") {
    let body: { firstName?: unknown } = {};
    try {
      body = (await request.json()) as { firstName?: unknown };
    } catch {
      // Falls through to bad_name.
    }
    const firstName = normalizeFirstName(body?.firstName);
    if (!firstName) return json({ error: "bad_name" }, 400);
    await setFirstName(env.DB, user.id, firstName);
    return json(me({ ...user, first_name: firstName }));
  }

  if (request.method === "DELETE") {
    const sessionIds = await sessionIdsForUser(env.DB, user.id);
    await deleteAccount(env.DB, user.id, user.email, now.toISOString());
    await forgetSessions(env, sessionIds);
    const res = json({ ok: true });
    res.headers.set("set-cookie", clearSessionCookie());
    return res;
  }

  return json({ error: "method_not_allowed" }, 405);
}
