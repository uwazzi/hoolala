# Hoolala!

*You never know until you go.*

> "We've sat at the same table for six months."
> Never spoken.

**Hoolala! Signals here.** People who share a place (a café, a bar, a coworking space) post small invitations to talk, stay anonymous until both say yes, and meet in person. Hoolala! turns "we should talk sometime" into "we did", and measures one thing: how many accepted invitations become real conversations.

Muse Spark does the work in between: it gets to know you from what's public (only with your OK), suggests topics, screens and translates every post, and proposes where to meet. Then it stops and lets two people decide.

**Signals, not feeds.** Not a dating app.

> Entry for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon), Indie Developer track, "Build for Your World".

**Live:** <https://hoolala.hg-labs.io>

## Try it in two minutes, on your own

1. Open <https://hoolala.hg-labs.io> and **Sign in** (an email link; 18+).
2. **Want a head start?** Let FIND ME look you up, or answer three questions.
3. **Where are you?** → **Try the SAMPLE place**. It works from anywhere (code DEMO).
4. Sample Sophie has a signal open. Tap **I'm curious**: she says yes straight away.
5. **Plan the meeting point**: PLAN IT drafts one; you confirm. Then **Meet Sample Sophie** → **We met**.
6. Under every AI answer: **Show the workings**.

Then **This place** (at a real café) shows details with their sources. The SAMPLE place never counts on the [Live page](https://hoolala.hg-labs.io/live). With two phones at a real café, the same loop runs between real people.

## How it works

| Step | What happens | Muse Spark |
|---|---|---|
| Get started | "Want a head start?" With your OK, Hoolala! searches the web for you (only you, at most 3 searches). You tick what's really you; your private Personal Compass is drafted. Or three questions, no AI. | **FIND ME**: web search, grounded citations, structured output |
| Arrive | Share location and pick the place (Hoolala! places, then OpenStreetMap), add it, or search by name in your town. | None, on purpose |
| Post | A topic, when, where in the place, for how many (1 to 3). "Need a topic?" gives three ideas, one maybe about something on nearby tonight, with its source. | **SUGGEST IT**: web search, grounded; **SCREEN IT**: verdict and FR/EN translation |
| The place | THIS PLACE: hours, menu, wifi and spots, AI / FOUND with their source, then confirmed by people here; THAT'S RIGHT, FIX IT, NOT ANY MORE; private place points | **PLACE IT**: web search, grounded |
| Discover | Three signals at a time, "Someone here", translated; ones that fit your compass first, marked only for you. | **SCREEN IT** translation |
| Respond | I'M CURIOUS; the poster accepts; first names only after both say yes; quick replies, no chat. | |
| Plan | A meeting point drafted from the place's real spots; a person confirms or changes it. | **PLAN IT**: parallel tool calls, draft only |
| Meet | Two phones, one QR, both agree. The Live page counts it. | None, on purpose |
| Show the workings | Function, tools in order, sources, verdict, "Grounded: N of M", reasoning level, under every AI answer. | **CHECK IT** |

North star: **real-world connection rate**, accepted signals that end in a QR-confirmed meet-up, shown on the [Live page](https://hoolala.hg-labs.io/live) as a collective number.

## Muse Spark by function

All on `muse-spark-1.3` (standard mode: what we send isn't used for training). Each function has a timeout, a JSON schema, our own validator and a rule-based fallback, so Hoolala! works with the model off.

| Function | Endpoint and capability | Effort | Median (live eval) | Without the model |
|---|---|---|---|---|
| SCREEN IT | Chat Completions, strict JSON schema; approve/reject with a category, FR/EN translation; never rewrites | minimal | 1.0 s | Code rules decide alone |
| SUGGEST IT | Responses API, 1 web search, strict JSON; every event must cite a page the search returned | low | 5.9 s | Three fixed ideas for the hour |
| FIND ME | Responses API, up to 3 web searches; findings resolved to returned pages; then a compass draft | low | 8.0 s | Three questions |
| PLACE IT | Responses API, up to 2 web searches; every detail resolved to a returned page | low | 8.5 s | People's own details only |
| PLAN IT | Chat Completions tool loop: 4 read-only tools in parallel, then `draft_meeting_point` limited to real spots | medium | 4.1 s | The poster's own spot and time |
| CHECK IT | `workings` rows: tools, sources, verdicts, grounding; owner only, no personal text | | | "Model off: rules only." |

What real calls taught us (and the code now handles): the JSON answer arrives after a preamble message; the model cites a site's home page or a bare domain instead of the page it found, so citations are resolved against the pages the search actually returned, and invented sites are dropped. Details in [docs/DECISIONS.md](docs/DECISIONS.md).

## Evaluation: 59 cases, 59 passing

`npm run eval` (43 offline cases, run in CI before every deploy) and `npm run eval:live` (16 cases against Muse Spark). Latest results: [`evals/results/latest.json`](evals/results/latest.json).

| Suite | Pass | What it checks |
|---|---|---|
| SCREEN IT | 20/20 | Phone numbers, emails, links, handles, dating, selling, insults, crisis words bypassing the model; and live: dating without dating words, a compliment on looks, selling without sale words, a disguised handle, a mild insult, approvals in French, English and German with translations |
| Grounding | 5/5 | Events without a returned citation dropped; invented sites dropped; site-only citations resolved to the right page |
| FIND ME | 4/4 | Refuses to look up someone else; live run on a public figure: sourced findings, no labels, at most 3 searches |
| Compass | 6/6 | Never keeps an unticked finding, or a personality, health, political or religious label; every line has a source or "you said" |
| PLAN IT | 4/4 | Never "sent" or "confirmed"; only real spots; never after the signal ends; live tool loop drafts a valid point |
| SUGGEST IT | 1/1 | Live: grounded ideas for a real café |
| PLACE IT | 4/4 | Never a menu item without a returned page; no points for your own detail; 30 a day; live: sourced details for a real Lausanne café |
| TRY IT | 15/15 | Drafts live or die by the validator: right step and place, inside the talking, minutes and ask bounds, and never flirting, contacts, streak shame or advice |

Live fallback rate: 0 of 16. The live eval caught a real bug before users did (FIND ME was dropping every finding because the model cites bare domains).

## Privacy, in short

Location used once and discarded; check-ins deleted after 24 hours; anonymous until both accept; FIND ME results never stored; the compass is private and never used to match people; AI calls logged as token counts only. The full page: <https://hoolala.hg-labs.io/privacy>

## Architecture

One Cloudflare Worker (TypeScript) serves a Vite + Preact web app and a JSON API; D1 holds the data, KV sessions and rate limits, Cron expires signals and purges check-ins. **Code for rules, data for content, the model for language**: who sees what, anonymity, limits and points are plain, tested functions in `src/rules/`; Muse Spark only reads, drafts, screens and translates. Map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

| Path | What |
|---|---|
| `src/rules/` | Pure rules: visibility, anonymity, check-in, screening, grounding, compass, meet, plan, place points |
| `src/api/` | One file per resource; every permission check |
| `src/llm/` | The Meta Model API client and the four functions |
| `src/db/` | D1 migrations and repositories |
| `web/` | The Mono LCD web app |
| `evals/` | The evaluation set |
| `tests/` | 249 tests, including three-person permission scenarios on a real SQLite schema |

## Run it

```bash
npm install
npm test            # 249 tests
npm run typecheck
npm run eval        # offline evaluation set
npm run dev         # wrangler dev; without EMAIL_API_KEY the sign-in link prints to the console
npm run dev:web     # Vite with hot reload, proxying /api to npm run dev
```

Secrets and how they're handled: [docs/SECRETS.md](docs/SECRETS.md). Pipeline (staging, promotion, migrations before every deploy): [docs/PIPELINE.md](docs/PIPELINE.md).

## Built during the hackathon

Building started 27 Oct 2026. Before that: brainstorming, the design system and project organisation only, no product code ([PRIOR-WORK.md](PRIOR-WORK.md)). Everything below was built from 27 Oct.

| Area | Status |
|---|---|
| Worker, D1, KV, cron, staging and production with an accept step, migrations before every deploy | Done |
| Sign-in (email link, 18+, first name), delete account | Done |
| Places and check-in (location, add a place, search by town), OpenStreetMap | Done |
| Signals here: post, discover, I'M CURIOUS, accept, quick replies, block, report | Done |
| MEET (mutual QR), STAY IN TOUCH, Live page, SAMPLE place | Done |
| SCREEN IT, SUGGEST IT, FIND ME and the Personal Compass, PLAN IT, CHECK IT, evaluation set | Done |
| PLACE IT and place points | Done |
| Telegram Mini App | Started, paused to finish the web app first |
| Pilot at a real place | Planned for Mon 2 Nov |

**How it was built.** With coding agents, each commit marked with an `Agent:` trailer: 30 by Claude Code, 2 by Muse Code at the time of writing. Rules every agent follows: [AGENTS.md](AGENTS.md).

## Limitations, honestly

- Translation covers English and French; other languages are detected but shown as written.
- Only OpenStreetMap for nearby places; Google Places is coded but off.
- The pilot with real people hasn't happened yet; the Live page shows real numbers, so far small ones.
- Telegram sign-in and notifications are paused.

## Licence

[MIT](LICENSE). Fonts (Silkscreen, Space Mono) load from Google Fonts under the SIL Open Font License.
