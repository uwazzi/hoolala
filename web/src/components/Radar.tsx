// WP32 radar: pins placed by bearing and distance, tap a pin for detail.
// The numbered list below stays the full path; pins are real buttons with
// names, so the radar works with a screen reader too.

interface Pin {
  id: string;
  name: string;
  distance_m: number;
  bearing: number;
  fit: "GOOD" | "OK" | "LOW";
}

interface Props {
  pins: Pin[];
  radiusM: number;
  onPick: (id: string) => void;
}

export function Radar({ pins, radiusM, onPick }: Props) {
  return (
    <div class="radar" role="group" aria-label={`Radar, ${pins.length} places within ${radiusM} metres`}>
      <div class="radar-ring radar-ring--half" aria-hidden="true" />
      <div class="radar-cross radar-cross--v" aria-hidden="true" />
      <div class="radar-cross radar-cross--h" aria-hidden="true" />
      <div class="radar-sweep" aria-hidden="true" />
      <span class="radar-north" aria-hidden="true">N</span>
      <span class="radar-you" aria-hidden="true">YOU</span>
      {pins.map((p, i) => {
        const frac = Math.min(1, p.distance_m / radiusM);
        const rad = ((p.bearing % 360) * Math.PI) / 180;
        const x = 50 + frac * 44 * Math.sin(rad);
        const y = 50 - frac * 44 * Math.cos(rad);
        return (
          <button
            key={p.id}
            type="button"
            class={`radar-pin fit-${p.fit.toLowerCase()}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onPick(p.id)}
            aria-label={`${i + 1}. ${p.name}, ${p.distance_m} metres`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
