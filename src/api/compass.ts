// WP24 FIND ME and the Personal Compass.
// POST /api/me/find {consent, name, town, links} · POST /api/me/compass/draft {kept, answers} ·
// POST /api/me/compass/confirm {lines, origin} · GET /api/me/compass ·
// DELETE /api/me/compass/:id · DELETE /api/me/compass
// FIND ME needs consent and looks up only the person: the name must contain
// their own first name. Findings are returned, never stored; nothing is saved
// before LOOKS RIGHT. The compass is only ever returned to its owner.

import { deleteCompass, getCompass, removeCompassLine, replaceCompass } from "../db/compass";
import { llmEnabled, writeWorking } from "../llm/client";
import { draftCompass, type Finding, findMe } from "../llm/findme";
import { type Answers, cleanCompass, isOwnName, MAX_FINDINGS, normalizeLinks, normalizeSearchName } from "../rules/compass";
import { normalizeLocality } from "../rules/checkin";
import { sourceDomain } from "../rules/grounding";
import type { CompassItemRow, Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const FIND_LIMIT = { max: 5, windowS: 24 * 60 * 60 };
const DRAFT_LIMIT = { max: 20, windowS: 60 * 60 };

function view(rows: CompassItemRow[]) {
  return rows.map((r) => ({
    id: r.id,
    part: r.part,
    text: r.text,
    sourceUrl: r.source_url,
    source: r.source_url ? sourceDomain(r.source_url) : "you said",
  }));
}

export async function handleFind(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (body.consent !== true) return json({ error: "consent_required" }, 400);
  if (!user.first_name) return json({ error: "first_name_required" }, 400);
  const name = normalizeSearchName(body.name);
  if (!name) return json({ error: "bad_name" }, 400);
  // Hoolala! never looks anyone else up.
  if (!isOwnName(name, user.first_name)) return json({ error: "not_you" }, 403);
  const links = normalizeLinks(body.links);
  if (!links) return json({ error: "bad_links" }, 400);
  const town = body.town ? normalizeLocality(body.town) : null;
  if (!llmEnabled(env)) return json({ error: "ai_off" }, 503);
  if (await overLimit(env, `rl:find:${user.id}`, FIND_LIMIT)) return json({ error: "too_many" }, 429);

  const found = await findMe(env, { name, town, links });
  if (!found) return json({ error: "ai_failed" }, 503);
  // CHECK IT records counts only: no URLs, no text, nothing about the person.
  const workingsId = await writeWorking(env, {
    userId: user.id,
    fn: "findme",
    tools: found.searches ? Array(found.searches).fill("web_search") : [],
    grounded: found.findings.length,
    total: found.total,
    effort: "low",
  });
  return json({
    workingsId,
    findings: found.findings.map((f) => ({ text: f.text, url: f.url, source: sourceDomain(f.url) })),
  });
}

function readKept(raw: unknown): Finding[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_FINDINGS) return null;
  const kept: Finding[] = [];
  for (const k of raw) {
    if (!k || typeof k !== "object") return null;
    const { text, url } = k as { text?: unknown; url?: unknown };
    if (typeof text !== "string" || typeof url !== "string" || text.length > 200 || !/^https:\/\//.test(url)) return null;
    kept.push({ text: text.trim(), url });
  }
  return kept;
}

function readAnswers(raw: unknown): Answers {
  const a = (raw ?? {}) as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : undefined);
  return { talk: pick(a.talk), more: pick(a.more), avoid: pick(a.avoid) };
}

/** A draft from what the person ticked and answered. Nothing is saved here. */
export async function handleDraft(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const kept = readKept(body.kept);
  if (!kept) return json({ error: "bad_findings" }, 400);
  if (await overLimit(env, `rl:draft:${user.id}`, DRAFT_LIMIT)) return json({ error: "too_many" }, 429);
  const draft = await draftCompass(env, kept, readAnswers(body.answers));
  return json({
    source: draft.source,
    lines: draft.lines.map((l) => ({ ...l, source: l.sourceUrl ? sourceDomain(l.sourceUrl) : "you said" })),
  });
}

/** LOOKS RIGHT: the person confirms these exact lines; only now is anything saved. */
export async function handleConfirm(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (!Array.isArray(body.lines)) return json({ error: "bad_lines" }, 400);
  const raw = body.lines as { part: unknown; text: unknown; sourceUrl?: unknown }[];
  // Sources here are the ones the person kept on the draft they're confirming.
  const sources = raw.map((l) => l.sourceUrl).filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u));
  const lines = cleanCompass(raw, sources, true);
  if (!lines.length) return json({ error: "bad_lines" }, 400);
  const origin = body.origin === "questions" ? "questions" : "find_me";
  await replaceCompass(env.DB, user.id, lines, origin, now.toISOString());
  return json({ compass: view(await getCompass(env.DB, user.id)) });
}

export async function handleCompass(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  return json({ compass: view(await getCompass(env.DB, user.id)) });
}

export async function handleRemoveLine(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!(await removeCompassLine(env.DB, user.id, id))) return json({ error: "not_found" }, 404);
  return json({ compass: view(await getCompass(env.DB, user.id)) });
}

export async function handleDeleteCompass(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  await deleteCompass(env.DB, user.id);
  return json({ ok: true });
}
