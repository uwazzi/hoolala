// WP26 Surprise Me: a short spoken conversation instead of a web search. Pure.
// Hoolala! asks, the person answers by voice or typing, at most 5 turns.
// Audio is heard, then forgotten: only the words the person sends are used,
// and only the compass lines they confirm are saved, as "you said".

import { type CompassLine, cleanCompass, hasBannedLabel } from "./compass";
import { screenText } from "./screening";

export const MIN_TURNS = 3;
export const MAX_TURNS = 5;
export const MAX_QUESTION = 140;
export const MAX_ANSWER = 300;
export const MAX_IDEAS = 2;
// Muse Voice Transcribe takes mono 16-bit WAV at 16 or 24 kHz. 60 s at 16 kHz is ~1.9 MB.
export const MAX_AUDIO_BYTES = 2_000_000;

export const OPENING = "Hi, I'm Hoolala! What could you talk about for an hour?";

// The no-AI conversation: same opening, then these, in order.
export const SCRIPTED = [
  OPENING,
  "What are you making or working on at the moment?",
  "Who or what has inspired you lately?",
  "What would you like more of in your week?",
  "Anything you'd rather not talk about?",
];

export interface Turn {
  q: string;
  a: string;
}

/** The conversation so far, as the client sends it back. Null when malformed. */
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

export function scriptedQuestion(turns: Turn[]): string | null {
  return isFinished(turns) ? null : SCRIPTED[turns.length];
}

/** A question the model asked: one short line, a real question, nothing about who the person is. */
export function cleanQuestion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = undash(raw).trim().replace(/\s+/g, " ");
  if (q.length < 8 || q.length > MAX_QUESTION || !q.endsWith("?")) return null;
  if (hasBannedLabel(q)) return null;
  return q;
}

// House style: no em or en dashes in anything we show.
const undash = (s: string) => s.replace(/\s*[—–]\s*/g, ", ");

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);

/** A line is "you said" only if it shares a real word with what the person said. */
export function heardIn(line: string, turns: Turn[]): boolean {
  const said = new Set(turns.flatMap((t) => words(t.a)));
  const mine = words(line);
  return mine.length === 0 ? false : mine.some((w) => said.has(w) || [...said].some((s) => s.length >= 5 && (s.startsWith(w) || w.startsWith(s))));
}

/** Model lines kept only when they echo the person's own words; then the usual compass rules. */
export function cleanSurpriseCompass(lines: { part: unknown; text: unknown }[], turns: Turn[]): CompassLine[] {
  const heard = lines.filter((l) => typeof l.text === "string" && heardIn(l.text, turns));
  return cleanCompass(heard.map((l) => ({ ...l, source_url: null })), [], true);
}

/** The playful one-liner: about what they said, never about who they are. */
export function cleanObservation(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = undash(raw).trim().replace(/\s+/g, " ");
  if (text.length < 8 || text.length > 160 || hasBannedLabel(text)) return null;
  return screenText(text, 160).ok ? text : null;
}

/** Topic ideas pass the same screening as any topic. */
export function cleanIdeas(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const text = undash(r).trim().replace(/\s+/g, " ");
    if (hasBannedLabel(text) || !screenText(text, 60).ok || out.includes(text)) continue;
    out.push(text);
    if (out.length === MAX_IDEAS) break;
  }
  return out;
}

// Passions, projects, inspiration, more of, rather not (the labels the reveal shows).
const SCRIPTED_PART = ["interest", "talk_about", "more_of", "more_of", "filter"] as const;

function partFor(q: string): CompassLine["part"] {
  const i = SCRIPTED.indexOf(q);
  if (i >= 0) return SCRIPTED_PART[i];
  return /rather not|avoid|steer clear|not talk/i.test(q) ? "filter" : "interest";
}

/** Without the model: each answer, split on commas, under its question's part. */
export function compassFromTurns(turns: Turn[]): CompassLine[] {
  const lines = turns.flatMap((t) => {
    const part = partFor(t.q);
    return t.a.split(/[,;\n]+|\band\b/).map((x) => x.trim().replace(/[.!]+$/, "")).filter(Boolean).map((text) => ({ part, text }));
  });
  return cleanCompass(lines, [], true);
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
