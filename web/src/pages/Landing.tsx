// WP66 landing for signed-out visitors: one short page (hero, WHY GO?,
// HOW IT WORKS, close) instead of tap-through slides. Headline, plant
// and story loop with stepped timers; all stop under reduced motion
// and pause while the tab hides. Beat words come from story.ts.
import { useEffect, useMemo, useState } from "preact/hooks";
import { Plant } from "../components/Plant";
import {
  headlineText,
  headlineTick,
  landingBeatLabel,
  landingBeats,
  landingCoffee,
  landingStepVisible,
  landingStoryTick,
  landingTurn,
  LANDING_LINES,
  LANDING_SOURCES,
  plantGrew,
  plantTick,
  PLANT_MAX,
  startHeadline,
  startLandingStory,
  type HeadlineState,
  type LandingStoryState,
} from "../landing";
import { setLocalSeen } from "../story";

function useLoop<T>(reduced: boolean, start: T, next: (s: T) => { state: T; delay: number }, set: (s: T) => void) {
  useEffect(() => {
    if (reduced) return;
    let alive = true;
    let timer = 0;
    let onVis: (() => void) | null = null;
    const unVis = () => {
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      onVis = null;
    };
    const schedule = (s: T) => {
      if (!alive) return;
      if (document.visibilityState === "hidden") {
        onVis = () => {
          if (document.visibilityState === "visible" && alive) {
            unVis();
            schedule(s);
          }
        };
        document.addEventListener("visibilitychange", onVis);
        return;
      }
      const { state, delay } = next(s);
      timer = window.setTimeout(() => {
        if (!alive) return;
        set(state);
        schedule(state);
      }, delay);
    };
    schedule(start);
    return () => {
      alive = false;
      clearTimeout(timer);
      unVis();
    };
  }, [reduced]);
}

function Beat1({ beat, sub }: { beat: number; sub: number }) {
  const s = { beat, sub };
  const v = (step: number) => (landingStepVisible(0, step, s) ? 1 : 0);
  const person = (x: number, step: number) => (
    <g opacity={v(step)}>
      <rect x={x + 2} y="0" width="4" height="4" />
      <rect x={x} y="5" width="8" height="5" />
      <rect x={x + 1} y="10" width="2" height="3" />
      <rect x={x + 5} y="10" width="2" height="3" />
    </g>
  );
  return (
    <svg width="100%" viewBox="0 0 66 28" aria-hidden="true" shape-rendering="crispEdges">
      <g class="land-f-ink">
        {person(1, 1)}
        {person(12, 2)}
        {person(23, 3)}
        {person(34, 4)}
        {person(45, 5)}
      </g>
      <g class="land-f-dim" opacity={v(6)}>
        <rect x="59" y="14" width="4" height="4" />
        <rect x="57" y="19" width="8" height="5" />
        <rect x="58" y="24" width="2" height="3" />
        <rect x="62" y="24" width="2" height="3" />
      </g>
    </svg>
  );
}

function Beat2({ beat, sub }: { beat: number; sub: number }) {
  const s = { beat, sub };
  const v = (step: number) => (landingStepVisible(1, step, s) ? 1 : 0);
  const person = (x: number) => (
    <g opacity={v(1)}>
      <rect x={x + 2} y="13" width="4" height="4" />
      <rect x={x} y="18" width="8" height="5" />
      <rect x={x + 1} y="23" width="2" height="4" />
      <rect x={x + 5} y="23" width="2" height="4" />
    </g>
  );
  return (
    <svg width="100%" viewBox="0 0 66 28" aria-hidden="true" shape-rendering="crispEdges">
      <g class="land-f-ink">
        {person(5)}
        {person(51)}
        <g opacity={v(2)}>
          <rect x="2" y="1" width="30" height="1" />
          <rect x="2" y="9" width="30" height="1" />
          <rect x="2" y="1" width="1" height="9" />
          <rect x="31" y="1" width="1" height="9" />
          <rect x="8" y="10" width="2" height="2" />
        </g>
        <g opacity={v(3)}>
          <rect x="6" y="5" width="2" height="1" />
          <rect x="10" y="5" width="2" height="1" />
          <rect x="14" y="5" width="2" height="1" />
        </g>
        <g opacity={v(4)}>
          <rect x="18" y="5" width="2" height="1" />
          <rect x="22" y="5" width="2" height="1" />
          <rect x="26" y="5" width="2" height="1" />
        </g>
      </g>
    </svg>
  );
}

function Beat3({ beat, sub }: { beat: number; sub: number }) {
  const s = { beat, sub };
  const v = (step: number) => (landingStepVisible(2, step, s) ? 1 : 0);
  const person = (x: number, step: number) => (
    <g opacity={v(step)}>
      <rect x={x + 2} y="13" width="4" height="4" />
      <rect x={x} y="18" width="8" height="5" />
      <rect x={x + 1} y="23" width="2" height="4" />
      <rect x={x + 5} y="23" width="2" height="4" />
    </g>
  );
  return (
    <svg width="100%" viewBox="0 0 66 28" aria-hidden="true" shape-rendering="crispEdges">
      <g class="land-f-ink">
        {person(13, 1)}
        {person(43, 2)}
      </g>
      <g opacity={v(3)}>
        <rect x="22" y="2" width="20" height="8" class="land-f-ink" />
        <rect x="29" y="10" width="2" height="2" class="land-f-ink" />
        <g class="land-f-paper">
          <rect x="25" y="5" width="1" height="2" />
          <rect x="27" y="5" width="1" height="2" />
          <rect x="25" y="6" width="3" height="1" />
          <rect x="30" y="5" width="3" height="2" />
          <rect x="35" y="5" width="1" height="2" />
          <rect x="38" y="5" width="1" height="2" />
        </g>
      </g>
    </svg>
  );
}

function Beat4({ beat, sub }: { beat: number; sub: number }) {
  const s = { beat, sub };
  const v = (step: number) => (landingStepVisible(3, step, s) ? 1 : 0);
  const coffee = landingCoffee(s);
  const person = (x: number) => (
    <g opacity={v(1)}>
      <rect x={x + 2} y="13" width="4" height="4" />
      <rect x={x} y="18" width="8" height="5" />
      <rect x={x + 1} y="23" width="2" height="4" />
      <rect x={x + 5} y="23" width="2" height="4" />
    </g>
  );
  return (
    <svg width="100%" viewBox="0 0 66 28" aria-hidden="true" shape-rendering="crispEdges">
      <g class="land-f-ink">
        {person(13)}
        {person(43)}
        <g opacity={coffee === "giver" ? 1 : 0}>
          <rect x="22" y="17" width="5" height="5" />
          <rect x="27" y="18" width="2" height="2" />
        </g>
        <g opacity={coffee === "middle" ? 1 : 0}>
          <rect x="28" y="17" width="5" height="5" />
          <rect x="33" y="18" width="2" height="2" />
        </g>
        <g opacity={coffee === "receiver" ? 1 : 0}>
          <rect x="35" y="17" width="5" height="5" />
          <rect x="40" y="18" width="2" height="2" />
          <rect x="36" y="13" width="1" height="2" />
          <rect x="38" y="12" width="1" height="2" />
        </g>
      </g>
    </svg>
  );
}

export function Landing() {
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [head, setHead] = useState<HeadlineState>(() =>
    reduced ? { line: 0, chars: LANDING_LINES[0].length, deleting: false } : startHeadline(),
  );
  const [leaves, setLeaves] = useState(() => (reduced ? PLANT_MAX : 0));
  const [story, setStory] = useState<LandingStoryState>(() => (reduced ? { beat: -1, sub: 0 } : startLandingStory()));
  const beats = useMemo(landingBeats, []);
  const scenes = [Beat1, Beat2, Beat3, Beat4];

  useEffect(() => {
    document.title = "Hoolala!";
  }, []);

  useLoop<HeadlineState>(reduced, startHeadline(), (s) => headlineTick(s, { reduced: false }), setHead);
  useLoop<number>(
    reduced,
    0,
    (n) => {
      const r = plantTick(n, { reduced: false });
      return { state: r.leaves, delay: r.delay };
    },
    setLeaves,
  );
  useLoop<LandingStoryState>(reduced, startLandingStory(), (s) => landingStoryTick(s, { reduced: false }), setStory);

  return (
    <>
      <header class="land-head">
        <div class="land-brand">
          <span class="land-name">HOOLALA!</span>
          <span class="land-tag">You never know until you go.</span>
        </div>
        <a class="land-signin" href="/signin" onClick={() => setLocalSeen()}>
          SIGN IN
        </a>
      </header>
      <main class="land">
        <section class="land-hero" aria-labelledby="hero-title">
          <div class="land-hero-text">
            <h1 id="hero-title" class="land-hero-title" aria-label="Say hi. See what happens.">
              <span aria-hidden="true">{headlineText(head)}</span>
              <span class="lcd-cursor" aria-hidden="true" />
            </h1>
            <p class="land-hero-line">One tiny thing to try in real life, each day.</p>
            <a class="lcd-key lcd-key--primary land-go" href="/signin" onClick={() => setLocalSeen()}>
              LET'S GO &gt;
            </a>
          </div>
          <div class="land-plant-col">
            <div class="land-plant-box">
              <div aria-hidden="true">
                <Plant leaves={leaves} grew={plantGrew(leaves, reduced)} cell={9} />
              </div>
            </div>
            <span class="land-plant-cap">EVERY TRY GROWS A LEAF.</span>
          </div>
        </section>
        <section class="land-section" aria-labelledby="why-title">
          <h2 id="why-title" class="land-kicker">
            WHY GO?
          </h2>
          <ol class="land-beats">
            {beats.map((b, i) => {
              const Scene = scenes[i];
              return (
                <li class="land-beat" key={i}>
                  <div class={`land-scene${story.beat === i ? " is-playing" : ""}`}>
                    <Scene beat={story.beat} sub={story.sub} />
                  </div>
                  <span class="land-beat-head">{b.head}</span>
                </li>
              );
            })}
          </ol>
          <div class="land-progress-row">
            <div class="land-progress" aria-hidden="true">
              {[0, 1, 2, 3].map((k) => (
                <span key={k} class={`land-dot${story.beat >= 0 && story.beat >= k ? " is-on" : ""}`} />
              ))}
            </div>
            <span class="land-beat-label">{landingBeatLabel(story.beat)}</span>
          </div>
          <div class="land-turn">
            <span>{landingTurn()}</span>
          </div>
          <p class="land-sources">{LANDING_SOURCES}</p>
        </section>
        <section class="land-section" aria-labelledby="how-title">
          <h2 id="how-title" class="land-kicker">
            HOW IT WORKS
          </h2>
          <ol class="land-steps">
            <li class="land-step">
              <span class="land-step-n">1</span>
              <div class="land-step-text">
                <span class="land-step-title">TELL US A LITTLE</span>
                <span class="land-step-sub">Two minutes.</span>
              </div>
            </li>
            <li class="land-step">
              <span class="land-step-n">2</span>
              <div class="land-step-text">
                <span class="land-step-title">GET ONE TINY TRY</span>
                <span class="land-step-sub">Soft, brave or bold.</span>
              </div>
            </li>
            <li class="land-step">
              <span class="land-step-n">3</span>
              <div class="land-step-text">
                <span class="land-step-title">GO. PHONE DOWN.</span>
                <span class="land-step-sub">Your plant grows.</span>
              </div>
            </li>
          </ol>
          <p class="land-trust">
            <span>FIRST NAMES ONLY</span>
            <span aria-hidden="true">·</span>
            <span>NOT A DATING APP</span>
            <span aria-hidden="true">·</span>
            <span>NO STREAKS</span>
            <span aria-hidden="true">·</span>
            <span>18+</span>
          </p>
        </section>
        <section class="land-close" aria-labelledby="close-title">
          <h2 id="close-title" class="land-close-title">
            YOU NEVER KNOW UNTIL YOU GO.
          </h2>
          <a class="lcd-key lcd-key--primary land-go" href="/signin" onClick={() => setLocalSeen()}>
            LET'S GO &gt;
          </a>
        </section>
      </main>
      <footer class="land-foot">
        <span>
          Run a place? <a href="/posters">Make a poster</a>
        </span>
        <span>
          Powered by <a href="https://hg-labs.io">hg-labs.io</a> · Muse Spark by Meta · <a href="/privacy">Privacy</a>
        </span>
      </footer>
    </>
  );
}
