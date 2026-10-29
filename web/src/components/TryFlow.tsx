// WP38: the tiny-try flow after LET'S GO: OUT > ASK > DEBRIEF, plus LATER.
// The offer screen moved to Home (the try is on the home screen itself);
// the place chips, the friend-dare link and the signals link are gone.
// Game tries record through the game branch; ANOTHER ONE draws from it.
import { useState } from "preact/hooks";
import { api } from "../api";
import { Plant } from "./Plant";
import { Typewriter } from "./Typewriter";

export interface PlantState {
  tries: number;
  leaves: number;
  step: number;
}

export interface HeroTry {
  id: string | null;
  step: number;
  place: string;
  title: string;
  hint: string;
  meta: string;
  source: "library" | "try_it" | "game";
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

const NEXTS: { move: -1 | 0 | 1; label: string }[] = [
  { move: -1, label: "Gentler" },
  { move: 0, label: "Same step" },
  { move: 1, label: "Braver" },
];

export function TryFlow({
  plant,
  onPlant,
  heroTry,
  initial,
  onAnother,
  onExit,
}: {
  plant: PlantState;
  onPlant: (p: PlantState) => void;
  heroTry: HeroTry;
  initial: "go" | "later";
  onAnother: (next: HeroTry) => void;
  onExit: () => void;
}) {
  const [screen, setScreen] = useState<"out" | "ask" | "debrief" | "later">(initial === "later" ? "later" : "out");
  const [note, setNote] = useState("");
  const [debrief, setDebrief] = useState<{ kind: OutcomeKind; suggestion: -1 | 0 | 1; grew: number; tryId: string | null } | null>(null);
  const [next, setNext] = useState<-1 | 0 | 1>(0);
  const [grew, setGrew] = useState(-1);
  const [busy, setBusy] = useState(false);
  const step = plant.step;

  async function tell(kind: OutcomeKind) {
    setNote("");
    setBusy(true);
    const telling =
      heroTry.source === "game"
        ? { source: "game", gameId: heroTry.id, placeKind: "anywhere", outcome: kind }
        : heroTry.source === "try_it"
          ? {
              source: "try_it",
              draft: {
                title: heroTry.title,
                hint: heroTry.hint,
                step: heroTry.step,
                words_max: heroTry.words_max,
                minutes: heroTry.minutes,
                asks_of_other: heroTry.asks_of_other,
                place_kind: heroTry.place,
                why: heroTry.why,
              },
              placeKind: heroTry.place,
              outcome: kind,
            }
          : { libraryId: heroTry.id, placeKind: heroTry.place, outcome: kind };
    const res = await api<{ try_id: string; step: number; leaves: number; grew: number; suggestion: -1 | 0 | 1 }>("POST", "/api/tries", telling);
    setBusy(false);
    if (res.status !== 200) {
      if (res.status === 401) return void (location.href = "/signin");
      setNote("That didn't save. Try again?");
      return;
    }
    const counts = await api<PlantState>("GET", "/api/me/plant");
    if (counts.status === 200) onPlant(counts.data);
    setDebrief({ kind, suggestion: res.data.suggestion, grew: res.data.grew, tryId: res.data.try_id ?? null });
    setGrew(res.data.grew);
    setNext(res.data.suggestion);
    setScreen("debrief");
  }

  async function another() {
    if (busy) return;
    setBusy(true);
    setNote("");
    const stepped = await api<{ step: number }>("POST", "/api/tries/step", { choice: next });
    const nl = stepped.status === 200 ? stepped.data.step : step;
    onPlant({ ...plant, step: nl });
    if (heroTry.source === "game" && heroTry.id) {
      const res = await api<{ try: HeroTry }>("POST", "/api/game/another", { id: heroTry.id });
      setBusy(false);
      if (res.status === 401) return void (location.href = "/signin");
      if (res.status !== 200) return setNote("That didn't work. Try again?");
      onAnother({ ...res.data.try, hint: "", meta: `${(res.data.try as { minutes?: number }).minutes ?? 1} MIN · FROM YOUR GAME`, place: "anywhere" });
      return;
    }
    const res = await api<{ try: HeroTry }>("GET", `/api/tries/today?skip=${nl === step ? 1 : 0}`);
    setBusy(false);
    if (res.status !== 200) return setNote("No try right now. Try again in a bit.");
    onAnother(res.data.try);
  }

  const outcome = OUTCOMES.find((o) => o.kind === debrief?.kind);
  const texts =
    screen === "later"
      ? { lead: "No problem. Your plant waits.", title: "See you whenever.", meta: null }
      : screen === "out"
        ? { lead: "Off you go. Phone in pocket.", title: heroTry.hint || heroTry.title, meta: null }
        : screen === "ask"
          ? { lead: "Welcome back.", title: "How did it go?", meta: null }
          : screen === "debrief" && outcome
            ? { lead: outcome.lead, title: outcome.title, meta: null }
            : null;

  const stepNow = screen === "later" ? 0 : screen === "out" ? 1 : 2;
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
          <p class="lcd-kicker" role="status">Finding today's try...</p>
        ) : (
          <Typewriter key={`${screen}:${heroTry.id ?? ""}:${debrief?.kind ?? ""}`} lead={texts.lead} title={texts.title} meta={texts.meta}>
            <div class="try-keys keys-rise">
              {screen === "out" && (
                <button class="lcd-key lcd-key--primary" type="button" onClick={() => setScreen("ask")}>I’m back</button>
              )}
              {screen === "ask" && (
                <>
                  {OUTCOMES.map((o, i) => (
                    <button key={o.kind} class={`lcd-key${i === 0 ? " lcd-key--primary" : ""}`} type="button" onClick={() => tell(o.kind)} disabled={busy}>
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
                  <button class="lcd-key lcd-key--primary" type="button" onClick={another} disabled={busy}>Another tiny try</button>
                  <button class="lcd-key" type="button" onClick={() => { setGrew(-1); setScreen("later"); }}>Enough for today</button>
                  {debrief.tryId && (
                    <a class="dashed-link" href={`/compass?fix=${debrief.tryId}`}>
                      <span>Compass? That try felt off</span>
                      <span aria-hidden="true">&gt;</span>
                    </a>
                  )}
                </>
              )}
              {screen === "later" && (
                <button class="lcd-key lcd-key--primary" type="button" onClick={onExit}>Changed my mind</button>
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
    </>
  );
}
