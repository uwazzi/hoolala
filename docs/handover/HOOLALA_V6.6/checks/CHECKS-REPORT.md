# Checks report · HOOLALA v6.6

Filled by the coding agent before writing code. One block per work package. Result: PASS, PASS WITH NOTES, or STOP.

## WP66: Landing for signed-out visitors

| Gate | Result | Notes (blockers, risks, cheaper alternative, rule touched) |
|---|---|---|
| Technical feasibility | PASS | Plant at cell 9 is 126x162px inside a 170-220px box, fits. BEATS heads/sources reused from story.ts, no change to Story behaviour. Longest headline line THE BEST CHAT (13 chars) fits 288px at 26px Silkscreen; grids collapse (2x2 beats, 1-col steps) at 320px. Timers cleared on unmount, paused on visibilitychange. Loop exception per design/DECISIONS.md (landing only, stepped, silent, pauses hidden, stops reduced motion). |
| Security and privacy | PASS | No new storage (existing hoolala.intro.seen flag only on LET'S GO/SIGN IN tap, never on view), no cookies, analytics, network or model calls. Links only to /signin, /posters, /privacy and hg-labs.io. No inputs, no PII, no secrets. Static layout in CSS classes (CSP style-src has no unsafe-inline); dynamic show/hide via attributes/classes like the existing Plant/Story. |
| Value alignment | PASS | Copy checked: hopeful, no guilt/streaks/scores/leaderboards; no model, not a companion; finite one-page; trust row FIRST NAMES ONLY, NOT A DATING APP (allowed exception), NO STREAKS, 18+; banned words absent (lonely, shy, anxiety, therapy, coach; dating only in NOT A DATING APP); UK English; no em dashes; motion stepped and still under prefers-reduced-motion. |

Things to confirm in particular:
- `Plant` renders well at `cell={9}` and loops without leaking timers. Confirmed: 126x162px in the box; setTimeout chain with cleanup and hidden-tab pause.
- `story.ts` exports what the landing needs, without changing the Story's behaviour. Confirmed: BEATS[0,2,3,4] heads plus BEATS[5].head, no edits to story.ts.
- No horizontal scroll at 320px; the longest headline line fits. Confirmed by measure math; verified in build at 320/390/768/1280px and 200% zoom.
- The loop exception in `design/DECISIONS.md` is respected: motion pauses when the tab is hidden and stops under reduced motion. Confirmed in implementation.
- No new storage, cookies, analytics or network calls. Confirmed: setLocalSeen only on tap.

Questions for the owner:
- Branch cut from staging tip (not main): main is at v6.1, v6.2-v6.5 live on staging/HOOLALA_V6.5; same precedent as v6.1/v6.4/v6.5. OK?
- Owner decisions still open (handover): story scenes as drawn (default), keep Story for signed-in introSeen false (default), Muse Spark credit stays (default). Built on defaults.
