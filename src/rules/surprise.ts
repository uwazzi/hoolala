// Surprise Me voice: three fixed questions, each filling a compass direction.
// Pure. Audio is heard, then forgotten: only the words the person sends are
// used, and only the compass lines they confirm are saved, as "you said".

import type { CompassLine } from "./compass";
import { screenText } from "./screening";

export const MAX_TURNS = 3;
export const MAX_QUESTION = 140;
export const MAX_ANSWER = 300;
// Muse Voice Transcribe takes mono 16-bit WAV at 16 or 24 kHz. 60 s at 16 kHz is ~1.9 MB.
export const MAX_AUDIO_BYTES = 2_000_000;

export interface Turn {
  q: string;
  a: string;
}

export interface SurpriseQuestion {
  q: string;
  part: CompassLine["part"] | null;
}

// The three questions, in order, each filling its direction. Mom Test rules:
// real past moments, never opinions or futures.
export const QUESTIONS: SurpriseQuestion[] = [
  { q: "When did you last have a good chat with someone? What about?", part: "interest" },
  { q: "What did you start, make or get going lately?", part: "intention" },
  { q: "Who do you bump into in a normal week?", part: "delivery" },
];

/** The conversation so far, as the client sends it back. Null when malformed. Skipped questions come back with an empty answer. */
export function readTurns(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_TURNS) return null;
  const turns: Turn[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") return null;
    const { q, a } = t as { q?: unknown; a?: unknown };
    if (typeof q !== "string" || typeof a !== "string" || q.length > MAX_QUESTION + 20 || a.length > MAX_ANSWER) return null;
    turns.push({ q: q.trim(), a: a.trim().replace(/\s+/g, " ") });
  }
  return turns;
}

export function isFinished(turns: Turn[]): boolean {
  return turns.length >= MAX_TURNS;
}

/** The next question with the direction it fills, or null when all five are answered or skipped. */
export function questionAt(turns: Turn[]): SurpriseQuestion | null {
  return isFinished(turns) ? null : QUESTIONS[turns.length];
}

/** Crisis words in an answer stop the conversation with the fixed help message. */
export function needsHelp(turns: Turn[]): boolean {
  return turns.some((t) => screenText(t.a, MAX_ANSWER).category === "crisis");
}

/** RIFF/WAVE, PCM, mono, 16-bit, 16 or 24 kHz, and not too long. */
export function isSpeechWav(bytes: Uint8Array): boolean {
  if (bytes.length < 44 || bytes.length > MAX_AUDIO_BYTES) return false;
  const text = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
  if (text(0) !== "RIFF" || text(8) !== "WAVE" || text(12) !== "fmt ") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const format = view.getUint16(20, true);
  const channels = view.getUint16(22, true);
  const rate = view.getUint32(24, true);
  const bits = view.getUint16(34, true);
  return format === 1 && channels === 1 && bits === 16 && (rate === 16000 || rate === 24000);
}
