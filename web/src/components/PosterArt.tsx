// The A4 poster (v6.5): hook, place line, plant story, SCAN TO PEEK QR,
// three growing steps, trust bar and tear-off tabs. Layout, sizes and copy
// follow design/screens/Poster.dc.html; the print route and the maker
// preview share this component so both always show the same poster.
import { Qr } from "./Qr";

const STORY_INK = "M6 0h4v1H6zM5 1h1v2H5zM10 1h1v2h-1zM6 3h4v1H6zM7 4h1v10H7zM8 7h3v1H8zM10 6h2v1h-2zM4 10h3v1H4zM3 9h2v1H3z";
const POT = "M3 14h10v1H3zM4 15h8v3H4z";
const SPROUT = "M7 11h1v3H7zM5 11h2v1H5zM8 10h2v1H8z";
const LEAVES = "M7 6h1v8H7zM6 5h3v1H6zM8 8h3v1H8zM10 7h2v1h-2zM4 10h3v1H4zM3 9h2v1H3z";

const STEPS = [
  { art: SPROUT, title: "1. SCAN AND PEEK", line: "See what's up around here. No names, no photos." },
  { art: LEAVES, title: "2. TRY ONE TINY THING", line: "A hello, a kindness, a chat. Join a table or post one line." },
  { art: STORY_INK, title: "3. WATCH YOUR PLANT GROW", line: "Every try grows a leaf. No streaks. No scores." },
];

const TRUST = ["FIRST NAMES ONLY", "NOT A DATING APP", "18+"];

export function PosterArt({ lines, place, saver, qrUrl, host }: { lines: string[]; place: string; saver: boolean; qrUrl: string; host: string }) {
  return (
    <div class={`poster${saver ? " poster--saver" : ""}`}>
      <div class="poster-main">
        <div class="poster-brand">
          <div class="poster-brand-left">
            <div class="poster-logo">HOOLALA!</div>
            <div class="poster-tagline">You never know until you go.</div>
          </div>
          <div class="poster-chip">PSST. YES, YOU.</div>
        </div>

        <div class="poster-hook-block">
          <h1 class="poster-hook">
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <div class="poster-place">
            Right here at <strong>{place}</strong>.
          </div>
        </div>

        <div class="poster-story">
          <div class="poster-plant-box">
            <svg viewBox="0 0 16 18" width="112" height="126" shape-rendering="crispEdges" role="img" aria-label="A pixel plant in a pot, with a flower" style="display: block">
              <path fill="var(--lcd-ink)" d={STORY_INK} />
              <path fill="var(--lcd-surface)" d="M6 1h4v2H6z" />
              <path fill="var(--lcd-ink-secondary)" d={POT} />
            </svg>
          </div>
          <div class="poster-story-right">
            <div class="poster-kicker">SO, HOOLALA!</div>
            <div class="poster-motto">GET OUTSIDE.<br />MEET PEOPLE.<br />GROW INSIDE.</div>
            <div class="poster-story-line">A hello, a kindness, a chat. Tiny tries in real life. Soft, brave or bold: you pick.</div>
          </div>
        </div>

        <div class="poster-action">
          <div class="poster-qr-block">
            <div class="poster-qr-head"><span>SCAN TO PEEK</span><span>&gt;</span></div>
            <div class="poster-qr-paper">
              <Qr text={qrUrl} label="QR code: opens Hoolala! for this place" />
            </div>
            <div class="poster-qr-note">Your phone camera is enough. Nothing to install.</div>
          </div>
          <div class="poster-steps">
            <div class="poster-how">HOW IT WORKS</div>
            {STEPS.map((step) => (
              <div class="poster-step" key={step.title}>
                <svg viewBox="0 0 16 18" width="36" height="40" shape-rendering="crispEdges" aria-hidden="true">
                  <path fill="var(--lcd-ink)" d={step.art} />
                  <path fill="var(--lcd-ink-secondary)" d={POT} />
                </svg>
                <div class="poster-step-text">
                  <div class="poster-step-title">{step.title}</div>
                  <div class="poster-step-line">{step.line}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div class="poster-trust">
          {TRUST.map((item, i) => (
            <span key={item} style="display: contents">
              {i > 0 && <span aria-hidden="true">·</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>

      <div class="poster-tabs">
        <div class="poster-tabs-head">
          <span>Take one. Say hi later.</span>
          <span>powered by hg-labs.io · say hi hugo@hg-labs.io</span>
        </div>
        <div class="poster-tabs-band">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div class="poster-tab" key={n}>
              <div class="poster-tab-turn">
                <span class="poster-tab-grow">GROW INSIDE</span>
                <span class="poster-tab-host">{host}</span>
              </div>
            </div>
          ))}
          <div class="poster-tab poster-brandcell">
            <Qr text="https://hg-labs.io" label="QR code: opens the HG-Labs website" />
            <span class="poster-tab-host">hg-labs.io</span>
          </div>
        </div>
      </div>
    </div>
  );
}
