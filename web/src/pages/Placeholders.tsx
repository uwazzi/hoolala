// Honest placeholders until their work package lands.
import { Screen } from "../components/Screen";

export function Meet() {
  return (
    <Screen title="Meet">
      <h1 class="screen-title">Meet</h1>
      <div class="lcd-block">
        <p>Two phones, one mutual QR, both agree. That is how a signal becomes a real conversation.</p>
      </div>
      <p class="lcd-small">Meeting lands on Sat (WP5). No AI on purpose: two people confirm, not a model.</p>
    </Screen>
  );
}

export function Live() {
  return (
    <Screen title="Live">
      <h1 class="screen-title">Live</h1>
      <div class="lcd-block">
        <p class="lcd-kicker">Real-life hellos</p>
        <p>Collective numbers live here: hellos so far, and how many accepted signals became a conversation.</p>
      </div>
      <p class="lcd-small">The Live page lands on Sat (WP6). Collective numbers only, never per person.</p>
    </Screen>
  );
}

export function NotFound() {
  return (
    <Screen title="Not here">
      <h1 class="screen-title">Not here</h1>
      <p>There is nothing at this address. Back home?</p>
    </Screen>
  );
}
