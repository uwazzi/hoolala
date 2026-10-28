// WP26 SURPRISE ME: a short spoken conversation instead of a web search.
// Hoolala! asks out loud (the phone's own voice, MUTE any time), the person
// holds the ball to answer or types, at most 5 questions. Then the surprise:
// a compass in their own words, one observation and two topic ideas.
// Heard, then forgotten: audio is never kept; nothing is saved before LOOKS RIGHT.
import { useEffect, useRef, useState } from "preact/hooks";
import { api } from "../api";
import { type BallMode, PixelBall } from "../components/PixelBall";
import { Screen } from "../components/Screen";
import { canRecord, isMuted, type Level, type Recording, record, setMuted, speak } from "../voice";

type Phase = "intro" | "talk" | "drafting" | "reveal" | "help" | "saved";
interface Turn { q: string; a: string }
interface Line { part: string; text: string; sourceUrl: null; source: string }
interface Draft { lines: Line[]; observation: string | null; ideas: string[]; source: "ai" | "rules" }

const PART_LABEL: Record<string, string> = { interest: "Passions", talk_about: "Projects", more_of: "Inspiration", filter: "Rather not" };
const MAX_TURNS = 5;

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
  const [mode, setMode] = useState<BallMode>("idle");
  const [muted, setMute] = useState(isMuted());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [help, setHelp] = useState("");
  const [note, setNote] = useState("");
  const recording = useRef<Recording | null>(null);
  const holding = useRef(false);
  const mic = canRecord();

  useEffect(() => {
    api("GET", "/api/me").then((res) => {
      if (res.status !== 200) location.href = "/signin";
    });
    return () => {
      recording.current?.cancel();
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function say(text: string) {
    setMode("speaking");
    await speak(text, level);
    // Grabbing the ball cuts Hoolala! off; don't undo "listening".
    setMode((m) => (m === "speaking" ? "idle" : m));
  }

  async function ask(sofar: Turn[]) {
    setMode("thinking");
    const res = await api<{ question?: string | null; help?: string }>("POST", "/api/me/surprise/next", { turns: sofar });
    if (res.data.help) return stop(res.data.help);
    if (res.status !== 200) {
      setMode("idle");
      return setNote("Something went wrong. Try again?");
    }
    if (!res.data.question || sofar.length >= MAX_TURNS) return surprise(sofar);
    setQuestion(res.data.question);
    setAnswer("");
    await say(res.data.question);
  }

  function stop(message: string) {
    window.speechSynthesis?.cancel();
    setMode("idle");
    setHelp(message);
    setPhase("help");
  }

  async function begin() {
    setPhase("talk");
    setNote("");
    setTurns([]);
    await ask([]);
  }

  async function send(event?: Event) {
    event?.preventDefault();
    const a = answer.trim();
    if (!a) return setNote(mic ? "Hold the ball and talk, or type an answer." : "Type an answer first.");
    setNote("");
    const next = [...turns, { q: question, a }];
    setTurns(next);
    setAnswer("");
    await ask(next);
  }

  async function holdStart(event: Event) {
    event.preventDefault();
    if (!mic || recording.current || mode === "thinking") return;
    window.speechSynthesis?.cancel();
    holding.current = true;
    setNote("");
    try {
      const rec = await record(level, () => void holdEnd());
      // Let go before the microphone was ready: drop it.
      if (!holding.current) return rec.cancel();
      recording.current = rec;
      setMode("listening");
    } catch {
      holding.current = false;
      setNote("No microphone? That's fine: type your answer.");
    }
  }

  async function holdEnd() {
    holding.current = false;
    const rec = recording.current;
    if (!rec) return;
    recording.current = null;
    const { wav, seconds } = await rec.stop();
    if (seconds < 0.5) {
      setMode("idle");
      return setNote("Hold the ball while you talk, then let go.");
    }
    setMode("thinking");
    const res = await fetch("/api/me/surprise/hear", { method: "POST", credentials: "same-origin", headers: { "content-type": "audio/wav" }, body: wav });
    const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
    setMode("idle");
    if (!res.ok || !data.text) return setNote(ERRORS[data.error ?? ""] ?? "Didn't catch that. Try again, or type it.");
    setAnswer((prev) => (prev ? `${prev} ${data.text}` : data.text!));
    setNote("Got it. Fix anything, then Send.");
  }

  function keyHold(event: KeyboardEvent, down: boolean) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.repeat) return event.preventDefault();
    if (down) void holdStart(event);
    else void holdEnd();
  }

  async function surprise(sofar: Turn[]) {
    if (!sofar.some((t) => t.a)) return setNote("Answer at least one question first.");
    window.speechSynthesis?.cancel();
    setPhase("drafting");
    setMode("thinking");
    const res = await api<Draft & { help?: string }>("POST", "/api/me/surprise/draft", { turns: sofar });
    if (res.data.help) return stop(res.data.help);
    if (res.status !== 200 || !res.data.lines?.length) {
      setPhase("talk");
      setMode("idle");
      return setNote("Nothing to draft yet. Tell Hoolala! a bit more?");
    }
    setDraft(res.data);
    setPhase("reveal");
    await say(res.data.observation ? `Surprise! ${res.data.observation}` : "Surprise! Here's your compass.");
  }

  async function looksRight() {
    if (!draft) return;
    const res = await api("POST", "/api/me/compass/confirm", { lines: draft.lines, origin: "questions" });
    if (res.status !== 200) return setNote("Keep at least one line.");
    setPhase("saved");
  }

  function toggleMute() {
    setMuted(!muted);
    setMute(!muted);
  }

  const muteKey = (
    <button class="lcd-key" type="button" aria-pressed={muted} onClick={toggleMute}>
      {muted ? "Voice: off" : "Voice: on"}
    </button>
  );

  return (
    <Screen title="Surprise me">
      {phase === "intro" && (
        <>
          <h1 class="screen-title">Surprise me</h1>
          <div class="ball-stage"><PixelBall mode={mode} level={level} /></div>
          <p class="lcd-block">No accounts, no searching. Hoolala! asks a few questions out loud. Hold the ball and answer, or type. Then a little surprise.</p>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={begin}>Start</button></li>
            <li>{muteKey}</li>
          </ul>
          <p class="lcd-small">Heard, then forgotten: your voice is turned into words and never kept. Only the lines you confirm are saved, and only you see them.</p>
        </>
      )}

      {(phase === "talk" || phase === "drafting") && (
        <>
          <p class="lcd-kicker">{phase === "drafting" ? "Thinking..." : `Question ${Math.min(turns.length + 1, MAX_TURNS)} of ${MAX_TURNS}`}</p>
          {mic && phase === "talk" ? (
            <button
              class="ball-stage ball-button"
              type="button"
              aria-label={mode === "listening" ? "Listening. Let go to stop." : "Hold to talk"}
              onPointerDown={holdStart}
              onPointerUp={holdEnd}
              onPointerCancel={holdEnd}
              onPointerLeave={() => holding.current && void holdEnd()}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => keyHold(e, true)}
              onKeyUp={(e) => keyHold(e, false)}
            >
              <PixelBall mode={mode} level={level} />
            </button>
          ) : (
            <div class="ball-stage"><PixelBall mode={mode} level={level} /></div>
          )}
          {phase === "talk" && (
            <>
              <p class="ball-question" aria-live="polite">{question}</p>
              {mic && <p class="lcd-small ball-hint">{mode === "listening" ? "Listening. Let go when you're done." : "Hold the ball to talk."}</p>}
              <form onSubmit={send} noValidate>
                <label class="lcd-label" for="sm-answer">Your answer</label>
                <textarea class="lcd-field" id="sm-answer" rows={2} maxLength={300} value={answer} onInput={(e) => setAnswer(e.currentTarget.value)} />
                <ul class="key-list">
                  <li><button class="lcd-key lcd-key--primary" type="submit" disabled={mode === "thinking" || mode === "listening"}>Send</button></li>
                  {turns.length > 0 && <li><button class="lcd-key" type="button" onClick={() => surprise(turns)}>Surprise me now</button></li>}
                  <li>{muteKey}</li>
                </ul>
              </form>
            </>
          )}
        </>
      )}

      {phase === "reveal" && draft && (
        <>
          <h1 class="screen-title">Surprise!</h1>
          <div class="ball-stage ball-stage--small"><PixelBall mode={mode} level={level} /></div>
          {draft.observation && (
            <div class="lcd-block">
              <p class="lcd-kicker">AI / Surprise</p>
              <p>{draft.observation}</p>
            </div>
          )}
          <h2 class="lcd-label">Your world, according to you</h2>
          <ul class="lcd-menu">
            {draft.lines.map((l, i) => (
              <li class="lcd-block idea" key={l.part + l.text}>
                <p class="lcd-kicker">{PART_LABEL[l.part] ?? l.part}</p>
                <p>{l.text}</p>
                <div class="tiny-actions">
                  <span class="lcd-small">you said</span>
                  <button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          {draft.ideas.length > 0 && (
            <>
              <h2 class="lcd-label">Two things you could post</h2>
              <ul class="lcd-menu">
                {draft.ideas.map((idea) => (
                  <li class="lcd-block idea" key={idea}>
                    <p class="lcd-kicker">AI / Suggestion</p>
                    <p>{idea}</p>
                  </li>
                ))}
              </ul>
              <p class="lcd-small">Check in at a café and post one, if you like.</p>
            </>
          )}
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={looksRight} disabled={!draft.lines.length}>Looks right</button></li>
            <li><button class="lcd-key" type="button" onClick={() => { setDraft(null); setPhase("intro"); }}>Start again</button></li>
          </ul>
          <p class="lcd-small">
            {draft.source === "ai" ? "Drafted by Muse Spark from your own words." : "Your own words, as you said them."} Only you see this. It shapes your own topic ideas; never shown to anyone, never used to match people.
          </p>
        </>
      )}

      {phase === "help" && (
        <>
          <h1 class="screen-title">Let's pause</h1>
          <p class="lcd-block">{help}</p>
          <ul class="key-list"><li><a class="lcd-key" href="/">Home</a></li></ul>
        </>
      )}

      {phase === "saved" && (
        <>
          <h1 class="screen-title">Saved</h1>
          <p class="lcd-block">That's your compass. Change it any time in My compass.</p>
          <ul class="key-list">
            <li><a class="lcd-key lcd-key--primary" href="/arrive">Where are you?</a></li>
            <li><a class="lcd-key" href="/compass">My compass</a></li>
          </ul>
        </>
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
