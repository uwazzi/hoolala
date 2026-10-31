# HANDOVER · HOOLALA v6.3

Sat 31 Oct 2026. Read this file first and follow it. Everything else in this folder is linked from here. Deadline: submit by Wed 4 Nov, 18:00 Zurich. Pilot in Lausanne Mon 2 Nov.

## In one paragraph
v6.3 replaces the question step of onboarding. After the story, Hoolala! says "Hello, human. Five quick ones, then you're out of here.", asks five short questions (mostly chips, voice always available), then keeps the juicy bits: Muse Spark strips the filler and keeps only what helps build the game of small talk and kindness. While it works, a Nokia-style Snake starts by itself. Everything else in v6.2 stays.

## The design must not change
Build the screens in `design/screens/Onboard.dc.html` **exactly as drawn**: the same copy, order, chips, sizes, keys, controls, timings and states. Do not reword, restyle, simplify, add a score, swap the game or "improve" anything. If something cannot be built as drawn, stop that work package, write it in `checks/CHECKS-REPORT.md` and ask the owner. The voice UI is the existing one: reuse it and add a chips slot; never build a second voice component.

## Branch
v6.3 sits on top of v6.2. If `HOOLALA_V6.2` is merged into `main`, create the branch `HOOLALA_V6.3` from `main`; if not, create `HOOLALA_V6.3` from `HOOLALA_V6.2`. One branch per work package if you work that way: `HOOLALA_V6.3/wp36-five-quick-ones`, `HOOLALA_V6.3/wp39-juicy-bits-snake`. Git does not allow spaces, so always use this form. Put this whole folder in the repo at `docs/handover/HOOLALA_V6.3/` in the first commit.

## What's in v6.3
| Work package | What | Spec | Screens |
|---|---|---|---|
| WP36 (revised) | Five quick ones: HELLO, HUMAN., five questions with chips, follow-ups and replies, in the existing voice UI; START HERE rules | `specs/five-quick-ones.md` | `design/screens/Onboard.dc.html`, `design/screens/Voice.dc.html` |
| WP39 (new) | Keeping the juicy bits: one extraction call, Snake while you wait, trimming view, compass check from the kept bits, game changes (nearly-said BOLD try, off-table filters) | `specs/juicy-bits-snake.md` | `design/screens/Onboard.dc.html` |

Unchanged and still to build if not done: WP35 story, WP37 game, WP38 Today (HOOLALA_V6.2). Context screens included here: `design/screens/Intro.dc.html`, `design/screens/Around.dc.html`.

## Reading order
1. This file.
2. `design/DECISIONS.md`: accepted, removed, rule changes, still open. Do not reopen these.
3. `design/SCREENS.md`: every state to build and how to reach it on the canvas.
4. `specs/five-quick-ones.md`, then `specs/juicy-bits-snake.md`.
5. The screens in `design/screens/`: open `Onboard.dc.html` on the canvas and play it through; use the `startAt` tweak (juicy, compass, game) to jump.
6. The repo's own rules (`AGENTS.md`, `docs/DESIGN.md`) and the v6.2 handover in `docs/handover/HOOLALA_V6.2/` for the game and Today.

## Gates before any code
For each work package, check the three gates below and fill `checks/CHECKS-REPORT.md`. A STOP means: do not build that work package; report and ask the owner. Never change the design to get past a gate without the owner's OK.

1. **Technical feasibility.** Can every state in `design/SCREENS.md` be built as drawn with the current stack before the deadline? The chips slot in the voice component, dictation matched to chips, keyboard focus on the Snake board inside the app shell, timers cleaned up on leave, the extraction call under 6 s with its fallback.
2. **Security and privacy.** No audio stored; free text held only in memory and discarded after extraction; names stripped; nothing stored before LOOKS RIGHT; no answers or free text in logs; prompt injection through free text; no analytics, scores or stored results for Snake.
3. **Value alignment.** Copy exactly as written; no labels about the person; no score, counter or game over anywhere; Snake is optional (SHOW ME reachable without playing); off-table answers respected in every try; no guilt, no streaks, not an AI companion, UK English, no em dashes. Any conflict not recorded in `design/DECISIONS.md` is a STOP.

## Build order
0. Docs (Sat 31): copy this folder to `docs/handover/HOOLALA_V6.3/`; add the v6.3 entry from `CHANGELOG.md` to `docs/CHANGELOG.md`; add WP39 and the revised WP36 to `docs/BUILD-PLAN.md`; in `docs/MUSE-SPARK-BY-FUNCTION.md`, describe the single "keep the juicy bits" extraction call. Show the owner the diff before merging.
1. Sat 31: WP36 revised (chips slot in the voice component, the script, the START HERE rules), working with `LLM_ENABLED=false`.
2. Sun 1 morning: WP39 with the **code fallback first** (Snake, trimming view, kept bits, compass check), then the Muse Spark extraction, its validator and evals (5 pass, 5 reject: filler kept, a name, an off-table topic, a label about the person, a role outside the allow-list).
3. Sun 1 afternoon: WP37 changes (nearly-said BOLD try, off-table filters, START HERE), then the WP9 safety pass.
4. Mon 2: pilot. Tue 3: fixes and video.

For every work package: tests first where the spec lists them; `npm test`, `npm run typecheck` and `npm run eval` pass; works with `LLM_ENABLED=false`; commits "WPn: what changed" with the trailer "Agent: Muse Code"; UK English, no em dashes. Confirm from `.github/workflows/` which branch deploys to staging and which to production; deploy to staging first, post the staging URL in the PR, and wait for the owner's OK before production. Include phone and desktop screenshots of each new state next to the matching design state in the PR, so the owner can check nothing changed.

## Definition of done
On a real phone and on a desktop, in a private window: after the story, HELLO, HUMAN. opens; the five questions play with the exact copy, chips, follow-ups and replies; CAN'T REMEMBER skips its follow-up; after Q5, Snake starts by itself, steers with the inverted-T buttons on the phone and the arrow keys on the desktop, never shows a score; SHOW ME WHAT YOU KEPT leads to the compass check with topics, people (more than hi, a nod), what you nearly said, battery and off-table; the game starts on the right level and includes the nearly-said BOLD try. Everything works with the model off. Screens match the design. `checks/CHECKS-REPORT.md` is filled and every STOP answered.

## Owner decisions still open
- CAN'T REMEMBER plus FULL: keep "Full battery. Bold it is." (current) or use "Full battery. We'll still start gentle."?
- From v6.2: the safety line for BOLD tries with people you know; Around me scope A or B; missing reference details.

## Versioning
This is v6.3, a minor version on top of v6.2. Accepted versions never change; later design changes become v6.4. The folder, the zip and the branch all carry the name `HOOLALA_V6.3`. See `CHANGELOG.md`.
