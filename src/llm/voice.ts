// WP26 HEAR IT: Muse Voice Transcribe turns a spoken answer into words.
// The audio goes to Meta once and is never stored, logged or kept in memory
// after the call; the llm_calls row has the latency only.

import type { Env } from "../types";
import { llmEnabled, logCall } from "./client";

export const VOICE_MODEL = "muse-voice-transcribe-1.0";

/** The words in a short mono WAV clip, or null when the model is off or failed. */
export async function transcribe(env: Env, wav: Uint8Array<ArrayBuffer>): Promise<string | null> {
  if (!llmEnabled(env)) return null;
  const started = Date.now();
  let text: string | null = null;
  try {
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify({ mode: "PUSH_TO_TALK", model: VOICE_MODEL, audioEncoding: "WAV" })], { type: "application/json" }));
    form.append("audio", new Blob([wav], { type: "audio/wav" }), "answer.wav");
    const res = await fetch(`${env.META_API_BASE}/asr/transcribe`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.META_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { transcript?: unknown };
      if (typeof body.transcript === "string") text = body.transcript.trim().replace(/\s+/g, " ");
    }
  } catch {
    text = null;
  }
  await logCall(env, { purpose: "hear", latencyMs: Date.now() - started, validated: text !== null, fallback: text === null, promptTokens: null, completionTokens: null, model: VOICE_MODEL });
  return text;
}
