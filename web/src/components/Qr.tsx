// Shared QR sign: the room topic's code on the table. Rendered with uqr,
// the same renderer the meet flow uses.
import { encode } from "uqr";

export function Qr({ text, label }: { text: string; label: string }) {
  const { data, size } = encode(text, { border: 2 });
  return (
    <svg class="qr qr--table" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width={size} height={size} fill="var(--lcd-surface)" />
      {data.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--lcd-ink)" /> : null)))}
    </svg>
  );
}
