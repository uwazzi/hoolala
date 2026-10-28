// WP26 Surprise Me: a short spoken conversation that drafts the compass.
// POST /api/me/surprise/hear (audio/wav body) · POST /api/me/surprise/next {turns} ·
// POST /api/me/surprise/draft {turns}
// Stateless: the client holds the conversation and sends it back. Audio is
// transcribed and dropped; answers are never stored. Lines are saved only
// through LOOKS RIGHT (POST /api/me/compass/confirm), as "you said".

import { llmEnabled } from "../llm/client";
import { nextQuestion, surpriseDraft } from "../llm/surprise";
import { transcribe } from "../llm/voice";
import { SCREEN_MESSAGES } from "../rules/screening";
import { isSpeechWav, MAX_AUDIO_BYTES, needsHelp, readTurns } from "../rules/surprise";
import type { Env } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

const HEAR_LIMIT = { max: 60, windowS: 60 * 60 };
const TALK_LIMIT = { max: 60, windowS: 60 * 60 };

export async function handleHear(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES) return json({ error: "too_long" }, 413);
  const audio = new Uint8Array(await request.arrayBuffer());
  if (audio.length > MAX_AUDIO_BYTES) return json({ error: "too_long" }, 413);
  if (!isSpeechWav(audio)) return json({ error: "bad_audio" }, 400);
  if (!llmEnabled(env)) return json({ error: "ai_off" }, 503);
  if (await overLimit(env, `rl:hear:${user.id}`, HEAR_LIMIT)) return json({ error: "too_many" }, 429);
  const text = await transcribe(env, audio);
  if (text === null) return json({ error: "ai_failed" }, 503);
  return json({ text });
}

export async function handleNext(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const turns = readTurns((await readJson(request)).turns);
  if (!turns) return json({ error: "bad_turns" }, 400);
  if (needsHelp(turns)) return json({ help: SCREEN_MESSAGES.crisis });
  if (await overLimit(env, `rl:talk:${user.id}`, TALK_LIMIT)) return json({ error: "too_many" }, 429);
  return json(await nextQuestion(env, turns));
}

export async function handleSurpriseDraft(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const turns = readTurns((await readJson(request)).turns);
  if (!turns || !turns.some((t) => t.a)) return json({ error: "bad_turns" }, 400);
  if (needsHelp(turns)) return json({ help: SCREEN_MESSAGES.crisis });
  if (await overLimit(env, `rl:talk:${user.id}`, TALK_LIMIT)) return json({ error: "too_many" }, 429);
  const draft = await surpriseDraft(env, turns);
  return json({ ...draft, lines: draft.lines.map((l) => ({ ...l, source: "you said" })) });
}
