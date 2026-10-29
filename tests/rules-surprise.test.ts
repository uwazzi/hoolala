import { describe, expect, it } from "vitest";
import {
  isFinished,
  isSpeechWav,
  MAX_TURNS,
  needsHelp,
  QUESTIONS,
  questionAt,
  readTurns,
} from "../src/rules/surprise";

const turns = [
  { q: QUESTIONS[0].q, a: "Chess with my neighbour last Tuesday" },
  { q: QUESTIONS[1].q, a: "A supper club, three so far" },
];

function wav(rate = 16000, channels = 1, bits = 16, samples = 160): Uint8Array {
  const bytes = new Uint8Array(44 + samples * 2);
  const v = new DataView(bytes.buffer);
  const put = (at: number, s: string) => [...s].forEach((c, i) => (bytes[at + i] = c.charCodeAt(0)));
  put(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  put(8, "WAVE");
  put(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * channels * (bits / 8), true);
  v.setUint16(32, channels * (bits / 8), true);
  v.setUint16(34, bits, true);
  put(36, "data");
  v.setUint32(40, samples * 2, true);
  return bytes;
}

describe("the three questions", () => {
  it("are asked in order, each filling its direction", () => {
    expect(questionAt([])).toEqual({ q: "When did you last have a good chat with someone? What about?", part: "interest" });
    expect(questionAt(turns)).toEqual({ q: "Who do you bump into in a normal week?", part: "delivery" });
    const full = QUESTIONS.map((q) => ({ q: q.q, a: "x" }));
    expect(isFinished(full)).toBe(true);
    expect(questionAt(full)).toBeNull();
  });

  it("covers talk, making and people", () => {
    expect(QUESTIONS.map((q) => q.part)).toEqual(["interest", "intention", "delivery"]);
  });

  it("reads the turns the client sends back, and nothing else", () => {
    expect(readTurns(turns)).toEqual(turns);
    expect(readTurns([{ q: "Hi?", a: "  lots   of\nspace " }])).toEqual([{ q: "Hi?", a: "lots of space" }]);
    expect(readTurns([{ q: QUESTIONS[0].q, a: "" }])).toEqual([{ q: QUESTIONS[0].q, a: "" }]);
    expect(readTurns("hello")).toBeNull();
    expect(readTurns([{ q: "Hi?" }])).toBeNull();
    expect(readTurns([{ q: "Hi?", a: "x".repeat(301) }])).toBeNull();
    expect(readTurns(Array(MAX_TURNS + 1).fill({ q: "Hi?", a: "x" }))).toBeNull();
  });

  it("stops at crisis words", () => {
    expect(needsHelp([{ q: QUESTIONS[0].q, a: "honestly I want to die" }])).toBe(true);
    expect(needsHelp(turns)).toBe(false);
  });
});

describe("the audio we accept", () => {
  it("is mono 16-bit WAV at 16 or 24 kHz", () => {
    expect(isSpeechWav(wav())).toBe(true);
    expect(isSpeechWav(wav(24000))).toBe(true);
    expect(isSpeechWav(wav(44100))).toBe(false);
    expect(isSpeechWav(wav(16000, 2))).toBe(false);
    expect(isSpeechWav(wav(16000, 1, 8))).toBe(false);
    expect(isSpeechWav(new TextEncoder().encode("not audio at all, just some text here to pad it out"))).toBe(false);
  });

  it("is at most about a minute", () => {
    expect(isSpeechWav(wav(16000, 1, 16, 1_100_000))).toBe(false);
  });
});
