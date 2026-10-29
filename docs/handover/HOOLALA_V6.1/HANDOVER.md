# HANDOVER · HOOLALA v6.1

Thu 29 Oct 2026. Read this file first and follow it. Everything else in this folder is linked from here. Deadline: submit by Wed 4 Nov, 18:00 Zurich.

## In one paragraph
v6 (tiny tries lead) is live. v6.1 makes the rest of the app as clear as the home: one navigation everywhere, an Around me that shows what's worth a short walk and why, a compass people can see and steer, and a Surprise me you answer with your thumb. Nothing here changes the home or the tiny-try flow.

## Branch
Create the branch `HOOLALA_V6.1` from `main`. If you work one branch per work package, name them `HOOLALA_V6.1/wp31b-navigation`, `HOOLALA_V6.1/wp32-around-me`, `HOOLALA_V6.1/wp33-compass`, `HOOLALA_V6.1/wp34-voice`. Git does not allow spaces, so always use this form. Put this whole folder in the repo at `docs/handover/HOOLALA_V6.1/` in the first commit.

## What's in v6.1
| Work package | What | Spec | Screens |
|---|---|---|---|
| WP31b | Softkeys TODAY · AROUND · FRIENDS; Here fixes, including removing the duplicate POST ONE; talking rating on leaving | `specs/navigation-here.md` | `design/screens/Here.dc.html` and all screens' softkeys |
| WP32 | Around me: first-screen rework, scan, radar, cards by fit, why go, talking rating, menus | `specs/around-me.md` | `design/screens/Around.dc.html` |
| WP33 | The compass (four directions, needle, sources, BEFORE / AFTER, UNDO), MY COMPASS on Today, COMPASS? row after a try | `specs/compass.md` | `design/screens/Compass.dc.html`, `design/screens/Flow.dc.html` |
| WP34 | Surprise me voice with the thumb-zone mic | `specs/voice.md` | `design/screens/Voice.dc.html` |

`design/screens/Friends.dc.html` is included for its softkeys only.

## Reading order
1. This file.
2. `design/DECISIONS.md`: accepted, rejected, rule changes. Do not reopen these.
3. `design/SCREENS.md`: every state to build, which screen shows it and how to reach it.
4. The specs in `specs/`, in the build order below.
5. The screens in `design/screens/`: interactive design references (open them on the canvas or in a browser), not production code.
6. The repo's own rules: `AGENTS.md` and `docs/DESIGN.md`.

## Gates before any code
For each work package, check the three gates below and fill `checks/CHECKS-REPORT.md`. A STOP means: do not build that work package; report and ask the owner. Never change the design to get past a gate without the owner's OK.

1. **Technical feasibility.** Can every state in `design/SCREENS.md` be built with the current stack, data and APIs before the deadline? Browser and device limits (location, mic, speech), third-party terms, quotas and cost, migrations. If not, propose the cheaper version.
2. **Security and privacy.** Permissions asked only at the moment of use, with a fallback if refused. Nothing stored beyond the spec. No location, audio, transcripts or personal text in logs. Rate limits. Prompt injection from fetched pages or answers. One person can never read another's compass or ratings.
3. **Value alignment.** Every screen and copy line against Hoolala!'s rules: no guilt, no streaks, no leaderboards or public scores, not an AI companion, safety first, ratings about places never people, colour is earned, Hoolala! types, nothing saved without the person's confirmation, UK English, no em dashes, and the words to avoid in AGENTS.md. Any conflict not recorded in `design/DECISIONS.md` is a STOP.

## Build order
0. Docs (today): copy this folder to `docs/handover/HOOLALA_V6.1/`; add the v6.1 entry from `CHANGELOG.md` to `docs/CHANGELOG.md`; add a v6.1 version note to the top of `docs/DESIGN.md` and the components Radar, CompassRose, MicKey, ThumbRow; add WHY GO and READ IT to `docs/MUSE-SPARK-BY-FUNCTION.md`; add WP31b to WP34 to `docs/BUILD-PLAN.md`. Show the owner the diff before merging.
1. WP31b (Fri 30, small).
2. WP33 compass and WP34 voice (Sat 31, after the dry run). Reuse WP26's speech code.
3. WP32 Around me (Sun 1), in the scope the owner chose. Start with the first-screen rework; `/around` is live with the old one.
4. WP9 safety pass (Sun 1): screening on Surprise me answers, rate limits on scans, nothing sensitive stored or logged.

For every work package: tests first where the spec lists them; `npm test`, `npm run typecheck` and `npm run eval` pass; works with `LLM_ENABLED=false`; commits "WPn: what changed" with the trailer "Agent: Muse Code"; UK English, no em dashes. Before any merge, confirm from `.github/workflows/` which branch deploys to staging and which to production; deploy to staging first, post the staging URL in the PR and wait for the owner's OK before production.

## Definition of done
On a real phone, in a private window: every top-level screen shows TODAY · AROUND · FRIENDS; Here has one post key and asks about talking on leaving; Around me shows the idle radar, scans in place at 500 m and lists places by fit with a reason; the compass shows four directions with sources and can be changed and undone; Surprise me is answered by holding the mic and ends on the compass reveal. `checks/CHECKS-REPORT.md` is filled and every STOP answered.

## Owner decisions still open
- Around me scope: Option A (Around me in full, Friends = dare link only) or Option B (Friends as planned, Around me without menus and ratings).
- Places provider: FIND ME's, or another.

## Versioning
This is v6.1, a minor version on top of v6. Accepted versions never change; later design changes become v6.2. The folder, the zip and the branch all carry the name `HOOLALA_V6.1`. See `CHANGELOG.md`.
