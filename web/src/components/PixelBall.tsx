// Surprise Me's face: a pixel ball on the LCD that breathes when idle, ripples
// with Hoolala!'s words or the person's voice, and spins a gap while thinking.
// A small canvas scaled up with crisp pixels; colours from the LCD tokens.
import { useEffect, useRef } from "preact/hooks";
import type { Level } from "../voice";

export type BallMode = "idle" | "speaking" | "listening" | "thinking";

const GRID = 28;

interface Props {
  mode: BallMode;
  level: Level;
}

export function PixelBall({ mode, level }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--lcd-ink").trim() || "#182513";
    const faint = css.getPropertyValue("--lcd-sunken").trim() || "#AEC58A";
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let smooth = 0;
    let frame = 0;

    const draw = (t: number) => {
      // Ease towards the level, and let the level fall back on its own.
      smooth += (level.current - smooth) * 0.35;
      level.current *= 0.88;
      const m = modeRef.current;
      const c = (GRID - 1) / 2;
      const breathe = still ? 0 : Math.sin(t / 900) * 0.4;
      const base = m === "idle" ? 8.5 + breathe : 9 + smooth * 3.5;
      ctx.clearRect(0, 0, GRID, GRID);
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const dx = x - c;
          const dy = y - c;
          const d = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          // Voice makes the edge ripple; louder means rougher.
          const ripple = still ? 0 : Math.sin(a * 6 + t / 90) * smooth * 1.6 + Math.sin(a * 11 - t / 130) * smooth * 0.8;
          const r = base + ripple;
          if (d > r) continue;
          if (m === "thinking" && !still) {
            // A gap that goes round in 8 pixel steps.
            const step = (Math.floor(t / 100) % 8) / 8;
            const gap = ((a - step * Math.PI * 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            if (gap < 0.9 && d > r - 4) continue;
          }
          // Listening: a hollow ring with a dot that grows with the voice.
          if (m === "listening" && d < r - 2.2 && d > 2 + smooth * 6) {
            ctx.fillStyle = faint;
          } else {
            ctx.fillStyle = ink;
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // A highlight pixel pair, so it reads as a ball, not a hole.
      if (m !== "listening") {
        ctx.fillStyle = faint;
        ctx.fillRect(Math.round(c - base / 2.4), Math.round(c - base / 2.4), 2, 1);
        ctx.fillRect(Math.round(c - base / 2.4), Math.round(c - base / 2.4) + 1, 1, 1);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [level]);

  return <canvas class="pixel-ball" ref={canvas} width={GRID} height={GRID} aria-hidden="true" />;
}
