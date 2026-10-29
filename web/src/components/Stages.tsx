// The onboarding progress strip, shared by Surprise me and the game:
// SURPRISE ME · COMPASS · GAME · AROUND?
export const STAGES = ["SURPRISE ME", "COMPASS", "GAME", "AROUND?"];

export function Stages({ now }: { now: number }) {
  return (
    <div class="sm-steps" aria-hidden="true">
      {STAGES.map((label, i) => (
        <span key={label} class={`sm-step${i === now ? " is-now" : i < now ? " is-done" : ""}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
