// WP28 home v6: GET OUTSIDE. MEET PEOPLE. The daily tiny try is the hero;
// Signals here is the second path. Per docs/DESIGN.md home spec.
import { useEffect, useState } from "preact/hooks";
import type { CheckinView, MeResponse } from "../../../src/types";
import { api } from "../api";
import { Plant } from "../components/Plant";
import { Screen } from "../components/Screen";
import { TryFlow, type PlantState } from "../components/TryFlow";

export function Home() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [here, setHere] = useState<CheckinView | null>(null);
  const [hasCompass, setHasCompass] = useState<boolean | null>(null);
  const [plant, setPlant] = useState<PlantState | null>(null);
  const [inFlow, setInFlow] = useState(false);

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status !== 200) return;
      setMe(res.data);
      api<{ checkin: CheckinView | null }>("GET", "/api/checkin").then((c) => c.status === 200 && setHere(c.data.checkin));
      api<{ compass: unknown[] }>("GET", "/api/me/compass").then((c) => c.status === 200 && setHasCompass(c.data.compass.length > 0));
      api<PlantState>("GET", "/api/me/plant").then((p) => p.status === 200 && setPlant(p.data));
    });
  }, []);

  return (
    <Screen
      back={false}
      softkeys={
        <>
          <a class="lcd-softkey" href="/">Today</a>
          <a class="lcd-softkey" href="/friends">Friends</a>
        </>
      }
    >
      <div class="brand">
        <p class="brand-name">Hoolala!</p>
        <p class="brand-tagline">You never know until you go.</p>
      </div>
      {!me ? (
        <>
          <h1 class="hero-display">Get outside. Meet people.</h1>
          <p class="hero-line">One tiny thing to try in real life each day. Small enough to do on the way to somewhere. You decide, always.</p>
          <ul class="key-list">
            <li>
              <a class="lcd-key lcd-key--primary" href="/signin">Sign in</a>
            </li>
          </ul>
          <p class="lcd-small">
            Not a dating app. Anonymous until you both say yes. <a href="/privacy">Privacy</a>
          </p>
        </>
      ) : inFlow && plant ? (
        <TryFlow plant={plant} onPlant={setPlant} />
      ) : (
        <>
          <h1 class="hero-display">Get outside. Meet people.</h1>
          <p class="hero-line">One tiny thing to try in real life each day. Small enough to do on the way to somewhere. You decide, always.</p>
          <div class="plant-card">
            <Plant leaves={plant?.leaves ?? 0} cell={8} />
            <div class="plant-card-text">
              <span class="plant-card-count">{plant?.leaves ?? 0} tiny tries</span>
              <span class="plant-card-sub">Your plant grows with every one. It never wilts.</span>
            </div>
          </div>
          <ul class="key-list">
            <li>
              <button class="lcd-key lcd-key--primary" type="button" onClick={() => plant && setInFlow(true)} disabled={!plant}>
                Give me today’s try
              </button>
            </li>
            <li>
              <a class="lcd-key" href="/friends">Dare a friend too</a>
            </li>
          </ul>
          <ul class="key-list">
            {here && (
              <li>
                <a class="lcd-key" href="/here">What’s here at {here.place.name}?</a>
              </li>
            )}
            <li>
              <a class="lcd-key" href="/arrive">Where are you?</a>
            </li>
            {hasCompass === false && (
              <li>
                <a class="lcd-key" href="/start">Want a head start?</a>
              </li>
            )}
            {hasCompass && (
              <li>
                <a class="lcd-key" href="/compass">My compass</a>
              </li>
            )}
            <li>
              <a class="lcd-key" href="/signin">Account</a>
            </li>
          </ul>
          <p class="lcd-small">
            Not a dating app. Anonymous until you both say yes. <a href="/privacy">Privacy</a>
          </p>
        </>
      )}
    </Screen>
  );
}
