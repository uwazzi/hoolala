// WP37: your game of tiny tries. POST /api/game writes nine tries (TRY IT
// with the model on, the hand-written library otherwise), POST
// /api/game/new-one replaces one try, POST /api/game/pick stores today's
// try. Code assigns step and minutes, validates every try, and swaps
// rejected drafts for library tries; the model never sets the step.

import { GAME_LIBRARY, type GameLibraryTry } from "../content/tries";
import { getCompass, listCompassPeople } from "../db/compass";
import { gameBelongs, latestPickedGameTry, pickGameTry, saveGameTries, type NewGameTry } from "../db/tries";
import { llmEnabled } from "../llm/client";
import { draftGameTries, draftNewOneTry, type GameDraftTry, type GameInput } from "../llm/tryit";
import {
  fillContext,
  fillGameTry,
  minutesForLevel,
  stepForLevelSlot,
  tabForPace,
  validateGameTry,
  type FillContext,
  type GameCtx,
  type GameKind,
  type GameLevel,
} from "../rules/tries";
import type { D1Database, Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const LEVELS: GameLevel[] = ["soft", "brave", "bold"];
const KINDS: GameKind[] = ["talk", "kind"];
const NEW_GAME_LIMIT = { max: 3, windowS: 24 * 60 * 60 };
const NEW_ONE_LIMIT = { max: 20, windowS: 24 * 60 * 60 };

interface Built {
  level: GameLevel;
  step: number;
  kind: GameKind;
  whoRole: string | null;
  title: string;
  source: "ai" | "library";
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function loadInput(db: D1Database, userId: string): Promise<{ input: GameInput; lines: { part: string; text: string }[] }> {
  const rows = await getCompass(db, userId);
  const lines = rows.filter((r) => r.active).map((r) => ({ part: r.part, text: r.text }));
  const people = await listCompassPeople(db, userId);
  const text = (part: string) => lines.find((l) => l.part === part)?.text ?? null;
  return {
    input: {
      talkAbout: text("interest"),
      moreOf: text("intention"),
      howIGo: text("delivery"),
      lessOf: lines.filter((l) => l.part === "filter").map((l) => l.text),
      roles: people.map((p) => ({ role: p.role, roleClass: p.roleClass })),
    },
    lines,
  };
}

/** The mock's pick: shuffled, first talk, first kind, first other. */
function pickLevel(rows: GameLibraryTry[]): GameLibraryTry[] {
  const order = shuffled(rows);
  const talk = order.find((r) => r.kind === "talk")!;
  const kind = order.find((r) => r.kind === "kind")!;
  const third = order.find((r) => r !== talk && r !== kind)!;
  return shuffled([talk, kind, third]);
}

function libraryTry(row: GameLibraryTry, ctx: FillContext, roles: { role: string; roleClass: string }[], slot: number): Built {
  const filled = fillGameTry(row.template, ctx, row.who, roles, slot);
  return { level: row.level, step: row.step, kind: row.kind, whoRole: filled.whoRole, title: filled.title, source: "library" };
}

/** The first library try at this level and kind whose filled title is new. */
function libraryNewOne(level: GameLevel, kind: GameKind, exclude: string[], ctx: FillContext, roles: { role: string; roleClass: string }[]): Built {
  const rows = shuffled(GAME_LIBRARY.filter((r) => r.level === level && r.kind === kind));
  for (let i = 0; i < rows.length; i++) {
    const built = libraryTry(rows[i], ctx, roles, exclude.length + i);
    if (!exclude.includes(built.title)) return built;
  }
  // Every try shown: repeat the first rather than leave an empty card.
  return libraryTry(rows[0], ctx, roles, exclude.length);
}

function acceptDraft(draft: GameDraftTry, level: GameLevel, kind: GameKind, ctx: GameCtx): boolean {
  return draft.level === level && draft.kind === kind && validateGameTry({ ...draft, place_kind: draft.place_kind ?? null }, ctx) === "ok";
}

async function buildGame(env: Env, userId: string): Promise<{ tries: Built[]; input: GameInput; lines: { part: string; text: string }[] }> {
  const { input, lines } = await loadInput(env.DB, userId);
  const ctx = fillContext(lines);
  const accepted: Built[] = [];
  const shown: string[] = [];
  const useModel = llmEnabled(env) && !(await overLimit(env, `rl:newgame:${userId}`, NEW_GAME_LIMIT));

  let second: GameDraftTry[] | null = null;
  if (useModel) {
    const first = await draftGameTries(env, userId, input);
    if (first) {
      for (const draft of first) {
        if (validateGameTry({ ...draft, place_kind: draft.place_kind ?? null }, { roles: input.roles, lessOf: input.lessOf, exclude: shown }) === "ok") {
          accepted.push({ level: draft.level, kind: draft.kind, whoRole: draft.who_role, title: draft.title, source: "ai", step: 0 });
          shown.push(draft.title);
        }
      }
    }
    if (accepted.length < 9) {
      second = await draftGameTries(env, userId, input);
    }
  }

  const game: Built[] = [];
  for (const level of LEVELS) {
    // At most three per level, whatever the model sent.
    const have = accepted.filter((t) => t.level === level).slice(0, 3);
    for (let slot = have.length; slot < 3; slot++) {
      let filled: Built | null = null;
      if (second) {
        // Second and last model attempt: first valid try at this level.
        const draft = second.find((d) => d.level === level && validateGameTry({ ...d, place_kind: d.place_kind ?? null }, { roles: input.roles, lessOf: input.lessOf, exclude: shown }) === "ok");
        if (draft) {
          second.splice(second.indexOf(draft), 1);
          filled = { level, kind: draft.kind, whoRole: draft.who_role, title: draft.title, source: "ai", step: 0 };
          shown.push(draft.title);
        }
      }
      if (!filled) {
        // Rejected twice (or model off): a library try.
        const rows = pickLevel(GAME_LIBRARY.filter((r) => r.level === level));
        const row = rows.find((r) => !shown.includes(fillGameTry(r.template, ctx, r.who, input.roles, slot).title)) ?? rows[0];
        filled = libraryTry(row, ctx, input.roles, slot);
        shown.push(filled.title);
      }
      have.push(filled);
    }
    // Talk and kind in every level: repair with the library, never a rewrite.
    for (const kind of KINDS) {
      if (!have.some((t) => t.kind === kind)) {
        const rows = GAME_LIBRARY.filter((r) => r.level === level && r.kind === kind);
        have[have.length - 1] = libraryTry(rows[0], ctx, input.roles, have.length - 1);
      }
    }
    have.forEach((t, slot) => {
      if (t.source === "ai") t.step = stepForLevelSlot(level, slot);
      game.push(t);
    });
  }
  return { tries: game, input, lines };
}

export async function handleNewGame(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const gameId = crypto.randomUUID();
  const createdAt = now.toISOString();
  const { tries, input, lines } = await buildGame(env, user.id);
  const rows: NewGameTry[] = tries.map((t) => ({ id: crypto.randomUUID(), userId: user.id, gameId, level: t.level, step: t.step, kind: t.kind, whoRole: t.whoRole, title: t.title, source: t.source, createdAt }));
  await saveGameTries(env.DB, rows);
  return json({
    gameId,
    tries: rows.map((r) => ({ id: r.id, level: r.level, step: r.step, kind: r.kind, who_role: r.whoRole, title: r.title, source: r.source, minutes: minutesForLevel(r.level as GameLevel) })),
    startTab: tabForPace(lines.find((l) => l.part === "delivery")?.text ?? null),
    people: input.roles.map((r) => r.role),
  });
}

export async function handleNewOne(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const { gameId, level, kind, exclude } = body as { gameId?: unknown; level?: unknown; kind?: unknown; exclude?: unknown };
  if (typeof gameId !== "string" || !LEVELS.includes(level as GameLevel) || !KINDS.includes(kind as GameKind)) return json({ error: "bad_try" }, 400);
  if (!Array.isArray(exclude) || !exclude.every((e) => typeof e === "string")) return json({ error: "bad_try" }, 400);
  if (!(await gameBelongs(env.DB, user.id, gameId))) return json({ error: "not_found" }, 404);
  const { input, lines } = await loadInput(env.DB, user.id);
  const ctx: GameCtx = { roles: input.roles, lessOf: input.lessOf, exclude };
  let built: Built | null = null;
  if (llmEnabled(env) && !(await overLimit(env, `rl:newone:${user.id}`, NEW_ONE_LIMIT))) {
    for (let attempt = 0; attempt < 2 && !built; attempt++) {
      const draft = await draftNewOneTry(env, user.id, input, level as GameLevel, kind as GameKind, exclude);
      if (draft && acceptDraft(draft, level as GameLevel, kind as GameKind, ctx)) {
        built = { level: level as GameLevel, step: 0, kind: kind as GameKind, whoRole: draft.who_role, title: draft.title, source: "ai" };
      }
    }
  }
  if (!built) built = libraryNewOne(level as GameLevel, kind as GameKind, exclude, fillContext(lines), input.roles);
  if (built.source === "ai") built.step = stepForLevelSlot(level as GameLevel, exclude.length % 3);
  const row: NewGameTry = { id: crypto.randomUUID(), userId: user.id, gameId, level: built.level, step: built.step, kind: built.kind, whoRole: built.whoRole, title: built.title, source: built.source, createdAt: now.toISOString() };
  await saveGameTries(env.DB, [row]);
  return json({ try: { id: row.id, level: row.level, step: row.step, kind: row.kind, who_role: row.whoRole, title: row.title, source: row.source, minutes: minutesForLevel(row.level as GameLevel) } });
}

export async function handlePick(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  if (typeof body.id !== "string") return json({ error: "bad_try" }, 400);
  const row = await pickGameTry(env.DB, user.id, body.id, now.toISOString());
  if (!row) return json({ error: "not_found" }, 404);
  return json({ ok: true, try: { id: row.id, level: row.level, step: row.step, kind: row.kind, who_role: row.who_role, title: row.title, source: row.source, minutes: minutesForLevel(row.level as GameLevel) } });
}

/** Today's try is the picked game try when there is one. */
export async function pickedTodayTry(db: D1Database, userId: string) {
  const row = await latestPickedGameTry(db, userId);
  if (!row) return null;
  return { id: row.id, step: row.step, place: "anywhere", title: row.title, hint: "", meta: `${minutesForLevel(row.level as GameLevel)} MIN · FROM YOUR GAME`, source: "game", why: null, minutes: minutesForLevel(row.level as GameLevel), words_max: null, asks_of_other: null };
}
