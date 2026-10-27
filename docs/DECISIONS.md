# Decisions

One line per decision: date, decision, why. Newest at the bottom.

- 2026-10-23: Pivot to Hoolala!, a private, finite social web app with a Mono LCD look. A social product, not a coaching or wellbeing tool.
- 2026-10-23: Email magic link sign-in; the Live counter counts only interactions confirmed by both people; Cloudflare Worker + D1 + KV.
- 2026-10-26: Indie Developer track, "Build for Your World". Public repo, MIT licence.
- 2026-10-26: Go App-Free (v3.2) fully in scope; small talk, Sounds familiar?, Find a plan, Unplug, Outside picks moved to the roadmap.
- 2026-10-26: Muse Spark by function (TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT). Web search replaces RSS and shared links; native audio replaces a separate transcription model; Telegram on demand only.
- 2026-10-26: Live URL `hoolala.hg-labs.io` as a Workers Custom Domain on the existing Cloudflare zone.
- 2026-10-26: Prior work in the repo is the design system and the planning docs only. The earlier clickable prototype is not carried over; the front end is built from scratch during the event.
- 2026-10-26: Coding agents: Claude Code orchestrates and reviews, Codex takes independent work packages, Muse Code takes SNAP IT and evals. Every commit carries an `Agent:` trailer.
- 2026-10-27: Use Docker Sandboxes (`sbx`) to run Muse Code in an isolated repository clone; integrate reviewed work through `staging` before updating `main`.
- 2026-10-27 (WP1): Scaffold built on `staging`. New code in `src/` (`worker.ts`, `types.ts`, `api/health.ts`, `db/migrations/0001_init.sql`), `public/` (home, sign-in, ARRIVE/HERE/MEET/LIVE placeholders), `tests/`, `evals/run.mjs` stub. Reused from `prior-work/design-system/` (read-only, untouched): colour/type/spacing values from `tokens.json` and class patterns from `components/bundle.css`, re-expressed in new `public/styles.css`. The v4/v5 components (PlaceCheckIn, PlaceSignal, CuriousRequest, MeetingPoint, FootprintCheck, PlaceCard) are not in `prior-work/`; their screens are built new.
- 2026-10-27 (WP1): Schema conventions (contract in `src/types.ts`): TEXT ids, ISO 8601 UTC timestamps, 0/1 booleans. `place_contributions.month` stores YYYY-MM for the one-confirm-per-fact-per-month UNIQUE. Runtime bindings are minimal structural interfaces in `src/types.ts`, so typecheck needs no Cloudflare type package.
- 2026-10-27 (WP1): No `frame-ancestors` or `X-Frame-Options` headers: the front end runs inside Telegram's webview as a Mini App and must stay frameable. CSP allows only self plus Telegram's script, Google Fonts, and data: images.
- 2026-10-27 (WP1): Cron runs expire/purge now (signals, check-ins, 7-day workings); `metrics_daily` rollup deferred to WP5/WP6, which own the metric writers. Font licence file (SIL OFL) deferred to the WP9 asset pass; fonts load from Google Fonts.
- 2026-10-27 (WP1): Owner steps before first deploy: `wrangler d1 create hoolala`, `wrangler kv namespace create SESSIONS`, paste ids into `wrangler.toml`, `wrangler secret put` for bot/email/Model/Maps keys; create the missing `pre-hackathon` tag (not found locally or on origin).
- 2026-10-27 (pipeline): Staging probed live: content served but pages missed the CSP, because Static Assets serve `public/` without running the worker. Fixed with `run_worker_first = true` in both wrangler configs; needs a staging redeploy. Staging stays without D1/KV until its own resources exist (never share prod data).
- 2026-10-27 (pipeline): `staging` branch auto-deploys to staging.hoolala.hg-labs.io; `promote.yml` smoke-tests staging, waits on the `acceptance` environment for a manual Accept, then merges to `main` and deploys hoolala.hg-labs.io. Owner setup: `acceptance` environment reviewer plus CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID secrets (see docs/PIPELINE.md).
- 2026-10-27 (pipeline): `llm_calls` gains `prompt_tokens` and `completion_tokens` (migration 0002, types updated); the PM agent reports totals, 24 h burn and per-function use from D1, with 50/80% warnings once LLM_TOKEN_BUDGET is set from confirmed pricing. Every `src/llm/` writer must fill the token columns.
- 2026-10-27 (WP1): Skeleton verified without a deploy: `npm test` 14/14, `npm run typecheck` clean, bundled worker serves `/api/health` and all six pages with the Telegram CSP in workerd (miniflare dispatchFetch) and against the real `public/`, both migrations apply to SQLite (24 tables), both wrangler configs pass `deploy --dry-run`. Real `npm run deploy` stays owner-gated: `wrangler login`, D1/KV ids, secrets, `pre-hackathon` tag.
- 2026-10-27 (pipeline): Production deploys two ways: `promote.yml` (manual Accept in the `acceptance` environment, then merge plus deploy in one run) and `deploy-production.yml` as a safety net for direct pushes to `main`. No double deploy: GitHub starts no new run from a GITHUB_TOKEN push. Deploy workflows run the eval set before publishing.
- 2026-10-27 (pipeline): One GitHub issue per work package, seeded from BUILD-PLAN.md by `scripts/seed-wp-issues.mjs` (idempotent, creates the `work-package` label); the PM agent keeps the separate Build status issue (creates the `pm` label) and never merges, closes or assigns.

## Open (confirm at kickoff)

- Meta Model API base URL, auth, exact Muse Spark model id, rate limits; credit claim link.
- Do hackathon keys work from Switzerland? Which features are on our key: audio, image, web_search, structured output, parallel tools, conversation state?
- Does Muse Code draw on the $150 credits?
- May code start after kickoff on 26 Oct, or only from 27 Oct?
