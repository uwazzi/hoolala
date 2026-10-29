// Surprise Me's voice. Hoolala! speaks with the phone's own voice (Meta has no
// text-to-speech); the person's answer is recorded in memory only, as a WAV,
// sent once to be transcribed and dropped. Both drive the pixel ball through
// a shared level from 0 to 1.

import { downsample, encodeWav, loudness } from "./wav";

export interface Level {
  current: number;
}

const MUTE_KEY = "hoolala.voice.muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // A preference, not a promise.
  }
  if (muted) window.speechSynthesis?.cancel();
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
export const canRecord = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Says the text (unless muted) and pulses the level with each word. Muted, or
 * without a voice, the ball still "speaks" at reading pace. Resolves when done.
 */
export function speak(text: string, level: Level, lang = "en-GB"): Promise<void> {
  const words = text.split(/\s+/).filter(Boolean).length;
  const pulseByClock = (ms: number) =>
    new Promise<void>((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        level.current = Math.max(level.current, 0.6 + Math.random() * 0.4);
        if (Date.now() - started >= ms) {
          clearInterval(timer);
          resolve();
        }
      }, 220);
    });

  if (isMuted() || !canSpeak()) return pulseByClock(Math.min(4000, words * 220));
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const say = new SpeechSynthesisUtterance(text);
    say.lang = lang;
    say.rate = 1.05;
    say.pitch = 1.1;
    let boundaries = 0;
    // Some voices never send word boundaries; pulse on a clock instead.
    const fallback = setInterval(() => {
      if (!boundaries && synth.speaking) level.current = Math.max(level.current, 0.5 + Math.random() * 0.5);
    }, 200);
    say.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      boundaries++;
      level.current = 0.7 + Math.random() * 0.3;
    };
    const done = () => {
      clearInterval(fallback);
      resolve();
    };
    say.onend = done;
    say.onerror = done;
    synth.speak(say);
  });
}

export interface Recording {
  stop(): Promise<{ wav: Uint8Array<ArrayBuffer>; seconds: number }>;
  cancel(): void;
}

const MAX_SECONDS = 45;

/** A press shorter than this is a tap: a hint, never sent. */
export const TAP_MS = 400;

export type HoldRelease = "send" | "tap" | "none";

/**
 * What letting go means. Releasing outside the key calls the same
 * release, so it counts as let go. Nothing was heard when the
 * microphone never got ready.
 */
export function holdRelease(pressedAt: number, releasedAt: number, wasReady: boolean): HoldRelease {
  if (!wasReady) return "none";
  return releasedAt - pressedAt < TAP_MS ? "tap" : "send";
}

/** Starts the microphone. Rejects when there's no microphone or the person said no. */
export async function record(level: Level, onTooLong: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const audio = new AudioContext();
  const source = audio.createMediaStreamSource(stream);
  // ScriptProcessor is old but everywhere, and needs no worklet file under our CSP.
  const tap = audio.createScriptProcessor(4096, 1, 1);
  const silent = audio.createGain();
  silent.gain.value = 0;
  const chunks: Float32Array[] = [];
  let length = 0;
  let stopped = false;
  tap.onaudioprocess = (e) => {
    if (stopped) return;
    const chunk = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(chunk);
    length += chunk.length;
    level.current = Math.max(level.current, loudness(chunk));
    if (length / audio.sampleRate > MAX_SECONDS) onTooLong();
  };
  source.connect(tap);
  tap.connect(silent);
  silent.connect(audio.destination);

  const close = () => {
    stopped = true;
    tap.onaudioprocess = null;
    stream.getTracks().forEach((t) => t.stop());
    void audio.close();
  };

  return {
    async stop() {
      close();
      const all = new Float32Array(length);
      let at = 0;
      for (const c of chunks) {
        all.set(c, at);
        at += c.length;
      }
      chunks.length = 0;
      return { wav: encodeWav(downsample(all, audio.sampleRate)), seconds: length / audio.sampleRate };
    },
    cancel() {
      close();
      chunks.length = 0;
    },
  };
}
