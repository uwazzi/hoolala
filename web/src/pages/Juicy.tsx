// WP39 keeping the juicy bits: while Muse Spark keeps the useful bits from
// the five quick ones, Snake plays by itself. SHOW ME WHAT YOU KEPT appears
// when extraction is done and the headline is typed; the compass check then
// shows the kept bits, and LOOKS RIGHT saves them and opens the game.
import { Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { Screen } from "../components/Screen";
import { Snake } from "../components/Snake";
import { Stages } from "../components/Stages";
import { Typed } from "../components/Typed";
import { keptListOf, mergeKept, showMeReady, tokenize, type ExtractedBits, type FullAnswers } from "../juicy";
import "../juicy.css";
import { takeOnboardAnswers } from "../onboard";
import { checkCells, checkHeadline, checkPeopleNod, checkPeopleSaid, checkPeopleSrc, savePayload } from "../personal";

const HEADLINE = "GOT IT. GIVE ME A MOMENT TO KEEP THE JUICY BITS.";
const FREE: [keyof Pick<FullAnswers, "q1f" | "q4">, string][] = [
  ["q1f", "Q1 · WHAT IT WAS ABOUT"],
  ["q4", "Q4 · WHAT YOU NEARLY SAID"],
];

interface ExtractResponse extends ExtractedBits {
  fallback: boolean;
}

export function Juicy() {
  const { route } = useLocation();
  const held = useMemo(() => takeOnboardAnswers(), []);
  const [headlineDone, setHeadlineDone] = useState(false);
  const [bits, setBits] = useState<ExtractedBits | null>(null);
  const [crisis, setCrisis] = useState("");
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"snake" | "trim">("snake");
  const [stage, setStage] = useState<"juicy" | "compass">("juicy");
  const [heldMs, setHeldMs] = useState(0);
  const [headDone, setHeadDone] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const asked = useRef(false);

  const answers: FullAnswers | null = held
    ? { q1: held.q1, q1f: held.q1f, q2: held.q2, q2extra: held.q2extra, q2f: held.q2f, q2fextra: held.q2fextra, q3: held.q3, q4: held.q4, q5: held.q5 }
    : null;

  useEffect(() => {
    api("GET", "/api/me").then((res) => {
      if (res.status !== 200) location.href = "/signin";
    });
    if (!held) route("/surprise");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!held || asked.current) return;
    asked.current = true;
    void extract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!headlineDone || stage !== "juicy") return;
    const timer = setInterval(() => setHeldMs((h) => Math.min(h + 30, 30000)), 30);
    return () => clearInterval(timer);
  }, [headlineDone, stage]);

  if (!held || !answers) {
    return (
      <Screen title="Keeping the juicy bits">
        <div class="sm-flow">
          <Stages now={0} />
        </div>
      </Screen>
    );
  }

  async function extract() {
    setFailed(false);
    setCrisis("");
    let res;
    try {
      res = await api<ExtractResponse>("POST", "/api/me/juicy/extract", {
        q1f: held!.q1f,
        q4: held!.q4,
        chips: { q1: held!.q1, q2: held!.q2, q2f: held!.q2f, q3: held!.q3 },
        q5: held!.q5,
      });
    } catch {
      setFailed(true);
      return;
    }
    if (res.status === 401) return void (location.href = "/signin");
    if (res.status === 422 && res.data.error === "crisis") {
      const why = (res.data as { why?: unknown }).why;
      setCrisis(typeof why === "string" ? why : "");
      return;
    }
    if (res.status !== 200) {
      setFailed(true);
      return;
    }
    setBits({ topics: res.data.topics ?? [], people: res.data.people ?? [], nearlySaid: res.data.nearlySaid ?? null });
  }

  async function save() {
    if (busy || !bits) return;
    setBusy(true);
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/me/compass/save", savePayload(mergeKept(answers!, bits)));
    } catch {
      setBusy(false);
      return setNote("That didn't save. Try again?");
    }
    if (res.status === 401) return void (location.href = "/signin");
    if (res.status !== 200) {
      setBusy(false);
      const why = (res.data as { why?: unknown }).why;
      return setNote(typeof why === "string" ? why : "That didn't save. Try again?");
    }
    route("/game");
  }

  const ready = showMeReady(bits !== null, headlineDone);
  const blocks = 1 + Math.floor(Math.min(heldMs, 5999) / 1200);
  const status = ready ? "READY WHEN YOU ARE." : `KEEPING THE JUICY BITS ${"■".repeat(blocks)}${"□".repeat(5 - blocks)}`;
  const kept = keptListOf(answers, answers.q3);
  const free = FREE.filter(([key]) => answers[key]);
  const merged = bits ? mergeKept(answers, bits) : null;
  const cells = merged ? checkCells(merged) : [];

  return (
    <Screen title={stage === "juicy" ? "Keeping the juicy bits" : "Your compass"}>
      <div class="sm-flow">
        <Stages now={stage === "juicy" ? 0 : 1} />

        {stage === "juicy" && (
          <div class="jy-flow">
            <div class="jy-headrow">
              <span class={`jy-face${ready ? "" : " is-spinning"}`} aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 14 14" shape-rendering="crispEdges">
                  <path d="M5 0h4v1h2v1h1v1h1v2h1v4h-1v2h-1v1h-1v1H9v1H5v-1H3v-1H2v-1H1V9H0V5h1V3h1V2h1V1h2z" fill="currentColor" />
                  <rect x="3" y="3" width="2" height="2" fill="var(--lcd-surface)" />
                </svg>
              </span>
              <h1 class="jy-head" aria-live="polite">
                <Typed text={HEADLINE} msPerChar={30} onDone={() => setHeadlineDone(true)} />
              </h1>
            </div>
            <div class="jy-statusrow">
              <span aria-live="polite">{status}</span>
              {view === "snake" && !crisis && !failed && (
                <button type="button" class="jy-stop" onClick={() => setView("trim")}>
                  STOP PLAYING
                </button>
              )}
            </div>

            {crisis ? (
              <>
                <div class="jy-help">{crisis}</div>
                <div class="jy-spacer" />
                <ul class="key-list">
                  <li>
                    <button type="button" class="lcd-key" onClick={() => route("/surprise")}>
                      CHANGE SOMETHING
                    </button>
                  </li>
                </ul>
              </>
            ) : failed ? (
              <>
                <p class="sm-center">That didn't work. Try again?</p>
                <div class="jy-spacer" />
                <ul class="key-list">
                  <li>
                    <button type="button" class="lcd-key lcd-key--primary" onClick={() => void extract()}>
                      Try again
                    </button>
                  </li>
                </ul>
              </>
            ) : view === "snake" ? (
              <Snake kept={kept} />
            ) : (
              <>
                <div class="jy-trim">
                  {free.map(([key, label]) => (
                    <div key={key}>
                      <span class="jy-trimlabel">{label}</span>
                      <div class="jy-trimtext">
                        {tokenize(answers[key] ?? "").map((tk, i) => {
                          const n = i + 1;
                          const struck = headlineDone && (still || heldMs >= 1200 + n * 90);
                          const lit = headlineDone && (still || heldMs >= 2600 + n * 90);
                          const cls = tk.cls === "filler" ? (struck ? "jy-token is-struck" : "jy-token") : tk.cls === "key" ? (lit ? "jy-token is-lit" : "jy-token") : lit ? "jy-token is-dim" : "jy-token";
                          return (
                            <Fragment key={i}>
                              <span class={cls}>{tk.w}</span>{" "}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {free.length === 0 && <div>Nothing to trim. Just your taps.</div>}
                </div>
                <div>
                  <span class="jy-keptlabel">KEPT</span>
                  <div class="jy-kept">
                    {kept
                      .filter((k, i) => headlineDone && (still || heldMs >= 3400 + i * 220))
                      .map((k) => (
                        <span class="jy-chip" key={k}>
                          {k}
                        </span>
                      ))}
                  </div>
                </div>
                <div class="jy-spacer" />
                <button type="button" class="jy-play" onClick={() => setView("snake")}>
                  <span class="jy-playinner">
                    <svg width="30" height="14" viewBox="0 0 15 7" shape-rendering="crispEdges" aria-hidden="true">
                      <path d="M0 4h8v2H0zM6 1h2v3H6zM8 1h4v2H8zM14 1h1v1h-1z" fill="currentColor" />
                    </svg>
                    PLAY SNAKE WHILE YOU WAIT
                  </span>
                  <span>&gt;</span>
                </button>
              </>
            )}

            {!crisis &&
              !failed &&
              (ready ? (
                <button type="button" class="lcd-key lcd-key--primary jy-show" onClick={() => setStage("compass")}>
                  <span>SHOW ME WHAT YOU KEPT</span>
                  <span>&gt;</span>
                </button>
              ) : (
                <div class="jy-wait">STILL KEEPING THE JUICY BITS...</div>
              ))}
          </div>
        )}

        {stage === "compass" && merged && (
          <div class="sm-check">
            <h1 class="sm-checkhead" aria-live="polite">
              <Typed text={checkHeadline(merged.answered)} msPerChar={35} onDone={() => setHeadDone(true)} />
            </h1>
            <div class="sm-grid">
              {cells.map((cell) => (
                <div class={`sm-cell${cell.value ? "" : " is-empty"}`} key={cell.pole}>
                  <span class="sm-cellhead">
                    {cell.pole} · {cell.name}
                  </span>
                  <span class="sm-celltext">{cell.value ?? "Add later, if you like"}</span>
                  <span class="sm-cellsrc">{cell.value ? cell.src : "EMPTY FOR NOW"}</span>
                </div>
              ))}
            </div>
            <div class={`sm-people${merged.said.length + merged.nod.length > 0 ? "" : " is-empty"}`}>
              <span class="sm-cellhead">PEOPLE IN YOUR DAYS</span>
              <span class="sm-celltext">{checkPeopleSaid(merged)}</span>
              <span>{checkPeopleNod(merged)}</span>
              <span class="sm-cellsrc">{checkPeopleSrc(merged)}</span>
            </div>
            <p class="sm-note">Nothing is saved until you say it looks right. Change or undo any line later in MY COMPASS.</p>
            {headDone && (
              <ul class="key-list">
                <li>
                  <button type="button" class="lcd-key lcd-key--primary" onClick={save} disabled={busy}>
                    LOOKS RIGHT. MAKE MY GAME
                  </button>
                </li>
                <li>
                  <button type="button" class="lcd-key" onClick={() => route("/surprise")}>
                    CHANGE SOMETHING
                  </button>
                </li>
              </ul>
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
