// WP39 Snake while you wait: starts by itself, steers on the focused board
// only (arrows and WASD) or the inverted-T buttons, wraps around the walls,
// and shows OOPS. GO AGAIN. on a self-hit. Each food eaten just reveals the
// next kept bit in the ticker; the game keeps nothing.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { newSnake, stepSnake, steerSnake, tickerFor } from "../juicy";
import "../juicy.css";

const STEP_MS = 170;
const STEP_MS_STILL = 260;

const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
  "a": [-1, 0],
  "w": [0, -1],
  "s": [0, 1],
  "d": [1, 0],
};

const PAD: { name: string; d: [number, number]; path: string; col: number; row: number }[] = [
  { name: "Left", d: [-1, 0], path: "M4 0h1v6H4zM3 1h1v4H3zM2 2h1v2H2z", col: 1, row: 2 },
  { name: "Up", d: [0, -1], path: "M0 4h6v1H0zM1 3h4v1H1zM2 2h2v1H2z", col: 2, row: 1 },
  { name: "Down", d: [0, 1], path: "M0 1h6v1H0zM1 2h4v1H1zM2 3h2v1H2z", col: 2, row: 2 },
  { name: "Right", d: [1, 0], path: "M1 0h1v6H1zM2 1h1v4H2zM3 2h1v2H3z", col: 3, row: 2 },
];

export function Snake({ kept }: { kept: string[] }) {
  const [snake, setSnake] = useState(newSnake);
  const boardRef = useRef<HTMLDivElement>(null);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    boardRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSnake((s) => stepSnake(s, Date.now())), still ? STEP_MS_STILL : STEP_MS);
    return () => clearInterval(timer);
  }, [still]);

  function onKey(e: KeyboardEvent) {
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (d) {
      e.preventDefault();
      setSnake((s) => steerSnake(s, d));
    }
  }

  const oops = snake.oops !== false;

  return (
    <>
      <div
        class="jy-board"
        ref={boardRef}
        tabIndex={0}
        onKeyDown={onKey}
        onClick={() => boardRef.current?.focus({ preventScroll: true })}
        aria-label="Snake. Steer with the arrow keys or the buttons below."
      >
        {snake.body.map((b, k) => (
          <div key={`${b[0]}-${b[1]}-${k}`} class={`jy-cell${k === 0 ? " is-head" : ""}`} style={`left:${b[0] * 18 + 1}px;top:${b[1] * 18 + 1}px`} />
        ))}
        <div class="jy-food" style={`left:${snake.food[0] * 18 + 4}px;top:${snake.food[1] * 18 + 4}px`} />
        {oops && <div class="jy-oops">OOPS. GO AGAIN.</div>}
      </div>
      <div class="jy-ticker" aria-live="polite">
        {tickerFor(snake.eaten, kept, oops)}
      </div>
      <div class="jy-spacer" />
      <div class="jy-pad" role="group" aria-label="Snake controls">
        {PAD.map((p) => (
          <button
            key={p.name}
            type="button"
            class="jy-padkey"
            aria-label={p.name}
            onClick={() => setSnake((s) => steerSnake(s, p.d))}
            style={`grid-column:${p.col};grid-row:${p.row}`}
          >
            <svg width="22" height="22" viewBox="0 0 6 6" shape-rendering="crispEdges" aria-hidden="true">
              <path d={p.path} fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
    </>
  );
}
