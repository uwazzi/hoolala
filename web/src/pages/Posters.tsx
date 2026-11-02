// The poster maker (v6.5): pick a hook or write one, name the place, choose
// the paper, see the live preview, print one full A4 page. Own hooks and
// places are screened before they print; after printing, tips and a nudge
// to post the first line. Only the poster itself prints.
import { useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { READY_HOOKS } from "../../../src/content/posters";
import { posterPlaceName, wrapHook } from "../../../src/rules/poster";
import { SCREEN_MESSAGES, screenPlaceText, screenText } from "../../../src/rules/screening";
import { api } from "../api";
import { PosterArt } from "../components/PosterArt";
import { Screen } from "../components/Screen";

type Err = { field: "hook" | "place" | null; text: string } | null;

export function Posters() {
  const { route } = useLocation();
  const [hook, setHook] = useState(0);
  const [own, setOwn] = useState("");
  const [place, setPlace] = useState("");
  const [saver, setSaver] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<Err>(null);
  const ownRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);

  const ownTrimmed = own.trim();
  const wrapped = hook === 3 ? wrapHook(ownTrimmed) : null;
  const tooLong = hook === 3 && !!ownTrimmed && !Array.isArray(wrapped);
  const lines = hook < 3 ? READY_HOOKS[hook].lines : Array.isArray(wrapped) ? wrapped : ["YOUR HOOK", "GOES HERE."];
  const placeLabel = posterPlaceName(place);
  const origin = window.location.origin;
  const host = window.location.host;

  function doPrint() {
    const done = () => setPrinted(true);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    done();
  }

  function localVerdict(): Err {
    if (hook === 3) {
      const code = screenText(ownTrimmed, 40);
      if (!code.ok) return { field: "hook", text: (SCREEN_MESSAGES as Record<string, string>)[code.category as string] };
    }
    if (place.trim()) {
      const code = screenPlaceText(place.trim());
      if (!code.ok) return { field: "place", text: (SCREEN_MESSAGES as Record<string, string>)[code.category as string] };
    }
    return null;
  }

  async function print() {
    if (checking) return;
    if (hook === 3 && !ownTrimmed) return setErr({ field: "hook", text: "Write your hook first, or pick one of ours." });
    if (tooLong) return setErr({ field: "hook", text: "Your hook needs a trim to fit the poster." });
    if (hook !== 3 && !place.trim()) return doPrint();
    setChecking(true);
    setErr(null);
    try {
      const res = await api<{ ok: boolean; field?: "hook" | "place"; reason?: string }>(
        "POST",
        "/api/poster/check",
        { ...(hook === 3 ? { hook: ownTrimmed } : {}), ...(place.trim() ? { place: place.trim() } : {}) },
        { signal: AbortSignal.timeout(4000) },
      );
      setChecking(false);
      if (res.status === 429) return setErr({ field: null, text: "Too many checks just now. Wait a minute, then try again." });
      if (res.status !== 200) return setErr({ field: null, text: "Couldn't check just now. Try again?" });
      if (!res.data.ok) return setErr({ field: res.data.field ?? null, text: res.data.reason ?? "That one doesn't fit a public poster. Try again?" });
      return doPrint();
    } catch {
      // Timed out or offline: code rules alone decide.
      setChecking(false);
      const local = localVerdict();
      if (local) return setErr(local);
      return doPrint();
    }
  }

  function focusField() {
    (err?.field === "place" ? placeRef : ownRef).current?.focus();
  }

  const art = <PosterArt lines={lines} place={placeLabel} saver={saver} qrUrl={`${origin}/p`} host={host} />;
  const softkeys = (
    <>
      <a class="lcd-softkey" href="/around">Back</a>
      <span class="lcd-softkey" aria-hidden="true"></span>
    </>
  );

  return (
    <Screen title="Poster" softkeys={softkeys}>
      {!printed ? (
        <div class="no-print">
          <div class="around-body">
            <span class="table-kicker">MAKE YOUR POSTER.</span>
            <h1 class="around-head">YOUR PLACE ON PAPER.</h1>
            <p class="around-promise">Three taps: a hook, the place's name, LCD green or ink saver. Print one full A4 page and post it by the coffee machine.</p>

            <span class="field-label">YOUR POSTER, LIVE.</span>
            <div class="maker-preview-well" aria-hidden="true">
              <div class="maker-preview-scale">{art}</div>
            </div>

            <h2 class="maker-step">1. PICK YOUR HOOK.</h2>
            <div class="maker-hooks" role="group" aria-label="Pick your hook">
              {READY_HOOKS.map((h, i) => (
                <button
                  key={h.label}
                  type="button"
                  class="maker-hook"
                  aria-pressed={hook === i}
                  onClick={() => {
                    setHook(i);
                    setErr(null);
                  }}
                >
                  <span>{h.label}<span class="maker-lines">{h.lines.join(" / ")}</span></span>
                  <span class="maker-mark" aria-hidden="true">{hook === i ? "■" : "□"}</span>
                </button>
              ))}
              <button
                type="button"
                class="maker-hook"
                aria-pressed={hook === 3}
                onClick={() => {
                  setHook(3);
                  setErr(null);
                }}
              >
                <span>+ Write your own</span>
                <span class="maker-mark" aria-hidden="true">{hook === 3 ? "■" : "+"}</span>
              </button>
            </div>

            {hook === 3 && (
              <div class="maker-own">
                <label class="field-label" for="poster-own">YOUR HOOK IN YOUR WORDS</label>
                <input
                  id="poster-own"
                  ref={ownRef}
                  class="lcd-field"
                  type="text"
                  maxLength={40}
                  placeholder="Make them look twice."
                  value={own}
                  onInput={(e) => {
                    setOwn((e.target as HTMLInputElement).value.slice(0, 40));
                    setErr(null);
                  }}
                />
                <span class="maker-hint">40 characters. What would you whisper?</span>
                <p class="around-privacy">Keep it kind and curious. No names, no numbers, no links. We check it before it prints.</p>
              </div>
            )}

            <h2 class="maker-step">2. NAME THE PLACE.</h2>
            <label class="field-label" for="poster-place">THE PLACE'S NAME</label>
            <input
              id="poster-place"
              ref={placeRef}
              class="lcd-field"
              type="text"
              maxLength={40}
              placeholder="Café du Coin"
              value={place}
              onInput={(e) => {
                setPlace((e.target as HTMLInputElement).value.slice(0, 40));
                setErr(null);
              }}
            />
            <span class="maker-hint">The café's name, exactly as locals say it.</span>

            <h2 class="maker-step">3. PICK YOUR PAPER.</h2>
            <div class="maker-paper-grid" role="group" aria-label="Pick your paper">
              {[
                { label: "LCD GREEN", value: false },
                { label: "INK SAVER", value: true },
              ].map((p) => (
                <button key={p.label} type="button" class="maker-paper" aria-pressed={saver === p.value} onClick={() => setSaver(p.value)}>
                  {p.label}
                </button>
              ))}
            </div>

            {err && (
              <div class="maker-status" role="status">
                <span>{err.text}</span>
                {err.field && (
                  <button type="button" class="maker-link" onClick={focusField}>
                    EDIT
                  </button>
                )}
              </div>
            )}
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" disabled={checking} onClick={print}>
              {checking ? (
                <span>CHECKING...<span class="typing-dots" aria-hidden="true"><i /><i /><i /></span></span>
              ) : (
                <span>PRINT A4</span>
              )}
              <span aria-hidden="true">&gt;</span>
            </button>
            <button class="maker-save" type="button" disabled={checking} onClick={print}>
              {checking ? "CHECKING..." : "SAVE AS PDF"}
            </button>
            <p class="around-privacy">Ask the staff where it helps most. Next to the machine beats behind the door.</p>
            <p class="around-privacy">
              Run this place? <a href="mailto:info@hg-labs.io?subject=Hoolala!%20I%20have%20something%20for%20you%20to%20share">Tell us.</a>
            </p>
          </div>
        </div>
      ) : (
        <div class="no-print">
          <div class="around-body">
            <span class="table-kicker">SENT TO YOUR PRINTER.</span>
            <h1 class="around-head">NOW THE FUN PART.</h1>
            <div class="maker-tips">
              <span class="field-label">THREE TIPS</span>
              <ol class="quiet-list">
                <li><strong>Eye level.</strong> Hooks work at a glance, not from the floor.</li>
                <li><strong>Near the queue.</strong> Waiting eyes read everything.</li>
                <li><strong>One poster.</strong> A wall of paper is invisible.</li>
              </ol>
            </div>
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" onClick={() => route("/around")}><span>POST THE FIRST LINE</span><span aria-hidden="true">&gt;</span></button>
            <button class="maker-link" type="button" onClick={() => setPrinted(false)}>
              PRINT ANOTHER
            </button>
            <p class="around-privacy">
              Run this place? <a href="mailto:info@hg-labs.io?subject=Hoolala!%20I%20have%20something%20for%20you%20to%20share">Tell us.</a>
            </p>
          </div>
        </div>
      )}
      <div class="print-only" aria-hidden="true">
        {art}
      </div>
    </Screen>
  );
}
