# Hoolala! project context (Meta hackathon)

Read this first in every chat in this project. Updated 29 Oct 2026: **Signals here is the hackathon hero** (v6.2: onboarding story, get personal, the game, simplified Today; any place, PLACE IT and place points). These docs, and nothing else, define the project:

| Doc | What it decides |
|---|---|
| `docs/CONTEXT.md` (this file) | The summary: event, product, scope, principles |
| `docs/SIGNALS-HERE.md` | The product brief for 4 Nov: check-in, Signals here, safety, metrics, pilot (wins on product scope) |
| `docs/MUSE-SPARK-BY-FUNCTION.md` | How each function uses Muse Spark, and the demo beat sheet (wins on model use) |
| `docs/HACKATHON-RULES.md` | Official rules, dates, submission and judging (wins on anything about the hackathon) |
| `docs/BUILD-PLAN.md` | Schedule, data model, API and work packages |
| `docs/AGENTIC-CODING.md` | Docker Sandbox setup and agentic coding workflow |
| `AGENTS.md` | Rules for every coding agent |
| `docs/DESIGN.md` | Mono LCD design system, voice and product rules |
| `docs/COMPETITOR-REVIEWS.md` | The review research behind the 27 Oct decision |
| `docs/PROJECT-INSTRUCTIONS-v3.2.md` | Go App-Free: the compass ideas now feed Let's get personal; briefings and the rest are after 4 Nov |
| `docs/CHANGELOG.md` | History of decisions |

## The event
- Meta Global AI Developer Hackathon (Cerebral Valley), remote. Building period 27 Oct to 4 Nov 2026. Solo entry by Huguinho (HG-Labs), **Indie Developer track**, problem statement **Build for Your World**.
- Workshops 27, 28 and 30 Oct at 17:00 Zurich. Office hours in Discord #office-hours on weekdays.
- **Deadline: Wed 4 Nov 21:00 ET (Thu 5 Nov 03:00 Zurich)** on the CV platform. Own target: submit by 18:00 Zurich on Wed 4 Nov.
- Submission: a **public repo** (MIT), a **3-minute demo video** of hackathon work only, and a live product.
- Judging: stage 1 pass or fail (problem statement, reasonable use of the Meta Model API or open weights), then four equal criteria 0 to 10: **Impact, Use of Meta AI tooling, Technical depth and execution, Demo**. Top 5 per track judged live on 9 Nov.
- Bonus prizes worth aiming at: Most Viral (X up to 8 Nov), Community Vote, Best Agentic Use-Case.
- Meta stack: Muse Spark via the Meta Model API, Muse Code as the coding agent. $150 API credits, claim by the deadline.

## Rules that shape the work
- **New work only, clearly marked.** The design system and planning docs pre-date the building period, are committed once and tagged `pre-hackathon`, listed as prior work in the README, and not shown in the video as hackathon work. All code is new.
- **Stay off the anti-project list.** Hoolala! is a social product for people who share a place. Copy, video and README avoid "lonely", "shy", "social anxiety", "therapy", "coach" and "dating". The model never gives emotional, health or relationship advice.
- **Use of Meta AI tooling is a quarter of the score.** The model does visible, meaningful work at several steps (see below).
- Only assets we have rights to.

## The product: Hoolala!
- Signature: **Hoolala!** *You never know until you go.* ("Less screen. More life." is retired.)
- An anti-social-media social network: not anti-social, not anti-technology, not a wellness coach. Finite by design; the best screen is the one that sends you to a real conversation.
- Voice: witty, observational, never preachy. What we say / what actually happens: **"We've sat at the same table for six months." / Never spoken.**
- Look: Nokia 3210-era green monochrome LCD, Silkscreen and Space Mono (`docs/DESIGN.md`).

### The hackathon build: Signals here (`docs/SIGNALS-HERE.md`, v6.2)
Works at **any public place**: a café, a bar, a coworking space, a library. No partner or host needed.
0. **Get started:** first open plays a six-beat onboarding story, then **Let's get personal:** three spoken questions about real moments; each answer drafts a **Personal Compass** line, and the compass check shows the sketch with PEOPLE IN YOUR DAYS. Nothing is saved before LOOKS RIGHT. Private: used only for their own topic ideas, their game of tiny tries, and to show signals that fit them first. Then the game (nine tries across SOFT, BRAVE and BOLD) and a simplified Today.
1. **Arrive** (no AI, on purpose): share location, pick the place; not listed, ADD THIS PLACE (saved at that location); GPS wrong, search by name; QR poster optional for partner places. The person's coordinates are discarded after the lookup.
2. **The place (PLACE IT):** hours, menu, spots fetched from Google Maps and the place's website with sources; people confirm or fix them and earn private **place points**.
3. **Peek and discover:** up to 3 open signals from people checked in at the same place, anonymous, translated FR/EN, FITS YOU marked only for you.
4. **Post:** a topic (60 characters), when, where in the place, for how many (1 to 3). SUGGEST IT gives ideas that fit you and the place; SCREEN IT checks every topic, reply and place detail.
5. **Respond and accept:** I'M CURIOUS; the poster accepts or says NOT THIS TIME. First names only after both accept. No free chat, quick replies only.
6. **Plan:** PLAN IT proposes the spot and time; the poster confirms.
7. **Meet:** mutual QR, both agree; the Live page counts it and the **real-world connection rate** rises.
8. **Stay in touch:** both choose it, or nothing happens.
9. **Go live:** HOOLALA! IS OFF. YOU'RE ON.

### How Muse Spark is used (see `docs/MUSE-SPARK-BY-FUNCTION.md`)
- **COMPASS DRAFT:** one structured call per spoken answer drafts a compass line (the question's part, ≤60 characters about what happened, roles only never names); nothing saved before LOOKS RIGHT.
- **PLACE IT:** an agent with parallel tools (Google Maps details live, web search for the menu, our confirmed facts) that returns sourced place facts for people to confirm.
- **SUGGEST IT:** topic ideas from the place, the time and what's on nearby, with web search citations.
- **SCREEN IT:** structured verdicts on every topic and reply (no dating, selling, personal data, harassment), plus FR/EN translation. Code rules first; the model never rewrites silently.
- **PLAN IT:** parallel tool calls propose a meeting spot and time; draft only, the poster confirms.
- **SNAP IT** (stretch): a noticeboard photo becomes a draft signal.
- **CHECK IT:** SHOW THE WORKINGS on every AI answer, an evaluation set with a published pass rate.
- No AI on purpose: ARRIVE, MEET IT, STAY IN TOUCH, GO LIVE. Muse Code builds it (`Agent: Muse Code` trailer).

### Moved to after 4 Nov
Briefings (FIND IT), Telegram bot briefings (the rest of Go App-Free; brief kept in `PROJECT-INSTRUCTIONS-v3.2.md`), SAY IT, small talk missions, Sounds familiar?, Find a plan, Unplug, Outside picks, NFC. The Personal Compass is in the build through Let's get personal (FIND ME removed in v6.2). If time after Sun 1: share card image, SNAP IT for menu boards, friends' Little Signals and Anyone around?, quick notes and invitations.

### Success metrics
**North star: real-world connection rate** (accepted signals that end in a QR-confirmed meet-up). Also: first-attempt check-in success rate, signal-to-response conversion, response-to-accept, stay-in-touch rate, and in the pilot whether people understood signals without help and how comfortable replying felt. Never time in app, opens or "engagement".

### Place points
Private credit for caring for places: add a new place (10, once someone else checks in), add or fix a detail (5, once confirmed), confirm a detail (2). Only while checked in, never for your own, max 30 a day. Never for posting, replying or meeting. No leaderboards, no public totals, no streaks.

### Pilot
One busy Lausanne place, decided by Thu 29 Oct (a coworking space first; a café or a university common room otherwise; no host needed now), 15 to 20 opt-in people, Mon 2 Nov 11:00 to 16:00, after a friends dry run at a café on Sat 31 Oct. Film the demo there, with consent.

### Hackathon goal (27 Oct)
By 4 Nov, at a real café or coworking space: people get a head start from their public footprint, check in on the first try, see place details they can fix, see and post signals, reply and accept anonymously, get a proposed meeting point, meet and confirm with two phones, and the Live page shows the connection rate. Every AI answer can SHOW THE WORKINGS; the eval pass rate is in the README.

### Demo video (3 minutes)
Beat sheet in `MUSE-SPARK-BY-FUNCTION.md`: the coworking table line; the story, three spoken questions and the compass check; share location and check in (with the GPS failure and search by name); the place card with a fixed price; three signals, one translated; SUGGEST IT with a cited idea and a dating line politely refused; I'M CURIOUS, accept, first names, PLAN IT; MEET IT on the terrace and the connection rate; SHOW THE WORKINGS; STAY IN TOUCH; GO LIVE. One plain line that the visual design and a mock-up pre-date the event.

## Design principles (non-negotiable)
- No feed, no likes, no follower counts, no streaks, no leaderboards, no map of people. The only public numbers are collective. Place points are private.
- Finite: 3 signals at a time; every flow ends.
- Anonymous until both accept; first names only; no photos or profiles; no free chat with someone who hasn't accepted.
- Place-level presence only: checked-in people at the same place, for at most 4 hours. The person's coordinates are discarded after finding the place; only places people add are saved. Check-ins deleted after 24 hours.
- Your compass is yours: built only with consent, only about you, every line sourced, never shown to others, never used to match people.
- Not dating, not selling, not recruiting: screened by code and Muse Spark, stated on the poster and the first screen.
- Not an AI companion and not an adviser: AI suggests, screens and drafts; people post, accept and send. Nothing AI-written is published automatically.
- Honest claims: a QR tap means both people met and agreed, not that a conversation was "verified".
- Safety: 18+, block (both ways, everywhere) and report, leave any time, public meeting points inside the place only, rate limits. Crisis words trigger a fixed help message (Switzerland 143, 147 for under 25s; UK Samaritans 116 123; 112). The model never improvises this.

## Tech
- Code for rules, data for content, the model for language.
- Cloudflare Worker (TypeScript) serving the Mono LCD front end and a JSON API, D1, KV, Cron Triggers. Share cards and posters as SVG to PNG with `@resvg/resvg-wasm`.
- Telegram Mini App as the main entry at the place (login verified with HMAC on the server); email magic link on the web. Optional bot notifications only for curious, accepted and quick replies, off by default.
- Muse Spark behind `src/llm/` (`suggest.ts`, `screen.ts`, `agent.ts`, `snap.ts`). Endpoint and model id from env.
- Full task list: `docs/BUILD-PLAN.md`. Agent rules: `AGENTS.md`.

## Open questions
- Which Muse Spark features are on our key from Switzerland (web_search, structured output, parallel tools, image input, prompt caching)?
- Pilot place (by Thu 29 Oct) and the OK to film there.
- Google Maps Platform key with billing (fallback: OpenStreetMap).
- Domain and email sender; trademark check on "Hoolala!".

## Style
- UK English, no em dashes, in all user-facing text and docs.
