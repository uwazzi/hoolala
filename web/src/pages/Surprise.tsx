// WP36 LET'S GET PERSONAL: three spoken questions about real moments on the
// Surprise me voice UI. Every answer drafts one compass line; NEXT confirms
// it in memory; after the third, the compass check shows the sketch and the
// people in your days. LOOKS RIGHT saves everything at once. Heard, then
// forgotten: audio is never kept; nothing is saved before LOOKS RIGHT.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { type BallMode, PixelBall } from "../components/PixelBall";
import { Screen } from "../components/Screen";
import { Typed } from "../components/Typed";
import { checkCells, checkHeadline, checkPeople, savePayload } from "../personal";
import { canRecord, holdRelease, isMuted, type Level, type Recording, record, setMuted, speak } from "../voice";

type Phase = "intro" | "ask" | "check" | "help";
type Mic = "speaking" | "ready" | "listening" | "thinking" | "confirm" | "typing";

interface Turn {
  q: string;
  a: string;
}
interface Draft {
  part: string;
  line: string;
  people: string[];
  viaTyped: boolean;
  fallback: boolean;
}

const PART_LABEL: Record<string, string> = {
  interest: "TALK ABOUT",
  intention: "MORE OF",
  filter: "LESS OF",
  delivery: "HOW I GO",
  action: "NEXT TIME",
};
const MAX_TURNS = 3;
const STAGES = ["SURPRISE ME", "COMPASS", "GAME", "AROUND?"];

const BALL: Record<Mic, BallMode> = {
  speaking: "speaking",
  ready: "idle",
  listening: "listening",
  thinking: "thinking",
  confirm: "idle",
  typing: "idle",
};

const HINTS: Record<Mic, string> = {
  speaking: "HOOLALA! IS ASKING...",
  ready: "YOUR TURN",
  listening: "LISTENING. LET GO WHEN YOU'RE DONE.",
  thinking: "GOT IT. ONE SECOND...",
  confirm: "CHECK IT, OR HOLD THE MIC TO REDO",
  typing: "",
};

const MIC_LABEL: Record<Mic, string> = {
  speaking: "WAIT...",
  ready: "HOLD TO TALK",
  listening: "LET GO TO SEND",
  thinking: "WAIT...",
  confirm: "HOLD TO REDO",
  typing: "WAIT...",
};

const ERRORS: Record<string, string> = {
  ai_off: "Listening isn't available right now. Type your answer instead.",
  ai_failed: "Didn't catch that. Try again, or type it.",
  too_many: "That's a lot of talking for one hour. Type instead?",
  too_long: "That was a long one. Try a shorter answer.",
  bad_audio: "Didn't catch that. Try again, or type it.",
};

export function Surprise() {
  const { route } = useLocation();
  const level = useRef<Level>({ current: 0 }).current;
  const [phase, setPhase] = useState<Phase>("intro");
  const [mic, setMic] = useState<Mic>("speaking");
  const [sound, setSound] = useState(!isMuted());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [qi, setQi] = useState(0);
  const [question, setQuestion] = useState("");
  const [qpart, setQpart] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [typedAnswer, setTypedAnswer] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftWhy, setDraftWhy] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [droppedPeople, setDroppedPeople] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [help, setHelp] = useState("");
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [said, setSaid] = useState(false);
  const [shown, setShown] = useState(false);
  const [bars, setBars] = useState<number[]>([]);
  const recording = useRef<Recording | null>(null);
  const holding = useRef(false);
  const pressedAt = useRef(0);
  const backTo = useRef<Mic>("ready");
  const seq = useRef(0);
  const acting = useRef(false);
  const [busy, setBusy] = useState(false);
  const voice = useMemo(canRecord, []);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    api("GET", "/api/me").then((res) => {
      if (res.status !== 200) location.href = "/signin";
    });
    return () => {
      recording.current?.cancel();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // The mic wakes when the question is both spoken and shown.
  useEffect(() => {
    if (phase === "ask" && mic === "speaking" && said && shown) setMic(voice ? "ready" : "typing");
  }, [said, shown, phase, mic, voice]);

  // Twelve radial bars from the mic level, while listening.
  useEffect(() => {
    if (mic !== "listening" || still) {
      setBars([]);
      return;
    }
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      const base = Math.min(1, level.current);
      setBars(Array.from({ length: 12 }, (_, i) => 4 + Math.round(base * 22 * (0.7 + 0.3 * Math.sin(tick * 0.7 + i * 1.3)))));
    }, 90);
    return () => clearInterval(timer);
  }, [mic, still, level]);

  function stop(message: string) {
    holding.current = false;
    recording.current?.cancel();
    recording.current = null;
    window.speechSynthesis?.cancel();
    setHelp(message);
    setPhase("help");
  }

  // One tap, one action: the ref guards faster than a re-render.
  function takeBusy() {
    if (acting.current) return false;
    acting.current = true;
    setBusy(true);
    return true;
  }

  function freeBusy() {
    acting.current = false;
    setBusy(false);
  }

  async function fetchNext(sofar: Turn[]) {
    const my = ++seq.current;
    setNote("");
    setFailed(false);
    let res;
    try {
      res = await api<{ question?: string | null; part?: string | null; help?: string }>("POST", "/api/me/surprise/next", { turns: sofar });
    } catch {
      res = null;
    }
    if (seq.current !== my) return;
    if (!res) return fetchFailed();
    if (res.status === 401) return void (location.href = "/signin");
    if (res.data.help) return stop(res.data.help);
    if (res.status !== 200 || !res.data.question) return fetchFailed();
    setQuestion(res.data.question);
    setQpart(res.data.part ?? null);
    setQi(sofar.length);
    setHeard("");
    setTypedAnswer(false);
    setDraft(null);
    setDraftWhy("");
    setText("");
    setSaid(false);
    setShown(false);
    setMic("speaking");
    await speak(res.data.question, level);
    if (seq.current === my) setSaid(true);
  }

  function fetchFailed() {
    setMic("ready");
    setFailed(true);
    setNote("Something went wrong.");
  }

  async function begin() {
    const sofar: Turn[] = [];
    setTurns(sofar);
    setDrafts([]);
    setDroppedPeople([]);
    setNote("");
    setPhase("ask");
    await fetchNext(sofar);
  }

  function restart() {
    setTurns([]);
    setDrafts([]);
    setDroppedPeople([]);
    setNote("");
    setFailed(false);
    setPhase("ask");
    setMic("thinking");
    void fetchNext([]);
  }

  async function holdStart(event: Event) {
    event.preventDefault();
    if (failed) return;
    if (mic !== "ready" && mic !== "confirm") return;
    if (recording.current) return;
    window.speechSynthesis?.cancel();
    holding.current = true;
    backTo.current = mic;
    pressedAt.current = Date.now();
    setNote("");
    let rec;
    try {
      rec = await record(level, () => void holdEnd());
    } catch {
      holding.current = false;
      setNote("No mic access. You can type instead.");
      setMic("typing");
      return;
    }
    // Let go before the microphone was ready: drop it.
    if (!holding.current) return rec.cancel();
    recording.current = rec;
    setMic("listening");
  }

  async function holdEnd() {
    if (!holding.current && !recording.current) return;
    holding.current = false;
    const rec = recording.current;
    recording.current = null;
    if (!rec) {
      setNote("Hold it down while you talk.");
      return;
    }
    const { wav } = await rec.stop();
    if (holdRelease(pressedAt.current, Date.now(), true) !== "send") {
      setNote("Hold it down while you talk.");
      setMic(backTo.current);
      return;
    }
    await sendHeard(wav);
  }

  async function sendHeard(wav: Uint8Array<ArrayBuffer>) {
    setMic("thinking");
    let res;
    try {
      res = await fetch("/api/me/surprise/hear", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "audio/wav" },
        body: wav,
      });
    } catch {
      setMic(backTo.current);
      return setNote("Didn't catch that. Try again, or type it.");
    }
    const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    if (!res.ok || !data.text) {
      setMic(backTo.current);
      return setNote(ERRORS[data.error ?? ""] ?? "Didn't catch that. Try again, or type it.");
    }
    const heardText = data.text.trim();
    setHeard(heardText);
    await draftLine(heardText, false);
  }

  async function draftLine(answer: string, viaTyping: boolean) {
    setMic("thinking");
    let res;
    try {
      res = await api<{ draft?: { part: string; line: string; people: string[] }; fallback?: boolean; error?: string; why?: string }>(
        "POST",
        "/api/me/compass/draft-line",
        { questionId: `q${qi + 1}`, answer },
      );
    } catch {
      res = null;
    }
    if (!res) {
      setTypedAnswer(viaTyping);
      setDraft(null);
      setDraftWhy("That didn't work. Try again?");
      setNote("");
      return setMic("confirm");
    }
    if (res.status === 401) return void (location.href = "/signin");
    if (res.data.error === "crisis") return stop(typeof res.data.why === "string" ? res.data.why : "Let's pause. Call 143 any time, day or night.");
    if (res.status === 200 && res.data.draft) {
      setTypedAnswer(viaTyping);
      setDraft({ part: res.data.draft.part, line: res.data.draft.line, people: res.data.draft.people ?? [], viaTyped: viaTyping, fallback: res.data.fallback === true });
      setDraftWhy("");
      setNote("");
      return setMic("confirm");
    }
    if (res.status === 429) {
      setTypedAnswer(viaTyping);
      setDraft(null);
      setDraftWhy("Slow down a little, then try again.");
      setNote("");
      return setMic("confirm");
    }
    setTypedAnswer(viaTyping);
    setDraft(null);
    setDraftWhy(typeof res.data.why === "string" ? res.data.why : "That didn't work. Try again?");
    setNote("");
    setMic("confirm");
  }

  function next() {
    if (!draft || !takeBusy()) return;
    const kept = [...drafts, draft];
    const sofar = [...turns, { q: question, a: heard }];
    setDrafts(kept);
    setTurns(sofar);
    setDraft(null);
    setHeard("");
    freeBusy();
    if (sofar.length >= MAX_TURNS) {
      window.speechSynthesis?.cancel();
      setMic("ready");
      setPhase("check");
      return;
    }
    setMic("thinking");
    void fetchNext(sofar).then(freeBusy);
  }

  async function save() {
    if (!takeBusy()) return;
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/me/compass/save", savePayload(drafts, droppedPeople));
    } catch {
      freeBusy();
      return setNote("That didn't save. Try again?");
    }
    if (res.status === 401) return void (location.href = "/signin");
    if (res.status !== 200) {
      freeBusy();
      const why = (res.data as { why?: unknown }).why;
      return setNote(typeof why === "string" ? why : "That didn't save. Try again?");
    }
    freeBusy();
    route("/game");
  }

  function again() {
    setHeard("");
    setTypedAnswer(false);
    setDraft(null);
    setDraftWhy("");
    setNote("");
    setMic(voice ? "ready" : "typing");
  }

  function typeInstead() {
    if (!question || failed) return;
    window.speechSynthesis?.cancel();
    holding.current = false;
    recording.current?.cancel();
    recording.current = null;
    setText(heard);
    setNote("");
    setMic("typing");
  }

  async function sendTyped(event?: Event) {
    event?.preventDefault();
    if (!question || !takeBusy()) return;
    const t = text.trim();
    if (!t) {
      freeBusy();
      return setNote(voice ? "Hold the mic and talk, or type an answer." : "Type an answer first.");
    }
    setNote("");
    setHeard(t);
    await draftLine(t, true);
    freeBusy();
  }

  async function skip() {
    if (phase !== "ask" || !question || failed || !takeBusy()) return;
    window.speechSynthesis?.cancel();
    holding.current = false;
    recording.current?.cancel();
    recording.current = null;
    const sofar = [...turns, { q: question, a: "" }];
    setTurns(sofar);
    setHeard("");
    if (sofar.length >= MAX_TURNS) {
      window.speechSynthesis?.cancel();
      setMic("ready");
      setPhase("check");
      freeBusy();
      return;
    }
    setMic("thinking");
    await fetchNext(sofar);
    freeBusy();
  }

  function keyHold(event: KeyboardEvent, down: boolean) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (event.repeat) return;
    if (down) void holdStart(event);
    else void holdEnd();
  }

  function toggleSound() {
    const on = !sound;
    setMuted(!on);
    setSound(on);
  }

  const soundLabel = sound ? "SOUND ON" : "SOUND OFF";
  const inVoice = phase === "intro" || phase === "ask";
  const showMicRow = voice && phase === "ask" && mic !== "typing" && !failed;
  const fills = qpart ? `Q${qi + 1} OF 3 · FILLS ${PART_LABEL[qpart] ?? qpart}` : `Q${qi + 1} OF 3 · ANYTHING ELSE`;
  const showTranscript = mic === "listening" || ((mic === "thinking" || mic === "confirm") && heard !== "");
  const stage = phase === "check" ? 1 : 0;
  const cells = checkCells(drafts);
  const people = checkPeople(drafts, droppedPeople);
  const checkHead = checkHeadline(drafts.length);

  const soundToggle = (
    <button type="button" class="sm-sound" onClick={toggleSound} aria-pressed={sound} aria-label={soundLabel}>
      <svg width="14" height="14" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
        <path d="M0 3h2l2-2h1v6H4L2 5H0z" fill="currentColor" />
        {sound && <rect x="6" y="2" width="1" height="4" fill="currentColor" />}
      </svg>
      <span>{soundLabel}</span>
    </button>
  );

  return (
    <Screen
      title="Let's get personal"
      softkeys={
        <>
          <a class="lcd-softkey" href="/">
            Leave
          </a>
          <button type="button" class="lcd-softkey" onClick={toggleSound} aria-pressed={sound}>
            {soundLabel}
          </button>
        </>
      }
    >
      <div class="sm-flow">
        {(inVoice || phase === "check") && (
          <div class="sm-stages" aria-hidden="true">
            {STAGES.map((label, i) => (
              <span key={label} class={`sm-stage${i === stage ? " is-now" : i < stage ? " is-done" : ""}`}>
                {label}
              </span>
            ))}
          </div>
        )}
        <div class="sm-progress">
          {phase === "ask" && question ? (
            <div class="sm-dots" role="status">
              {Array.from({ length: MAX_TURNS }, (_, i) => (
                <span key={i} class={`sm-dot${i < qi ? " is-done" : i === qi ? " is-now" : ""}`} aria-hidden="true" />
              ))}
              <span class="sm-fills">{fills}</span>
            </div>
          ) : (
            <span class="sm-kicker">Surprise me</span>
          )}
          {soundToggle}
        </div>

        {inVoice && (
          <div class="sm-stage">
            {mic === "listening" && bars.length > 0 && (
              <svg class="sm-bars" width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
                {bars.map((h, i) => (
                  <g key={i} transform={`rotate(${i * 30} 100 100)`}>
                    <rect x={97} y={166} width={6} height={h} class="sm-bar" />
                  </g>
                ))}
              </svg>
            )}
            {phase === "ask" && mic === "listening" && <span class="sm-ping" aria-hidden="true" />}
            <div class={`sm-ball${phase === "ask" && mic === "speaking" ? " is-talking" : phase === "ask" && mic === "listening" ? " is-squashed" : ""}`}>
              <PixelBall mode={phase === "ask" ? BALL[mic] : "idle"} level={level} />
            </div>
          </div>
        )}

        {phase === "ask" && <p class="sm-hint">{HINTS[mic]}</p>}

        {phase === "ask" && question && (
          <p class="sm-caption" aria-live="polite">
            {mic === "speaking" ? <Typed key={qi} text={question} msPerChar={45} onDone={() => setShown(true)} /> : question}
          </p>
        )}

        {phase === "intro" && (
          <>
            <h1 class="sm-head">Let's get personal.</h1>
            <p class="sm-center">Three questions about real moments you've had, so your tiny tries fit you. No right answers. Hold the mic at the bottom and answer out loud, or type. About a minute.</p>
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="button" onClick={begin}>
                  Start
                </button>
              </li>
            </ul>
            <p class="lcd-small sm-center">Heard, then forgotten. Your voice becomes words and is never kept. Only lines you keep are saved, and only you see them.</p>
          </>
        )}

        {phase === "ask" && showTranscript && (
          <div class="sm-said keys-rise">
            <span class="sm-said-label">{mic === "confirm" ? (typedAnswer ? "YOU TYPED" : "I HEARD") : "HEARING..."}</span>
            <span class="sm-said-text">
              {heard}
              {mic === "listening" && <span class="lcd-cursor" aria-hidden="true" />}
            </span>
          </div>
        )}

        {phase === "ask" && mic === "confirm" && (
          <div class="keys-rise">
            <div class="sm-draft">
              <span class="lcd-kicker">{draft && !draft.fallback ? "AI · For your compass" : "For your compass"}</span>
              {draft ? (
                <p class="sm-draft-line">
                  <span class="sm-draft-part">{PART_LABEL[draft.part] ?? draft.part}:</span> {draft.line}
                </p>
              ) : (
                <p class="sm-draft-line">{draftWhy}</p>
              )}
            </div>
            <ul class="key-list">
              {draft && (
                <li>
                  <button class="lcd-key lcd-key--primary" type="button" onClick={next} disabled={busy}>
                    Next
                  </button>
                </li>
              )}
              <li>
                <div class="key-row">
                  <button class="lcd-key" type="button" onClick={again}>
                    Say again
                  </button>
                  <button class="lcd-key" type="button" onClick={typeInstead}>
                    Fix by typing
                  </button>
                </div>
              </li>
            </ul>
          </div>
        )}

        {phase === "ask" && mic === "typing" && (
          <form class="keys-rise" onSubmit={sendTyped} noValidate>
            <label class="lcd-label" for="sm-answer">
              Your answer
            </label>
            <textarea
              class="lcd-field"
              id="sm-answer"
              rows={2}
              maxLength={300}
              value={text}
              placeholder="Type your answer"
              onInput={(e) => setText(e.currentTarget.value)}
            />
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="submit" disabled={!text.trim() || busy}>
                  Send
                </button>
              </li>
            </ul>
            {!voice ? (
              <p class="lcd-small sm-center">Voice isn't available here (no mic access or an unsupported browser). Type instead.</p>
            ) : (
              <p class="sm-center">
                <button type="button" class="link-button" onClick={() => setMic("ready")}>
                  Answer out loud instead
                </button>
              </p>
            )}
          </form>
        )}

        {phase === "ask" && failed && (
          <ul class="key-list">
            <li>
              <button class="lcd-key" type="button" onClick={() => fetchNext(turns)}>
                Try again
              </button>
            </li>
          </ul>
        )}

        {showMicRow && (
          <div class="sm-thumb">
            <button type="button" class="sm-side" onClick={typeInstead} aria-label="Type instead">
              <svg width="28" height="20" viewBox="0 0 14 10" shape-rendering="crispEdges" aria-hidden="true">
                <path d="M0 0h14v10H0z M1 1v8h12V1z" fill="currentColor" fill-rule="evenodd" />
                <rect x="2" y="2" width="2" height="1" fill="currentColor" />
                <rect x="5" y="2" width="2" height="1" fill="currentColor" />
                <rect x="8" y="2" width="2" height="1" fill="currentColor" />
                <rect x="3" y="4" width="2" height="1" fill="currentColor" />
                <rect x="6" y="4" width="2" height="1" fill="currentColor" />
                <rect x="9" y="4" width="2" height="1" fill="currentColor" />
                <rect x="4" y="6" width="6" height="1" fill="currentColor" />
              </svg>
              <span>Type</span>
            </button>
            <div class="sm-micwrap">
              <button
                type="button"
                class={`sm-mic${mic === "listening" ? " is-held" : mic === "speaking" || mic === "thinking" ? " is-dim" : ""}`}
                disabled={mic === "speaking" || mic === "thinking"}
                aria-pressed={mic === "listening"}
                aria-label={MIC_LABEL[mic]}
                onPointerDown={holdStart}
                onPointerUp={holdEnd}
                onPointerCancel={holdEnd}
                onPointerLeave={() => (holding.current || recording.current) && void holdEnd()}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => keyHold(e, true)}
                onKeyUp={(e) => keyHold(e, false)}
              >
                <svg width="40" height="56" viewBox="0 0 10 14" shape-rendering="crispEdges" aria-hidden="true">
                  <path d="M3 0h4v1h1v7H7v1H3V8H2V1h1z" fill="currentColor" />
                  <path d="M0 5h1v3h1v1h1v1h4V9h1V8h1V5h1v4H9v1H8v1H6v2h2v1H2v-1h2v-2H2v-1H1V9H0z" fill="currentColor" />
                </svg>
              </button>
              <span class="sm-miclabel">{MIC_LABEL[mic]}</span>
            </div>
            <button type="button" class="sm-side" onClick={skip} aria-label="Skip this question" disabled={busy}>
              <svg width="20" height="20" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
                <path d="M0 1h2v1h1v1h1v1h1v2H4v1H3v1H2v1H0zM5 1h2v1h1v1h1v1h1v2H9v1H8v1H7v1H5z" fill="currentColor" />
              </svg>
              <span>Skip</span>
            </button>
          </div>
        )}

        {phase === "check" && (
          <div class="sm-check">
            <h1 class="sm-checkhead" aria-live="polite">
              <Typed text={checkHead} msPerChar={35} onDone={() => {}} />
            </h1>
            <div class="sm-grid">
              {cells.map((cell) => (
                <div class={`sm-cell${cell.line ? "" : " is-empty"}`} key={cell.pole}>
                  <span class="sm-cellhead">
                    {cell.pole} · {PART_LABEL[cell.part]}
                  </span>
                  <span class="sm-celltext">{cell.line ?? "Add later, if you like"}</span>
                  <span class="sm-cellsrc">{cell.line ? (cell.viaTyped ? "FROM: YOU TYPED" : "FROM: SURPRISE ME") : "EMPTY FOR NOW"}</span>
                </div>
              ))}
            </div>
            <div class={`sm-people${people.length > 0 ? "" : " is-empty"}`}>
              <span class="sm-cellhead">PEOPLE IN YOUR DAYS</span>
              {people.length > 0 ? (
                <>
                  <ul class="sm-roles">
                    {people.map((role) => (
                      <li key={role}>
                        <span class="sm-celltext">{role.toUpperCase()}</span>
                        <button type="button" class="link-button" onClick={() => setDroppedPeople((d) => [...d, role])} aria-label={`Remove ${role}`}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <span class="sm-cellsrc">FROM: YOUR ANSWERS · ROLES ONLY, NEVER NAMES</span>
                </>
              ) : (
                <>
                  <span class="sm-celltext">Nobody named yet. Tries will say someone.</span>
                  <span class="sm-cellsrc">EMPTY FOR NOW</span>
                </>
              )}
            </div>
            <p class="sm-note">Nothing is saved until you say it looks right. Change or undo any line later in MY COMPASS.</p>
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="button" onClick={save} disabled={busy}>
                  Looks right. Make my game
                </button>
              </li>
              <li>
                <button class="lcd-key" type="button" onClick={restart}>
                  Change something
                </button>
              </li>
            </ul>
          </div>
        )}

        {phase === "help" && (
          <>
            <h1 class="sm-head">Let's pause</h1>
            <p class="sm-center">{help}</p>
            <ul class="key-list">
              <li>
                <a class="lcd-key" href="/">
                  Home
                </a>
              </li>
            </ul>
          </>
        )}

        <p class="lcd-small" role="status" aria-live="polite">
          {note}
        </p>
      </div>
    </Screen>
  );
}
