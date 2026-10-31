// WP36 FIVE QUICK ONES: Hoolala! asks five mostly-chip questions on the
// shared Surprise me voice UI, then hands the answers (in memory only) to
// the juicy bits screen. No per-answer AI; nothing is stored before LOOKS
// RIGHT. Heard, then forgotten: audio is never kept.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { type BallMode, PixelBall } from "../components/PixelBall";
import { Screen } from "../components/Screen";
import { Stages } from "../components/Stages";
import { Typed } from "../components/Typed";
import "../fivequick.css";
import { CLOSING, CONFIRM_LINE, HEARD_NOTE, INTRO, matchChips, saveOnboardAnswers, STEPS, toggleMany, type OnboardAnswers, type OnboardStep } from "../onboard";
import { canRecord, holdRelease, isMuted, type Level, type Recording, record, setMuted, speak } from "../voice";

type Phase = "intro" | "ask" | "closing";
type Mic = "speaking" | "ready" | "listening" | "thinking" | "confirm" | "typing" | "reply";

const BALL: Record<Mic, BallMode> = {
  speaking: "speaking",
  ready: "idle",
  listening: "listening",
  thinking: "thinking",
  confirm: "idle",
  typing: "idle",
  reply: "speaking",
};

const BASE_HINTS: Record<Mic, string> = {
  speaking: "HOOLALA! IS ASKING…",
  ready: "",
  listening: "LISTENING. LET GO WHEN YOU’RE DONE.",
  thinking: "GOT IT. ONE SECOND…",
  confirm: "CHECK IT, OR HOLD THE MIC TO REDO",
  typing: "",
  reply: "",
};

const MIC_LABEL: Record<Mic, string> = {
  speaking: "WAIT…",
  ready: "HOLD TO TALK",
  listening: "LET GO TO SEND",
  thinking: "WAIT…",
  confirm: "HOLD TO REDO",
  typing: "WAIT…",
  reply: "WAIT…",
};

const ERRORS: Record<string, string> = {
  ai_off: "Listening isn't available right now. Type your answer instead.",
  ai_failed: "Didn't catch that. Try again, or type it.",
  too_many: "That's a lot of talking for one hour. Type instead?",
  too_long: "That was a long one. Try a shorter answer.",
  bad_audio: "Didn't catch that. Try again, or type it.",
};

/** The reply to a chip plays 1.7 s, as drawn. */
const REPLY_MS = 1700;
/** Thinking shows at least 800 ms, as drawn, even when transcription is quick. */
const THINK_MS = 800;

const BLANK: OnboardAnswers = {
  q1: null,
  q1f: null,
  q2: [],
  q2extra: null,
  q2f: [],
  q2fextra: null,
  q3: null,
  q4: null,
  q5: [],
};

export function Surprise() {
  const { route } = useLocation();
  const level = useRef<Level>({ current: 0 }).current;
  const [phase, setPhase] = useState<Phase>("intro");
  const [mic, setMic] = useState<Mic>("speaking");
  const [sound, setSound] = useState(!isMuted());
  const [si, setSi] = useState(0);
  const [answers, setAnswers] = useState<OnboardAnswers>(BLANK);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string[]>([]);
  const [heard, setHeard] = useState("");
  const [typedAnswer, setTypedAnswer] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [reply, setReply] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [said, setSaid] = useState(false);
  const [shown, setShown] = useState(false);
  const [bars, setBars] = useState<number[]>([]);
  const recording = useRef<Recording | null>(null);
  const holding = useRef(false);
  const pressedAt = useRef(0);
  const backTo = useRef<Mic>("ready");
  const seq = useRef(0);
  const thinkingSince = useRef(0);
  const saved = useRef(false);
  const voice = useMemo(canRecord, []);
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const step: OnboardStep = STEPS[Math.min(si, STEPS.length - 1)];

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

  function ask(i: number) {
    const my = ++seq.current;
    const q = STEPS[i];
    setSi(i);
    setHeard("");
    setTypedAnswer(false);
    setLastHeard("");
    setReply("");
    setSel([]);
    setText("");
    setNote("");
    setSaid(false);
    setShown(false);
    setMic("speaking");
    void speak(q.q, level).then(() => {
      if (seq.current === my) setSaid(true);
    });
  }

  function keep(id: OnboardStep["id"], value: string | string[] | null) {
    setAnswers((a) => {
      const next = { ...a };
      if (id === "q1" || id === "q1f" || id === "q3" || id === "q4") {
        next[id] = typeof value === "string" ? value : null;
      } else if (id === "q2" || id === "q2f" || id === "q5") {
        next[id] = Array.isArray(value) ? value : [];
      }
      if (id === "q2") next.q2extra = extras.q2?.trim() ? extras.q2.trim() : null;
      if (id === "q2f") next.q2fextra = extras.q2f?.trim() ? extras.q2f.trim() : null;
      return next;
    });
  }

  function advance(skipNext: boolean) {
    const i = si + (skipNext ? 2 : 1);
    if (i >= STEPS.length) {
      const my = ++seq.current;
      setPhase("closing");
      void speak(CLOSING, level).then(() => {
        if (seq.current === my) setSaid(true);
      });
      return;
    }
    ask(i);
  }

  function pickOne(chip: string) {
    if (phase !== "ask") return;
    const my = ++seq.current;
    const q = STEPS[si];
    keep(q.id, chip);
    const line = q.replies?.[chip];
    const skipNext = q.skipFollow === chip;
    if (!line) {
      advance(skipNext);
      return;
    }
    setReply(line);
    setMic("reply");
    void speak(line, level);
    setTimeout(() => {
      if (seq.current === my) advance(skipNext);
    }, REPLY_MS);
  }

  function toggleChip(chip: string) {
    const q = STEPS[si];
    if (phase !== "ask" || q.type !== "many" || !q.none || mic !== "ready") return;
    setSel((s) => toggleMany(s, chip, q.none!));
  }

  function manyNext() {
    const q = STEPS[si];
    if (phase !== "ask" || q.type !== "many") return;
    if (!sel.length && !extras[q.id]?.trim()) return;
    keep(q.id, sel.slice());
    advance(false);
  }

  function textNext() {
    const q = STEPS[si];
    if (phase !== "ask" || q.type !== "text" || !heard.trim()) return;
    keep(q.id, heard.trim());
    advance(false);
  }

  function skip() {
    if (phase !== "ask") return;
    if (mic !== "ready" && mic !== "confirm" && mic !== "typing" && mic !== "reply") return;
    window.speechSynthesis?.cancel();
    holding.current = false;
    recording.current?.cancel();
    recording.current = null;
    const q = STEPS[si];
    keep(q.id, q.type === "many" ? [] : null);
    advance(q.id === "q1");
  }

  async function holdStart(event: Event) {
    event.preventDefault();
    if (phase !== "ask") return;
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
    const my = seq.current;
    const q = STEPS[si];
    thinkingSince.current = Date.now();
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
      if (seq.current !== my) return;
      setMic(backTo.current);
      return setNote("Didn't catch that. Try again, or type it.");
    }
    const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    if (seq.current !== my) return;
    if (!res.ok || !data.text) {
      setMic(backTo.current);
      return setNote(ERRORS[data.error ?? ""] ?? "Didn't catch that. Try again, or type it.");
    }
    // Thinking shows at least 800 ms, as drawn, even when transcription is quick.
    const wait = THINK_MS - (Date.now() - thinkingSince.current);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (seq.current !== my) return;
    const saidText = data.text.trim();
    if (q.type === "text") {
      setHeard(saidText);
      setTypedAnswer(false);
      setMic("confirm");
      return;
    }
    const found = matchChips(saidText, q.chips ?? []);
    setLastHeard(saidText);
    if (q.type === "one") {
      if (found[0]) {
        pickOne(found[0]);
      } else {
        setNote("Didn't catch an answer. Tap one, or try again.");
        setMic("ready");
      }
      return;
    }
    if (!found.length) {
      setNote("Didn't catch a chip. Tap any, or try again.");
      setMic("ready");
      return;
    }
    setSel(q.none && found.includes(q.none) ? [q.none] : found.filter((c) => c !== q.none));
    setMic("ready");
  }

  function again() {
    setHeard("");
    setTypedAnswer(false);
    setNote("");
    setMic(voice ? "ready" : "typing");
  }

  function typeInstead() {
    if (phase !== "ask") return;
    window.speechSynthesis?.cancel();
    holding.current = false;
    recording.current?.cancel();
    recording.current = null;
    const q = STEPS[si];
    setText(q.type === "many" ? (extras[q.id] ?? "") : heard);
    setNote("");
    setMic("typing");
  }

  function sendTyped(event?: Event) {
    event?.preventDefault();
    if (phase !== "ask") return;
    const q = STEPS[si];
    const t = text.trim();
    if (!t) return setNote(voice ? "Hold the mic and talk, or type an answer." : "Type an answer first.");
    setNote("");
    if (q.type === "text") {
      setHeard(t);
      setTypedAnswer(true);
      setMic("confirm");
      return;
    }
    if (q.type === "many") {
      setExtras((x) => ({ ...x, [q.id]: t }));
      setText("");
      setMic("ready");
      return;
    }
    const found = matchChips(t, q.chips ?? [])[0];
    if (found) {
      setLastHeard(t);
      pickOne(found);
    } else {
      setNote("Tap one above, or hold the mic.");
      setMic("ready");
    }
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

  function finish() {
    if (saved.current) return;
    saved.current = true;
    saveOnboardAnswers(answers);
    route("/juicy");
  }

  const soundLabel = sound ? "SOUND ON" : "SOUND OFF";
  const showMicRow = voice && phase === "ask" && mic !== "typing";
  const fills = phase === "intro" ? "5 QUICK ONES" : `Q${step.n} OF 5${step.follow ? " · FOLLOW-UP" : ""}`;
  const hint = mic === "ready" ? step.hint : BASE_HINTS[mic];
  const showChips = phase === "ask" && step.type !== "text" && (mic === "ready" || mic === "listening" || mic === "thinking");
  const showTranscript =
    phase === "ask" && (mic === "listening" || mic === "thinking" || mic === "confirm" || ((mic === "ready" || mic === "reply") && lastHeard !== ""));
  const transcriptLabel = mic === "confirm" ? (typedAnswer ? "YOU TYPED" : "I HEARD") : mic === "ready" || mic === "reply" ? "I HEARD" : "HEARING…";
  const transcriptText = mic === "confirm" ? heard : mic === "ready" || mic === "reply" ? lastHeard : "";
  const showManyNext = phase === "ask" && step.type === "many" && mic === "ready";
  const manyReady = sel.length > 0 || Boolean(extras[step.id]?.trim());
  const confirming = phase === "ask" && step.type === "text" && mic === "confirm";

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
        <Stages now={0} />
        <div class="sm-progress">
          <div class="sm-dots" role="status">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                class={`sm-dot${phase !== "intro" && i + 1 < step.n ? " is-done" : phase !== "intro" && i + 1 === step.n ? " is-now" : ""}`}
                aria-hidden="true"
              />
            ))}
            <span class="sm-fills">{fills}</span>
          </div>
          {soundToggle}
        </div>

        {phase !== "closing" && (
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
            <div
              class={`sm-ball${phase === "ask" && (mic === "speaking" || mic === "reply") ? " is-talking" : phase === "ask" && mic === "listening" ? " is-squashed" : ""}`}
            >
              <PixelBall mode={phase === "ask" ? BALL[mic] : "idle"} level={level} />
            </div>
          </div>
        )}

        {phase === "ask" && <p class="sm-hint">{hint}</p>}

        {phase === "intro" && (
          <>
            <h1 class="fq-hello">{INTRO.head}</h1>
            <p class="sm-center">{INTRO.sub}</p>
            <p class="sm-center lcd-small">{INTRO.how}</p>
            <ul class="key-list">
              <li>
                <button
                  class="lcd-key lcd-key--primary"
                  type="button"
                  onClick={() => {
                    setAnswers(BLANK);
                    setExtras({});
                    setPhase("ask");
                    ask(0);
                  }}
                >
                  Start
                </button>
              </li>
            </ul>
            <p class="lcd-small sm-center">{INTRO.privacy}</p>
          </>
        )}

        {phase === "ask" && (
          <p class="sm-caption" aria-live="polite">
            {mic === "speaking" ? <Typed key={step.id} text={step.q} msPerChar={40} onDone={() => setShown(true)} /> : step.q}
          </p>
        )}

        {phase === "ask" && mic === "reply" && (
          <p class="fq-reply" aria-live="polite">
            {reply}
          </p>
        )}

        {showChips && (
          <div class="fq-chips">
            {(step.chips ?? []).map((chip) => {
              const on = step.type === "many" && sel.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  class={`fq-chip${on ? " is-on" : ""}`}
                  aria-pressed={step.type === "many" ? on : undefined}
                  onClick={() => (step.type === "one" ? pickOne(chip) : toggleChip(chip))}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        )}

        {phase === "ask" && step.type === "many" && mic === "ready" && extras[step.id]?.trim() && (
          <p class="fq-extra">+ {extras[step.id].trim()}</p>
        )}

        {showTranscript && (
          <div class="sm-said keys-rise">
            <span class="sm-said-label">{transcriptLabel}</span>
            <span class="sm-said-text">
              {transcriptText}
              {(mic === "listening" || mic === "thinking") && <span class="lcd-cursor" aria-hidden="true" />}
            </span>
          </div>
        )}

        {showManyNext && (
          <ul class="key-list">
            <li>
              <button class="lcd-key lcd-key--primary" type="button" onClick={manyNext} disabled={!manyReady}>
                Next
              </button>
            </li>
          </ul>
        )}

        {confirming && (
          <div class="keys-rise">
            <p class="sm-center lcd-small">{CONFIRM_LINE}</p>
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="button" onClick={textNext}>
                  Next
                </button>
              </li>
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
              placeholder={step.placeholder}
              onInput={(e) => setText(e.currentTarget.value)}
            />
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="submit" disabled={!text.trim()}>
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

        {phase === "closing" && (
          <p class="sm-caption" aria-live="polite">
            <Typed text={CLOSING} msPerChar={40} onDone={finish} />
          </p>
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
                class={`sm-mic${mic === "listening" ? " is-held" : mic === "speaking" || mic === "thinking" || mic === "reply" ? " is-dim" : ""}`}
                disabled={mic === "speaking" || mic === "thinking" || mic === "reply"}
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
            <button type="button" class="sm-side" onClick={skip} aria-label="Skip this question">
              <svg width="20" height="20" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
                <path d="M0 1h2v1h1v1h1v1h1v2H4v1H3v1H2v1H0zM5 1h2v1h1v1h1v1h1v2H9v1H8v1H7v1H5z" fill="currentColor" />
              </svg>
              <span>Skip</span>
            </button>
          </div>
        )}

        {phase === "ask" && <p class="lcd-small sm-center">{HEARD_NOTE}</p>}

        <p class="lcd-small" role="status" aria-live="polite">
          {note}
        </p>
      </div>
    </Screen>
  );
}
