// WP34 SURPRISE ME voice: five quick questions, answered by holding the mic
// in the thumb zone or by typing. Every answer shows what was heard and the
// compass line it would make; KEEP saves exactly that line, SAY AGAIN drops
// it, SKIP moves on. Heard, then forgotten: audio is never kept; nothing is
// saved before KEEP.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { api } from "../api";
import { type BallMode, PixelBall } from "../components/PixelBall";
import { Screen } from "../components/Screen";
import { Typed } from "../components/Typed";
import { proposePlan } from "../surprise";
import { canRecord, holdRelease, isMuted, type Level, type Recording, record, setMuted, speak } from "../voice";

type Phase = "intro" | "ask" | "done" | "help";
type Mic = "speaking" | "ready" | "listening" | "thinking" | "confirm" | "typing";

interface Turn {
  q: string;
  a: string;
}
interface Draft {
  part: string;
  words: string;
}

const PART_LABEL: Record<string, string> = {
  interest: "TALK ABOUT",
  intention: "MORE OF",
  filter: "LESS OF",
  delivery: "HOW I GO",
  action: "NEXT TIME",
};
const MAX_TURNS = 5;

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
  const [kept, setKept] = useState(0);
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

  async function begin() {
    const sofar: Turn[] = [];
    setTurns(sofar);
    setKept(0);
    setNote("");
    setPhase("ask");
    await fetchNext(sofar);
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
    await proposeAnswer(heardText, false);
  }

  async function proposeAnswer(answer: string, viaTyping: boolean) {
    setMic("thinking");
    let why = "That didn't work. Try again?";
    for (const attempt of proposePlan(answer, qpart)) {
      let res;
      try {
        res = await api<{ proposed?: Draft; error?: string; why?: string }>("POST", "/api/me/compass/propose", attempt);
      } catch {
        break;
      }
      if (res.status === 401) return void (location.href = "/signin");
      if (res.status === 200 && res.data.proposed) {
        setTypedAnswer(viaTyping);
        setDraft(res.data.proposed);
        setDraftWhy("");
        setNote("");
        setMic("confirm");
        return;
      }
      if (res.data.error === "crisis") return stop(typeof res.data.why === "string" ? res.data.why : "Let's pause. Call 143 any time, day or night.");
      if (res.status === 429) {
        why = "Slow down a little, then try again.";
        break;
      }
      if (typeof res.data.why === "string") why = res.data.why;
    }
    setTypedAnswer(viaTyping);
    setDraft(null);
    setDraftWhy(why);
    setNote("");
    setMic("confirm");
  }

  async function keep() {
    if (!draft || !takeBusy()) return;
    setNote("");
    let res;
    try {
      res = await api<{ why?: string }>("POST", "/api/me/compass/keep", { part: draft.part, words: draft.words });
    } catch {
      freeBusy();
      return setNote("That didn't save. Try again?");
    }
    if (res.status === 401) return void (location.href = "/signin");
    if (res.status !== 200) {
      freeBusy();
      return setNote(typeof res.data.why === "string" ? res.data.why : "That didn't save. Try again?");
    }
    const next = [...turns, { q: question, a: heard }];
    setTurns(next);
    setKept((k) => k + 1);
    setDraft(null);
    setHeard("");
    if (next.length >= MAX_TURNS) {
      window.speechSynthesis?.cancel();
      setPhase("done");
      freeBusy();
      return;
    }
    setMic("thinking");
    await fetchNext(next);
    freeBusy();
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
    await proposeAnswer(t, true);
    freeBusy();
  }

  async function skip() {
    if (phase !== "ask" || !question || failed || !takeBusy()) return;
    window.speechSynthesis?.cancel();
    holding.current = false;
    recording.current?.cancel();
    recording.current = null;
    const next = [...turns, { q: question, a: "" }];
    setTurns(next);
    setHeard("");
    if (next.length >= MAX_TURNS) {
      setPhase("done");
      freeBusy();
      return;
    }
    setMic("thinking");
    await fetchNext(next);
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
  const inQuestions = phase === "ask";
  const showMicRow = voice && inQuestions && mic !== "typing" && !failed;
  const fills = qpart ? `Q${qi + 1} · FILLS ${PART_LABEL[qpart] ?? qpart}` : `Q${qi + 1} · ANYTHING ELSE`;
  const showTranscript = mic === "listening" || ((mic === "thinking" || mic === "confirm") && heard !== "");

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
      title="Surprise me"
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
        <div class="sm-progress">
          {inQuestions && question ? (
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

        {(phase === "intro" || inQuestions) && (
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
            {inQuestions && mic === "listening" && <span class="sm-ping" aria-hidden="true" />}
            <div class={`sm-ball${inQuestions && mic === "speaking" ? " is-talking" : inQuestions && mic === "listening" ? " is-squashed" : ""}`}>
              <PixelBall mode={inQuestions ? BALL[mic] : "idle"} level={level} />
            </div>
          </div>
        )}

        {inQuestions && <p class="sm-hint">{HINTS[mic]}</p>}

        {inQuestions && question && (
          <p class="sm-caption" aria-live="polite">
            {mic === "speaking" ? <Typed key={qi} text={question} msPerChar={45} onDone={() => setShown(true)} /> : question}
          </p>
        )}

        {phase === "intro" && (
          <>
            <h1 class="sm-head">Five quick questions. Then a little surprise.</h1>
            <p class="sm-center">Hold the mic at the bottom and answer out loud, or type.</p>
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

        {inQuestions && showTranscript && (
          <div class="sm-said keys-rise">
            <span class="sm-said-label">{mic === "confirm" ? (typedAnswer ? "YOU TYPED" : "I HEARD") : "HEARING..."}</span>
            <span class="sm-said-text">
              {heard}
              {mic === "listening" && <span class="lcd-cursor" aria-hidden="true" />}
            </span>
          </div>
        )}

        {inQuestions && mic === "confirm" && (
          <div class="keys-rise">
            <div class="sm-draft">
              <span class="lcd-kicker">For your compass</span>
              {draft ? (
                <>
                  <p class="sm-draft-line">
                    <span class="sm-draft-part">{PART_LABEL[draft.part] ?? draft.part}:</span> {draft.words}
                  </p>
                  <p class="sm-src">you said</p>
                </>
              ) : (
                <p class="sm-draft-line">{draftWhy}</p>
              )}
            </div>
            <ul class="key-list">
              {draft && (
                <li>
                  <button class="lcd-key lcd-key--primary" type="button" onClick={keep} disabled={busy}>
                    Keep
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

        {inQuestions && mic === "typing" && (
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

        {inQuestions && failed && (
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

        {phase === "done" && (
          <>
            <h1 class="sm-head">{kept > 0 ? `That's you, in ${kept} ${kept === 1 ? "answer" : "answers"}.` : "Nothing kept this time."}</h1>
            <p class="sm-center">{kept > 0 ? "Your surprise is ready: your compass, drawn from your own words." : "Your compass is still empty. You can try again any time."}</p>
            <ul class="key-list">
              <li>
                <a class="lcd-key lcd-key--primary" href="/compass?fresh=1">
                  Show me
                </a>
              </li>
            </ul>
          </>
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
