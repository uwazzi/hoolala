// v6.4 radar: rings, the radius label, your square pulsing at the centre.
// No pins, no dots for people: the scan finds icebreaker rooms, never
// people. Compact on results. Decorative: screen readers get the text below.

interface Props {
  scanning: boolean;
  compact?: boolean;
  note?: string;
}

export function Radar({ scanning, compact = false, note = "" }: Props) {
  return (
    <div class={`radar-panel${compact ? " radar-panel--compact" : ""}`} aria-hidden="true">
      <div class="radar-ring radar-ring--outer" />
      <div class="radar-ring radar-ring--inner" />
      {scanning && <div class="radar-sweep" />}
      <div class="radar-ping" />
      <div class="radar-you" />
      <span class="radar-tag radar-tag--radius">500 M</span>
      <span class="radar-tag radar-tag--you">YOU ■</span>
      {note && <span class="radar-tag radar-tag--note">{note}</span>}
    </div>
  );
}
