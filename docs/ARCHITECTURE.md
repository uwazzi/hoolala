# Architecture

The stack at a glance (28 Oct 2026). `AGENTS.md` holds the folder-level rules; this page is the map above them. Product: `docs/SIGNALS-HERE.md`. Model use: `docs/MUSE-SPARK-BY-FUNCTION.md`.

**One principle: code for rules, data for content, the model for language.** Everything that decides who sees what, who can do what and what gets counted is plain code over D1. Muse Spark only reads, drafts, screens and translates, and the app keeps working when it is off.

## The stack

```
┌──────────────────────────────────────────────────────────────────────┐
│ CHANNELS                                                             │
│   Web app (PWA): Vite + Preact, Mono LCD design system               │
│     ├─ in any browser, signed in with an email magic link            │
│     └─ inside Telegram as the Mini App, signed in with Telegram      │
│   Telegram bot: login check and 3 opt-in notifications, nothing else │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │ HTTPS JSON (polling for live)     │ HTTPS webhook
                ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ EDGE: one Cloudflare Worker                                          │
│   Router · static assets · security headers · sessions · same-origin │
│   check · rate limits                                                │
└───────────────┬──────────────────────────────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CORE (no model)                                                      │
│   Rules (pure functions): visibility, anonymity, limits, check-in,   │
│     points, screening code rules, crisis words                       │
│   Data: D1 (relational truth) · KV (sessions, rate limits)           │
│   Cron: expiry, 24 h check-in purge, daily metrics                   │
│   Stretch: one Durable Object per place for live push (SSE)          │
└───────────────┬──────────────────────────────────────────────────────┘
                │ only for the six AI functions
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ AI ADAPTERS                                                          │
│   FIND ME · PLACE IT · SUGGEST IT · SCREEN IT · PLAN IT · CHECK IT   │
│   each: timeout, output validator, rule-based fallback, workings row │
│   Tools: web search, Google Places (live, never stored), our D1 reads│
└───────────────┬──────────────────────────────────────────────────────┘
                ▼
        Meta Model API: Muse Spark  (optional AI Gateway, logging off)
```

## Layers

| Layer | Technology | Lives in | Owns | Never |
|---|---|---|---|---|
| Web app | Vite + Preact PWA, one build for browser and Telegram Mini App | `web/` | Screens, device APIs (location, camera for QR), calling the API | Business rules, secrets, model calls |
| Telegram bot | Bot API webhook | `src/channels/telegram.ts` | Verifying Mini App `initData`, the 3 opt-in notifications | Chat, briefings, messages nobody switched on |
| Edge | Cloudflare Worker (TypeScript) | `src/worker.ts`, `src/api/` | Routing, auth, sessions, permission checks per request | SQL strings, model calls |
| Rules | Pure TypeScript | `src/rules/` | Every decision about visibility, limits, points and screening | I/O of any kind |
| Data | D1, KV, Cron Triggers | `src/db/` | Schema, migrations, repositories | Coordinates in check-ins, prompts, raw FIND ME findings |
| Live (stretch) | Durable Object per place | `src/live/` | Pushing new signals and replies to people checked in there | Being the source of truth (D1 is) |
| AI adapters | Meta Model API through one client | `src/llm/`, `src/places/` | Prompts, tools, schemas, validation, fallbacks, token counts | Deciding permissions, posting, accepting or sending anything |
| Email | Resend HTTP API | `src/channels/email.ts` | The sign-in link | Anything else |

## Three flows

**Check in (no model).** Web app asks for location once → Worker → `rules/checkin` picks places in radius from D1 (plus Google nearby, live) → person picks one → `checkins` row without coordinates. GPS denied: search by name. The model is never on this path.

**Post a signal (model as a checker).** Web app → Worker → `rules/screening` (code rules) → SCREEN IT (verdict, category, reason, translation; 4 s timeout) → saved in D1, or rejected with the reason. Model off or late: the code rules decide alone.

**See what's here (live).** Web app polls `GET /api/here/signals` every few seconds while open; `rules/here` filters every read. Stretch: the place's Durable Object pushes the same events over SSE, so polling becomes the fallback. The API does not change.

## Where data lives

| Data | Where | Kept |
|---|---|---|
| People, places, facts, signals, responses, meet-ups, points, compass lines | D1 | Until deleted; check-ins 24 h, workings 7 days |
| Sessions, rate-limit counters | KV (sessions also in D1) | Until expiry |
| A person's coordinates | Request memory only | Never stored, except as a new place's location |
| Google Places content | Fetched live | Never stored, only the place id |
| Prompts and user text sent to the model | Request memory only | Never stored or logged; `llm_calls` holds counts only |

## Choices and what we left out

- **One Worker.** No microservices; a second Worker only if secret isolation ever needs it.
- **Muse Spark only at runtime.** The hackathon requires Meta's models. Claude and Codex help write code; they are not in the product.
- **No chat memory, no conversational bot.** Every AI function is one bounded call with structured output. Hoolala! has quick replies, not chat.
- **No native app, no Expo.** One PWA covers phones, desktop and Telegram. A native wrapper can come after 4 Nov if the pilot asks for it.
- **AI Gateway is optional.** Use it for caching and spend limits only with logging off; otherwise call Meta directly.
- **Durable Objects only for live places.** Not for memory, sessions or business data.

## Moving from today's code

`public/` holds plain HTML pages from WP1 and WP2. They move to `web/` (Vite + Preact) before more screens are built; the Worker then serves the Vite build from `web/dist`. The API, rules, data and tests stay as they are.
