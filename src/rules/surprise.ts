// WP34 Surprise Me voice: five fixed questions, each filling a compass
// direction; the fifth lands wherever the words point. Pure. Audio is
// heard, then forgotten: only the words the person sends are used, and
// only the compass lines they keep are saved, as "you said".

import type { CompassLine } from "./compass";
import { screenText } from "./screening";

export const MAX_TURNS = 5;
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

// The five questions, in order. The last one is open: its direction is
// guessed from the person's own words when they answer.
export const QUESTIONS: SurpriseQuestion[] = [
  { q: "What could you talk about for an hour?", part: "interest" },
  { q: "What would you like a little more of?", part: "intention" },
  { q: "What drains you, or what should I leave alone?", part: "filter" },
  { q: "When do you like to be out, alone or with others?", part: "delivery" },
  { q: "Anything else I should know about you?", part: null },
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
