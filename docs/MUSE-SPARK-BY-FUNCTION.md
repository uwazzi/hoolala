# Hoolala!: Muse Spark by function

Updated 29 Oct 2026 (v6.2: onboarding story, get personal, the game, simplified Today; FIND ME removed) for **Signals here** (`claude/SIGNALS-HERE.md`): any place, the Personal Compass from spoken answers, PLACE IT and place points. This document wins over older docs on how models are used. Product rules in `claude/DESIGN.md` and `claude/AGENTS.md` still apply. Briefings (FIND IT) and SAY IT move to after 4 Nov.

## The story in one line

**Hoolala! turns "we should talk sometime" into "we did".** People who share a place post small invitations to talk. Muse Spark gets to know you from three questions about real moments, writes your game of tiny tries, gets to know the place, suggests, screens, translates and plans, then stops and lets two people decide. Arriving and meeting stay model-free, on purpose.

Pitch line (video opening, README): **"We've sat at the same table for six months." / Never spoken.** Then: **Hoolala! Signals, not feeds.**

## The loop

| # | Function | The moment | Muse Spark capability | API feature | Code guardrail | Fallback (model off) |
|---|---|---|---|---|---|---|
| 0 | **COMPASS DRAFT** | "Let's get personal." Three spoken questions about real moments; each answer becomes a compass line with topic, place, pace and people | Structured output, short grounded drafting | JSON schema `{part, line (≤60), topic?, place_kind?, pace?, people[role]}`, `reasoning_effort: low`; input is the question id and the answer only | `src/rules/compass.ts`: part matches the question; roles from the fixed allow-list, never names; banned labels; the line describes what happened, never what the person is; transcripts never stored; nothing stored before LOOKS RIGHT | The answer trimmed to 60 characters, roles from keyword match, pace gentle |
| 1 | **ARRIVE** (no AI) | Share location, pick the place, or ADD THIS PLACE. GPS wrong? Search by name | None, on purpose | | `src/rules/checkin.ts`: radius, place search within the city, optional poster key and code, 4-hour expiry; the person's coordinates discarded after the lookup | Same |
| 2 | **PLACE IT** | The place card: hours, menu highlights, spots. "AI / FOUND > google maps" until people confirm it | Parallel tool calling, structured output, web search | Tools: `google_place_details` (live, field-masked), `web_search` (menu and hours on the place's website), `get_place_facts`; parallel; JSON schema `{facts[{field, value, source, url}]}`; `reasoning_effort: low`; cached per place for 30 days as fetched facts only where the source allows | `src/rules/places.ts`: facts carry a source; Google content shown live with attribution, only the place id kept; nothing becomes a Hoolala! fact without a person confirming; SCREEN IT on people's edits; points rules | People's confirmed facts only |
| 2b | **TRY IT** | "Your game. Pick a level, pick a try." Nine tries in SOFT, BRAVE and BOLD, mixing SMALL TALK and KIND IT, with the people in your days | Structured output, short creative drafting | Schema `{tries[{title, level, kind, who_role, place_kind, why}]}` (exactly 9, 3 per level), `reasoning_effort: low`; inputs: compass lines and roles only | `src/rules/tries.ts`: code assigns step and minutes; each level has talk and kind; roles from the compass; service roles light only; no buying, no looks, no contact details, no LESS OF; then SCREEN IT | The hand-written library (24 tries) filled with topic, place and roles |
| 2c | **WHY GO** | "Why this one: compass (coffee) + shared table + 7 Hoolala! visits." One line per nearby place | Short grounded drafting | Schema `{why (≤140), tiny_try (≤80), facts_used[]}`, `reasoning_effort: low`, 6 s timeout, one call for up to 6 places | Used facts must exist; no invented numbers, times or prices; banned themes and step 1 to 3 bounds on the try | Template from facts ("On your compass: coffee. Talking here: often chatty.") |
| 2d | **READ IT** | Today's menu or event from the place's own page | Extraction with source check | Page text (20 kB), place name, date; schema `{items[] (≤3), hours?, kind}` | Every item must appear in the source text; no allergen or health claims | "See their menu" link only |
| 3 | **SUGGEST IT** | "Need a topic?" Three ideas that fit you, the place and what's on nearby: "Their flat white is apparently famous. Verdict at 16:00?" | Web search with citations, structured output | `web_search` (at most 1, cached per place for 1 hour), schema `{ideas[{topic, why, citation_url?}]}`, `reasoning_effort: low`; compass lines and place facts as context | `src/rules/grounding.ts`: events need a returned citation; ideas pass SCREEN IT; AI / SUGGESTION, never posted automatically | Hand-written topics by time of day |
| 4 | **SCREEN IT** | Every topic, reply and place detail checked before anyone sees it, translated FR/EN | Structured output (classification with reasons), translation | `{verdict, category, reason, fr, en}`, `reasoning_effort: minimal`, prompt caching on the house rules | `src/rules/screening.ts` first (contacts, links, handles, length, word list, crisis words); approve or reject, never rewrite | Code rules only |
| 5 | **PLAN IT** | "Terrace at 15:10 works for all three of you. Confirm?" | Parallel tool calling and planning | `get_signal`, `get_place_spots`, `get_place_hours`, `get_quick_replies`, `draft_meeting_point`; max 4 per turn; `reasoning_effort: medium` | Draft only; the poster confirms with a tap; only this signal and place | The spot and time the poster picked |
| 6 | **SNAP IT** (stretch) | Photograph the menu board: new menu facts to confirm | Vision | Image part, schema `{items[{name, price}], confidence}` | Image in memory only; becomes AI / FOUND facts, never stored as fact until a person confirms; never describes people | Type it in |
| 7 | **CHECK IT** | SHOW THE WORKINGS: tools, citations, verdicts, "Grounded: 3 of 3" | Verifiable agent behaviour | Logged tool calls, citations, verdicts (no personal text) | Evaluation set of about 36 cases before every deploy; pass rate in the README | "Model off: rules only." |

Then the model steps out:

| # | Function | Why no AI here |
|---|---|---|
| 8 | **MEET IT**: two phones, mutual QR, both agree; the connection rate ticks up | Real life is confirmed by two people, not inferred by a model. |
| 9 | **STAY IN TOUCH**: both choose it, or nothing happens | A friendship is a decision, not a recommendation. |
| 10 | **GO LIVE**: HOOLALA! IS OFF. YOU'RE ON. | The best screen is the one that ends. |

## Reasoning effort by function

| Function | Effort | Why |
|---|---|---|
| SCREEN IT | minimal | Fast verdict on every post, reply and detail |
| COMPASS DRAFT, TRY IT, PLACE IT, SUGGEST IT, WHY GO, READ IT, SNAP IT | low | Extraction and short drafts, with and without search |
| PLAN IT | medium | Combines several tool results into one proposal |
| Evaluation runs | high | Judge-style checks |

## Evaluation set (about 70 cases, `npm run eval`)

- COMPASS DRAFT: roles from the allow-list only; names never stored; personality labels rejected; the line describes what happened.
- TRY IT (game): 5 passes (levels and kinds with roles), 10 rejections (buying, service-role prying, stranger at home, names, looks, contact details, LESS OF, single-kind level, model-set step, em dash).
- PLACE IT: every fact has a source; never invents a menu item without a source; Google facts are never written as Hoolala! facts.
- SCREEN IT: rejects dating lines, phone numbers and handles, selling, insults, and abusive place edits; approves ordinary French and English; never rewrites.
- SUGGEST IT: an event without a returned citation is dropped.
- PLAN IT: never returns "sent"; only real spots; respects capacity.
- WHY GO: every used fact exists; invented prices, features and flirting tries rejected.
- READ IT: items absent from the source page are dropped.
- Crisis words bypass the model.

## The demo, beat by beat (3 minutes)

| Time | Beat | Capability on screen |
|---|---|---|
| 0:00 | Home: GET OUTSIDE. MEET PEOPLE. GROW INSIDE. One try typed out, tried for real at the place: NO REPLY, answered kindly, and the plant gains a coloured leaf. NEXT TIME: SAME STEP, with TRY IT's "why this one". | TRY IT |
| 0:12 | First open: the story (1 in 6, the liking gap), then LET'S GO. Three spoken questions, the compass check with PEOPLE IN YOUR DAYS, LOOKS RIGHT. MAKE MY GAME. Nine tries across SOFT, BRAVE and BOLD; NEW ONE rewrites one. | COMPASS DRAFT, TRY IT (structured output) |
| 0:35 | And when you're somewhere with others: ARRIVE, share location, pick the café. Then the failure case: "the lake", search by name works. | None, on purpose |
| 0:50 | THE PLACE: hours and menu fetched with sources; one price is wrong: FIX IT, +5 place points (private). | PLACE IT (parallel tools) |
| 1:05 | DISCOVER: three signals, one in French shown in English, one marked FITS YOU | SCREEN IT translation |
| 1:15 | POST: "Need a topic?" An idea from the menu and one citing a talk nearby tonight. A cheeky dating line gets a friendly no. | SUGGEST IT, SCREEN IT |
| 1:40 | Second phone: I'M CURIOUS. ACCEPT. First names. PLAN IT: "Terrace at 15:10?" CONFIRM. ON MY WAY. | PLAN IT |
| 2:05 | MEET IT: two phones, QR, both agree. Live page: "Real-world connection rate: 7 of 9". | None, on purpose |
| 2:20 | SHOW THE WORKINGS: tools, citations, verdicts; the eval pass rate | CHECK IT |
| 2:35 | STAY IN TOUCH, both. | |
| 2:45 | GO LIVE. "Signals, not feeds." Built with Muse Spark and Muse Code. One line on prior work. | |

## Risks to check

- **Access from Switzerland** and features on our key (`web_search`, structured output, parallel tools, image input, prompt caching). Log in `docs/DECISIONS.md`.
- **Google Maps Platform:** needs a key with billing and attribution. Terms allow keeping the place id; latitude and longitude only for 30 days; Places content may not be used with a non-Google map. So: Google content is shown live, place coordinates come from the person who added the place, and our facts are people's own. Fallback if the key is a problem: OpenStreetMap search plus web search.
- **The compass draft and the anti-project list** ("personality analysers"): it drafts lines about what happened, in the person's words, never traits; roles only, never names. Say so in the README.
- `web_search` cost: PLACE IT once per place per 30 days; SUGGEST IT cached per place per hour. The compass draft and the game use no search.
- Telegram Mini App location: use the Mini App location API where available, browser geolocation otherwise; search by name always works.

## Scoring logic

- **Use of Meta AI tooling:** a personal game written fresh (TRY IT), a compass drafted from spoken answers, web search with citations (the place, nearby events), a real tool-using agent (PLACE IT, PLAN IT), classification and translation, vision (stretch), verifiable workings with an eval set, plus Muse Code for building.
- **Technical depth:** location check-in with fallbacks, server-enforced anonymity and audience rules, consent and provenance on every compass line and place fact, points that can't be farmed, evals, model-off paths.
- **Impact:** works in any café tomorrow, not just partner venues; one primary metric that counts real conversations; place data that gets better as people use it.
- **Demo:** one place, two phones, a new capability every 20 to 30 seconds, and a memorable ending.
