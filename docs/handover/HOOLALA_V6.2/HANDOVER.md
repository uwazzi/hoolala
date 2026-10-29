# HANDOVER · HOOLALA v6.2

Thu 29 Oct 2026, evening. Read this file first and follow it. Everything else in this folder is linked from here. Deadline: submit by Wed 4 Nov, 18:00 Zurich. Pilot in Lausanne Mon 2 Nov.

## In one paragraph
v6.2 rebuilds the first few minutes. A new person sees a short animated story about why small contacts matter, answers three spoken questions about real moments in their life, and gets a personal game of tiny tries (SOFT, BRAVE, BOLD; small talk and kindness) written by Muse Spark around their topic, their places and the people in their days. Today then shows just that try and one key. FIND ME is gone; Muse Spark's showcase is now the game.

## Branch
v6.2 sits on top of v6.1. If `HOOLALA_V6.1` is merged into `main`, create the branch `HOOLALA_V6.2` from `main`; if not, create `HOOLALA_V6.2` from `HOOLALA_V6.1`. One branch per work package if you work that way: `HOOLALA_V6.2/wp35-story`, `HOOLALA_V6.2/wp36-get-personal`, `HOOLALA_V6.2/wp37-game`, `HOOLALA_V6.2/wp38-today`. Git does not allow spaces, so always use this form. Put this whole folder in the repo at `docs/handover/HOOLALA_V6.2/` in the first commit.

## What's in v6.2
| Work package | What | Spec | Screens |
|---|---|---|---|
| WP35 | Onboarding story: six animated, sourced beats on first open, then LET'S GO | `specs/onboarding-story.md` | `design/screens/Intro.dc.html` |
| WP36 | Let's get personal: **the existing Surprise me voice UI**, new intro, three Mom Test questions, NEXT, compass check with PEOPLE IN YOUR DAYS; FIND ME removed | `specs/get-personal.md` | `design/screens/Onboard.dc.html`, `design/screens/Voice.dc.html` |
| WP37 | Your game of tiny tries: Muse Spark writes 9 tries (SOFT, BRAVE, BOLD; SMALL TALK and KIND IT) with people from the compass; NEW ONE; NEW GAME; Around me optional | `specs/game.md` | `design/screens/Onboard.dc.html`, `design/screens/Around.dc.html` |
| WP38 | Today simplified: today's try, LET'S GO, ANOTHER ONE, NOT TODAY; links removed | `specs/today-home.md` | `design/screens/Flow.dc.html`, `design/screens/Compass.dc.html` |

**Voice UI: reuse, do not rebuild.** WP36 uses the Surprise me voice UI exactly as built for WP34 in v6.1 (ball, thumb-zone mic, captions, transcript, draft block, SAY AGAIN, FIX BY TYPING, sound toggle, WP26 speech code). Only the intro copy, the questions and the end of the flow change. If you find yourself writing a second voice component, stop.

## Reading order
1. This file.
2. `design/DECISIONS.md`: accepted, removed, rule changes, still open. Do not reopen these.
3. `design/SCREENS.md`: every state to build, which screen shows it and how to reach it.
4. The specs in `specs/`, in the build order below.
5. The screens in `design/screens/`: interactive design references (open them on the canvas or in a browser), not production code.
6. The repo's own rules: `AGENTS.md` and `docs/DESIGN.md`. The v6.1 handover in `docs/handover/HOOLALA_V6.1/` for WP34 (voice) and WP32 (Around me).

## Gates before any code
For each work package, check the three gates below and fill `checks/CHECKS-REPORT.md`. A STOP means: do not build that work package; report and ask the owner. Never change the design to get past a gate without the owner's OK.

1. **Technical feasibility.** Can every state in `design/SCREENS.md` be built with the current stack, data and APIs before the deadline? Latency of the game call, speech on mobile browsers, the first-open flag, migrations (`compass_people`, `game_tries`). If not, propose the cheaper version (for example, the library-only game).
2. **Security and privacy.** No audio, transcripts or personal text in logs. People stored as roles only, never names. Nothing saved before LOOKS RIGHT. Prompt injection through answers and compass lines into TRY IT. Rate limits on NEW ONE and NEW GAME. FIND ME code paths and any stored footprint data removed or disabled.
3. **Value alignment.** Every screen and copy line against Hoolala!'s rules: no guilt, no streaks, no leaderboards or public scores, not an AI companion, safety first, people never rated, colour is earned, Hoolala! types, nothing saved without the person's confirmation, no buying, UK English, no em dashes, and the words to avoid in AGENTS.md. Story figures exactly as written, with their sources. Any conflict not recorded in `design/DECISIONS.md` is a STOP.

## Build order
0. Docs (Fri 30 morning): copy this folder to `docs/handover/HOOLALA_V6.2/`; add the v6.2 entry from `CHANGELOG.md` to `docs/CHANGELOG.md`; add a v6.2 note to `docs/DESIGN.md` (components Story, ThumbRow reuse, GameBoard, TryCard with NEW ONE); in `docs/MUSE-SPARK-BY-FUNCTION.md` replace FIND ME with the compass draft (WP36) and the game (WP37); add WP35 to WP38 to `docs/BUILD-PLAN.md`; mark FIND ME (WP24) as removed. Show the owner the diff before merging.
1. Fri 30: WP31b (v6.1), then WP38 Today and WP35 story (both small, no model).
2. Sat 31, before the dry run: WP34 voice (v6.1) if not done, then WP36 Let's get personal, then WP37 with the **library fallback first**, so the dry run works with `LLM_ENABLED=false`.
3. Sun 1: WP37 Muse Spark generation, validator and the 15 evals; WP33 compass adjustments; WP32 Around me in the scope the owner chose; WP9 safety pass (screening on answers, rate limits, nothing sensitive stored or logged).
4. Mon 2: pilot. Tue 3: fixes and video.

For every work package: tests first where the spec lists them; `npm test`, `npm run typecheck` and `npm run eval` pass; works with `LLM_ENABLED=false`; commits "WPn: what changed" with the trailer "Agent: Muse Code"; UK English, no em dashes. Before any merge, confirm from `.github/workflows/` which branch deploys to staging and which to production; deploy to staging first, post the staging URL in the PR and wait for the owner's OK before production.

## Definition of done
On a real phone, in a private window: the story plays once and ends on LET'S GO; Let's get personal asks three questions out loud with the same voice UI as Surprise me, and the compass check shows the people from the answers as roles; the game shows nine tries across SOFT, BRAVE and BOLD with both SMALL TALK and KIND IT, NEW ONE replaces one try, NEW GAME rewrites all; picking a try offers Around me or skip; Today shows that try with one LET'S GO key; everything still works with the model off. `checks/CHECKS-REPORT.md` is filled and every STOP answered.

## Owner decisions still open
- BOLD tries with people you already know at home: change the safety line to "Public places with strangers; anywhere with people you already know"? Until answered, see the interim rule in `design/DECISIONS.md`.
- Around me scope (from v6.1): Option A or Option B.
- Missing reference details (Abdalla et al. authors, Lanser and Eisenberger volume and pages) for `docs/RESEARCH.md`.

## Versioning
This is v6.2, a minor version on top of v6.1. Accepted versions never change; later design changes become v6.3. The folder, the zip and the branch all carry the name `HOOLALA_V6.2`. See `CHANGELOG.md`.
