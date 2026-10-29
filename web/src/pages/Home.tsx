// WP38 Today, simplified (v6.2): the picked game try on the home screen
// itself, one LET'S GO key, then ANOTHER ONE and NOT TODAY. The motto,
// compass box, friend dare, WHERE chips and here links are gone (the story
// ends on the motto; the softkeys cover the rest).
import { useEffect, useState } from "preact/hooks";
import type { MeResponse } from "../../../src/types";
import { api } from "../api";
import { Plant } from "../components/Plant";
import { Screen } from "../components/Screen";
import { Story } from "../components/Story";
import { TryFlow, type HeroTry, type PlantState } from "../components/TryFlow";
import { localSeen } from "../story";
import { Typed } from "../components/Typed";

export function Home() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [plant, setPlant] = useState<PlantState | null>(null);
  const [current, setCurrent] = useState<HeroTry | null>(null);
  const [skip, setSkip] = useState(0);
  const [typed, setTyped] = useState(false);
  const [note, setNote] = useState("");
  const [inFlow, setInFlow] = useState<"go" | "later" | null>(null);
  const [seenLocal] = useState(localSeen);

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status !== 200) {
        setAuth("out");
        return;
      }
      setMe(res.data);
      setAuth("in");
      api<PlantState>("GET", "/api/me/plant").then((p) => p.status === 200 && setPlant(p.data));
    });
  }, []);

  useEffect(() => {
    if (auth !== "in") return;
    setCurrent(null);
    setTyped(false);
    setNote("");
    api<{ try: HeroTry }>("GET", `/api/tries/today?skip=${skip}`).then((res) => {
      if (res.status === 401) return void (location.href = "/signin");
      if (res.status !== 200) return setNote("No try right now. Try again in a bit.");
      setCurrent(res.data.try);
    });
  }, [auth, skip]);

  async function another() {
    if (!current) return;
    setNote("");
    setTyped(false);
    if (current.source === "game" && current.id) {
      const res = await api<{ try: HeroTry }>("POST", "/api/game/another", { id: current.id });
      if (res.status === 401) return void (location.href = "/signin");
      if (res.status !== 200) return setNote("That didn't work. Try again?");
      setCurrent({ ...res.data.try, hint: "", meta: `${(res.data.try as { minutes?: number }).minutes ?? 1} MIN · FROM YOUR GAME`, place: "anywhere" });
      return;
    }
    setSkip((s) => s + 1);
  }

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
          <h1 class="today-title">Hoolala!</h1>
          <p class="lcd-block">One tiny thing to try in real life each day. Small enough to do on the way to somewhere. You decide, always.</p>
          <ul class="key-list">
            <li>
              <a class="lcd-key lcd-key--primary" href="/signin">Sign in</a>
            </li>
          </ul>
          <p class="lcd-small">
            Not a dating app. Anonymous until you both say yes. <a href="/privacy">Privacy</a>
          </p>
        </>
      ) : inFlow && plant && current ? (
        <TryFlow
          plant={plant}
          onPlant={setPlant}
          heroTry={current}
          initial={inFlow}
          onAnother={(next) => {
            setCurrent(next);
            setSkip(0);
            setInFlow(null);
          }}
          onExit={() => setInFlow(null)}
        />
      ) : (
        <div class="today">
          <div class="today-plant">
            <Plant leaves={plant?.leaves ?? 0} cell={6} />
            <span class="today-plant-text">
              <span class="today-plant-count">{plant?.tries ?? 0} TINY TRIES</span>
              <span class="today-plant-sub">Your plant. It only grows.</span>
            </span>
          </div>
          <div class="today-kicker">TODAY'S TRY · STEP {current?.step ?? plant?.step ?? 1} OF 5</div>
          {current ? (
            <div class="today-try" aria-live="polite">
              {typed ? current.title : <Typed key={current.id ?? `${skip}`} text={current.title} msPerChar={35} onDone={() => setTyped(true)} />}
            </div>
          ) : (
            <p class="lcd-kicker" role="status">Finding today's try...</p>
          )}
          {current && typed && (
            <div class="keys-rise">
              {(current.hint || current.meta) && <p class="today-hint">{current.hint || current.meta}</p>}
              <a class="dashed-link" href="/compass">
                <span>My compass</span>
                <span aria-hidden="true">&gt;</span>
              </a>
              <p>
                <a class="today-compass" href="/signin">ACCOUNT &gt;</a>
              </p>
            </div>
          )}
          <div class="today-spacer" />
          {current && typed && (
            <div class="keys-rise">
              <ul class="key-list">
                <li>
                  <button class="lcd-key lcd-key--primary today-go" type="button" onClick={() => plant && setInFlow("go")} disabled={!plant}>
                    LET'S GO
                  </button>
                </li>
              </ul>
              <div class="today-links">
                <button type="button" class="link-button" onClick={another}>
                  ANOTHER ONE
                </button>
                <button type="button" class="link-button" onClick={() => setInFlow("later")}>
                  NOT TODAY
                </button>
              </div>
            </div>
          )}
          <p class="lcd-small" role="status" aria-live="polite">
            {note}
          </p>
        </div>
      )}
    </Screen>
  );
}
