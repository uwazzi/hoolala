# Hoolala! project context (Meta hackathon)

Read this first in every chat in this project. The current docs (26 Oct), and nothing else, define the project:

| Doc | What it decides |
|---|---|
| `docs/CONTEXT.md` (this file) | The summary: event, product, scope, principles |
| `docs/PROJECT-INSTRUCTIONS-v3.2.md` | The product brief: Go App-Free, Personal Compass, sources, briefings |
| `docs/MUSE-SPARK-BY-FUNCTION.md` | How each function uses Muse Spark, and the demo beat sheet (wins on model use) |
| `docs/HACKATHON-RULES.md` | Official rules, dates, submission and judging (wins on anything about the hackathon) |
| `docs/BUILD-PLAN.md` | Schedule, data model, API and work packages |
| `AGENTS.md` | Rules for every coding agent |
| `docs/DESIGN.md` | Mono LCD design system, voice and core product rules |
| `docs/CHANGELOG.md` | History of decisions |

The earlier Hi-Five quest bot and the v2 brief are retired and deleted. Their core rules (circle, catch-up in threes, Little Signals, invitations, mutual QR, finite by design) live on in this file, `DESIGN.md` and `AGENTS.md`.

## The event
- Meta Global AI Developer Hackathon (Cerebral Valley), remote. Building period 27 Oct to 4 Nov 2026. Solo entry by Huguinho (HG-Labs), **Indie Developer track**, problem statement **Build for Your World**.
- Kickoff Mon 26 Oct 12:00 ET (17:00 Zurich). Workshops 27, 28 and 30 Oct at 17:00 Zurich. Office hours in Discord #office-hours on weekdays, 10:00 to 11:00 ET.
- **Deadline: Wed 4 Nov 21:00 ET (Thu 5 Nov 03:00 Zurich)** on the CV platform. Late entries are not considered. Own target: submit by 18:00 Zurich on Wed 4 Nov.
- Submission needs: a **public repo** (open-source licence), a **3-minute demo video** showing only what was built during the hackathon, and a live product.
- Judging: stage 1 pass or fail (fits a problem statement, reasonably uses the Meta Model API or Meta open weights), then four equal criteria scored 0 to 10: **Impact, Use of Meta AI tooling, Technical depth and execution, Demo**. Top 5 per track judged live on 9 Nov.
- Bonus prizes worth aiming at: Most Viral (X engagement up to 8 Nov), Community Vote, Best Agentic Use-Case, Best Build on Meta Open Weight Models.
- Meta stack: Muse Spark via the Meta Model API (language, tool use), Muse Voice Transcribe (voice input), Muse Code (coding agent), optional Muse Spark Open on Baseten (`meta-models/muse-spark-open-1026`). $150 Meta API credits per participant, claim by the deadline; a card must be on the account, set a spend limit.

## Rules that shape the work
- **New work only, clearly marked.** The design system and the planning docs existed before the building period. They are in the repo's first commit, tagged `pre-hackathon`; the earlier clickable prototype is not carried over, so all code is new. They are are listed in the README as prior work, and are not presented as hackathon work in the video. Not declaring this can mean disqualification.
- **Stay off the anti-project list.** It names AI mental-health advisers, AI coaches and simple chatbots. Hoolala! is pitched as a social product for friends and real plans. In the submission, video and README avoid "lonely", "shy", "social anxiety", "therapy" and "coach"; the model never gives emotional or health advice; small talk missions are a pre-written game, not AI guidance.
- **Use of Meta AI tooling is a quarter of the score.** The model must do visible, meaningful work, not one rewrite button. See the model plan below.
- Only assets we have rights to: our own code and copy, OFL fonts with their licence, no third-party images.

## The product: Hoolala!
- Signature: **Hoolala!** *You never know until you go.* ("Less screen. More life." is retired.) Positioning line for Go App-Free, the pitch and the README: **Your data. Your choice. Your attention.**
- An anti-social-media social network. Not anti-social, not anti-technology, not a digital wellness coach. A tiny private circle, finite by design, whose best screen is the one that sends you outside.
- v3.2 in one line: Opal helps people manage distractions; Hoolala! helps people navigate possibilities. The person defines what meaningful technology use is; Hoolala! never moralises screen time.
- Voice: witty, observational, never preachy. Formula: what we say / what actually happens ("We live five minutes apart." / It's been six months.).
- Look: Nokia 3210-era green monochrome LCD, Silkscreen and Space Mono. Source of truth: `docs/DESIGN.md` (and the Hoolala! design system in Claude).

### Features in the hackathon build
- **Home:** one rotating two-line observation per visit, then ANYTHING NEW? and GO APP-FREE, a short menu and a one-question chat.
- **Go App-Free (v3.2):** a seven-stage Muse Spark conversation ("Hello, human." > what you want more of > what makes digital time worthwhile > where to look > what to filter > how often > "Your world, according to you.") then Telegram linking and a first briefing. Back, skip and edit everywhere; scripted fallback.
- **Personal Compass (v3.2):** "What you're curious about right now": intentions, interests, filters, sources, delivery, welcome actions. Built only from what the person said; edits in plain language ("Only send me opportunities near Lausanne") are proposed, confirmed, listed and undoable. Never a score.
- **Sources:** friends on Hoolala! plus Muse Spark web search (FIND IT). RSS feeds and shared links are cut from the hackathon build. LinkedIn and Instagram are "links you share only" because their platform rules forbid feed reading and digests.
- **Briefings (v3.2):** finite (default cap 3), friends' items first in their own words, each item with a reason tied to a compass line and a source link, one action at the end (often ASK A FRIEND), one-tap feedback that becomes a visible compass change. In the web app or Telegram, on demand or on the person's schedule, inside quiet hours.
- **Catch me up (Anything new?):** friends' notes and signals wait until asked; three at a time, ASK FOR MORE only on request, then "That's everything. We could show you more, but we'd have to make it up."
- **Little Signals:** a temporary mood or availability hint ("Coffee wouldn't hurt.", "Social battery: 12%.") for the circle, chosen friends or private; expires (4 hours default), editable, cancellable, enforced on the server. Not an online status.
- **Anyone around?:** availability signals friends explicitly shared with you, plus "So... Thursday?" to suggest a plan or leave a note. Never mood signals, location or behaviour; nothing sent without approval.
- **Leave a note:** quick personal notes (edit, delete) or an invitation out.
- **Invite them out:** pick an activity, when, where, who, one line, review, send. Answers: I'M IN / NOT THIS TIME. Open invitations also appear in briefings (this replaces Find a plan).
- **Meet IRL:** mutual QR, both agree, +1 private moment, counted on the Live page.
- **Go live:** the screen "switches to full resolution" (real life), goes dark: HOOLALA! IS OFF. YOU'RE ON.

### Cut from the hackathon build (26 Oct, to make room for v3.2)
Small talk missions, Sounds familiar? persistence, sharing and discovery, Find a plan as a separate flow, Unplug, Outside Picks, NFC, voice input, Muse Spark Open. Their designs stay in the design system, marked ROADMAP; none are built or shown in the demo. They return to the roadmap after 4 Nov.

### How Muse Spark is used: by function (see `docs/MUSE-SPARK-BY-FUNCTION.md`, which wins on model use)
Hoolala! turns "we should catch up" into "we did". Each step shows one Muse Spark capability, behind a code guardrail and with a model-off fallback:
1. **TELL IT:** onboarding conversation builds the Personal Compass (conversation state, structured output).
2. **SAY IT:** a Telegram voice note becomes an intent (native audio; audio never stored).
3. **SNAP IT:** a poster or chalkboard photo becomes an event draft (vision; image never stored).
4. **FIND IT:** a finite briefing of friends' items plus cited things happening nearby (built-in web search with citations, grounding validator).
5. **PLAN IT:** the agent combines shared availability, finds and the compass into one draft invitation (parallel tool calling; sending needs your tap).
6. **CHECK IT:** SHOW THE WORKINGS on every AI answer, plus an evaluation set with a published pass rate.
Then the model steps out on purpose: **MEET IT** (mutual QR, Live counter) and **GO LIVE**. Reasoning effort is tuned per function. Muse Code builds it (commit trailer `Agent: Muse Code`). Not used: Muse Image, Muse Wonder, Muse Spark Open; Muse Voice Transcribe only as a fallback.

### Development priorities
1. Private accounts and trusted circles. 2. Conversational mailbox. 3. Little Signals with audience controls and expiry. 4. Social opportunities and voluntary invitations. 5. Sounds familiar? creation and sharing. 6. QR real-world acknowledgements. 7. Offline rewards. 8. Optional Outside Picks.
For the hackathon build (26 Oct): accounts and circle, invitations, Little Signals, then Go App-Free (onboarding, compass, sources, briefings, Telegram), then QR, Live and share card. Small talk missions and Sounds familiar? move to after 4 Nov.

### Success metrics
Friend connections made, invitations accepted, plans made and (when reported) completed, share of users who find catch-ups useful, ease of starting an interaction, whether signals make plans easier, self-reported connection. Never session length or notification opens.
v3.2 adds: onboarding completed without friction, self-rated compass accuracy, confidence editing preferences, sources and Telegram connected, first-briefing usefulness, actions taken from briefings. Never "screen time reduced".

### Hackathon goal (updated 26 Oct for v3.2)
By 4 Nov, real people can:
1. **Sign in** with an email magic link on a public URL.
2. **Go App-Free:** finish the onboarding conversation, approve their Personal Compass, add a feed or a shared link, and link Telegram.
3. **Get a finite briefing** in the web app or Telegram: friends' notes, signals and invitations plus their own sources, each with a reason and a link, ending on one action. Give feedback that visibly changes the compass.
4. **Exchange:** add friends, send notes and invitations (agent drafts, person confirms), answer I'M IN.
5. **Count real life:** a public Live page shows one collective number of interactions confirmed by both people.
6. **Share:** a pixel LCD share card. Post the demo on X for Most Viral.

### Demo video (3 minutes)
"Hello, human." onboarding with one agent follow-up; "Your world, according to you."; Telegram link; a briefing with a friend's signal and a feed item, each with a reason; "Stop showing me this topic" with confirm and undo; ASK A FRIEND becomes an invitation and the friend says I'M IN; two phones do the QR; the Live number ticks up; share card; Go live. One plain line that the visual design and a mock-up pre-date the event; credits for Muse Spark and Muse Code.

## Design principles (non-negotiable)
- No feed, no likes, no follower counts, no streaks, no leaderboards, no guilt. The only public number is collective.
- Pull, not push. Private by default. Confirm every outbound action. Never show SENT before the server confirms.
- Not an AI companion and not an adviser: the chat answers one question with one action and gets out of the way. AI suggests, people decide; nothing AI-written is published automatically.
- Honest claims: a QR tap means both people were together and agreed, not that a conversation was "verified". A web app cannot track screen time or switch a phone off.
- Safety: 18+, block and report, delete account, simple public everyday plans, respect "no". Crisis words trigger a fixed help message (Switzerland 143, 147 for under 25s; UK Samaritans 116 123; 112). The model never improvises this.
- Privacy: no contacts, location or usage data without explicit purpose. The compass holds only what the person said or chose; no hidden behavioural profiling, no personality labels, no dwell time or opens treated as interest. Feed items are purged after 14 days.
- No screen-time moralising: never years lost, time wasted, productivity goals or comparisons. Limits are the person's own and easy to change or switch off.

## Tech
- One rule still holds: code for rules, data for content, the model for language.
- Cloudflare Worker (TypeScript) serving the Mono LCD front end and a JSON API, D1, KV for sessions and rate limits, Cron Triggers for clean-up. Share card images as SVG to PNG with `@resvg/resvg-wasm`.
- Email magic link via an email API (Resend or similar). Session cookie: HttpOnly, Secure, SameSite=Lax.
- Muse Spark behind `src/llm/`. Endpoint and model id from env.
- Telegram Bot API through `src/channels/telegram.ts` (webhook on the Worker, single-use link tokens). External finds come from Muse Spark's built-in web search, cached for an hour.
- Front end: built from scratch during the hackathon from the Mono LCD design system (`prior-work/design-system/`), talking to the API.
- Full task list: `docs/BUILD-PLAN.md`. Agent rules: `AGENTS.md`.

## Business model (to revisit after the hackathon)
- Earlier idea: B2B finite programmes for employers, universities and relocation services. Not needed for the demo, and not part of the Indie Developer pitch.

## Open questions
- Can code start after Monday's kickoff, or only from Tue 27 Oct? Default: setup only on Monday. Ask in #questions.
- Do hackathon keys work from Switzerland (the Muse Spark preview was described as US only)? Which features are on our key: audio, image, web_search, structured output, parallel tools, conversation state?
- Meta Model API base URL, auth and model ids (Muse Spark, Muse Voice Transcribe), rate limits; credit claim link.
- Confirm a declared pre-hackathon design system is acceptable.
- Domain name and email sender for magic links. Trademark check on "Hoolala!".

## Style
- UK English, no em dashes, in all user-facing text and docs.
