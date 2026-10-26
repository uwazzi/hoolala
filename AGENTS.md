# Hoolala!: rules for every coding agent

Read this file first, every session. It is the single source of truth for Muse Code, Claude Code or any other agent working in this repo. `CLAUDE.md` points here. Updated 26 Oct 2026 for the official hackathon rules (`docs/HACKATHON-RULES.md`).

## What we are building

A tiny, private, finite social network with a Nokia LCD look. Friends invite each other out, catch up on at most three items at a time, mark real-life meet-ups with a mutual QR, and can share a card saying they went live. A public Live page shows one collective number of real-life interactions confirmed by both people. Muse Spark powers six functions, each behind a code guardrail: TELL IT (onboarding and Personal Compass), SAY IT (voice notes), SNAP IT (poster photos), FIND IT (finite, grounded briefings with web search), PLAN IT (tool-using agent that only drafts) and CHECK IT (show the workings, evaluation set). Muse Spark listens, looks, searches, ranks and drafts; it never sends anything itself. Product: `docs/PROJECT-INSTRUCTIONS-v3.2.md` and `docs/MUSE-SPARK-BY-FUNCTION.md` (wins on model use). Product and brand: `docs/DESIGN.md`. Context: `docs/CONTEXT.md`. Tasks: `docs/BUILD-PLAN.md`. Hackathon rules: `docs/HACKATHON-RULES.md`.

## Hackathon rules agents must respect

- **The repo is public.** Nothing secret, personal or unlicensed is ever committed. Every asset must be ours or under a licence we include (fonts: SIL OFL with its licence file).
- **Prior work stays separate.** `prior-work/` holds what existed before the building period: the Mono LCD design system (tokens, guidelines, component previews). Never edit it. Build new code in `public/` and `src/` from it, log any reuse in `docs/DECISIONS.md`, so `git diff pre-hackathon..main` shows exactly what was built during the event.
- **Mark agent commits.** Every commit written by Muse Code ends with the trailer `Agent: Muse Code` (Claude Code: `Agent: Claude Code`). The README reports this honestly.
- **Not a mental-health or coaching product.** The model never gives emotional, health, therapy or relationship advice and never assesses personality. Avoid "lonely", "shy", "anxiety", "therapy" and "coach" in user-facing copy, the README and commit messages.

## The one architecture rule

**Code for rules, data for content, the model for language.**

| Folder | Owns | Never does |
|---|---|---|
| `src/worker.ts` | Routing, static assets, security headers | Business rules |
| `src/api/` | One file per resource: auth, circle, notes, signals, onboarding, compass, sources, briefing, delivery, meet, moments, live, share, chat | SQL strings (use `src/db/`) or model calls (use `src/llm/`) |
| `src/rules/` | Pure functions: limits (briefing cap, 3 per catch-up), confirmation tokens, counter rules, signal visibility, compass validator, grounding validator, quiet hours and caps, crisis words | I/O of any kind |
| `src/db/` | D1 schema, migrations, small repositories | Leaks SQL elsewhere |
| `src/llm/` | Meta Model API client; one file per function: `onboarding.ts` (TELL IT), `say.ts` (audio), `snap.ts` (vision), `find.ts` (web search and ranking), `agent.ts` (PLAN IT tools); schemas, validators, fallbacks, reasoning effort per function | Decides permissions, saves compass changes, sends or publishes anything, stores audio or images |
| `src/briefing/` | Candidate gathering (via `src/rules/signals.ts`), search cache, cap, assembling items, `workings` rows | Uses dwell time, opens or hidden weights |
| `evals/` | About 30 evaluation cases and `npm run eval` | Contains real people's data |
| `src/channels/telegram.ts` | Link tokens, webhook, commands, inline buttons, message formatting | Holds business rules or sends to friends without a confirmation |
| `src/share/` | Share card SVG and PNG, share text and URLs | Includes other people's names |
| `public/` | The Mono LCD front end, built during the hackathon from `prior-work/design-system/` | Holds secrets or calls the model directly |
| `prior-work/` | Pre-hackathon design system, read-only | Changes after the `pre-hackathon` tag |

If a task seems to need breaking this table, stop and write the question in `docs/DECISIONS.md`.

## Stack

- Cloudflare Worker (TypeScript), D1, KV (sessions, rate limits, magic-link tokens), Cron Triggers (expire tokens, QR exchanges and signals).
- Email magic link through an email API (`EMAIL_API_KEY`, `EMAIL_FROM`), 15-minute single-use tokens.
- Meta Model API behind `src/llm/client.ts`: Muse Spark (`MUSE_SPARK_MODEL`), base URL and key from env (`META_API_BASE`, `META_API_KEY`).
- Telegram Bot API: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`, all secrets.
- Share cards: SVG template rendered with `@resvg/resvg-wasm`, fonts embedded.
- Tests: vitest. `npm test` and `npm run typecheck` must pass before every commit.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run dev           # wrangler dev, uses .dev.vars
npm run db:migrate    # apply migrations to local D1
npm run deploy
```

## Working rules

1. Pick ONE work package from `docs/BUILD-PLAN.md`. Don't touch files owned by another package unless it says so.
2. Types in `src/types.ts` are the contract. Change them only in WP0 or with a note in `docs/DECISIONS.md`.
3. Test first for anything in `src/rules/` and for every API permission check (a user can only read their own data and notes addressed to them).
4. Every model call: 8 s timeout (15 s for FIND IT with web search), output validator, rule-based fallback, one `llm_calls` row with no prompt or user text. Must work with `LLM_ENABLED=false`.
5. Secrets only in `.dev.vars` and `wrangler secret put`. Never commit them. Never log emails, note text, compass text, Telegram messages or chat ids.
6. Small commits: `WPn: what changed`, plus the agent trailer. Tick the checkbox in the plan when done.
7. UK English in all user-facing text. No em dashes. Copy comes from `docs/DESIGN.md` voice section.

## Product rules agents must not break

- No feed, likes, follower counts, streaks, personal scores or leaderboards. The only public number is the collective Live counter.
- The Live counter counts only interactions confirmed by both people: a mutual QR exchange (both agree within 10 minutes) or an invitation both host and guest marked "We did it". Each pair counts once per day.
- Signals: every read path uses `src/rules/signals.ts` (active, unexpired, not private, viewer in audience, not blocked). Mood signals never feed suggestions, the agent or outreach. No presence or online status anywhere.
- The model never invents friend updates, availability, feelings or events. Summaries pass `src/rules/grounding.ts` (every line cites real note ids) or are replaced by the original notes. Suggestions stay labelled separately from friends' words.
- The agent may only read through its tools and create drafts. It never returns "sent"; sending needs a confirmation token from a separate user gesture, and never returns "sent" before the D1 write succeeds.
- Personal Compass: items come only from what the person said or chose, checked by `src/rules/compass.ts`. No personality, health or psychological labels, no screen-time or productivity framing. Every change (onboarding, plain-language edit, feedback) is proposed, confirmed, logged in `compass_changes` and undoable.
- Briefings (FIND IT): at most the person's cap; friends' items first and in their own words; every model line tied by `src/rules/grounding.ts` to a real candidate id or a citation URL returned in that same call, plus a compass id; web finds show a link and a short summary, never the page; at most 2 web searches per briefing; one action at most; closing line at the end.
- SAY IT and SNAP IT: audio and images live in memory only and are never written to D1, KV, R2 or logs; the transcript or extracted details are shown before anything happens; vision prompts never describe people or faces.
- Every AI answer writes a `workings` row (tool names, citations, grounded counts, no personal text) for SHOW THE WORKINGS.
- LinkedIn and Instagram are "links you share only". Never scrape, log in to, or imply account access to them.
- Delivery: on demand only in the hackathon build; pause and unlink always work from both web and Telegram.
- Never: years lost, time wasted, screen-time estimates, productivity goals, streaks, comparisons, fear or scarcity copy, forced permissions.
- Catch-up returns at most 3 items per batch and ends with a closing screen.
- Share cards and share text never include the other person's name, email or exact place.
- Never auto-publish AI text.
- 18+ at sign-up, block and report on any person, delete account removes the user's data (compass, sources, briefings, Telegram link included). Crisis words, on web or Telegram, return the fixed help message from `src/rules/safety.ts`, never model text.

## Definition of done (every package)

- `npm test` and `npm run typecheck` pass; works with `LLM_ENABLED=false`.
- Permission tests for every new endpoint.
- Nothing in `prior-work/` changed; any reuse logged.
- Plan checklist ticked, decisions logged in `docs/DECISIONS.md`.
