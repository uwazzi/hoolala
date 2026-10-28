# Pipeline: staging, promotion and the PM agent

## Branches and URLs

| Branch | URL | Deployed by |
|---|---|---|
| `staging` | https://staging.hoolala.hg-labs.io | `deploy-staging.yml` on every push: checks, eval, `npm run deploy:staging`, smoke test |
| `main` | https://hoolala.hg-labs.io | `promote.yml` after your manual accept: merge, checks, eval, `npm run deploy`, smoke test, all in one run |

`deploy-production.yml` is the safety net for direct pushes to `main` (a docs
hotfix merged by PR, a manual merge): checks, eval, deploy, smoke test. It
never double-deploys after a promotion, because GitHub starts no new run from
a `GITHUB_TOKEN` push. It is also runnable by hand for a redeploy.

Both configs set `run_worker_first = true`, so every request (pages and API)
passes through `src/worker.ts` and carries the security headers. Without it the
platform serves `public/` directly and pages ship without a CSP.

Staging has its own D1 (`hoolala-staging`) and KV namespace (bound as `SESSIONS`),
created 28 Oct and bound in `wrangler.staging.toml`. Never point staging at
production data. Apply migrations with `npm run db:migrate:staging`.

Agent and local wrangler access uses a scoped API token (D1, Workers KV and
Workers Scripts: Edit; expires 5 Nov) kept in the macOS keychain, never in a
file. Set `CLOUDFLARE_ACCOUNT_ID` too, or wrangler fails on its account lookup:

```bash
export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s cloudflare-api-token -w)"
export CLOUDFLARE_ACCOUNT_ID=57b4d8690e875e205612a834a83915b4
```

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

## Work package issues

One GitHub issue per work package, seeded from `docs/BUILD-PLAN.md`:

```bash
node scripts/seed-wp-issues.mjs
```

Safe to re-run: it skips titles that already exist, and creates the
`work-package` label if missing. `DRY_RUN=1` prints what it would create.
The PM agent keeps the separate Build status issue (label `pm`) and never
closes or assigns these issues; you do.

## Secrets and variables

The full key inventory, rules and leak response are in `docs/SECRETS.md`.

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
