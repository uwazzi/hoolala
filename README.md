# Hoolala!

*You never know until you go.*

Hoolala! turns "we should catch up" into "we did". It's an anti-social-media social network: a tiny private circle, little signals instead of an online status, catch-ups that end after three, and a public counter of real-life meet-ups that only goes up when both people confirm.

Muse Spark does the work in between. It listens, looks, searches and drafts, then stops and lets two people decide.

**Your data. Your choice. Your attention.**

> Entry for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) (Indie Developer track, "Build for Your World"). Live at **https://hoolala.hg-labs.io** (from the first deploy).

## Status

**Building starts 27 Oct 2026.** At the moment this repo holds only the planning and the design system made before the event. See [PRIOR-WORK.md](PRIOR-WORK.md) for what existed before, and the `pre-hackathon` tag for the exact starting point.

## Muse Spark by function

| Function | What it does | Muse Spark capability |
|---|---|---|
| TELL IT | A short conversation becomes your Personal Compass | Conversation state, structured output |
| SAY IT | A voice note becomes a request | Native audio |
| SNAP IT | A poster photo becomes an event draft | Vision |
| FIND IT | A finite briefing: friends first, then cited finds nearby | Web search with citations, grounded ranking |
| PLAN IT | One draft invitation; you confirm | Parallel tool calling |
| CHECK IT | SHOW THE WORKINGS on every AI answer | Logged tools, sources and an evaluation set |

Then the model steps out on purpose: two phones confirm a meet-up with a mutual QR, and the Live counter ticks up.

Details: [docs/MUSE-SPARK-BY-FUNCTION.md](docs/MUSE-SPARK-BY-FUNCTION.md).

## Repo map

| Path | What |
|---|---|
| `AGENTS.md` | Rules for every coding agent (`CLAUDE.md` points here) |
| `docs/CONTEXT.md` | One-page project context |
| `docs/PROJECT-INSTRUCTIONS-v3.2.md` | Product brief |
| `docs/MUSE-SPARK-BY-FUNCTION.md` | How each function uses Muse Spark |
| `docs/BUILD-PLAN.md` | Schedule, data model, API, work packages |
| `docs/HACKATHON-RULES.md` | Official rules and what they mean for us |
| `docs/DESIGN.md` | Mono LCD design system, portable copy |
| `docs/DECISIONS.md` | Decision log |
| `prior-work/design-system/` | The design system as it stood before building (read-only) |

## Built during the hackathon

Filled in as work lands. Everything after the `pre-hackathon` tag.

| Area | Status |
|---|---|
| Worker, D1, KV, deploy | Not started |
| Sign-in (email magic link) | Not started |
| Circle, notes, invitations, Little Signals | Not started |
| TELL IT, FIND IT, SAY IT, SNAP IT, PLAN IT, CHECK IT | Not started |
| Telegram | Not started |
| Meet IRL, Live counter, share card | Not started |

## Licence

[MIT](LICENSE). Fonts (Silkscreen, Space Mono) load from Google Fonts under the SIL Open Font License.
