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
2. **Get personal:** three spoken questions about real moments, then LOOKS RIGHT to save your compass.
3. **Where are you?** → **Try the SAMPLE place**. It works from anywhere (code DEMO).
4. Sample Sophie has a signal open. Tap **I'm curious**: she says yes straight away.
5. **Plan the meeting point**: PLAN IT drafts one; you confirm. Then **Meet Sample Sophie** → **We met**.
6. Under every AI answer: **Show the workings**.

Then **This place** (at a real café) shows details with their sources. The SAMPLE place never counts on the [Live page](https://hoolala.hg-labs.io/live). With two phones at a real café, the same loop runs between real people.

## How it works

| Step | What happens | Muse Spark |
|---|---|---|
| Get started | A short story, then three spoken questions about real moments. Each answer drafts one compass line; LOOKS RIGHT saves them. Transcripts never stored. | **COMPASS DRAFT**: structured output, code validator |
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
| COMPASS DRAFT | Chat Completions, strict JSON; one spoken answer to a line with topic, place, pace and roles | low | — | The trimmed answer with keyword roles |
| PLACE IT | Responses API, up to 2 web searches; every detail resolved to a returned page | low | 8.5 s | People's own details only |
| PLAN IT | Chat Completions tool loop: 4 read-only tools in parallel, then `draft_meeting_point` limited to real spots | medium | 4.1 s | The poster's own spot and time |
| WHY GO | Chat Completions, strict JSON; one grounded line per nearby place, every fact must exist | low | — | Template from real inputs |
| READ IT | Chat Completions, strict JSON; today's menu or event off the place's own page, checked against it | low | — | The menu link only |
| JUICY BITS | Chat Completions, strict JSON; topics, people and nearly-said from two free-text answers, validator rejects | low | — | Code filler-strip fallback |
| TRY IT | Chat Completions, strict JSON; exactly 9 tries, 3 per level; code assigns step and bounds | low | — | Hand-written 24-try library |
| CHECK IT | `workings` rows: tools, sources, verdicts, grounding; owner only, no personal text | | | "Model off: rules only." |

What real calls taught us (and the code now handles): the JSON answer arrives after a preamble message; the model cites a site's home page or a bare domain instead of the page it found, so citations are resolved against the pages the search actually returned, and invented sites are dropped. Details in [docs/DECISIONS.md](docs/DECISIONS.md).

## Evaluation: 97 cases

`npm run eval` (82 offline cases, run in CI before every deploy, all passing) and `npm run eval:live` (15 cases against Muse Spark). Last published results: [`evals/results/latest.json`](evals/results/latest.json) (28 Oct run).

| Suite | Pass | What it checks |
|---|---|---|
| SCREEN IT | 20/20 | Phone numbers, emails, links, handles, dating, selling, insults, crisis words bypassing the model; and live: dating without dating words, a compliment on looks, selling without sale words, a disguised handle, a mild insult, approvals in French, English and German with translations |
| Grounding | 5/5 | Events without a returned citation dropped; invented sites dropped; site-only citations resolved to the right page |
| COMPASS DRAFT | 8/8 | Roles only, never names; the question's part; what happened, never who; no personality, health, political or religious labels |
| PLAN IT | 4/4 | Never "sent" or "confirmed"; only real spots; never after the signal ends; live tool loop drafts a valid point |
| SUGGEST IT | 1/1 | Live: grounded ideas for a real café |
| PLACE IT | 4/4 | Never a menu item without a returned page; no points for your own detail; 30 a day; live: sourced details for a real Lausanne café |
| TRY IT | 15/15 | Drafts live or die by the validator: right step and place, inside the talking, minutes and ask bounds, and never flirting, contacts, streak shame or advice |
| GAME | 15/15 | Five passes (talk and kind in each level, with roles); ten rejections (buying, heavy service tries, BOLD at home, names, looks, contact asks, LESS OF, single-kind levels, model-set steps, em dashes) |
| JUICY BITS | 10/10 | Full bits pass; filler kept, names, off-table topics, labels about the person and off-list roles rejected |
| READ IT | 5/5 | Items absent from the source page, allergen claims and unsourced hours dropped |
| WHY GO | 10/10 | Unused facts dropped; invented content rejected |

Last live run (28 Oct): 0 fallbacks in 16. The live eval caught a real bug before users did (FIND ME was dropping every finding because the model cites bare domains).

## Privacy, in short

Location used once and discarded; check-ins deleted after 24 hours; anonymous until both accept; voice transcripts never stored; the compass is private and never used to match people; AI calls logged as token counts only. The full page: <https://hoolala.hg-labs.io/privacy>

## Architecture

One Cloudflare Worker (TypeScript) serves a Vite + Preact web app and a JSON API; D1 holds the data, KV sessions and rate limits, Cron expires signals and purges check-ins. **Code for rules, data for content, the model for language**: who sees what, anonymity, limits and points are plain, tested functions in `src/rules/`; Muse Spark only reads, drafts, screens and translates. Map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

| Path | What |
|---|---|
| `src/rules/` | Pure rules: visibility, anonymity, check-in, screening, grounding, compass, meet, plan, place points |
| `src/api/` | One file per resource; every permission check |
| `src/llm/` | The Meta Model API client, voice transcription and ten Muse functions |
| `src/db/` | D1 migrations and repositories |
| `web/` | The Mono LCD web app |
| `evals/` | The evaluation set |
| `tests/` | 723 tests, including three-person permission scenarios on a real SQLite schema |

## Run it

```bash
npm install
npm test            # 723 tests
npm run typecheck
npm run eval        # offline evaluation set
npm run dev         # wrangler dev; without EMAIL_API_KEY the sign-in link prints to the console
npm run dev:web     # Vite with hot reload, proxying /api to npm run dev
```

Secrets and how they're handled: [docs/SECRETS.md](docs/SECRETS.md). Pipeline (staging, promotion, migrations before every deploy): [docs/PIPELINE.md](docs/PIPELINE.md).

## Built during the hackathon

Building started 27 Oct 2026. Before that: brainstorming, the design system and project organisation only, no product code ([PRIOR-WORK.md](PRIOR-WORK.md)). Everything below was built from 27 Oct.

| Area | Status | Live code |
|---|---|---|
| Worker, D1, KV, cron, staging and production with an accept step, migrations before every deploy | Done | `src/worker.ts`, `src/db/`, `wrangler.toml`, `.github/workflows/` |
| Sign-in (email link, 18+, first name), delete account | Done | `web/src/pages/SignIn.tsx`, `src/api/auth.ts`, `src/api/me.ts`, `src/channels/email.ts` |
| Landing for signed-out visitors | Done | `web/src/pages/Landing.tsx`, `web/src/landing.ts` |
| Today: tiny try, plant, go-out flow | Done | `web/src/pages/Home.tsx`, `web/src/components/TryFlow.tsx`, `web/src/components/Plant.tsx`, `src/api/tries.ts`, `src/rules/tries.ts` |
| Story and voice onboarding (COMPASS DRAFT) | Done | `web/src/components/Story.tsx`, `web/src/story.ts`, `web/src/pages/Surprise.tsx`, `src/api/surprise.ts`, `src/api/compass.ts`, `src/llm/compassdraft.ts`, `src/llm/voice.ts` |
| Five quick ones, juicy bits, Snake, game (TRY IT) | Done | `web/src/pages/Juicy.tsx`, `web/src/pages/Game.tsx`, `web/src/components/Snake.tsx`, `src/api/juicy.ts`, `src/api/game.ts`, `src/llm/juicy.ts`, `src/llm/tryit.ts`, `src/rules/juicy.ts`, `src/content/tries.ts` |
| Compass page | Done | `web/src/pages/Compass.tsx`, `src/api/compass.ts`, `src/rules/compass.ts` |
| Places and check-in (location, add a place, search by town), OpenStreetMap | Done | `web/src/pages/Arrive.tsx`, `web/src/pages/Place.tsx`, `src/api/checkin.ts`, `src/api/places.ts`, `src/api/placecard.ts`, `src/rules/checkin.ts`, `src/rules/places.ts` |
| Signals here: post, discover, I'M CURIOUS, accept, quick replies, block, report | Done | `web/src/pages/Here.tsx`, `src/api/here.ts`, `src/api/plan.ts`, `src/rules/here.ts` |
| Around, icebreaker rooms, table QR, debrief | Done | `web/src/pages/Around.tsx`, `web/src/pages/Compose.tsx`, `web/src/pages/Room.tsx`, `web/src/pages/TableJoin.tsx`, `web/src/pages/Debrief.tsx`, `web/src/around.ts`, `web/src/scan.ts`, `src/api/rooms.ts`, `src/api/around.ts`, `src/api/table.ts`, `src/api/debrief.ts`, `src/rules/rooms.ts` |
| MEET (mutual QR), STAY IN TOUCH, Live page, SAMPLE place | Done | `web/src/pages/Meet.tsx`, `web/src/pages/Live.tsx`, `src/api/meet.ts` |
| Friends and crew | Done | `web/src/pages/Friends.tsx`, `web/src/pages/Join.tsx`, `src/api/crew.ts` |
| Posters, maker, poster onboarding | Done | `web/src/pages/Posters.tsx`, `web/src/pages/PosterPrint.tsx`, `web/src/pages/PosterJoin.tsx`, `web/src/components/PosterArt.tsx`, `src/api/posters.ts`, `src/api/poster.ts`, `src/rules/poster.ts`, `src/content/posters.ts` |
| SCREEN IT, SUGGEST IT, PLAN IT, PLACE IT, WHY GO, READ IT, CHECK IT, evaluation set | Done | `src/llm/screen.ts`, `src/llm/suggest.ts`, `src/llm/roomideas.ts`, `src/llm/agent.ts`, `src/llm/place.ts`, `src/llm/whygo.ts`, `src/llm/readit.ts`, `src/api/workings.ts`, `web/src/components/Workings.tsx`, `evals/` |
| Owner dashboard and feedback | Done | `web/src/pages/Dashboard.tsx`, `web/src/pages/SayHi.tsx`, `src/api/dashboard.ts`, `src/api/feedback.ts` |
| Telegram Mini App | Started, paused to finish the web app first | — |
| Pilot at a real place | Planned for Mon 2 Nov | — |

**How it was built.** With coding agents, each commit marked with an `Agent:` trailer: 32 by Claude Code, 80 by Muse Code at the time of writing. The boilerplate and design were made with Claude Code; all the implementation was done with Muse Code. Rules every agent follows: [AGENTS.md](AGENTS.md). The flowers on the plant and the virtual icebreaker rooms both came out of usability tests in the wild with real people.

## Research behind the story

The onboarding story states six sourced findings: WHO 2025 (1 in 6), Kardas, Kumar and Epley 2022 (expected awkwardness), Tissera et al. 2025 (the liking gap), Wild et al. 2025 and Drebing et al. 2025 (one hello lifts you for hours), Lanser and Eisenberger 2022 and Lee et al. 2025 (kindness). Full list: [docs/RESEARCH.md](docs/RESEARCH.md).

## Limitations, honestly

- Translation covers English and French; other languages are detected but shown as written.
- Only OpenStreetMap for nearby places; Google Places is coded but off.
- The pilot with real people hasn't happened yet; the Live page shows real numbers, so far small ones.
- Telegram sign-in and notifications are paused.

## Licence

[MIT](LICENSE). Fonts (Silkscreen, Space Mono) load from Google Fonts under the SIL Open Font License.
