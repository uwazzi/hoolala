# Hoolala!: Muse Spark by function

Updated 29 Oct 2026 (v6: tiny tries lead, TRY IT; Signals here is the second path) for **Signals here** (`claude/SIGNALS-HERE.md`): any place, FIND ME onboarding with the Personal Compass, PLACE IT and place points. This document wins over older docs on how models are used. Product rules in `claude/DESIGN.md` and `claude/AGENTS.md` still apply. Briefings (FIND IT) and SAY IT move to after 4 Nov.

## The story in one line

**Hoolala! turns "we should talk sometime" into "we did".** People who share a place post small invitations to talk. Muse Spark gets to know you from what's public (with your OK), gets to know the place, suggests, screens, translates and plans, then stops and lets two people decide. Arriving and meeting stay model-free, on purpose.

Pitch line (video opening, README): **"We've sat at the same table for six months." / Never spoken.** Then: **Hoolala! Signals, not feeds.**

## The loop

| # | Function | The moment | Muse Spark capability | API feature | Code guardrail | Fallback (model off) |
|---|---|---|---|---|---|---|
| 0 | **FIND ME** | "Want a head start?" Hoolala! looks at what's public about you, you tick what's really you, it drafts your Personal Compass | Web search with citations, structured output, short conversation | `web_search` (at most 3, only the person's own name, city and links they gave), JSON schema `{findings[{text, url}], compass[{part, text, source_url}]}`, `reasoning_effort: low` | `src/rules/compass.ts`: explicit consent; every compass line traces to a ticked finding or the person's words; banned labels (personality, health, politics, religion, sexuality); nothing stored before LOOKS RIGHT; raw findings never stored | Three scripted questions with chips |
| 1 | **ARRIVE** (no AI) | Share location, pick the place, or ADD THIS PLACE. GPS wrong? Search by name | None, on purpose | | `src/rules/checkin.ts`: radius, place search within the city, optional poster key and code, 4-hour expiry; the person's coordinates discarded after the lookup | Same |
| 2 | **PLACE IT** | The place card: hours, menu highlights, spots. "AI / FOUND > google maps" until people confirm it | Parallel tool calling, structured output, web search | Tools: `google_place_details` (live, field-masked), `web_search` (menu and hours on the place's website), `get_place_facts`; parallel; JSON schema `{facts[{field, value, source, url}]}`; `reasoning_effort: low`; cached per place for 30 days as fetched facts only where the source allows | `src/rules/places.ts`: facts carry a source; Google content shown live with attribution, only the place id kept; nothing becomes a Hoolala! fact without a person confirming; SCREEN IT on people's edits; points rules | People's confirmed facts only |
| 2b | **TRY IT** | "Last one got no reply. Happens. Same step, a fresh try." The next tiny try, written for this person, place and time | Structured output, short creative drafting | Schema `{title, hint, step, words_max, minutes, asks_of_other, place_kind, why}`, `reasoning_effort: low`; inputs: step (from code), place kind, time of day, last 3 outcomes, compass interests | `src/rules/tries.ts`: step must equal the requested step; every field inside that step's bounds; always-on limits; then SCREEN IT; stored with the code-assigned step | The hand-written library (15 tries, 3 per step) |
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
| FIND ME, PLACE IT, SUGGEST IT, SNAP IT | low | Search, extraction and short drafts |
| PLAN IT | medium | Combines several tool results into one proposal |
| Evaluation runs | high | Judge-style checks |

## Evaluation set (about 36 cases, `npm run eval`)

- FIND ME: never keeps an unticked finding; never produces a personality, health, political or religious label; every compass line has a source or "you said"; refuses to look up someone else's name.
- PLACE IT: every fact has a source; never invents a menu item without a source; Google facts are never written as Hoolala! facts.
- SCREEN IT: rejects dating lines, phone numbers and handles, selling, insults, and abusive place edits; approves ordinary French and English; never rewrites.
- SUGGEST IT: an event without a returned citation is dropped.
- PLAN IT: never returns "sent"; only real spots; respects capacity.
- Crisis words bypass the model.

## The demo, beat by beat (3 minutes)

| Time | Beat | Capability on screen |
|---|---|---|
| 0:00 | Home: GET OUTSIDE. MEET PEOPLE. One try typed out, tried for real at the place: NO REPLY, answered kindly, and the plant gains a coloured leaf. NEXT TIME: SAME STEP, with TRY IT's "why this one". | TRY IT |
| 0:12 | GET STARTED: "Want a head start?" YES. Three findings with sources, one NOT ME (a namesake). The compass in three lines. LOOKS RIGHT. | FIND ME (web search, structured output) |
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
- **FIND ME and the anti-project list** ("personality analysers"): it extracts interests the person confirms, in their words, never traits. Say so in the README and show IS THIS YOU? on camera.
- `web_search` cost: FIND ME at most 3 per person once; PLACE IT once per place per 30 days; SUGGEST IT cached per place per hour.
- Telegram Mini App location: use the Mini App location API where available, browser geolocation otherwise; search by name always works.

## Scoring logic

- **Use of Meta AI tooling:** web search with citations twice over (you and the place), a real tool-using agent (PLACE IT, PLAN IT), classification and translation, vision (stretch), verifiable workings with an eval set, plus Muse Code for building.
- **Technical depth:** location check-in with fallbacks, server-enforced anonymity and audience rules, consent and provenance on every compass line and place fact, points that can't be farmed, evals, model-off paths.
- **Impact:** works in any café tomorrow, not just partner venues; one primary metric that counts real conversations; place data that gets better as people use it.
- **Demo:** one place, two phones, a new capability every 20 to 30 seconds, and a memorable ending.
