// WP-A5 how did it go: three quick ones, all skippable, then the
// celebration. Battery and chat stay private; stay-in-touch only connects
// when both say yes, and a one-sided yes looks like a no.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { Screen } from "../components/Screen";

interface MetPerson {
  name: string;
  stayToken: string | null;
}

interface DebriefForm {
  roomId: string;
  topic: string;
  mine: boolean;
  met: MetPerson[];
  answered?: boolean;
}

interface StayResult {
  name: string;
  result: "friends" | "no" | "waiting";
}

type Phase = "loading" | "signed-out" | "none" | "answered" | "form" | "done";

const CHATS = ["AWKWARD", "OK", "GOOD", "GREAT"];
const TAGS = [
  { id: "good", label: "SOMETHING GOOD" },
  { id: "bad", label: "SOMETHING OFF" },
  { id: "idea", label: "AN IDEA" },
];

export function Debrief() {
  const { query } = useLocation();
  const id = typeof query.room === "string" ? query.room : "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [form, setForm] = useState<DebriefForm | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [chat, setChat] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [stay, setStay] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<StayResult[]>([]);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!id) return setPhase("none");
    api<DebriefForm>("GET", `/api/rooms/${id}/debrief`)
      .then((res) => {
        if (res.status === 401) return setPhase("signed-out");
        if (res.status !== 200) return setPhase("none");
        if (res.data.answered) return setPhase("answered");
        setForm(res.data);
        setPhase("form");
      })
      .catch(() => setPhase("none"));
  }, [id]);

  async function send() {
    if (busy || !form) return;
    setBusy(true);
    setNote("");
    const choices: Record<string, boolean> = {};
    for (const m of form.met) {
      if (m.stayToken && stay[m.stayToken] !== undefined) choices[m.stayToken] = stay[m.stayToken];
    }
    let res;
    try {
      res = await api<{ stay: StayResult[]; feedbackSent: boolean }>("POST", `/api/rooms/${id}/debrief`, {
        battery,
        chat: chat?.toLowerCase() ?? null,
        tag,
        text: text.trim(),
        stay: choices,
      });
    } catch {
      setBusy(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    if (res.status === 401) return setPhase("signed-out");
    if (res.status === 422) return setNote(String((res.data as { message?: string }).message ?? "That one doesn't fit. Try again?"));
    if (res.status !== 200) return setNote("Something went wrong. Try again.");
    setResults(res.data.stay);
    setFeedbackSent(res.data.feedbackSent);
    setPhase("done");
  }

  return (
    <Screen title="How did it go">
      {phase === "loading" && (
        <div class="around-body">
          <p class="around-status">OPENING...</p>
        </div>
      )}

      {phase === "signed-out" && (
        <div class="around-body">
          <p class="lcd-block">Sign in first.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
        </div>
      )}

      {phase === "none" && (
        <div class="around-body">
          <h1 class="around-head">NOTHING TO ANSWER.</h1>
          <p class="around-promise">That debrief ended or never opened.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/">Back to today</a></li></ul>
        </div>
      )}

      {phase === "answered" && (
        <div class="around-body">
          <h1 class="around-head">ALREADY SENT.</h1>
          <p class="around-promise">Enjoy the rest of your day.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/">Back to today</a></li></ul>
        </div>
      )}

      {phase === "form" && form && (
        <>
          <div class="around-body">
            <h1 class="around-head">HOW DID IT GO?</h1>
            <p class="around-privacy">Three quick ones. Skip any.</p>

            <span class="field-label" id="db-battery-label">YOUR BATTERY NOW?</span>
            <div class="battery-row" role="group" aria-labelledby="db-battery-label">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  class={`battery${battery === n ? " on" : ""}`}
                  aria-pressed={battery === n}
                  aria-label={`${n} out of 5`}
                  onClick={() => setBattery(battery === n ? null : n)}
                >
                  {"■".repeat(n)}{"□".repeat(5 - n)}
                </button>
              ))}
            </div>

            <span class="field-label" id="db-chat-label">AND THE CHAT?</span>
            <div class="dur-row chat-row" role="group" aria-labelledby="db-chat-label">
              {CHATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  class={`chip${chat === c ? " on" : ""}`}
                  aria-pressed={chat === c}
                  onClick={() => setChat(chat === c ? null : c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <span class="field-label" id="db-fb-label">ANYTHING FOR THE OWNER?</span>
            <div class="dur-row" role="group" aria-labelledby="db-fb-label">
              {TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  class={`chip${tag === t.id ? " on" : ""}`}
                  aria-pressed={tag === t.id}
                  onClick={() => setTag(tag === t.id ? null : t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              class="lcd-field"
              rows={3}
              maxLength={280}
              placeholder="A line for Huguinho. No names, it lands without yours."
              value={text}
              aria-label="Feedback for the owner"
              onInput={(e) => setText((e.target as HTMLTextAreaElement).value.slice(0, 280))}
            />
            <span class="field-count">{text.length} / 280 · Huguinho reads every note. Be kind.</span>

            {form.met.map((m) => (
              <div key={m.stayToken ?? m.name} class="stay-row">
                <span class="stay-ask">STAY IN TOUCH WITH {m.name.toUpperCase()}?</span>
                <div class="stay-keys">
                  <button
                    type="button"
                    class={`chip${m.stayToken && stay[m.stayToken] === true ? " on" : ""}`}
                    aria-pressed={m.stayToken !== null && stay[m.stayToken] === true}
                    onClick={() => m.stayToken && setStay({ ...stay, [m.stayToken]: true })}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    class={`chip${m.stayToken && stay[m.stayToken] === false ? " on" : ""}`}
                    aria-pressed={m.stayToken !== null && stay[m.stayToken] === false}
                    onClick={() => m.stayToken && setStay({ ...stay, [m.stayToken]: false })}
                  >
                    NO THANKS
                  </button>
                </div>
              </div>
            ))}
            {note && <p class="lcd-small" role="alert">{note}</p>}
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" disabled={busy} onClick={send}>
              <span>SEND</span><span aria-hidden="true">&gt;</span>
            </button>
          </div>
        </>
      )}

      {phase === "done" && form && (
        <div class="around-body">
          <div class="confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={`left: ${(i * 53) % 100}%; animation-delay: ${(i % 6) * 0.2}s;`} />
            ))}
          </div>
          <h1 class="around-head">HOOLALA!</h1>
          <p class="around-promise">YOU MADE A REAL HUMAN CONNECTION.</p>
          <p class="around-privacy">
            {form.mine
              ? "You started something. Someone came. That's the whole trick."
              : "You walked up to a stranger's table. That's the whole trick."}
          </p>
          <p class="around-privacy">
            {feedbackSent ? "+1 private moment · your note went to the Hoolala! inbox" : "Your plant grows 5 leaves for this one."}
          </p>
          {results.map((r) => (
            <p key={r.name} class="around-privacy">
              {r.result === "friends"
                ? `${r.name} said yes too. Hoolala! keeps you in touch. Find them under Friends.`
                : r.result === "waiting"
                  ? `Waiting for ${r.name} to finish.`
                  : "A good chat needs nothing more. Enjoy the rest of your day."}
            </p>
          ))}
          <p class="around-status">HOOLALA! IS OFF. YOU'RE ON.</p>
          <p class="around-privacy">Enjoy the rest of your day.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/?grew=5">Back to today</a></li></ul>
        </div>
      )}
    </Screen>
  );
}
