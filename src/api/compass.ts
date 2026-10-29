// WP24 FIND ME and the Personal Compass. WP33 SAY IT YOUR WAY. WP34 Surprise Me keeps.
// POST /api/me/find {consent, name, town, links} · POST /api/me/compass/draft {kept, answers} ·
// POST /api/me/compass/confirm {lines, origin} · GET /api/me/compass ·
// POST /api/me/compass/propose {lineId?, part?, words?, feedback?, reviewed?, fix?} (dry run, never saves) ·
// POST /api/me/compass/confirm_line {lineId, part, words, source?, tryId?} ·
// POST /api/me/compass/keep {part, words} (one new line, Surprise Me) ·
// POST /api/me/compass/undo · GET /api/me/compass/changes · DELETE /api/me/compass/:id · DELETE /api/me/compass
// FIND ME needs consent and looks up only the person: the name must contain
// their own first name. Findings are returned, never stored; nothing is saved
// before LOOKS RIGHT. The compass is only ever returned to its owner.
// SAY IT YOUR WAY never edits the person's words: propose guesses a line
// from their words, confirm saves exactly those words after a tap, and every
// confirm and REMOVE is recorded for one UNDO.

import {
  addCompassLine,
  deleteCompass,
  getCompass,
  getCompassLine,
  latestUndoable,
  markUndone,
  recentChanges,
  recordChange,
  removeCompassLine,
  replaceCompass,
  restoreCompassLine,
  setCompassOrigin,
  updateCompassLine,
} from "../db/compass";
import { llmEnabled, writeWorking } from "../llm/client";
import { draftCompass, type Finding, findMe } from "../llm/findme";
import {
  type Answers,
  changeRemove,
  cleanCompass,
  isOwnName,
  MAX_FINDINGS,
  normalizeLinks,
  normalizeSearchName,
  PARTS,
  partForWords,
  proposeFeedback,
  type TryFeedback,
  validateProposal,
} from "../rules/compass";
import { normalizeLocality } from "../rules/checkin";
import { sourceDomain } from "../rules/grounding";
import type { CompassItemRow, CompassOrigin, CompassPart, Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const FIND_LIMIT = { max: 5, windowS: 24 * 60 * 60 };
const DRAFT_LIMIT = { max: 20, windowS: 60 * 60 };
const PROPOSE_LIMIT = { max: 30, windowS: 60 * 60 };
const KEEP_LIMIT = { max: 30, windowS: 60 * 60 };

const FEEDBACKS: readonly TryFeedback[] = ["went_well", "awkward", "no_reply", "didnt_happen"];

/** A full line snapshot, so UNDO restores direction, text and source exactly. */
function snapshot(r: { part: string; text: string; source_url: string | null; origin: string }): string {
  return JSON.stringify({ part: r.part, text: r.text, sourceUrl: r.source_url, origin: r.origin });
}

function readSnapshot(raw: string | null): { part: string; text: string; sourceUrl: string | null; origin: string } | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { part?: unknown; text?: unknown; sourceUrl?: unknown; origin?: unknown };
    if (!PARTS.includes(s.part as (typeof PARTS)[number]) || typeof s.text !== "string") return null;
    return {
      part: s.part as string,
      text: s.text,
      sourceUrl: typeof s.sourceUrl === "string" ? s.sourceUrl : null,
      origin: typeof s.origin === "string" ? s.origin : "edit",
    };
  } catch {
    return null;
  }
}

function originFor(source: unknown): CompassOrigin {
  return source === "feedback" || source === "delivery" || source === "suggest" ? source : "edit";
}

function view(rows: CompassItemRow[]) {
  return rows.map((r) => ({
    id: r.id,
    part: r.part,
    text: r.text,
    sourceUrl: r.source_url,
    source: r.source_url ? sourceDomain(r.source_url) : "you said",
    origin: r.origin,
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

/**
 * SAY IT YOUR WAY, the dry run. Never saves: guesses a line from the
 * person's words (feedback names become starter words), runs the same
 * validator the confirm uses, and echoes the lines reviewed. A REVIEW tap
 * from Around also marks where those lines were checked.
 */
export async function handlePropose(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (await overLimit(env, `rl:propose:${user.id}`, PROPOSE_LIMIT)) return json({ error: "too_many" }, 429);

  const line = typeof body.lineId === "string" ? await getCompassLine(env.DB, user.id, body.lineId) : null;
  if (typeof body.lineId === "string" && !line) return json({ error: "not_found" }, 404);

  let words = typeof body.words === "string" ? body.words : "";
  let part = PARTS.includes(body.part as CompassPart) ? (body.part as CompassPart) : null;
  if (body.feedback !== undefined) {
    if (!FEEDBACKS.includes(body.feedback as TryFeedback)) return json({ error: "bad_feedback" }, 400);
    const starter = proposeFeedback(body.feedback as TryFeedback);
    words = words.trim() ? words : starter.words;
    part = part ?? starter.part;
  }
  part = part ?? partForWords(words);

  const check = validateProposal(part, words);
  if (!check.ok) return json({ error: check.error, why: check.why }, 422);

  const saw: { part: string; words: string }[] = [];
  const reviewed = Array.isArray(body.reviewed) ? body.reviewed.filter((r): r is string => typeof r === "string").slice(0, 8) : [];
  const reviewOrigin = body.source === "delivery" || body.source === "suggest" ? (body.source as CompassOrigin) : null;
  for (const id of reviewed) {
    const seen = await getCompassLine(env.DB, user.id, id);
    if (!seen) continue;
    saw.push({ part: seen.part, words: seen.text });
    if (reviewOrigin) await setCompassOrigin(env.DB, user.id, id, reviewOrigin);
  }

  return json({
    proposed: { part: check.line!.part, words: check.line!.words, change: { before: line?.text ?? null, after: check.line!.words } },
    saw,
  });
}

/**
 * SAY IT YOUR WAY, the tap. Saves exactly the person's words on the line
 * they picked, and records the change for UNDO. A debrief confirm keeps the
 * try id as its feedback ref and marks the line's origin.
 */
export async function handleConfirmLine(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (typeof body.lineId !== "string") return json({ error: "bad_line" }, 400);
  const check = validateProposal(body.part, body.words);
  if (!check.ok) return json({ error: check.error, why: check.why }, 422);
  const line = await getCompassLine(env.DB, user.id, body.lineId);
  if (!line) return json({ error: "not_found" }, 404);
  const origin = originFor(body.source);
  const after = snapshot({ part: check.line!.part, text: check.line!.words, source_url: line.source_url, origin });
  const tryId = typeof body.tryId === "string" && body.tryId ? body.tryId : null;
  await recordChange(env.DB, user.id, "line", line.id, snapshot(line), after, check.line!.words, tryId, now.toISOString());
  await updateCompassLine(env.DB, user.id, line.id, check.line!.part, check.line!.words, origin);
  return json({ compass: view(await getCompass(env.DB, user.id)) });
}

/**
 * SURPRISE ME, the KEEP tap. Saves one new line from the person's own
 * words, through the same validator the proposal used. Nothing is saved
 * before this tap. Kept lines are removed on the compass screen; they
 * never enter the UNDO log.
 */
export async function handleKeep(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (await overLimit(env, `rl:keep:${user.id}`, KEEP_LIMIT)) return json({ error: "too_many" }, 429);
  const check = validateProposal(body.part, body.words);
  if (!check.ok) return json({ error: check.error, why: check.why }, 422);
  await addCompassLine(env.DB, user.id, check.line!.part, check.line!.words, "questions", now.toISOString());
  return json({ compass: view(await getCompass(env.DB, user.id)) });
}

export async function handleRemoveLine(id: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const line = await getCompassLine(env.DB, user.id, id);
  if (!line) return json({ error: "not_found" }, 404);
  const shape = changeRemove(line.text);
  await recordChange(env.DB, user.id, "remove", line.id, snapshot(line), null, shape.before, null, now.toISOString());
  await removeCompassLine(env.DB, user.id, id);
  return json({ compass: view(await getCompass(env.DB, user.id)) });
}

/** The last three changes for their owner: words before and after, and whether each still stands. */
export async function handleChanges(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const rows = await recentChanges(env.DB, user.id, 3);
  return json({
    changes: rows.map((c) => ({
      id: c.id,
      kind: c.kind,
      words: c.words,
      before: readSnapshot(c.before)?.text ?? c.before,
      after: c.kind === "remove" ? null : (readSnapshot(c.after)?.text ?? c.after),
      undone: c.undone_at !== null,
    })),
  });
}

/** UNDO once restores exactly the last edit: the line's direction, text and source. */
export async function handleUndo(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  for (let tries = 0; tries < 5; tries++) {
    const change = await latestUndoable(env.DB, user.id);
    if (!change) return json({ error: "nothing_to_undo" }, 404);
    const before = change.line_id ? readSnapshot(change.before) : null;
    if (!before) {
      // A row from before snapshots: retire it and look further back.
      await markUndone(env.DB, user.id, change.id, now.toISOString());
      continue;
    }
    await restoreCompassLine(env.DB, user.id, change.line_id!, before.part as (typeof PARTS)[number], before.text, before.sourceUrl, before.origin as CompassOrigin, now.toISOString());
    await markUndone(env.DB, user.id, change.id, now.toISOString());
    return json({ compass: view(await getCompass(env.DB, user.id)), restored: { part: before.part, words: before.text } });
  }
  return json({ error: "nothing_to_undo" }, 404);
}

export async function handleDeleteCompass(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  await deleteCompass(env.DB, user.id);
  return json({ ok: true });
}
