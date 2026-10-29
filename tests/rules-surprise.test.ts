import { describe, expect, it } from "vitest";
import {
  cleanIdeas,
  cleanObservation,
  cleanQuestion,
  cleanSurpriseCompass,
  compassFromTurns,
  heardIn,
  isFinished,
  isSpeechWav,
  MAX_TURNS,
  needsHelp,
  OPENING,
  readTurns,
  SCRIPTED,
  scriptedQuestion,
} from "../src/rules/surprise";

const turns = [
  { q: OPENING, a: "Chess, and cycling around the lake" },
  { q: "What are you building?", a: "A small app for cafés in Lausanne" },
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

describe("the conversation", () => {
  it("is at most 5 turns, and the scripted one asks in order", () => {
    expect(scriptedQuestion([])).toBe(OPENING);
    expect(scriptedQuestion(turns)).toBe(SCRIPTED[2]);
    const full = SCRIPTED.map((q) => ({ q, a: "x" }));
    expect(isFinished(full)).toBe(true);
    expect(scriptedQuestion(full)).toBeNull();
  });

  it("reads the turns the client sends back, and nothing else", () => {
    expect(readTurns(turns)).toEqual([turns[0], { q: turns[1].q, a: "A small app for cafés in Lausanne" }]);
    expect(readTurns([{ q: "Hi?", a: "  lots   of\nspace " }])).toEqual([{ q: "Hi?", a: "lots of space" }]);
    expect(readTurns("hello")).toBeNull();
    expect(readTurns([{ q: "Hi?" }])).toBeNull();
    expect(readTurns([{ q: "Hi?", a: "x".repeat(301) }])).toBeNull();
    expect(readTurns(Array(MAX_TURNS + 1).fill({ q: "Hi?", a: "x" }))).toBeNull();
  });

  it("keeps a model question only if it's one short real question, never about who you are", () => {
    expect(cleanQuestion(" What got you into chess? ")).toBe("What got you into chess?");
    expect(cleanQuestion("Tell me more.")).toBeNull();
    expect(cleanQuestion(`${"Why ".repeat(40)}?`)).toBeNull();
    expect(cleanQuestion("Would you say you're an introvert?")).toBeNull();
    expect(cleanQuestion(42)).toBeNull();
  });

  it("stops at crisis words", () => {
    expect(needsHelp([{ q: OPENING, a: "honestly I want to die" }])).toBe(true);
    expect(needsHelp(turns)).toBe(false);
  });
});

describe("the surprise", () => {
  it("keeps only lines that echo the person's own words", () => {
    expect(heardIn("Chess", turns)).toBe(true);
    expect(heardIn("Cycling round Lac Léman", turns)).toBe(true);
    expect(heardIn("Building apps for cafés", turns)).toBe(true);
    expect(heardIn("Jazz piano", turns)).toBe(false);
    const lines = cleanSurpriseCompass(
      [
        { part: "interest", text: "Chess" },
        { part: "interest", text: "Your café app" },
        { part: "interest", text: "Jazz piano" },
        { part: "interest", text: "Introverted cycling" },
      ],
      turns,
    );
    expect(lines).toEqual([
      { part: "interest", text: "Chess", sourceUrl: null },
      { part: "interest", text: "Your café app", sourceUrl: null },
    ]);
  });

  it("keeps a playful observation about what was said, not about the person", () => {
    expect(cleanObservation("Chess and cafés: you like a slow game and a good cup.")).toBe("Chess and cafés: you like a slow game and a good cup.");
    expect(cleanObservation("Sounds like an anxious introvert.")).toBeNull();
    expect(cleanObservation("Find me on instagram @ana")).toBeNull();
    expect(cleanObservation("ok")).toBeNull();
    expect(cleanObservation("Chess moves, lake loops — old-school charm!")).toBe("Chess moves, lake loops, old-school charm!");
    expect(cleanQuestion("Chess – since when?")).toBe("Chess, since when?");
  });

  it("gives at most two screened topic ideas", () => {
    expect(cleanIdeas(["Best chess opening for cafés?", "Single and ready to flirt?", "Lake loops by bike", "One more"])).toEqual([
      "Best chess opening for cafés?",
      "Lake loops by bike",
    ]);
    expect(cleanIdeas("nope")).toEqual([]);
  });

  it("without the model, turns the answers into 'you said' lines", () => {
    const scripted = [
      { q: SCRIPTED[0], a: "Chess and cycling." },
      { q: SCRIPTED[1], a: "slow evenings, with one friend" },
      { q: SCRIPTED[3], a: "board game evenings" },
      { q: SCRIPTED[4], a: "work talk" },
      { q: "What got you into chess?", a: "my grandfather" },
      { q: "Anything you'd steer clear of?", a: "football" },
    ];
    expect(compassFromTurns(scripted)).toEqual([
      { part: "interest", text: "Chess", sourceUrl: null },
      { part: "interest", text: "cycling", sourceUrl: null },
      { part: "delivery", text: "slow evenings", sourceUrl: null },
      { part: "delivery", text: "with one friend", sourceUrl: null },
      { part: "intention", text: "board game evenings", sourceUrl: null },
      { part: "filter", text: "work talk", sourceUrl: null },
      { part: "interest", text: "my grandfather", sourceUrl: null },
      { part: "filter", text: "football", sourceUrl: null },
    ]);
  });

  it("covers every direction across the five scripted questions", () => {
    const lines = compassFromTurns(SCRIPTED.map((q) => ({ q, a: "slow chess evenings" })));
    expect(new Set(lines.map((l) => l.part))).toEqual(new Set(["interest", "delivery", "intention", "filter"]));
  });

  it("feeds inspiration to MORE OF, and model-asked how-questions to HOW I GO", () => {
    const lines = compassFromTurns([
      { q: SCRIPTED[2], a: "a street photographer" },
      { q: "Do you walk to places, or take the bus?", a: "mostly walking" },
      { q: "What would you want again next week?", a: "slow coffees" },
    ]);
    expect(lines).toEqual([
      { part: "intention", text: "a street photographer", sourceUrl: null },
      { part: "delivery", text: "mostly walking", sourceUrl: null },
      { part: "intention", text: "slow coffees", sourceUrl: null },
    ]);
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
