# Hoolala!

*You never know until you go.*

> "We've sat at the same table for six months."
> Never spoken.

**Hoolala! Signals here.** People who share a place (a café, a bar, a coworking space) post small invitations to talk, stay anonymous until both say yes, and meet in person. Hoolala! turns "we should talk sometime" into "we did", and measures one thing: how many accepted invitations become real conversations.

Muse Spark does the work in between. It gets to know you from what's public (only with your OK), gets to know the place, suggests topics, screens and translates every post, and proposes where to meet. Then it stops and lets two people decide.

**Signals, not feeds.** Not a dating app.

> Entry for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) (Indie Developer track, "Build for Your World"). Live at **https://hoolala.hg-labs.io** (from the first deploy).

## Status

**Building started 27 Oct 2026.** See [PRIOR-WORK.md](PRIOR-WORK.md) for what existed before, and the `pre-hackathon` tag for the exact starting point. On 27 Oct the product focus moved to **Signals here** ([docs/SIGNALS-HERE.md](docs/SIGNALS-HERE.md)); the earlier Go App-Free brief is kept for after the hackathon.

## How it works

| Step | What happens | Muse Spark |
|---|---|---|
| Get started | "Want a head start?" With your OK, Hoolala! looks at what's public about you; you tick what's really you; your private Personal Compass is drafted | **FIND ME**: web search with citations, structured output |
| Arrive | Share location and pick the place, or add it; search by name if GPS is wrong | None, on purpose |
| The place | Hours, menu and spots, with sources; people confirm or fix them and earn private place points | **PLACE IT**: parallel tool calling (Google Maps, web search, our facts) |
| Post | A topic, when, where, for how many (1 to 3) | **SUGGEST IT**: web search with citations; **SCREEN IT**: structured verdicts and FR/EN translation |
| Respond | I'M CURIOUS; the poster accepts; first names only after both say yes; quick replies, no chat | |
| Meet | A proposed meeting point, then two phones confirm with a mutual QR | **PLAN IT**: tools, draft only |
| Show the workings | Tools, sources and verdicts behind every AI answer; an evaluation set with a published pass rate | **CHECK IT** |
| Go live | HOOLALA! IS OFF. YOU'RE ON. | |

North star: **real-world connection rate**, accepted signals that end in a QR-confirmed meet-up. Details: [docs/MUSE-SPARK-BY-FUNCTION.md](docs/MUSE-SPARK-BY-FUNCTION.md).

## Repo map

| Path | What |
|---|---|
| `AGENTS.md` | Rules for every coding agent (`CLAUDE.md` points here) |
| `docs/CONTEXT.md` | One-page project context |
| `docs/SIGNALS-HERE.md` | Product brief for 4 Nov (wins on scope) |
| `docs/MUSE-SPARK-BY-FUNCTION.md` | How each function uses Muse Spark, and the demo beat sheet |
| `docs/BUILD-PLAN.md` | Schedule, data model, API, work packages |
| `docs/AGENTIC-CODING.md` | Docker Sandbox setup and agentic coding workflow |
| `docs/HACKATHON-RULES.md` | Official rules and what they mean for us |
| `docs/DESIGN.md` | Mono LCD design system (v5), portable copy |
| `docs/COMPETITOR-REVIEWS.md` | Review research behind the Signals here decision |
| `docs/PROJECT-INSTRUCTIONS-v3.2.md` | Go App-Free brief (after the hackathon) |
| `docs/DECISIONS.md` | Decision log |
| `docs/CHANGELOG.md` | History of decisions |
| `prior-work/design-system/` | The design system as it stood before building (read-only) |

## Built during the hackathon

Filled in as work lands. Everything after the `pre-hackathon` tag.

| Area | Status |
|---|---|
| Product re-plan: Signals here, any place, FIND ME, PLACE IT, place points; design system v5 (docs only) | Done 27 Oct |
| Worker, D1, KV, deploy | Not started |
| Sign-in (Telegram Mini App, email magic link) | Not started |
| FIND ME and the Personal Compass | Not started |
| Places, check-in, PLACE IT and place points | Not started |
| Signals here, I'M CURIOUS, quick replies, block and report | Not started |
| SUGGEST IT, SCREEN IT, PLAN IT, CHECK IT and evals | Not started |
| Meet, Live page, stay in touch | Not started |

## Licence

[MIT](LICENSE). Fonts (Silkscreen, Space Mono) load from Google Fonts under the SIL Open Font License.
