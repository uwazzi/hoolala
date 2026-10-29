// WP35 onboarding story: six beats about why small contacts matter, played
// once on first open. LET'S GO and SKIP mark it seen and open the
// get-personal voice flow.
import { useEffect, useMemo, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import {
  BEATS,
  PERSONAL_PATH,
  setLocalSeen,
  startStory,
  storyBack,
  storyDone,
  storyLast,
  storyNext,
  storyTap,
  storyTick,
  TYPING_MS,
  type BeatPic,
} from "../story";

const FIGURE = "M2 0h4v4H2zM1 5h6v4H1zM2 9h1v3H2zM5 9h1v3H5z";
const HEART = "M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z";
const CUP = "M0 1h4v1h2v2H4v2H0z M4 2v1h1V2z";

function Figure({ dim = false }: { dim?: boolean }) {
  return (
    <svg width="40" height="60" viewBox="0 0 8 12" shape-rendering="crispEdges" aria-hidden="true" class={dim ? "st-dim" : "st-ink"}>
      <path d={FIGURE} fill="currentColor" />
    </svg>
  );
}

function Meter({ label, filled }: { label: string; filled: boolean[] }) {
  return (
    <span class="st-meter">
      {label}
      <span class="st-cells" aria-hidden="true">
        {filled.map((on, i) => (
          <span key={i} class={`st-cell${on ? " is-on" : ""}`} />
        ))}
      </span>
    </span>
  );
}

function Picture({ pic, done, show }: { pic: BeatPic; done: boolean; show: (ms: number) => boolean }) {
  if (pic === "people") {
    return (
      <>
        <div class="st-figures">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <span key={k} class={k === 4 && done ? "st-drift" : ""}>
              <Figure />
            </span>
          ))}
        </div>
        <p class="st-piccap">
          1 · 2 · 3 · 4 · 5 · <u>6</u>
        </p>
      </>
    );
  }
  if (pic === "talk") {
    const flipped = show(1400);
    return (
      <div class="st-col">
        <div class="st-bubbles">
          <span class="st-pop st-bubble">HI!</span>
          {flipped && <span class="st-pop st-bubble st-bubble--dark">OH, HI!</span>}
        </div>
        <div class="st-row">
          <span class="st-lean">
            <Figure />
          </span>
          <span class="st-leanl">
            <Figure />
          </span>
        </div>
        <div class="st-rule" />
        <div class="st-meters">
          <Meter label="EXPECTED" filled={[true, true, false, false, false]} />
          <Meter label="GOT" filled={[true, true, true, true, false]} />
        </div>
      </div>
    );
  }
  if (pic === "fear") {
    const flipped = show(1400);
    return (
      <div class="st-col st-col--left">
        <span class="st-pop st-think">{flipped ? "THEY LIKED ME MORE THAN I THOUGHT." : "THEY WON’T LIKE ME."}</span>
        <div class="st-row st-row--wide">
          <Figure />
          {flipped && (
            <svg width="28" height="24" viewBox="0 0 7 6" shape-rendering="crispEdges" aria-hidden="true" class="st-pop st-ink">
              <path d={HEART} fill="currentColor" />
            </svg>
          )}
          <Figure dim />
        </div>
      </div>
    );
  }
  if (pic === "hours") {
    return (
      <div class="st-col">
        <div class="st-row">
          <Figure />
          <span class="st-pop st-bubble st-bubble--dark">HELLO!</span>
          <Figure />
        </div>
        <div class="st-blocks">
          {["1H", "2H", "3H", "4H"].map((label, k) => (
            <span class="st-blockcell" key={label}>
              <span class={`st-block${show(600 + k * 500) ? " is-on" : ""}`} />
              <span class="st-blocklabel">{label}</span>
            </span>
          ))}
        </div>
        <p class="st-piccap">FEELING LESS ALONE, HOURS LATER</p>
      </div>
    );
  }
  if (pic === "kind") {
    return (
      <div class="st-col">
        <div class="st-thanks">{show(1400) && <span class="st-pop st-bubble st-bubble--dark">THANKS!</span>}</div>
        <div class="st-row st-row--pass">
          <Figure />
          <span class="st-cup" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 6 6" shape-rendering="crispEdges" aria-hidden="true" class="st-ink">
              <path d={CUP} fill="currentColor" fill-rule="evenodd" />
            </svg>
          </span>
          <Figure />
        </div>
        <div class="st-rule" />
        <p class="st-piccap">A SMALL KINDNESS. TWO BETTER MOODS.</p>
      </div>
    );
  }
  return (
    <svg width="150" height="190" viewBox="0 0 15 19" shape-rendering="crispEdges" aria-hidden="true" class="st-ink">
      {show(0) && (
        <g>
          <path d="M7 9h1v6H7z" fill="currentColor" />
        </g>
      )}
      {show(500) && (
        <g>
          <path d="M4 10h3v1H4zM3 9h2v1H3z" fill="currentColor" />
        </g>
      )}
      {show(1000) && (
        <g>
          <path d="M8 7h3v1H8zM10 6h2v1h-2zM7 5h1v4H7z" fill="currentColor" />
        </g>
      )}
      {show(1600) && (
        <g>
          <path d="M6 1h3v1H6zM5 2h1v2H5zM9 2h1v2H9zM6 4h3v1H6z" fill="currentColor" />
          <path d="M6 2h3v2H6z" class="st-cut" />
        </g>
      )}
      <path d="M3 15h9v1H3zM4 16h7v3H4z" class="st-pot" />
    </svg>
  );
}

export function Story() {
  const { route } = useLocation();
  const [s, setS] = useState(startStory);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const beat = BEATS[s.beat];
  const done = storyDone(s);
  const last = storyLast(s);
  const show = (ms: number) => still || (done && s.held >= ms);

  useEffect(() => {
    const timer = setInterval(() => setS((x) => storyTick(x, { reduced: still, autoplay: true })), TYPING_MS);
    return () => clearInterval(timer);
  }, [still]);

  function finish() {
    setLocalSeen();
    void api("POST", "/api/me/intro-seen").catch(() => {});
    route(PERSONAL_PATH);
  }

  return (
    <div class="story">
      <p class="story-kicker">{beat.kicker}</p>
      <h1 class="story-head" aria-live="polite">
        {beat.head.slice(0, s.typed)}
        {!done && <span class="lcd-cursor" aria-hidden="true" />}
      </h1>
      <div class="story-pic" onClick={() => setS(storyTap)}>
        <div class="story-art" key={s.beat} aria-hidden="true">
          <Picture pic={beat.pic} done={done} show={show} />
        </div>
      </div>
      {done && (
        <div class="keys-rise">
          <p class="story-body">{beat.body}</p>
          <p class="story-src">{beat.source}</p>
        </div>
      )}
      {last && done && (
        <div class="story-go keys-rise">
          <button class="lcd-key lcd-key--primary story-key" type="button" onClick={finish}>
            Let’s go
          </button>
        </div>
      )}
      <nav class="story-bar" aria-label="Intro controls">
        {s.beat === 0 ? (
          <button class="story-ctl" type="button" onClick={finish}>
            Skip
          </button>
        ) : (
          <button class="story-ctl" type="button" onClick={() => setS(storyBack)}>
            &lt; Back
          </button>
        )}
        <div class="story-dots" role="img" aria-label={`Step ${s.beat + 1} of ${BEATS.length}`}>
          {BEATS.map((_, i) => (
            <span key={i} class={`story-dot${i === s.beat ? " is-on" : ""}`} />
          ))}
        </div>
        {last ? (
          <button class="story-ctl story-ctl--right" type="button" onClick={() => setS(startStory)}>
            Replay
          </button>
        ) : (
          <button class="story-ctl story-ctl--right" type="button" onClick={() => setS(storyNext)}>
            Next &gt;
          </button>
        )}
      </nav>
    </div>
  );
}
