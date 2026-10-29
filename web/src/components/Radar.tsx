// WP32 radar (v6.1): the panel sits at the top from the start. Idle: rings,
// the radius label, your square pulsing at the centre. Scanning: the sweep
// turns in place. Then the numbered pins pop in, solid for good fit, dashed
// for low fit, inverted when open. Tap a pin for its card.

interface Pin {
  id: string;
  n: number;
  name: string;
  distance_m: number;
  bearing: number;
  fit: "GOOD" | "OK" | "LOW";
}

interface Props {
  pins: Pin[];
  radiusM: number;
  scanning: boolean;
  openId: string | null;
  onPick: (id: string) => void;
}

const label = (m: number) => (m >= 1000 ? `${m / 1000} KM` : `${m} M`);

export function Radar({ pins, radiusM, scanning, openId, onPick }: Props) {
  const scale = 84 / radiusM;
  return (
    <div class="radar-panel" role="group" aria-label={`Radar, ${pins.length} places within ${label(radiusM)}`}>
      <div class="radar-ring radar-ring--outer" aria-hidden="true" />
      <div class="radar-ring radar-ring--inner" aria-hidden="true" />
      {scanning && <div class="radar-sweep" aria-hidden="true" />}
      <div class="radar-ping" aria-hidden="true" />
      <div class="radar-you" aria-hidden="true" />
      {pins.map((p) => {
        const rad = ((p.bearing % 360) * Math.PI) / 180;
        const d = Math.max(p.distance_m * scale, 18);
        const x = Math.round(Math.sin(rad) * d);
        const y = Math.round(-Math.cos(rad) * d * 0.95);
        const open = openId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            class={`radar-pin fit-${p.fit.toLowerCase()}${open ? " on" : ""}`}
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
            onClick={() => onPick(p.id)}
            aria-label={`${p.n}. ${p.name}`}
          >
            {p.n}
          </button>
        );
      })}
      <span class="radar-tag radar-tag--radius" aria-hidden="true">{label(radiusM)}</span>
      <span class="radar-tag radar-tag--you" aria-hidden="true">YOU ■</span>
    </div>
  );
}
