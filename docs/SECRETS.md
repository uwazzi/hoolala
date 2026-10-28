# Secrets and API keys

How every key for Hoolala! is kept, who may use it and what to do if one leaks. Updated 28 Oct 2026. The repo is **public**: anything committed, pasted into an issue or a PR, or printed in a CI log is published.

## The rules

1. **A key never leaves its store.** Keys live in exactly three places: Cloudflare Worker secrets (the running app), GitHub Actions secrets (CI and deploys) and the macOS keychain (people and agents on this Mac). Never in the repo, an issue, a PR, a chat with an agent, a log, a screenshot or a URL.
2. **No key in a link.** Never put a key in a query string, a webhook URL or a shared link; send it in a header. Links get logged, cached and shared.
3. **Nothing secret reaches the web app.** Vite bundles every `VITE_*` variable into public JavaScript. `web/` reads no secrets and never calls a provider directly; the Worker does, server side.
4. **Least privilege, short life.** Each key gets only the permissions its job needs, one key per environment (staging and production never share), and an expiry where the provider allows it.
5. **Agents read keys at the moment of use and never print them.** They pipe the value from the keychain into the command that needs it (`wrangler secret put`, `curl -H`), never echo it, never write it to a file.
6. **If in doubt, rotate.** Revoking and making a new key takes two minutes; a leaked key can cost the $150 credit or the account.

## Inventory

| Key | Lives in | Used by | Scope | Expires or reviewed |
|---|---|---|---|---|
| `EMAIL_API_KEY` (Resend) | Worker secret, separately for staging and production | `src/channels/email.ts` | **Sending only**, restricted to `mail.hoolala.hg-labs.io` | Rotate after the pilot |
| Resend setup key | Keychain `resend-api-key` | Agent, during Resend setup only | Full access | **Delete at resend.com/api-keys once setup is done** |
| `EMAIL_FROM` | Worker secret | `src/channels/email.ts` | Not secret; kept with the key so they change together | |
| `META_API_KEY` | Worker secret | `src/llm/client.ts` | Meta Model API, with a $150 spend-limit alert | After 4 Nov |
| `GOOGLE_MAPS_KEY` | Worker secret | `src/places/google.ts` | Places API (New) only, budget alert | After 4 Nov |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Worker secrets | `src/channels/telegram.ts` | One bot | Revoke with @BotFather if exposed |
| `CLOUDFLARE_API_TOKEN` (CI) | GitHub Actions secret | Deploy workflows, PM report | Workers deploy, D1 read | Reviewed 4 Nov |
| Cloudflare agent token `hoolala-agent` | Keychain `cloudflare-api-token` | Agents and local wrangler | D1, Workers KV, Workers Scripts: Edit. **No DNS, no zone settings** | **5 Nov** |
| GitHub login for agents | `~/.gh-hoolala` (token in the keychain) | `gh` for issues and PRs | `repo`, `read:org`, `gist` | Revoke at github.com/settings/applications after 4 Nov |

**Not secret, fine in the public repo:** the Cloudflare account id, D1 database ids, KV namespace ids, domain names, `LLM_ENABLED`, `PLACES_PROVIDER`. They identify resources; they grant nothing without a token.

## How to add or change a key

**The app (Worker secrets).** From your Terminal, never from a file:

```bash
npx wrangler secret put EMAIL_API_KEY                          # production
npx wrangler secret put EMAIL_API_KEY -c wrangler.staging.toml # staging
```

Wrangler asks for the value without echoing it. Check which names are set (values are never shown) with `npx wrangler secret list`.

**Local development.** Copy `.dev.vars.example` to `.dev.vars` (git-ignored) and use test keys. Without `EMAIL_API_KEY` on localhost the sign-in link is printed to the dev console, so you rarely need a real one.

**Keys an agent may use.** Store them in the keychain, which asks for the value without echoing it:

```bash
security add-generic-password -a hoolala -s <name> -w
```

Then tell the agent the name, never the value. The agent runs, for example:

```bash
export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s cloudflare-api-token -w)"
export CLOUDFLARE_ACCOUNT_ID=57b4d8690e875e205612a834a83915b4
```

Delete an entry with `security delete-generic-password -s <name>`.

**CI.** Repo Settings > Secrets and variables > Actions. Workflows read `${{ secrets.NAME }}`; never `echo` one, and never pass one on a command line that a step prints.

## What protects us

- **GitHub secret scanning and push protection** are on for this repo (checked 28 Oct): a push containing a known key format is blocked before it lands.
- **`npm run check:secrets`** (`scripts/check-secrets.mjs`) scans every tracked file for key patterns (Resend, GitHub, Google, Telegram, Meta-style `sk-`, private keys, `KEY=value` assignments) and runs in CI on every push and PR. Run it before committing anything that touches config.
- `.dev.vars`, `.env*` and `.claude/settings.local.json` are git-ignored.
- The full history (66 commits) was scanned on 28 Oct: no key found.
- The app never logs emails, tokens, links or provider responses (`AGENTS.md`, working rule 5).

## If a key leaks

Order matters: **revoke first**, then replace, then clean up. Deleting the commit or the comment is not enough, because the repo is public and may already be cloned, cached or indexed.

1. **Revoke** the key at the provider: resend.com/api-keys, dash.cloudflare.com/profile/api-tokens, the Meta developer dashboard, the Google Cloud credentials page, @BotFather `/revoke`, github.com/settings/applications.
2. **Create a new key** with the same narrow scope and put it where the old one lived (`wrangler secret put`, the Actions secret, or the keychain).
3. **Redeploy** if it was a Worker secret: `npm run deploy` or push to `staging`.
4. **Clean up** the place it leaked: edit or delete the comment, issue or log; if it was committed, rotating is the fix, and history rewriting is optional.
5. **Check usage and spend** on the provider dashboard for the time it was exposed, and log what happened in `docs/DECISIONS.md` (never the key itself).
