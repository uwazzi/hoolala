# Hoolala!: rules for every coding agent

Read this file first, every session. It is the single source of truth for Muse Code, Claude Code or any other agent working in this repo. `CLAUDE.md` points here. Updated 29 Oct 2026 for v6: tiny tries lead; Signals here is the second path (`docs/HANDOFF-v6.md`).

## What we are building

A finite, real-world nudge with a Nokia LCD look. The first screen says GET OUTSIDE. MEET PEOPLE. and offers one tiny try a day on a private 5-step ladder; a private pixel plant gains a coloured leaf for every try. When people share a place, Signals here lets them post small invitations to talk, stay anonymous until both accept, agree a meeting point, and confirm the meet-up with a mutual QR. People get a head start from their public footprint (with their OK) as a private Personal Compass, check in at any public place (café, bar, coworking) by sharing location or adding the place, and keep place details right and earn private place points. A public Live page shows collective numbers, including the real-world connection rate. Muse Spark powers seven functions, each behind a code guardrail: FIND ME (web search about the person, compass draft), PLACE IT (tool-using agent that fetches place details), TRY IT (the next tiny try inside code-set bounds), SUGGEST IT (topic ideas with citations), SCREEN IT (verdicts and FR/EN translation), PLAN IT (drafts the meeting point) and CHECK IT (workings, evaluation set); SNAP IT (menu boards) is a stretch. Check-in, meeting and staying in touch never depend on a model. Architecture at a glance: `docs/ARCHITECTURE.md`. Product: `docs/SIGNALS-HERE.md` and `docs/MUSE-SPARK-BY-FUNCTION.md` (wins on model use). Brand and product rules: `docs/DESIGN.md`. Context: `claude/hoolala-context.md`. Tasks: `docs/BUILD-PLAN.md`. Hackathon rules: `docs/HACKATHON-RULES.md`.

## Hackathon rules agents must respect

- **The repo is public.** Nothing secret, personal or unlicensed is ever committed. Every asset must be ours or under a licence we include (fonts: SIL OFL with its licence file).
- **Prior work stays separate.** `prior-work/` holds the pre-hackathon design system. Never edit it. Build new code in `web/` and `src/`, log any reuse in `docs/DECISIONS.md`.
- **Mark agent commits.** Muse Code commits end with `Agent: Muse Code` (Claude Code: `Agent: Claude Code`).
- **Not a mental-health, coaching or dating product.** The model never gives emotional, health, therapy or relationship advice, never assesses people, and never helps with flirting or dating. Avoid "lonely", "shy", "anxiety", "therapy", "coach" and "dating" in user-facing copy, the README and commit messages (except in screening rules that reject dating content).

## The one architecture rule

**Code for rules, data for content, the model for language.** The stack diagram and the reasons behind it are in `docs/ARCHITECTURE.md`.

| Folder | Owns | Never does |
|---|---|---|
| `src/worker.ts` | Routing, static assets, security headers (CSP allows Telegram's Mini App script) | Business rules |
| `src/api/` | One file per resource: auth, telegram-auth, compass, places (nearby, add, card, facts, points), checkin, here (signals, responses, quick replies, meeting points), block, report, meet, stay-in-touch, tries, plant, crew, live, share, workings | SQL strings (use `src/db/`) or model calls (use `src/llm/`) |
| `src/rules/` | Pure functions: `checkin.ts` (radius, search within the city, optional poster key and code, expiry), `compass.ts` (consent, provenance, banned labels), `places.ts` (fact states, points, caps), `here.ts` (visibility, anonymity, capacity, limits), `screening.ts` (code rules), `grounding.ts` (citations), `tries.ts` (step bounds, validation, leaves, next-step suggestion), confirmation tokens, counter and connection-rate rules, crisis words (`safety.ts`) | I/O of any kind |
| `src/db/` | D1 schema, migrations, small repositories | Leaks SQL elsewhere |
| `src/content/` | The 15-try library (`tries.ts`), data not code | Rules or model calls |
| `src/llm/` | Meta Model API client; `findme.ts` (FIND ME), `place.ts` (PLACE IT, with the Google Places tool in `src/places/google.ts`), `suggest.ts` (SUGGEST IT), `screen.ts` (SCREEN IT), `agent.ts` (PLAN IT), `tryit.ts` (TRY IT), `snap.ts` (SNAP IT, stretch); schemas, validators, fallbacks, reasoning effort per function | Decides permissions, posts, accepts, sends or publishes anything, stores images |
| `src/channels/telegram.ts` | Mini App launch parameters, bot webhook, the three opt-in notifications | Holds business rules or messages anyone who didn't switch notifications on |
| `src/channels/email.ts` | The sign-in link email (Resend) | Sends anything else |
| `src/live/` (stretch) | One Durable Object per place pushing live updates | Holds the source of truth (D1 does) or chat memory |
| `src/share/` | Share cards and place posters (SVG to PNG) | Includes other people's names |
| `evals/` | About 30 evaluation cases and `npm run eval` | Contains real people's data |
| `web/` | The Mono LCD web app: Vite + Preact PWA, also the Telegram Mini App | Holds secrets, business rules or calls the model directly |
| `public/` | Old WP1/WP2 pages, no longer served; deleted once `web/` is live on staging | Gets new screens |
| `prior-work/` | Pre-hackathon design system, read-only | Changes after the `pre-hackathon` tag |

If a task seems to need breaking this table, stop and write the question in `docs/DECISIONS.md`.

## Stack

- Web app: Vite + Preact PWA in `web/`, served by the Worker; the same build runs as the Telegram Mini App. No native app, no Expo.
- Cloudflare Worker (TypeScript), D1, KV (sessions, rate limits, magic-link tokens), Cron Triggers (expire check-ins and signals, purge check-ins after 24 h, roll up daily metrics).
- Telegram Mini App login: verify `initData` with HMAC-SHA256 from the bot token and check `auth_date`; never trust client-side Telegram data. Email magic link on the web (`EMAIL_API_KEY`, `EMAIL_FROM`).
- Meta Model API behind `src/llm/client.ts`: `MUSE_SPARK_MODEL`, `META_API_BASE`, `META_API_KEY` from env.
- Google Places API (New) behind `src/places/google.ts`: `GOOGLE_MAPS_KEY` secret, field masks always set, results never written to D1 except the place id; `PLACES_PROVIDER=google|osm` for the fallback.
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`, all secrets.
- Tests: vitest. `npm test` and `npm run typecheck` must pass before every commit.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run eval          # evaluation set, prints the pass rate
npm run dev           # wrangler dev (API and the built web app), uses .dev.vars
npm run dev:web       # Vite with hot reload, proxies /api to npm run dev
npm run build         # web app into web/dist (deploy runs it)
npm run db:migrate
npm run deploy
```

## Working rules

1. Pick ONE work package from `docs/BUILD-PLAN.md`. Don't touch files owned by another package unless it says so.
2. Types in `src/types.ts` are the contract. Change them only with a note in `docs/DECISIONS.md`.
3. Test first for anything in `src/rules/` and for every API permission check (who can see a signal, when names are revealed, blocked users).
4. Every model call: timeout (4 s for SCREEN IT, 8 s otherwise, 15 s with web search), output validator, rule-based fallback, one `llm_calls` row with no prompt or user text, one `workings` row. Must work with `LLM_ENABLED=false`.
5. Secrets only in `.dev.vars`, `wrangler secret put` and the keychain, as `docs/SECRETS.md` sets out; never in chat, issues, PRs, logs, URLs or `VITE_*` variables. Run `npm run check:secrets` before committing config. Never log emails, topics, replies, Telegram ids, coordinates, names searched by FIND ME or compass lines.
6. Small commits: `WPn: what changed`, plus the agent trailer.
7. UK English in all user-facing text. No em dashes. Copy from `docs/DESIGN.md` and `docs/SIGNALS-HERE.md`.
8. Web layouts are mobile first and responsive, using the shared LCD styles in `web/src/styles.css`. Follow the layout rules in `docs/DESIGN.md`: fluid app container up to 960px, 42ch for prose/forms only, 16/24/32px gutters at base/640/960px. Check 320 to 1440px and 200% zoom. Never cap the entire app at a mobile text measure.

## Product rules agents must not break

- **Check-in never depends on GPS or a model.** Share location first, ADD THIS PLACE when it's missing, search by name when location fails, QR poster and code for partner places. The person's coordinates are used for the nearby lookup and discarded; the only coordinates written are a new place's (from the person who added it). Never in `checkins`, KV, logs or analytics. `checkin_attempts` stores method, ok and reason only. Public places only.
- **FIND ME needs consent and looks up only the person themselves.** At most 3 searches; IS THIS YOU? before anything is used; raw findings never stored; every compass line has a ticked source or "you said"; no personality, health, political, religious or sexuality labels; nothing saved before LOOKS RIGHT. The compass is private: only SUGGEST IT and the viewer's own ordering (FITS YOU) use it; no endpoint returns it to anyone else; never used to match or rank people. We never log in to or scrape any social network.
- **Place facts have provenance.** Google Maps content is fetched live with attribution and never stored (only the place id); web facts are AI / FOUND until a person confirms them; people's edits are screened.
- **Place points are private and can't be farmed.** Only while checked in at that place, never for your own additions, counted on another person's confirmation or 24 h without dispute, max 30 a day. Never for posting, replying or meeting. No leaderboards, public totals, streaks or levels.
- **Visibility through `src/rules/here.ts` only.** A viewer sees a place signal only if both are checked in at that place now, it's open and unexpired, neither blocked the other, and it isn't theirs. Every read path uses it (peek, discover, notifications, PLAN IT tools). Peek shows topics only.
- **Anonymous until both accept.** Before acceptance: "Someone here". After: first names only, between the owner and accepted responders. Never photos, profiles, last names or contact details.
- **Code owns the step and the leaves.** TRY IT drafts words only; `src/rules/tries.ts` validates against the requested step's bounds and the always-on limits; rejected drafts fall back to the library; tries are stored with the code-assigned step. Steps change only through the person's NEXT TIME tap. Leaves are flat, one per try made.
- **The plant and the step are private.** Never shown to others, never on the Live page, never compared. Colour only in the plant.
- **Crew posts are stories, not chat.** Small private crew by invite link (one crew, link expires in 7 days); posts are screened like topics; NICE ONE only; no replies thread, no counts per person, no leaves for posting. No names, faces or photos of strangers.
- **Invites are never auto-sent.** WhatsApp, Messenger or copied link, opened by the person's tap; we never read contacts.
- **No free chat.** Quick replies only (on my way, five minutes late, can't make it, at the spot). (Crew posts follow the crew rule above.)
- **Screening on every topic, reply line and suggestion:** `src/rules/screening.ts` first, then SCREEN IT. The model approves or rejects with a reason; it never rewrites text silently. Rejected text is never shown to anyone else.
- **Suggestions are suggestions.** SUGGEST IT ideas are labelled AI / SUGGESTION, pass grounding (events need a citation returned in that call) and screening, and are never posted without a tap.
- **The agent only drafts.** PLAN IT reads through its tools and drafts a meeting point; confirming needs a confirmation token from a tap; it never returns "sent" or "confirmed".
- **Limits:** 2 open signals per person, 5 I'M CURIOUS per hour, capacity 1 to 3, check-in 4 hours, signals expire at the time plus 30 minutes, on leaving, or after 2 hours.
- **Finite:** 3 signals at a time and a closing line. No feed, map, "people near you", counts per person, likes or leaderboards.
- The Live page counts only both-confirmed meet-ups (`interactions`), once per pair per day, and shows rates as collective numbers. Sample places and sample people are never counted.
- STAY IN TOUCH creates a friendship only when both chose it; a one-sided choice is never revealed.
- Block works both ways, across places, immediately. Report hides the item at once.
- Images for SNAP IT live in memory only and are never stored; vision prompts never describe people.
- 18+ at sign-in; delete account removes the user's data. Crisis words return the fixed help message from `src/rules/safety.ts`, never model text.
- Never: years lost, time wasted, screen-time talk, streaks, comparisons, fear or scarcity copy, forced permissions. The 5-step ladder and the plant are allowed because they are private and the person chooses every step; they must never become public levels, scores or rankings.

## Definition of done (every package)

- `npm test` and `npm run typecheck` pass; works with `LLM_ENABLED=false`.
- Permission tests for every new endpoint (place scoping, anonymity, blocks).
- Nothing in `prior-work/` changed; any reuse logged.
- Plan checklist ticked, decisions logged in `docs/DECISIONS.md`.
