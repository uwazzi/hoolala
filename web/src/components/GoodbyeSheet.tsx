// GOODBYE: the talking sheet shared by Here and Arrive. Five words about
// the place, never people; SKIP stores nothing. The caller rates first
// (the check-in must still be open) and leaves after.
const WORDS = ["mostly quiet", "a little", "sometimes chatty", "often chatty", "very chatty"] as const;

export function GoodbyeSheet({ placeName, onRate }: { placeName: string; onRate: (value: 1 | 2 | 3 | 4 | 5 | null) => void }) {
  return (
    <>
      <p class="lcd-kicker">LEAVING {placeName}</p>
      <h1 class="screen-title">HOW WAS IT FOR TALKING HERE?</h1>
      <ul class="key-list">
        {WORDS.map((label, i) => (
          <li key={label}>
            <button class="lcd-key rate-key" type="button" onClick={() => onRate((i + 1) as 1 | 2 | 3 | 4 | 5)}>
              <span class="meter-bars" aria-hidden="true">{[1, 2, 3, 4, 5].map((b) => <span key={b} class={`meter-bar${b <= i + 1 ? " on" : ""}`} />)}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p class="lcd-small">About the place, never people. Shown only once 3 visits have rated it.</p>
      <ul class="key-list">
        <li><button class="lcd-key" type="button" onClick={() => onRate(null)}>Skip</button></li>
      </ul>
    </>
  );
}
