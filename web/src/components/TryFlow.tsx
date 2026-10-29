// WP28: the one-screen tiny-try flow: GET A TRY > GO > TELL ME > NEXT TIME.
// States and copy from docs/design/v6/Flow.dc.html. The server assigns the
// step, counts the leaves and suggests the next move; the person's taps
// decide everything. NO REPLY only (no GHOSTED) until the owner decides.

import { useEffect, useState } from "preact/hooks";
import { api } from "../api";
import { Plant } from "./Plant";
import { Typewriter } from "./Typewriter";

export interface PlantState {
  tries: number;
  leaves: number;
  step: number;
}

interface LibraryTryView {
  id: string | null;
  step: number;
  place: string;
  title: string;
  hint: string;
  meta: string;
  source: "library" | "try_it";
  why: string | null;
  minutes?: number;
  words_max?: number;
  asks_of_other?: string;
}

type OutcomeKind = "went_well" | "no_reply" | "awkward" | "didnt_happen";

const OUTCOMES: { kind: OutcomeKind; label: string; note: string; lead: string; title: string; past: string }[] = [
  { kind: "went_well", label: "Went well", note: "+1 leaf", lead: "A new leaf just grew.", title: "Lovely. That was you.", past: "Last one went well." },
  { kind: "no_reply", label: "No reply / ghosted", note: "+1 leaf", lead: "No worries, sometimes it happens. It says nothing about you.", title: "Still a leaf. You went.", past: "Last one got no reply. Happens." },
  { kind: "awkward", label: "Awkward but done", note: "+1 leaf", lead: "Awkward just means new. It wears off.", title: "A leaf for going anyway.", past: "Last one felt awkward." },
  { kind: "didnt_happen", label: "Didn't happen", note: "No problem", lead: "That’s fine. Some days are like that.", title: "The plant doesn’t mind.", past: "Last one didn’t happen. Fine." },
];

const PLACES = [
  { id: "anywhere", label: "Anywhere" },
  { id: "cafe", label: "Café" },
  { id: "work", label: "Work" },
];

const NEXTS: { move: -1 | 0 | 1; label: string }[] = [
  { move: -1, label: "Gentler" },
  { move: 0, label: "Same step" },
  { move: 1, label: "Braver" },
];

export function TryFlow({ plant, onPlant }: { plant: PlantState; onPlant: (p: PlantState) => void }) {
  const [screen, setScreen] = useState<"offer" | "out" | "ask" | "debrief" | "later">("offer");
  const [place, setPlace] = useState("anywhere");
  const [pick, setPick] = useState(0);
  const [current, setCurrent] = useState<LibraryTryView | null>(null);
  const [note, setNote] = useState("");
  const [debrief, setDebrief] = useState<{ kind: OutcomeKind; suggestion: -1 | 0 | 1; grew: number } | null>(null);
  const [lastOutcome, setLastOutcome] = useState<OutcomeKind | null>(null);
  const [moved, setMoved] = useState(0);
  const [next, setNext] = useState<-1 | 0 | 1>(0);
  const [grew, setGrew] = useState(-1);
  const step = plant.step;

  useEffect(() => {
    if (screen !== "offer") return;
    setCurrent(null);
    setNote("");
    api<{ try: LibraryTryView; step: number }>("GET", `/api/tries/today?place=${place}&skip=${pick}`).then((res) => {
      if (res.status !== 200) {
        setNote("No try right now. Try again in a bit.");
        return;
      }
      setCurrent(res.data.try);
    });
  }, [screen, place, pick]);

  async function tell(kind: OutcomeKind) {
    if (!current) return;
    setNote("");
    const res = await api<{ step: number; leaves: number; grew: number; suggestion: -1 | 0 | 1 }>(
      "POST",
      "/api/tries",
      current.source === "try_it"
        ? {
            source: "try_it",
            draft: {
              title: current.title,
              hint: current.hint,
              step: current.step,
              words_max: current.words_max,
              minutes: current.minutes,
              asks_of_other: current.asks_of_other,
              place_kind: place,
              why: current.why,
            },
            placeKind: place,
            outcome: kind,
          }
        : { libraryId: current.id, placeKind: place, outcome: kind },
    );
    if (res.status !== 200) {
      setNote("That didn't save. Try again?");
      return;
    }
    const counts = await api<PlantState>("GET", "/api/me/plant");
    if (counts.status === 200) onPlant(counts.data);
    setDebrief({ kind, suggestion: res.data.suggestion, grew: res.data.grew });
    setGrew(res.data.grew);
    setNext(res.data.suggestion);
    setLastOutcome(kind);
    setScreen("debrief");
  }

  async function another() {
    const res = await api<{ step: number }>("POST", "/api/tries/step", { choice: next });
    const nl = res.status === 200 ? res.data.step : step;
    onPlant({ ...plant, step: nl });
    setMoved(nl - step);
    setGrew(-1);
    if (nl === step) setPick((p) => p + 1);
    else setPick(0);
    setScreen("offer");
  }

  const outcome = OUTCOMES.find((o) => o.kind === (debrief?.kind ?? lastOutcome));
  const past = lastOutcome ? OUTCOMES.find((o) => o.kind === lastOutcome)!.past : "";
  const why = moved > 0 ? "One step braver, as you chose." : moved < 0 ? "A gentler one, as you chose." : "Same step, a fresh try.";
  const texts =
    screen === "offer" && current
      ? { lead: lastOutcome ? `${past} ${why}` : "Today’s tiny try. Optional, always.", title: current.title, meta: `Step ${step} of 5 · ${current.meta}` }
      : screen === "later"
        ? { lead: "No problem. Your plant waits.", title: "See you whenever.", meta: null }
        : screen === "out" && current
          ? { lead: "Off you go. Phone in pocket.", title: current.hint, meta: null }
          : screen === "ask"
            ? { lead: "Welcome back.", title: "How did it go?", meta: null }
            : screen === "debrief" && outcome
              ? { lead: outcome.lead, title: outcome.title, meta: null }
              : null;

  const stepNow = screen === "offer" || screen === "later" ? 0 : screen === "out" ? 1 : 2;
  const path = ["Get a try", "Go", "Tell me"];

  return (
    <>
      <div class="goal-bar">Get outside. Meet people. Grow inside.</div>
      <div class="plant-meter">
        <Plant leaves={plant.leaves} grew={grew} cell={10} />
        <div>
          <div class="lcd-kicker">Your plant</div>
          <div class="plant-meter-count">{plant.leaves}</div>
          <div class="lcd-small">{plant.leaves === 0 ? "Bare for now. One try and it starts." : plant.leaves === 1 ? "1 tiny try so far" : `${plant.leaves} tiny tries so far`}</div>
          <div class="ladder" aria-label={`Step ${step} of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} class={`ladder-cell${i <= step ? " is-on" : ""}`} />
            ))}
            <span class="lcd-kicker">Step {step} of 5</span>
          </div>
          <div class="lcd-small">Every try adds colour. It never wilts.</div>
        </div>
      </div>
      <ol class="step-path" aria-label="Where you are">
        {path.map((label, i) => (
          <li key={label} class={i === stepNow ? "step-now" : i < stepNow ? "step-done" : "step-next"}>
            {i + 1} {label}
          </li>
        ))}
      </ol>
      <div class="says" aria-live="polite">
        <div class="lcd-kicker">Hoolala! says</div>
        {!texts ? (
          <p class="lcd-kicker" role="status">Finding today’s try...</p>
        ) : (
          <Typewriter key={`${screen}:${current?.id ?? ""}:${pick}:${debrief?.kind ?? ""}`} lead={texts.lead} title={texts.title} meta={texts.meta} why={screen === "offer" ? current?.why ?? null : null}>
            <div class="try-keys keys-rise">
              {screen === "offer" && (
                <>
                  <div class="chip-row" role="radiogroup" aria-label="Where?">
                    <span class="chip-row-label">Where?</span>
                    {PLACES.map((p) => (
                      <label class="chip" key={p.id}>
                        <input type="radio" name="where" checked={place === p.id} onChange={() => { setPlace(p.id); setPick(0); }} />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                  <button class="lcd-key lcd-key--primary" type="button" onClick={() => setScreen("out")}>I’m in. Off I go</button>
                  <div class="key-row">
                    <button class="lcd-key" type="button" onClick={() => setPick((p) => p + 1)}>Another one</button>
                    <button class="lcd-key" type="button" onClick={() => setScreen("later")}>Not today</button>
                  </div>
                </>
              )}
              {screen === "out" && (
                <button class="lcd-key lcd-key--primary" type="button" onClick={() => setScreen("ask")}>I’m back</button>
              )}
              {screen === "ask" && (
                <>
                  {OUTCOMES.map((o, i) => (
                    <button key={o.kind} class={`lcd-key${i === 0 ? " lcd-key--primary" : ""}`} type="button" onClick={() => tell(o.kind)}>
                      <span>{o.label}</span>
                      <span class="key-note">{o.note}</span>
                    </button>
                  ))}
                </>
              )}
              {screen === "debrief" && debrief && (
                <>
                  <div class="chip-row" role="radiogroup" aria-label="Next time">
                    <span class="chip-row-label">Next time</span>
                    {NEXTS.map((n) => (
                      <label class="chip" key={n.label}>
                        <input
                          type="radio"
                          name="next"
                          checked={next === n.move}
                          disabled={step + n.move < 1 || step + n.move > 5}
                          onChange={() => setNext(n.move)}
                        />
                        <span>
                          {n.label}
                          {debrief.suggestion === n.move && <em class="chip-suggested">Suggested</em>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button class="lcd-key lcd-key--primary" type="button" onClick={another}>Another tiny try</button>
                  <button class="lcd-key" type="button" onClick={() => { setGrew(-1); setScreen("later"); }}>Enough for today</button>
                  {debrief.kind !== "didnt_happen" && (
                    <a class="dashed-link" href="/friends">
                      <span>Tell my friends what happened</span>
                      <span aria-hidden="true">&gt;</span>
                    </a>
                  )}
                </>
              )}
              {screen === "later" && (
                <button class="lcd-key lcd-key--primary" type="button" onClick={() => setScreen("offer")}>Changed my mind</button>
              )}
            </div>
          </Typewriter>
        )}
      </div>
      {note && (
        <p class="lcd-small" role="status">
          {note}
        </p>
      )}
      <a class="dashed-link" href="/here">
        <span>At a café or coworking? See who here would like to talk</span>
        <span aria-hidden="true">&gt;</span>
      </a>
    </>
  );
}
