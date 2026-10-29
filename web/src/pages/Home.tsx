import { useEffect, useState } from "preact/hooks";
import type { CheckinView, MeResponse } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";

/** Home leads to the next step: sign in, then check in, then what's here. */
export function Home() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [here, setHere] = useState<CheckinView | null>(null);
  const [hasCompass, setHasCompass] = useState<boolean | null>(null);

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status !== 200) return;
      setMe(res.data);
      api<{ checkin: CheckinView | null }>("GET", "/api/checkin").then((c) => c.status === 200 && setHere(c.data.checkin));
      api<{ compass: unknown[] }>("GET", "/api/me/compass").then((c) => c.status === 200 && setHasCompass(c.data.compass.length > 0));
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
      <div class="obs" aria-live="off">
        <p class="obs-say">We have sat at the same table for six months.</p>
        <p class="obs-happens">Never spoken.</p>
      </div>
      <div class="brand">
        <p class="brand-name">Hoolala!</p>
        <p class="brand-tagline">You never know until you go.</p>
      </div>
      <ul class="key-list">
        {!me && <li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li>}
        {me && !me.firstName && <li><a class="lcd-key lcd-key--primary" href="/signin?step=name">Your first name</a></li>}
        {me && here && <li><a class="lcd-key lcd-key--primary" href="/here">What's here at {here.place.name}?</a></li>}
        <li><a class={`lcd-key${me?.firstName && !here ? " lcd-key--primary" : ""}`} href="/arrive">Where are you?</a></li>
        {me?.firstName && hasCompass === false && <li><a class="lcd-key" href="/start">Want a head start?</a></li>}
        {me && hasCompass && <li><a class="lcd-key" href="/compass">My compass</a></li>}
        {me && <li><a class="lcd-key" href="/signin">Account</a></li>}
      </ul>
      <p class="lcd-small">Not a dating app. Anonymous until you both say yes. <a href="/privacy">Privacy</a></p>
    </Screen>
  );
}
