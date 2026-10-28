import { Screen } from "../components/Screen";

export function Home() {
  return (
    <Screen
      softkeys={
        <>
          <a class="lcd-softkey" href="/here">Here</a>
          <a class="lcd-softkey" href="/live">Live</a>
        </>
      }
    >
      <div class="obs" aria-live="off">
        <p class="obs-say">We have sat at the same table for six months.</p>
        <p class="obs-happens">Never spoken.</p>
      </div>
      <div class="brand">
        <p class="brand-name">Hoolala!</p>
        <p class="brand-tagline">You never know until you go.</p>
      </div>
      <ul class="key-list">
        <li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li>
        <li><a class="lcd-key" href="/arrive">Where are you?</a></li>
      </ul>
      <p class="lcd-small">Not a dating app. Anonymous until you both say yes.</p>
    </Screen>
  );
}
