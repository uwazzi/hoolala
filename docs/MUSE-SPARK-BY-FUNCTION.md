# Hoolala!: Muse Spark by function

Agreed direction (26 Oct): every Hoolala! function is built around one Muse Spark capability, so the judges see a different capability at each step of the demo, and every step ends nearer a real meet-up. This document wins over older docs on how models are used. Product rules in `docs/DESIGN.md`, `docs/PROJECT-INSTRUCTIONS-v3.2.md` and `AGENTS.md` still apply.

## The story in one line

**Hoolala! turns "we should catch up" into "we did".** Muse Spark does the work in between: it listens, looks, searches and plans, then stops and lets two people decide.

## The loop: six functions, six capabilities

| # | Function | The moment | Muse Spark capability | API feature | Code guardrail | Fallback (model off) |
|---|---|---|---|---|---|---|
| 1 | **TELL IT** (Go App-Free onboarding) | "Hello, human. What would you like a little more of?" A short conversation becomes your Personal Compass. | Multi-turn conversation that remembers, plus structured output | Responses API state (`previous_response_id`), JSON schema output, `reasoning_effort: low` | `src/rules/compass.ts`: every compass item traces to the person's own words; no personality, health or screen-time labels; nothing saved before LOOKS RIGHT | Scripted stages, same screens |
| 2 | **SAY IT** (voice in Telegram) | Send a voice note: "Anyone free for coffee Thursday? Somewhere near Ouchy." | Native audio understanding, no separate transcription step | Audio content part in the request; intent returned as structured output | Audio never stored; intent shown as text before anything happens; crisis words checked on the transcript | Text message works the same |
| 3 | **SNAP IT** (poster to plan) | Photograph a gig poster, a café chalkboard or a flyer. "Jazz at Le Bourg, Thu 21:00. So... Thursday?" | Vision: reads event, date, time and place from a photo | Image content part; structured output `{title, date, time, place, confidence}` | Image processed in memory, never stored; low confidence asks the person to check the details; no faces or people extracted | Type the details yourself |
| 4 | **FIND IT** (finite briefing) | ANYTHING NEW? Two friends' items, then one or two things happening near you that match your compass, each with a reason and a source. | Built-in web search with citations, plus grounded ranking | `web_search` tool with inline citations; `reasoning_effort: medium`; prompt caching for the compass and rules | `src/rules/grounding.ts`: every line maps to a real friend item id or a returned citation URL and a compass id; cap respected; friends first; mood signals never used | Friends' items only, newest first |
| 5 | **PLAN IT** (the agent) | "Sophie could be persuaded into coffee. Jazz on Thursday fits you both. Shall I draft it?" | Parallel tool calling and planning | Tools: `get_shared_availability`, `get_my_compass`, `get_open_invitations`, `draft_invitation`; parallel calls; max 4 per turn | The model can only draft. Sending needs a confirmation token from a tap. Only signals shared with this person, never mood signals | Prefilled invitation form |
| 6 | **CHECK IT** (show the workings) | Tap SHOW THE WORKINGS: the tools called, the citations, "Grounded: 3 of 3 lines", the compass line behind each item. | Verifiable agent behaviour | Logged tool calls and citations per response (no personal text stored) | Evaluation set of about 30 cases run before every deploy; pass rate in the README | Panel says "Model off: rules only" |

Then the model deliberately steps out:

| # | Function | Why no AI here |
|---|---|---|
| 7 | **MEET IT**: two phones, mutual QR, both agree, +1 private moment, the Live counter ticks up | Real life is confirmed by two people, not inferred by a model. Saying so is part of the pitch. |
| 8 | **GO LIVE**: HOOLALA! IS OFF. YOU'RE ON. | The best screen is the one that ends. |

## Reasoning effort by function (a craft detail worth showing in the README)

| Function | Effort | Why |
|---|---|---|
| Chat replies, SAY IT intent | minimal | Fast, one action |
| TELL IT, SNAP IT | low | Extraction and short questions |
| FIND IT | medium | Search, compare against the compass, explain |
| PLAN IT | medium | Combine several tool results into one proposal |
| Evaluation runs | high | Judge-style checks of grounding and rules |

## What this replaces

- **RSS fetcher and shared-link sources are dropped.** FIND IT uses Muse Spark's built-in web search with citations instead. It needs less code, is more useful ("things happening near Lausanne this week"), and highlights a Muse Spark feature. LinkedIn and Instagram stay "links you share only" and are not part of the demo.
- **Muse Voice Transcribe is not needed** for SAY IT: Muse Spark takes audio directly. Keep Transcribe only as a fallback if audio input isn't available on our API key.
- **Scheduled Telegram delivery is cut.** On demand only ("anything new?"), which also fits "pull, not push".
- Onboarding is five stages on camera (intentions, what matters, filters, how often, reveal); sources and Telegram linking are folded into the reveal.

## The demo, beat by beat (3 minutes)

| Time | Beat | Capability on screen |
|---|---|---|
| 0:00 | "We live five minutes apart." / It's been six months. One line: Hoolala! turns "we should" into "we did". | |
| 0:15 | TELL IT: three answers, one smart follow-up, "Your world, according to you." | Conversation state, structured output |
| 0:45 | FIND IT in Telegram: Sophie's signal, plus a jazz night near Ouchy with its source and a reason | Web search with citations, grounding |
| 1:10 | SAY IT: voice note "coffee Thursday?" | Native audio |
| 1:25 | PLAN IT: the agent combines Sophie's availability, the jazz night and your compass, drafts the invitation, stops at SEND THIS TO SOPHIE? | Parallel tool calling, confirmation boundary |
| 1:50 | Sophie's phone: I'M IN | |
| 2:00 | SNAP IT: at the café, photograph the chalkboard; next week's quiz night becomes a draft for the circle | Vision |
| 2:20 | SHOW THE WORKINGS for five seconds: tools, citations, "Grounded: 3 of 3" | Verifiable agent |
| 2:30 | MEET IT: two phones, QR, the Live number ticks up; share card | (no AI, on purpose) |
| 2:50 | GO LIVE. "Your data. Your choice. Your attention." Built with Muse Spark and Muse Code. | |

## Risks to check at kickoff (Mon 26, 17:00 Zurich)

- **Access from Switzerland.** Meta's developer blog describes the Muse Spark preview as available to US developers. Confirm that hackathon keys work from Zurich (ask in #questions). If not, run through the partner route the organisers suggest, and note it in `docs/DECISIONS.md`.
- Confirm on our key: audio input, image input, `web_search`, structured output, parallel tool calling, `previous_response_id`, and the exact model id (public sources list versions 1.1 to 1.3).
- `web_search` cost and latency: cap at 2 searches per briefing, cache results for an hour per compass, and keep the friends-only fallback.
- Privacy for SNAP IT and SAY IT: images and audio are never written to D1, KV, R2 or logs. State it on the privacy page and in the video.

## Scoring logic (why this direction)

- **Use of Meta AI tooling:** five distinct Muse Spark capabilities (conversation state, audio, vision, web search, parallel tools), each doing a real job, plus Muse Code for building. Not one wrapper.
- **Technical depth:** each capability sits behind a pure, tested guardrail; an evaluation set; reasoning effort tuned per function; prompt caching; a full model-off path.
- **Impact:** every function ends nearer a real meet-up, and the Live counter measures it with confirmations from both people.
- **Demo:** one story, two people, one day; a new capability every 20 to 30 seconds; a memorable ending.
