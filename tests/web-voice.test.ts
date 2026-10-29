import { afterEach, describe, expect, it, vi } from "vitest";
import { canRecord, holdRelease, isMuted, record, setMuted, speak, TAP_MS, type Level } from "../web/src/voice";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the mic key press", () => {
  it("treats under 400 ms as a tap, never sent", () => {
    expect(TAP_MS).toBe(400);
    expect(holdRelease(1000, 1399, true)).toBe("tap");
    expect(holdRelease(1000, 1400, true)).toBe("send");
    expect(holdRelease(1000, 6000, true)).toBe("send");
  });

  it("sends nothing when the microphone never got ready", () => {
    expect(holdRelease(1000, 6000, false)).toBe("none");
    expect(holdRelease(1000, 1100, false)).toBe("none");
  });

  it("is offered only where a microphone can open", () => {
    expect(canRecord()).toBe(false);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: async () => ({}) } });
    expect(canRecord()).toBe(true);
  });
});

describe("recording", () => {
  function fakeMic() {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const tap = { onaudioprocess: null as null | ((e: { inputBuffer: { getChannelData: () => Float32Array } }) => void), connect() {} };
    const audio = {
      sampleRate: 16000,
      destination: {},
      createMediaStreamSource: () => ({ connect() {} }),
      createScriptProcessor: () => tap,
      createGain: () => ({ gain: { value: 1 }, connect() {} }),
      close: vi.fn(),
    };
    vi.stubGlobal("AudioContext", vi.fn(() => audio));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
    return { track, tap, audio };
  }

  const frame = () => ({ inputBuffer: { getChannelData: () => new Float32Array(4096).fill(0.1) } });

  it("stops the microphone tracks when the answer is sent", async () => {
    const { track, tap, audio } = fakeMic();
    const level: Level = { current: 0 };
    const rec = await record(level, () => {});
    tap.onaudioprocess!(frame());
    expect(level.current).toBeGreaterThan(0);
    const { wav, seconds } = await rec.stop();
    expect(track.stop).toHaveBeenCalled();
    expect(audio.close).toHaveBeenCalled();
    expect(wav.length).toBeGreaterThan(44);
    expect(seconds).toBeCloseTo(4096 / 16000);
  });

  it("stops the microphone tracks when the recording is dropped", async () => {
    const { track, tap } = fakeMic();
    const rec = await record({ current: 0 }, () => {});
    tap.onaudioprocess!(frame());
    rec.cancel();
    expect(track.stop).toHaveBeenCalled();
  });

  it("stops and sends at 45 seconds", async () => {
    const { tap } = fakeMic();
    const tooLong = vi.fn();
    await record({ current: 0 }, tooLong);
    for (let i = 0; i < 175; i++) tap.onaudioprocess!(frame());
    expect(tooLong).not.toHaveBeenCalled();
    for (let i = 0; i < 5; i++) tap.onaudioprocess!(frame());
    expect(tooLong).toHaveBeenCalled();
  });
});

describe("sound", () => {
  function fakePrefs(muted: boolean) {
    const store = new Map<string, string>(muted ? [["hoolala.voice.muted", "1"]] : []);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  }

  it("remembers the sound setting", () => {
    fakePrefs(false);
    vi.stubGlobal("window", { speechSynthesis: { cancel: vi.fn() } });
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
  });

  it("never speaks when sound is off", async () => {
    fakePrefs(true);
    const synth = { speak: vi.fn(), cancel: vi.fn(), speaking: false };
    vi.stubGlobal("window", { speechSynthesis: synth });
    vi.stubGlobal("navigator", {});
    await speak("hello there", { current: 0 });
    expect(synth.speak).not.toHaveBeenCalled();
  });
});
