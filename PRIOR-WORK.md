# Prior work (before the building period)

The Meta Global AI Developer Hackathon building period runs from **27 Oct to 4 Nov 2026** (kickoff Mon 26 Oct, 12:00 ET). Everything in this repo at the tag [`pre-hackathon`](../../tree/pre-hackathon) was created before building started. It is **brainstorming, design and project organisation only: no product code.**

Everything committed after that tag was built during the hackathon. To see it:

```bash
git diff pre-hackathon..main --stat
```

## What was done before 27 Oct

| When | What | Where |
|---|---|---|
| Oct 2026 (early) | Idea exploration. The concept moved from a cooking-challenge idea, to a quest-style chat bot ("Hi-Five"), to Hoolala!, a private social app that turns plans into real meet-ups. None of the earlier code is used. | Not in the repo |
| 23 Oct | Product brief v2 ("Anti-social media. Pro-social life."): circle, catch-ups in threes, Little Signals, invitations, mutual QR, finite by design. Now folded into `docs/CONTEXT.md` and the design system. | `docs/CONTEXT.md` |
| 23 Oct | Brand and visual concept: name Hoolala!, tagline "You never know until you go.", Nokia-era green LCD look, witty observational voice. | `prior-work/design-system/README.md`, `voice.md` |
| 23 Oct | Mono LCD design system v2: tokens, product rules, voice, AI and data rules, 20 components with guidelines and HTML previews. | `prior-work/design-system/` |
| 23 Oct | A clickable front-end prototype with sample data, used to explore flows. **Deliberately not included**: the hackathon front end is built from scratch. | Not in the repo |
| 26 Oct | Read the official participant guide; rules, dates, judging and anti-project list summarised. | `docs/HACKATHON-RULES.md` |
| 26 Oct | Product brief v3.2 "Go App-Free": conversational onboarding, Personal Compass, honest sources, finite briefings, Telegram. | `docs/PROJECT-INSTRUCTIONS-v3.2.md` |
| 26 Oct | Muse Spark by function: TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT, and the demo beat sheet. | `docs/MUSE-SPARK-BY-FUNCTION.md` |
| 26 Oct | Design system v3: nine new components for the Muse Spark functions, rules 21 to 27, roadmap marked. | `prior-work/design-system/`, `docs/DESIGN.md` |
| 26 Oct | Project organisation: build plan with schedule, data model, API and work packages; rules for coding agents; decision log; changelog. | `docs/BUILD-PLAN.md`, `AGENTS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md` |

## What was not done before 27 Oct

No Worker, no database, no API, no front-end code, no Meta Model API integration, no Telegram bot code, no tests. All of that is hackathon work.

## How this was made

Brainstorming, writing and design were done with Claude (chat and design tools). Coding agents during the hackathon (Muse Code, Claude Code, Codex) are credited per commit with an `Agent:` trailer, as set out in `AGENTS.md`.
