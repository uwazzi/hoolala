# Pipeline: staging, promotion and the PM agent

## Branches and URLs

| Branch | URL | Deployed by |
|---|---|---|
| `staging` | https://staging.hoolala.hg-labs.io | `deploy-staging.yml` on every push: checks, `npm run deploy:staging`, smoke test |
| `main` | https://hoolala.hg-labs.io | `promote.yml` after your manual accept: merge, `npm run deploy`, smoke test |

Both configs set `run_worker_first = true`, so every request (pages and API)
passes through `src/worker.ts` and carries the security headers. Without it the
platform serves `public/` directly and pages ship without a CSP.

Staging has no D1 or KV bindings yet, so anything touching the database fails
there. Before WP2 lands, create its own resources (never share prod data):

```bash
npx wrangler d1 create hoolala-staging -c wrangler.staging.toml
npx wrangler kv namespace create SESSIONS_STAGING
```

then add the bindings to `wrangler.staging.toml` and run `npm run db:migrate:staging`.

## Promoting to production

1. Push to `staging`. The staging workflow deploys and smoke-tests the staging URL.
2. Test on the staging URL yourself.
3. Actions > promote > Run workflow. After its own smoke test passes, the run
   waits at the `acceptance` environment: press Accept to release, or reject
   (or just leave it) to stop.
4. Accepting merges `staging` into `main`, deploys production, and smoke-tests
   the production URL.

One-time setup: repo Settings > Environments > `acceptance`, with yourself as
required reviewer.

## Secrets and variables

| Name | Kind | Used by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | staging and production deploys, PM token report |
| `CLOUDFLARE_ACCOUNT_ID` | secret | deploys, PM token report |
| `D1_DATABASE_ID` | secret | PM token report (production database id) |
| `LLM_TOKEN_BUDGET` | variable | PM budget warnings (optional; see below) |

The token needs Workers deploy and D1 read permissions.

## Token consumption

`llm_calls` stores per-call `prompt_tokens` and `completion_tokens` (counts
only, never prompts or user text). Every morning the PM agent reads the totals
from D1 and reports calls, total tokens, 24-hour burn and per-function use in
the Build status issue.

Set the `LLM_TOKEN_BUDGET` variable to get warnings at 50% and 80% spent.
Pick the number from the $150 credit line once Muse Spark pricing per token is
confirmed; until then the report shows use without a budget.
