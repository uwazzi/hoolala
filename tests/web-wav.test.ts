import { describe, expect, it } from "vitest";
import { isSpeechWav } from "../src/rules/surprise";
import { downsample, encodeWav, loudness } from "../web/src/wav";

describe("spoken answers in the browser", () => {
  it("are downsampled to 16 kHz", () => {
    const one = new Float32Array(48000).fill(0.5);
    const out = downsample(one, 48000);
    expect(out).toHaveLength(16000);
    expect(out[100]).toBeCloseTo(0.5);
    expect(downsample(one, 16000)).toBe(one);
  });

  it("are encoded as the WAV the server accepts", () => {
    const bytes = encodeWav(new Float32Array([0, 1, -1, 2]));
    expect(isSpeechWav(bytes)).toBe(true);
    const v = new DataView(bytes.buffer);
    expect([v.getInt16(44, true), v.getInt16(46, true), v.getInt16(48, true), v.getInt16(50, true)]).toEqual([0, 32767, -32768, 32767]);
  });

  it("drive the ball by loudness", () => {
    expect(loudness(new Float32Array(10))).toBe(0);
    expect(loudness(new Float32Array(10).fill(0.1))).toBeCloseTo(0.4);
    expect(loudness(new Float32Array(10).fill(1))).toBe(1);
  });
});
