// WP37 your game of tiny tries: TRY IT writes nine tries in SOFT, BRAVE and
// BOLD, code sets each level and checks every try, and the person picks one
// as today's try. NEW ONE rewrites a single card; NEW GAME writes all nine
// again. After a pick, one key leads to Today.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { api } from "../api";
import { Screen } from "../components/Screen";
import { Stages } from "../components/Stages";
import { Typed } from "../components/Typed";
import { BUILD_TICK_MS, buildTick, offTableLine, peopleLine, startBuild, tryInfo, type BuildState } from "../game";
import { CANT_REMEMBER, startPace } from "../juicy";

interface GameTry {
  id: string;
  level: "soft" | "brave" | "bold";
  step: number;
  kind: "talk" | "kind";
  who_role: string | null;
  title: string;
  source: "ai" | "library";
  minutes: number;
  nearly: boolean;
}

interface GameData {
  gameId: string;
  tries: GameTry[];
  startTab: number;
  people: string[];
  offtable: string[];
  pace: { battery: string | null; cantRemember: boolean };
}

/** START HERE follows the battery, as the server paced it. */
function startTabOf(d: GameData): number {
  if (!d.pace) return d.startTab;
  return startPace(d.pace.battery, d.pace.cantRemember ? CANT_REMEMBER : null);
}

const LEVELS = [
  { name: "SOFT", tag: "STEPS 1-2", line: "A nod, a thank you, a kind word. Over in seconds." },
  { name: "BRAVE", tag: "STEPS 3-4", line: "One question or one kind act, with a reply. A minute or two." },
  { name: "BOLD", tag: "STEP 5", line: "Big for you, still small for the world. Five minutes, in public." },
];
const LEVEL_KEY = ["soft", "brave", "bold"] as const;
const WRITE_MS = 700;

export function Game() {
  const [phase, setPhase] = useState<"build" | "game" | "failed">("build");
  const [build, setBuild] = useState<BuildState>(startBuild);
  const [data, setData] = useState<GameData | null>(null);
  const [people, setPeople] = useState<string[] | null>(null);
  const [offtable, setOfftable] = useState<string[] | null>(null);
  const [tab, setTab] = useState(0);
  const [tries, setTries] = useState<GameTry[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const [writing, setWriting] = useState<Record<string, boolean>>({});
  const [chosen, setChosen] = useState<{ level: number; index: number } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const gameId = useRef("");
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    api("GET", "/api/me").then((res) => {
      if (res.status !== 200) location.href = "/signin";
    });
    void newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The checklist ticks while the game is written; the last line waits.
  useEffect(() => {
    if (phase !== "build") return;
    if (build.done && data) {
      setTries(data.tries);
      setShown(data.tries.map((t) => t.title));
      setTab(startTabOf(data));
      setPhase("game");
      return;
    }
    const timer = setTimeout(() => setBuild((s) => buildTick(s, data !== null, still)), BUILD_TICK_MS);
    return () => clearTimeout(timer);
  }, [phase, build, data, still]);

  async function newGame() {
    setPhase("build");
    setBuild(startBuild());
    setData(null);
    setPeople(null);
    setOfftable(null);
    setChosen(null);
    setWriting({});
    setNote("");
    let res;
    try {
      res = await api<GameData>("POST", "/api/game", {});
    } catch {
      setPhase("failed");
      return;
    }
    if (res.status === 401) return void (location.href = "/signin");
    if (res.status !== 200) {
      setPhase("failed");
      return;
    }
    gameId.current = res.data.gameId;
    setPeople(res.data.people);
    setOfftable(res.data.offtable ?? []);
    setData(res.data);
  }

  async function newOne(level: number, index: number) {
    const levelKey = LEVEL_KEY[level];
    const at = tries.filter((t) => t.level === levelKey);
    const current = at[index];
    if (!current || writing[`${level}-${index}`] || busy) return;
    setWriting((w) => ({ ...w, [`${level}-${index}`]: true }));
    setNote("");
    const started = Date.now();
    let res;
    try {
      res = await api<{ try: GameTry }>("POST", "/api/game/new-one", { gameId: gameId.current, level: levelKey, kind: current.kind, exclude: shown });
    } catch {
      res = null;
    }
    const wait = WRITE_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    setWriting((w) => ({ ...w, [`${level}-${index}`]: false }));
    if (!res || res.status !== 200) {
      if (res?.status === 401) return void (location.href = "/signin");
      setNote("That didn't work. Try again?");
      return;
    }
    setTries((ts) => ts.map((t) => (t.id === current.id ? res.data.try : t)));
    setShown((s) => [...s, res.data.try.title]);
  }

  async function pick(level: number, index: number) {
    const current = tries.filter((t) => t.level === LEVEL_KEY[level])[index];
    if (!current || writing[`${level}-${index}`] || busy) return;
    setBusy(true);
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/game/pick", { id: current.id });
    } catch {
      res = null;
    }
    setBusy(false);
    if (!res || res.status !== 200) {
      if (res?.status === 401) return void (location.href = "/signin");
      setNote("That didn't save. Try again?");
      return;
    }
    setChosen({ level, index });
  }

  const at = tries.filter((t) => t.level === LEVEL_KEY[tab]);
  const lines = ["READING YOUR ANSWERS", peopleLine(people), offTableLine(offtable), "TRY IT WRITES 9 TRIES: SMALL TALK AND KIND IT", "CODE SETS THE LEVELS: SOFT, BRAVE, BOLD"];

  return (
    <Screen title="Your game">
      <div class="sm-flow">
        <Stages now={2} />

        {phase === "build" && (
          <div class="gm-build">
            <div class="gm-spinrow">
              <span class={`gm-face${still ? "" : " is-spinning"}`} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 14 14" shape-rendering="crispEdges">
                  <path
                    d="M5 0h4v1h2v1h1v1h1v2h1v4h-1v2h-1v1h-1v1H9v1H5v-1H3v-1H2v-1H1V9H0V5h1V3h1V2h1V1h2z"
                    fill="currentColor"
                  />
                  <rect x="3" y="3" width="2" height="2" fill="var(--lcd-surface)" />
                </svg>
              </span>
              <h1 class="gm-head" aria-live="polite">
                <Typed text="WRITING YOUR GAME..." msPerChar={35} onDone={() => {}} />
              </h1>
            </div>
            <div class="gm-lines" role="status">
              {lines.map((line, i) => (
                <span key={line} class={`gm-line${i < build.ticked ? " is-ticked" : ""}`}>
                  {i < build.ticked ? "■ " : "□ "}
                  {line}
                </span>
              ))}
            </div>
            <p class="gm-foot">
              TRY IT writes fresh words every time, so no two games are the same. Code sets each level, checks every try against the safety rules, and swaps in a hand-written
              one if a try fails.
            </p>
          </div>
        )}

        {phase === "failed" && (
          <div class="gm-build">
            <h1 class="gm-head">Your game got lost on the way.</h1>
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="button" onClick={newGame}>
                  Try again
                </button>
              </li>
            </ul>
          </div>
        )}

        {phase === "game" && (
          <div class="gm-game">
            <h1 class="gm-gamehead" aria-live="polite">
              <Typed text="YOUR GAME. PICK A LEVEL, PICK A TRY." msPerChar={35} onDone={() => {}} />
            </h1>
            <div class="gm-tabs" role="tablist" aria-label="Levels">
              {LEVELS.map((l, i) => (
                <button
                  key={l.name}
                  role="tab"
                  type="button"
                  aria-selected={tab === i}
                  class={`gm-tab${tab === i ? " is-now" : ""}`}
                  onClick={() => setTab(i)}
                >
                  <span class="gm-tabname">{l.name}</span>
                  <span class="gm-tabtag">{data && i === startTabOf(data) ? "START HERE" : l.tag}</span>
                </button>
              ))}
            </div>
            <p class="gm-levelline">{LEVELS[tab].line}</p>
            <div class="gm-cards">
              {at.map((t, i) => {
                const isWriting = !!writing[`${tab}-${i}`];
                const isChosen = chosen?.level === tab && chosen?.index === i;
                return (
                  <div key={t.id} class={`gm-card${isChosen ? " is-chosen" : isWriting ? " is-writing" : ""}`}>
                    <button type="button" class="gm-pick" onClick={() => pick(tab, i)} disabled={isWriting || busy} aria-pressed={isChosen}>
                      <span class="gm-title">{isWriting ? "TRY IT IS WRITING A NEW ONE..." : t.title}</span>
                      <span class="gm-info">{isWriting ? "CHECKING IT AGAINST THE RULES" : tryInfo(t.kind, t.step, t.minutes, t.who_role, t.nearly)}</span>
                    </button>
                    <button
                      type="button"
                      class="gm-newone"
                      onClick={() => newOne(tab, i)}
                      disabled={isWriting || busy}
                      aria-label={`Write a new ${LEVELS[tab].name.toLowerCase()} ${t.kind === "kind" ? "kind act" : "small talk"} instead`}
                    >
                      <svg width="16" height="16" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
                        <path d="M2 0h4v1h1v1H6v1H5V2H2v1H1v3h1v1h3V6h1V5h1V4h1v2H7v1H6v1H2V7H1V6H0V2h1V1h1z" fill="currentColor" />
                      </svg>
                      <span>NEW ONE</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p class="sm-center">
              <button type="button" class="link-button" onClick={newGame}>
                None of these? New game from scratch
              </button>
            </p>
            <p class="gm-safe">Every level stays safe: public places, no contact details, no touching, nothing about looks. Any level is fine. Trying counts.</p>
            {!chosen ? (
              <div class="gm-nopick" aria-hidden="true">
                PICK A TRY ABOVE
              </div>
            ) : (
              <div class="keys-rise">
                <p class="gm-saved">Saved as today's try.</p>
                <ul class="key-list">
                  <li>
                    <a class="lcd-key lcd-key--primary" href="/">
                      Skip. I know where to go
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        <p class="lcd-small" role="status" aria-live="polite">
          {note}
        </p>
      </div>
    </Screen>
  );
}
