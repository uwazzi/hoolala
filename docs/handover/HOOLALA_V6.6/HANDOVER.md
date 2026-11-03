# HANDOVER · HOOLALA v6.6

3 November 2026. Read this file first and follow it. Everything else in this folder is linked from here.

## In one paragraph
v6.6 replaces the six tap-through intro slides that signed-out visitors see at `/` with one short landing page. In a few seconds, a visitor sees why Hoolala! exists, what it does and how it works, without tapping through anything. It has four parts. A hero with a typed, rotating headline, one line, LET'S GO and the app's own growing plant. WHY GO?: the four story beats in visible squares, all on screen at once, with each square replaying its scene in turn. HOW IT WORKS: three steps and a one-line trust row. A closing LET'S GO. It is mobile first, because most visitors arrive by scanning the poster QR. No new API, no new data and no model call.

## Branch
Create the branch `HOOLALA_V6.6` from `main`. If you work one branch per work package, use `HOOLALA_V6.6/wp66-landing`. Git does not allow spaces, so always use this form.

## What's in v6.6
| Work package | What | Spec | Screens |
|---|---|---|---|
| WP66 | Landing page for signed-out visitors at `/` | `specs/landing.md` | `Mobile.dc.html`, `Main.dc.html` |

WP66 follows the repo's numbering (v6.5 was WP65). Split into WP66-1, WP66-2 and so on only if it helps.

## Reading order
1. This file.
2. `design/DECISIONS.md` (accepted, rejected, rule changes; do not reopen these).
3. `design/SCREENS.md` (every state to build and how to see it).
4. `specs/landing.md`.
5. The screens in `design/screens/` (interactive references from the design canvas, not production code). The live canvas is the easiest way to play them: Hoolala! v6.6: Landing, in the owner's claude.ai artifacts.
6. The project's own rules: `AGENTS.md`, `docs/DESIGN.md`.

## Gates before any code
Check **technical feasibility**, **security and privacy** and **value alignment** for WP66 as described in `checks/CHECKS-REPORT.md`, and fill that report. A STOP means: do not build; report and ask the owner. Never change the design to get past a gate without the owner's OK.

Values to check against: no guilt, no streaks, no scores or leaderboards, not an AI companion, safety first; finite by design; copy avoids "lonely", "shy", "anxiety", "therapy", "coach" and "dating" (except "Not a dating app" in the trust row, as on the poster); UK English, no em dashes; motion is stepped and switches off with reduced motion (`docs/DESIGN.md`, `AGENTS.md`).

## Build order
1. WP66 (Tue 3 Nov, half a day): `web/src/pages/Landing.tsx` (or `components/Landing.tsx`), wired into `Home.tsx` in place of `<Story guest />` for signed-out visitors; reuse `Plant`, `story.ts` and the shared LCD styles.

For WP66: write the tests in the spec first; `npm test` and `npm run typecheck` pass; small commits named `WP66: ...` with the `Agent: Muse Code` trailer; deploy to staging, post the staging URL, wait for the owner's OK before production. Check 320, 390, 768 and 1280px wide and 200% zoom.

## Definition of done
On a real phone, opening `https://staging.hoolala.hg-labs.io/` signed out shows the landing:
- the headline types and rotates;
- the plant grows leaf by leaf, then blooms;
- the four story squares replay one after another with the progress squares filling;
- LET'S GO opens sign-in, and SIGN IN in the header opens sign-in;
- with reduced motion on, everything is shown complete and still.

Signed-in people still land on Today exactly as before.

## Owner decisions still open
- **Story scenes:** keep the landing's own small scenes, as drawn and accepted (default), or reuse the animated `Picture` scenes from `Story.tsx` inside the squares, as was done for the plant. Default unless the owner says otherwise: as drawn.
- **The old Story for signed-in first-timers:** keep `<Story>` for signed-in people with `introSeen === false` (default, no change), or retire it now that the landing tells the story.
- **Footer credit:** "Muse Spark by Meta" stays in the footer (default) or is removed.

## Versioning
This is v6.6. Accepted versions never change; later changes are the next version. See `CHANGELOG.md`.
