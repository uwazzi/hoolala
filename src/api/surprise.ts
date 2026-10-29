// WP34 Surprise Me voice: five fixed questions, each filling a compass
// direction. POST /api/me/surprise/hear (audio/wav body) ·
// POST /api/me/surprise/next {turns}
// Stateless: the client holds the conversation and sends it back. Audio is
// transcribed and dropped; answers are never stored. Lines are saved one at
// a time through KEEP (POST /api/me/compass/keep), as "you said".

import { transcribe } from "../llm/voice";
import { llmEnabled } from "../llm/client";
import { SCREEN_MESSAGES } from "../rules/screening";
import { isSpeechWav, MAX_AUDIO_BYTES, needsHelp, questionAt, readTurns } from "../rules/surprise";
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
  const next = questionAt(turns);
  return json(next ? { question: next.q, part: next.part } : { question: null, part: null });
}
