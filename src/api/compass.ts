// The Personal Compass. WP33 SAY IT YOUR WAY. WP36 get personal (FIND ME removed).
// GET /api/me/compass · GET /api/me/compass/people · DELETE /api/me/compass/people/:role ·
// POST /api/me/compass/draft-line {questionId, answer} (dry run, never saves) ·
// POST /api/me/compass/save {lines, people} (LOOKS RIGHT: the one save of onboarding) ·
// POST /api/me/compass/propose {lineId?, part?, words?, feedback?, reviewed?, fix?} (dry run, never saves) ·
// POST /api/me/compass/confirm_line {lineId, part, words, source?, tryId?} ·
// POST /api/me/compass/undo · GET /api/me/compass/changes · DELETE /api/me/compass/:id · DELETE /api/me/compass
// The compass is spoken answers only: drafts are returned, never stored;
// nothing is saved before LOOKS RIGHT. People appear as roles, never names.
// The compass is only ever returned to its owner.
// SAY IT YOUR WAY never edits the person's words: propose guesses a line
// from their words, confirm saves exactly those words after a tap, and every
// confirm and REMOVE is recorded for one UNDO.

import {
  deleteCompass,
  getCompass,
  getCompassLine,
  latestUndoable,
  listCompassPeople,
  markUndone,
  recentChanges,
  recordChange,
  removeCompassLine,
  removeCompassPerson,
  restoreCompassLine,
  saveCompass,
  saveOnboardBits,
  setCompassOrigin,
  updateCompassLine,
} from "../db/compass";
import { draftAnswer } from "../llm/compassdraft";
import {
  changeRemove,
  cleanRole,
  hasBannedLabel,
  PARTS,
  partForWords,
  type PeopleRole,
  proposeFeedback,
  roleClass,
  type TryFeedback,
  validateProposal,
} from "../rules/compass";
import { hasJuicyName, JUICY_ROLES, MAX_LINE as JUICY_LINE, OFFTABLE_CHIPS } from "../rules/juicy";
import { FAMILY_ROLES } from "../rules/tries";
import { SCREEN_MESSAGES, screenText } from "../rules/screening";
import { MAX_ANSWER, QUESTIONS } from "../rules/surprise";
import { sourceDomain } from "../rules/grounding";
import type { CompassItemRow, CompassOrigin, CompassPart, Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const DRAFT_LINE_LIMIT = { max: 30, windowS: 60 * 60 };
const SAVE_LIMIT = { max: 30, windowS: 60 * 60 };
const PROPOSE_LIMIT = { max: 30, windowS: 60 * 60 };

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
 * GET PERSONAL, one answer: draft its compass line with topic, place, pace
 * and people. Dry run, never saves. The server retries a bad draft once,
 * then falls back to the trimmed answer with keyword roles.
 */
export async function handleDraftLine(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const index = ["q1", "q2", "q3"].indexOf(questionId);
  if (index < 0) return json({ error: "bad_question" }, 400);
  const answer = typeof body.answer === "string" ? body.answer.trim().replace(/\s+/g, " ") : "";
  if (!answer || answer.length > MAX_ANSWER) return json({ error: "bad_answer" }, 400);
  const screen = screenText(answer, MAX_ANSWER);
  if (!screen.ok) {
    if (screen.category === "crisis") return json({ error: "crisis", why: SCREEN_MESSAGES.crisis }, 422);
    if (screen.category === "dating") return json({ error: "not_allowed", why: SCREEN_MESSAGES.dating }, 422);
    return json({ error: "not_allowed", why: SCREEN_MESSAGES[screen.category ?? "length"] }, 422);
  }
  if (await overLimit(env, `rl:draftline:${user.id}`, DRAFT_LINE_LIMIT)) return json({ error: "too_many" }, 429);
  const question = QUESTIONS[index];
  const { draft, fallback } = await draftAnswer(env, user.id, { id: questionId, part: question.part!, text: question.q }, answer);
  return json({ draft, fallback });
}

/**
 * LOOKS RIGHT: the one save of onboarding. Validates every line and role
 * again, then stores them. Empty saves are a no-op. WP39 also accepts the
 * kept-bits extras (battery, offtable, nearlySaid) for the game; a save that
 * sends none keeps the stored bits.
 */
export async function handleSave(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (!Array.isArray(body.lines) || body.lines.length > 8 || (body.people !== undefined && !Array.isArray(body.people))) {
    return json({ error: "bad_lines" }, 400);
  }
  const bits = readBits(body);
  if (!bits.ok) return json(bits.error.status === 400 ? { error: bits.error.error } : bits.error, bits.error.status);
  const lines: { part: CompassPart; words: string }[] = [];
  for (const l of body.lines) {
    const check = validateProposal((l as { part?: unknown })?.part, (l as { words?: unknown })?.words);
    if (!check.ok) return json({ error: check.error, why: check.why }, 422);
    lines.push(check.line!);
  }
  const people: { role: string; roleClass: string }[] = [];
  for (const p of body.people ?? []) {
    const role = cleanAnyRole(typeof p === "string" ? p : (p as { role?: unknown })?.role);
    if (!role) return json({ error: "bad_role", why: "People are saved as roles only." }, 422);
    if (!people.some((x) => x.role === role.role)) people.push(role);
  }
  const kept = bits.value ? people.filter((p) => !(bits.value!.offtable.includes("FAMILY") && FAMILY_ROLES.includes(p.role)) && !(bits.value!.offtable.includes("WORK") && p.role === "colleague")) : people;
  if (await overLimit(env, `rl:save:${user.id}`, SAVE_LIMIT)) return json({ error: "too_many" }, 429);
  await saveCompass(env.DB, user.id, lines, kept, now.toISOString());
  if (bits.value) await saveBits(env, user.id, bits.value, now.toISOString());
  return json({ compass: view(await getCompass(env.DB, user.id)), people: kept.map((p) => ({ role: p.role })) });
}

const BATTERIES = ["LOW", "OK", "GOOD", "FULL"];
const JUICY_ROLE_CLASS: Record<string, string> = {
  grandparent: "close",
  family: "close",
  flatmate: "close",
  colleague: "close",
  waiter: "service",
  cashier: "service",
  librarian: "service",
  "shop staff": "service",
  "a regular": "close",
};

/** A proposed role folded to the v6.2 or juicy allow-list, with its class. Names never survive. */
function cleanAnyRole(raw: unknown): { role: string; roleClass: string } | null {
  if (typeof raw === "string" && (JUICY_ROLES as readonly string[]).includes(raw.trim().toLowerCase())) {
    const role = raw.trim().toLowerCase();
    return { role, roleClass: JUICY_ROLE_CLASS[role] ?? roleClass(role as PeopleRole) };
  }
  const role = cleanRole(raw);
  return role ? { role, roleClass: roleClass(role) } : null;
}

interface SaveBits {
  battery: string | null;
  offtable: string[];
  nearlySaid: { line: string; toRole: string | null } | null;
}

type BitsResult = { ok: true; value: SaveBits | null } | { ok: false; error: { error: string; why?: string; status: number } };

/** The kept-bits extras: absent entirely when an older client saves, validated when present. */
function readBits(body: Record<string, unknown>): BitsResult {
  if (body.battery === undefined && body.offtable === undefined && body.nearlySaid === undefined) return { ok: true, value: null };
  const battery = body.battery ?? null;
  if (battery !== null && (typeof battery !== "string" || !BATTERIES.includes(battery))) return { ok: false, error: { error: "bad_bits", status: 400 } };
  const offtable = body.offtable ?? [];
  if (!Array.isArray(offtable) || !offtable.every((c): c is string => typeof c === "string" && (OFFTABLE_CHIPS as readonly string[]).includes(c))) {
    return { ok: false, error: { error: "bad_bits", status: 400 } };
  }
  const raw = body.nearlySaid ?? null;
  let nearlySaid: SaveBits["nearlySaid"] = null;
  if (raw !== null) {
    if (!raw || typeof raw !== "object") return { ok: false, error: { error: "bad_bits", status: 400 } };
    const { line, toRole } = raw as { line?: unknown; toRole?: unknown };
    if (typeof line !== "string" || line.trim().length < 1 || line.length > JUICY_LINE) return { ok: false, error: { error: "bad_bits", status: 400 } };
    if (toRole !== null && (typeof toRole !== "string" || !(JUICY_ROLES as readonly string[]).includes(toRole.trim().toLowerCase()))) {
      return { ok: false, error: { error: "bad_bits", status: 400 } };
    }
    const screen = screenText(line.trim(), JUICY_LINE);
    if (!screen.ok || hasBannedLabel(line) || hasJuicyName(line)) {
      return { ok: false, error: { error: "not_allowed", why: "People are saved as roles only, never names.", status: 422 } };
    }
    nearlySaid = { line: line.trim().replace(/\s+/g, " "), toRole: toRole === null ? null : (toRole as string).trim().toLowerCase() };
  }
  return { ok: true, value: { battery, offtable, nearlySaid } };
}

async function saveBits(env: Env, userId: string, bits: SaveBits, nowIso: string): Promise<void> {
  await saveOnboardBits(env.DB, userId, bits, nowIso);
}

export async function handlePeople(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  return json({ people: (await listCompassPeople(env.DB, user.id)).map((p) => ({ role: p.role })) });
}

export async function handleRemovePerson(role: string, request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (!cleanRole(role)) return json({ error: "bad_role" }, 400);
  if (!(await removeCompassPerson(env.DB, user.id, cleanRole(role)!))) return json({ error: "not_found" }, 404);
  return json({ people: (await listCompassPeople(env.DB, user.id)).map((p) => ({ role: p.role })) });
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
