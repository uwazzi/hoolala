// WP28 home v6: GET OUTSIDE. MEET PEOPLE. The daily tiny try is the hero;
// Signals here is the second path. Per docs/DESIGN.md home spec.
import { useEffect, useState } from "preact/hooks";
import type { CheckinView, MeResponse } from "../../../src/types";
import { api } from "../api";
import { Plant } from "../components/Plant";
import { Screen } from "../components/Screen";
import { Story } from "../components/Story";
import { TryFlow, type PlantState } from "../components/TryFlow";
import { localSeen } from "../story";

export function Home() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [here, setHere] = useState<CheckinView | null>(null);
  const [hasCompass, setHasCompass] = useState<boolean | null>(null);
  const [plant, setPlant] = useState<PlantState | null>(null);
  const [inFlow, setInFlow] = useState(false);
  const [seenLocal] = useState(localSeen);

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status !== 200) {
        setAuth("out");
        return;
      }
      setMe(res.data);
      setAuth("in");
      api<{ checkin: CheckinView | null }>("GET", "/api/checkin").then((c) => c.status === 200 && setHere(c.data.checkin));
      api<{ compass: unknown[] }>("GET", "/api/me/compass").then((c) => c.status === 200 && setHasCompass(c.data.compass.length > 0));
      api<PlantState>("GET", "/api/me/plant").then((p) => p.status === 200 && setPlant(p.data));
    });
  }, []);

  // First open plays the story: the account flag rules once signed in, the local flag for visitors.
  const showStory = auth === "in" ? !(me?.introSeen ?? true) : auth === "out" ? !seenLocal : false;

  return (
    <Screen back={false} bare={showStory}>
      {auth === "loading" || showStory ? (
        showStory ? (
          <Story />
        ) : null
      ) : !me ? (
        <>
          <h1 class="hero-display">Get outside. Meet people. Grow inside.</h1>
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
          <h1 class="hero-display">Get outside. Meet people. Grow inside.</h1>
          <p class="hero-line">One tiny thing to try in real life each day. Small enough to do on the way to somewhere. You decide, always.</p>
          <div class="plant-card">
            <Plant leaves={plant?.leaves ?? 0} cell={8} />
            <div class="plant-card-text">
              <span class="plant-card-count">{plant?.leaves ?? 0} tiny tries</span>
              <span class="plant-card-sub">Your plant grows with every one. It never wilts.</span>
            </div>
          </div>
          {hasCompass && (
            <a class="dashed-link" href="/compass">
              <span>My compass</span>
              <span aria-hidden="true">&gt;</span>
            </a>
          )}
          <ul class="key-list">
            <li>
              <button class="lcd-key lcd-key--primary" type="button" onClick={() => plant && setInFlow(true)} disabled={!plant}>
                Give me today’s try
              </button>
            </li>
            <li>
              <a class="lcd-key" href="/friends">Invite a friend too</a>
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
