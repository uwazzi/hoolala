# Hoolala! build plan (26 Oct to 4 Nov 2026)

Product: `docs/PROJECT-INSTRUCTIONS-v3.2.md` (Go App-Free) and `docs/MUSE-SPARK-BY-FUNCTION.md` (how each function uses Muse Spark; this wins on model use). Hackathon rules and judging: `docs/HACKATHON-RULES.md`.

**Goal for the submission.** Hoolala! turns "we should catch up" into "we did". Each step shows one Muse Spark capability: TELL IT (conversation and structured output), SAY IT (native audio), SNAP IT (vision), FIND IT (web search with citations), PLAN IT (parallel tool calling behind a confirmation), CHECK IT (show the workings and an evaluation set). Then the model steps out: MEET IT (mutual QR, Live counter) and GO LIVE.

Decisions (23 Oct): email magic link sign-in; the Live counter counts both-confirmed interactions only; Cloudflare Worker + D1 + KV; Muse Spark with a rule-based fallback.
Decisions (26 Oct, official guide): Indie Developer track, Build for Your World; public repo, MIT licence; prior work committed once and tagged `pre-hackathon`; code starts after kickoff; pitched as a social and attention product, never mental-health or coaching AI.
Decisions (26 Oct, Muse Spark by function): RSS and shared-link sources replaced by Muse Spark web search with citations; Muse Voice Transcribe replaced by Muse Spark native audio (Transcribe only as fallback); scheduled Telegram delivery cut (on demand only); new WP13 SNAP IT and WP14 CHECK IT; onboarding five stages.
Decisions (26 Oct, v3.2 in full): Go App-Free onboarding, Personal Compass, sources and Telegram briefings are in scope. LinkedIn and Instagram are "links you share only" (their platform rules forbid feed reading and digests). To make room, small talk missions, Sounds familiar? persistence and discovery, Find a plan as a separate flow, Unplug, Outside Picks, NFC and voice are cut from the build (see Cuts).

## Before kickoff (owner, Mon 26 before 17:00 Zurich)

- [ ] Cloudflare account with Workers, D1 and KV enabled.
- [ ] A domain (or the free `*.workers.dev` address).
- [ ] Email API account (Resend or similar), sender domain verified. Magic links fail without this.
- [ ] Telegram bot from @BotFather: name, username, token (into `wrangler secret`, never the repo). Bot description in Hoolala! voice.
- [ ] Join the hackathon Discord, post in #intros, watch #announcements.
- [ ] Meta Model API account with a card on file and a $150 spend-limit alert; claim the $150 credits when the link appears (deadline Wed 4 Nov 21:00 ET).
- [ ] 5 to 15 pilot testers for Sat 31 Oct, ideally in friend pairs, each with Telegram and one or two feeds they actually read.

## Schedule (Zurich)

| Day | Work packages | Event (Zurich) | End-of-day check |
|---|---|---|---|
| Mon 26 | WP0 kickoff and setup, no product code | Kickoff 17:00 | Repo public with the `pre-hackathon` tag; one Muse Spark test call works; bot token stored |
| Tue 27 | WP1 skeleton and deploy, WP2 sign-in | Agents 101, 17:00 | Live URL; you can sign in from your phone |
| Wed 28 | WP3 circle, WP4 notes and invitations | Agents 102, 17:00 | Two accounts are friends and one invitation is answered I'M IN |
| Thu 29 | WP4c Little Signals, WP10 onboarding agent and Personal Compass | Office hours 15:00 | A new account finishes onboarding and sees "Your world, according to you." |
| Fri 30 | WP11 FIND IT: briefing with web search and grounding | Fireworks 17:00 (optional) | A briefing mixes a friend's signal with one cited event near Lausanne, each with a reason; grounding rejects an invented line |
| Sat 31 | WP12 Telegram with SAY IT and PLAN IT; pilot starts | | A voice note "coffee Thursday?" ends at SEND THIS TO SOPHIE?; compass edit with confirm and UNDO works in Telegram |
| Sun 1 | WP13 SNAP IT (morning); WP5 meet IRL, WP6 Live page, WP7 share card (slim) | | A poster photo becomes a draft invitation; two phones confirm a meet-up; the Live number goes up |
| Mon 2 (morning) | WP14 CHECK IT: workings panel and evaluation set | | Evaluation pass rate printed; SHOW THE WORKINGS opens on every AI answer |
| Mon 2 (afternoon) | Pilot fixes, safety pass, polish, draft the X post | Office hours 16:00 | Checklist in WP9 is green |
| Tue 3 | Code freeze 18:00, record the 3-minute video | Last day for submission questions | Video draft watched once by someone else |
| Wed 4 | WP9 submit by 18:00, post on X | Official deadline Thu 5 Nov 03:00 | Submitted; repo and video open while signed out |

## Cuts and order of cutting

Cut from the build to make room for v3.2 (their designs stay in the design system, marked ROADMAP; none are built or shown in the demo): small talk missions, Sounds familiar? persistence, sharing and discovery, Find a plan as its own flow (open invitations appear in the briefing instead), Unplug, Outside Picks, NFC, voice input, Muse Spark Open on Baseten.

Also cut on 26 Oct (Muse Spark by function): RSS feed fetcher, shared-link sources, scheduled Telegram delivery, a separate transcription model.

If still late, cut in this order: share card image (keep share text and link), Live page animation, WP4c chosen-friends audience (keep circle and private), SNAP IT in Telegram (keep it in the web app).

Never cut: sign-in, circle, invitations with confirmation, Little Signals with server-side audience and expiry, TELL IT with fallback, Personal Compass with confirm and undo, FIND IT with grounding and a cap, PLAN IT behind the confirmation token, SAY IT, SHOW THE WORKINGS, the evaluation set, Telegram on demand, mutual QR and the Live counter, safety basics, the prior-work declaration.

## Data model (D1)

| Table | Key fields |
|---|---|
| `users` | id, email (unique), display_name, is_adult (bool), created_at, deleted_at |
| `sessions` | id, user_id, expires_at (also cached in KV) |
| `login_tokens` | token_hash, email, expires_at, used_at |
| `friendships` | user_a, user_b, created_at, status (active, blocked) |
| `invite_links` | code, owner_id, expires_at, max_uses, uses |
| `notes` | id, author_id, kind (invitation, reply, quick), activity, day, time, place, text, status (draft, sent), drafted_by (person, agent), created_at, edited_at, deleted_at |
| `note_recipients` | note_id, user_id, read_at, answer (in, not_this_time, null), answered_at |
| `signals` | id, owner_id, type, custom_text, kind (availability, mood), audience_mode (circle, chosen, private), created_at, expires_at, state (active, cancelled) |
| `signal_audience` | signal_id, user_id |
| `onboarding_sessions` | id, user_id, stage (1 to 7), answers_json (the person's own answers only), completed_at |
| `compass_items` | id, user_id, part (intention, interest, filter, action), text, why (optional, only if the person gave it), origin (onboarding, edit, feedback), active, created_at |
| `compass_changes` | id, user_id, item_id, change (add, edit, remove), before, after, source_text (the person's words), confirmed_at, undone_at |
| `delivery_prefs` | user_id, channel (web, telegram), cap_items (default 3), quiet_start, quiet_end, timezone, home_area (optional, e.g. "Lausanne", only if the person gave it) |
| `search_cache` | compass_hash, query, results_json (title, url, snippet, date), created_at; expires after 1 hour; no user id |
| `briefings` | id, user_id, channel, created_at, item_count |
| `briefing_items` | briefing_id, kind (note, signal, invitation, web_find), ref_id, citation_url (web_find only), reason_compass_item_id, summary, feedback (more, not_useful, less_topic, null) |
| `workings` | id, user_id, response_kind (tell, say, snap, find, plan), tools_json (tool names and ids only), citations_json, grounded_count, total_count, reasoning_effort, created_at; purged after 7 days |
| `telegram_links` | user_id, chat_id, linked_at; `telegram_link_tokens` token_hash, user_id, expires_at, used_at |
| `meet_exchanges` | id, initiator_id, token_hash, expires_at, joiner_id, initiator_agreed_at, joiner_agreed_at |
| `interactions` | id, kind (meet, invitation), user_a, user_b, day, confirmed_at, UNIQUE(kind, user_a, user_b, day) |
| `moments` | id, user_id, interaction_id, label (private) |
| `llm_calls` | id, user_id, purpose (tell, compass_edit, say, snap, find, plan, eval), model, latency_ms, tool_calls, validated, fallback_used, created_at. No prompt or user text. |
| `reports` | id, reporter_id, target_user_id, reason, created_at |

`interactions` is the only table behind the public number. Nothing stores dwell time, opens or scroll behaviour.

## API (JSON, session cookie unless noted)

Auth and circle: `POST /api/auth/start` · `GET /auth/verify` · `POST /api/auth/logout` · `GET /api/me` · `DELETE /api/me` · `POST /api/circle/invite-links` · `POST /api/circle/join` · `GET /api/circle` · `POST /api/circle/block` · `POST /api/report`
Notes and signals: `GET /api/mailbox?batch=n` · `POST /api/notes` · `PATCH /api/notes/:id` · `DELETE /api/notes/:id` · `POST /api/notes/:id/send {confirmationToken}` · `POST /api/notes/:id/answer` · `POST /api/notes/:id/done` · `POST /api/signals` · `PATCH /api/signals/:id` · `POST /api/signals/:id/cancel` · `GET /api/around`
Onboarding and compass: `POST /api/onboarding/start` · `POST /api/onboarding/turn {stage, text?, choices?}` (agent reply plus the next stage) · `POST /api/onboarding/back` · `POST /api/onboarding/finish` · `GET /api/compass` · `POST /api/compass/propose {text}` (plain language in, proposed change out, nothing saved) · `POST /api/compass/changes {proposal, confirmationToken}` · `POST /api/compass/changes/:id/undo` · `GET /api/compass/changes`
Find, say, snap, plan: `GET /api/briefing` (FIND IT, on demand, capped) · `POST /api/briefing/items/:id/feedback` · `PUT /api/delivery` · `POST /api/say` (audio in, intent out, audio never stored) · `POST /api/snap` (image in, event draft out, image never stored) · `POST /api/chat {text}` (PLAN IT; returns a reply and at most one draft) · `GET /api/workings/:id` (SHOW THE WORKINGS)
Telegram: `POST /api/telegram/link-token` (returns a `t.me/<bot>?start=<token>` link, 10 minutes, single use) · `POST /telegram/webhook` (secret header checked)
Meet and Live: `POST /api/meet/start` · `POST /api/meet/join` · `POST /api/meet/:id/agree` · `GET /api/live` (public) · `GET /share/card/:interactionId.png` · `GET /s/:shareId`

## Work packages

### WP0 Kickoff and setup (owner, Mon 26)
- [ ] Watch the kickoff (17:00 Zurich). Write in `docs/DECISIONS.md`: Meta Model API base URL, auth, Muse Spark model id, tool-calling format, rate limits, anything new on rules or judging.
- [ ] Ask in #questions: may code start after kickoff on 26 Oct; is a declared pre-hackathon design system acceptable (assumed yes).
- [x] Public repo with MIT `LICENSE`. Commit 1 `Pre-hackathon work (before the building period)`: `prior-work/design-system/` and `PRIOR-WORK.md`. Tag `pre-hackathon`. No prototype code is carried over.
- [ ] Commit 2: `AGENTS.md`, `CLAUDE.md`, `docs/` (DESIGN, BUILD-PLAN, DECISIONS, HACKATHON-RULES, PROJECT-INSTRUCTIONS-v3.2, MUSE-SPARK-BY-FUNCTION), `src/types.ts`, README stub with "Built during the hackathon".
- [ ] One Muse Spark test call with a tool definition, so stage 1 is never at risk.

### WP1 Skeleton and deploy (Tue 27, morning)
- [ ] Worker serves `public/` (a new Mono LCD front end built from `prior-work/design-system/` tokens and components: `index.html`, `app.css`, `app.js`) with security headers and a CSP. Home, sign-in and a placeholder for each flow.
- [ ] D1 migrations for every table above; KV bound; Cron Trigger registered (no jobs yet).
- [ ] `npm run deploy` publishes; `/api/health` returns ok.

### WP2 Sign-in with email magic link (Tue 27, afternoon)
- [ ] Email, 18+ checkbox, SEND MY LINK. "Check your email. The link works once, for 15 minutes."
- [ ] Tokens hashed, single use, 15 minutes; rate limits in KV. Session cookie HttpOnly, Secure, SameSite=Lax, 30 days. Display name on first sign-in.
- [ ] Sign out; delete account removes notes, signals, compass, sources, briefings, Telegram link, moments; keeps anonymous counter rows.
- [ ] Tests: expired, reused, wrong tokens; same response whether or not the email exists.

### WP3 Circle (Wed 28, morning)
- [ ] Invite link (7 days, 5 uses) as link and QR; mutual friendship after the joiner confirms. Circle list, block, report.
- [ ] Tests: own circle only; blocked users excluded everywhere.

### WP4 Notes and invitations (Wed 28, afternoon)
- [ ] Mailbox from the API (max 3 per batch), quick notes, invitation compose, review, send with a confirmation token, I'M IN / NOT THIS TIME, edit and delete in MY NOTES.
- [ ] After the date: WE DID IT on both sides writes one `interactions` row.
- [ ] Tests: recipients only; max 3; no "sent" before the write; one interaction per pair per day.

### WP4c Little Signals (Thu 29, morning)
- [ ] Set, edit, cancel; presets or 40 characters; circle, chosen or private; expiry 1 h, 4 h default, 23:00, 09:00.
- [ ] `src/rules/signals.ts` (pure, tested): active, unexpired, not private, viewer in audience, not blocked. Used by mailbox, around, briefing and Telegram.
- [ ] Mood signals never feed suggestions, ranking or the agent. Cron purges expired signals after 24 hours.

### WP10 Go App-Free onboarding and Personal Compass (Thu 29, afternoon)
- [ ] Entry: GO APP-FREE on home and in My moments. Five stages on camera (intentions, what matters, filters, how often, reveal; sources and Telegram link folded into the reveal) in the LCD style: progress cells, BACK, SKIP on optional stages, every answer editable before the reveal.
- [ ] TELL IT agent (`src/llm/onboarding.ts`): Muse Spark runs each stage using Responses API state (`previous_response_id`) and `reasoning_effort: low`, may ask one follow-up per stage, and returns structured output validated against a schema (`{reply, followUp?, compassDraft[]}`); replies 240 characters or fewer in Hoolala! voice. Scripted fallback with the same stages when the model is off or fails validation.
- [ ] Compass draft uses only the person's own answers. A validator rejects any item not traceable to an answer, any personality or health label, and any screen-time or productivity framing.
- [ ] Reveal: "Your world, according to you." plus the compass lines and "Everything else can wait. Sound about right?" LOOKS RIGHT / CHANGE SOMETHING / START AGAIN. Nothing saved until LOOKS RIGHT.
- [ ] Compass screen: YOUR PERSONAL COMPASS, "What you're curious about right now:", edit, remove, CHANGES list with UNDO.
- [ ] Plain-language edits: `/api/compass/propose` turns "Only send me opportunities near Lausanne" into a proposed change shown as before / after; saved only after a confirm; logged in `compass_changes`.
- [ ] Add the new screens to `docs/DESIGN.md` as components: OnboardingStage, CompassReveal, PersonalCompass, BriefingItem, SnapResult, Workings.
- [ ] Tests: nothing saved before confirm; undo restores the previous state; fallback completes all stages; validator rejects untraceable or labelling items.

> Prompt: "Read AGENTS.md, docs/PROJECT-INSTRUCTIONS-v3.2.md sections 5 and 6, and BUILD-PLAN WP10. Build the onboarding endpoints, the Muse Spark stage agent with schema validation and a scripted fallback, the compass tables and the propose/confirm/undo flow, and the LCD screens in public/ using existing classes. Write the validator and undo tests first. Never store anything the person did not say or choose."

### WP11 FIND IT: briefing with Muse Spark web search (Fri 30)
- [ ] Candidates: unread notes and invitations, visible signals (via `src/rules/signals.ts`, availability only for suggestions), plus up to 2 Muse Spark `web_search` calls built from compass interests and the person's `home_area` ("jazz this week near Lausanne"). Results cached for one hour per compass hash in `search_cache`.
- [ ] Muse Spark (`reasoning_effort: medium`, prompt caching on the compass and rules) ranks candidates and returns structured lines `{kind, ref_id or citation_url, compass_item_id, summary, reason}`.
- [ ] `src/rules/grounding.ts` (pure, tests first): every line's `ref_id` is a real candidate id or its `citation_url` was returned by the search in this call; `compass_item_id` exists; friends' text is quoted as written; cap respected; friends first. Failing lines are dropped; if nothing survives, show friends' items newest first.
- [ ] Web finds show title, one-line summary in Hoolala!'s words, date, place and the source link. Never reproduce the page.
- [ ] End screen: at most one action (ASK A FRIEND opens PLAN IT prefilled, SAVE, OPEN), then "That's everything. We could show you more, but we'd have to make it up."
- [ ] Feedback: MORE LIKE THIS / NOT USEFUL / LESS OF THIS TOPIC becomes a proposed compass change with KEEP or UNDO. No hidden weights, no dwell time.
- [ ] Each briefing writes a `workings` row (tools, citations, grounded count).
- [ ] Tests: invented URL rejected; invented friend item rejected; mood signals never ranked; cap; private and expired signals absent; model-off fallback.

> Prompt: "Read AGENTS.md, docs/MUSE-SPARK-BY-FUNCTION.md (FIND IT) and BUILD-PLAN WP11. Write src/rules/grounding.ts with its tests first, then the briefing builder using Muse Spark web_search with structured output, the search cache and the workings row. Only show lines that pass grounding."

### WP12 Telegram with SAY IT and PLAN IT (Sat 31)
- [ ] Link: the onboarding reveal shows a single-use `t.me/<bot>?start=<token>` link (10 minutes). `/start <token>` binds the chat. Webhook checks Telegram's secret header.
- [ ] On demand only: "anything new?" runs FIND IT; "anyone around?" lists shared availability; "stop showing me X" goes through compass propose with inline CONFIRM / CANCEL and UNDO.
- [ ] **SAY IT:** a voice note is downloaded from Telegram into memory, sent to Muse Spark as audio (`reasoning_effort: minimal`), and returns `{transcript, intent, when?, where?, who?}`. The transcript is shown back ("You said: ..."), crisis words are checked on it, then the intent routes to FIND IT or PLAN IT. Audio is never stored. If audio input isn't on our key, fall back to Muse Voice Transcribe.
- [ ] **PLAN IT** (`src/llm/agent.ts`): Muse Spark with parallel tool calls over `get_shared_availability`, `get_my_compass`, `get_open_invitations`, `get_recent_finds`, and `draft_invitation` (draft only). Max 4 tool calls per turn. Ends at SEND THIS TO SOPHIE? with inline CONFIRM that issues the confirmation token; nothing sends from free text. Writes a `workings` row.
- [ ] Same agent and endpoints in the web chat (`POST /api/chat`, `POST /api/say`).
- [ ] Crisis words in Telegram and voice return the fixed help message.
- [ ] Tests: link token single use; unlinked chats get only a link prompt; webhook secret required; the agent never returns "sent"; mood signals never in agent context; audio never persisted.

> Prompt: "Read AGENTS.md, docs/MUSE-SPARK-BY-FUNCTION.md (SAY IT, PLAN IT) and BUILD-PLAN WP12. Add src/channels/telegram.ts and src/llm/agent.ts. Voice notes go to Muse Spark as audio in memory only. The agent may call tools in parallel but can only draft; sending stays behind the confirmation token. Write the agent safety tests first."

### WP13 SNAP IT: poster to plan (Sun 1, morning)
- [ ] Web: SNAP IT key opens the camera (`<input type="file" accept="image/*" capture="environment">`); Telegram: a photo sent to the bot.
- [ ] Muse Spark vision (`reasoning_effort: low`) returns `{title, date, time, place, confidence, note}` as structured output. Prompt forbids describing people or faces.
- [ ] Shows "Looks like: Jazz at Le Bourg, Thu 21:00." with SO... THURSDAY? (opens PLAN IT prefilled), FIX DETAILS and NOT NOW. Below a confidence threshold, the fields open for checking first.
- [ ] Image held in memory only, max 5 MB, never written to D1, KV, R2 or logs. Writes a `workings` row without the image.
- [ ] Tests: oversized and non-image rejected; nothing persisted; low confidence forces the check screen.

### WP14 CHECK IT: show the workings and the evaluation set (Mon 2, morning)
- [ ] SHOW THE WORKINGS key under every AI answer (web and a Telegram inline button): capability used (Conversation, Audio, Vision, Web search, Tools), tools called, citations as links, "Grounded: 3 of 3 lines", the compass line behind each item, reasoning effort. LCD style, SAMPLE-free, no personal text beyond what the person already sees.
- [ ] `evals/` with about 30 cases: grounding (invented URL, invented friend item), the agent never sends, mood signals excluded, compass traceability, no screen-time or personality language, crisis words bypass the model, SNAP IT on 5 sample posters we made ourselves, SAY IT on 3 recorded sample notes. `npm run eval` prints a pass rate; run before each deploy.
- [ ] Pass rate, median latency per function and fallback rate go into the README and the video.

### WP5 Meet IRL and the counter (Sun 1)
- [ ] QR of `/m/<token>` (10 minutes) plus a short code; the joiner agrees, the initiator agrees; one `interactions` row, a private moment each, GOOD TO MEET YOU.
- [ ] "You both said you met. That's all we record." No location.
- [ ] Tests: expiry, self-scan, blocked users, one per pair per day.

### WP6 Live page (Sun 1)
- [ ] Public `/live`: one number, "real-life hellos since 27 Oct", confirmed by both people, split by kind. Updates every 60 s. No names, no map, no leaderboard. Open Graph image.

### WP7 Share card, slim (Sun 1)
- [ ] After a meet-up or WE DID IT: "I went live." / "One of N real-life hellos on Hoolala!" / "You never know until you go." Server SVG to PNG; Web Share with the image, fallback links for WhatsApp, X, LinkedIn, Facebook; COPY LINK. No names or places.

### WP9 Safety pass, pilot and submission (Mon 2 to Wed 4)
- [ ] Safety: 18+ gate, block and report, delete account (including Telegram unlink and compass), rate limits on every model endpoint (web search capped per user per day), crisis message on web, Telegram and voice, privacy page in plain English: what the compass stores, that photos and voice notes are processed and never kept, what LinkedIn and Instagram can't do, nothing about time spent.
- [ ] Demo circle for judges: a clearly labelled SAMPLE friend ("Sample Sophie") with a shared availability signal and scripted I'M IN, so a judge signed in alone can complete the whole loop. Never counted on the Live page.
- [ ] Pilot (from Sat 31): testers onboard, link Telegram, send one voice note and one poster photo, add each other, send one invitation, do one QR meet-up. Ask: "Is your compass right?" (yes, mostly, no) and "Was the first briefing useful?" plus one sentence: "What actually happened?"
- [ ] Demo metrics (v3.2 section 11): onboarding completion, compass accuracy (self-rated), compass edits made and undone, Telegram connected, SAY IT and SNAP IT uses that became drafts, first-briefing usefulness, actions taken from briefings, invitations accepted, both-confirmed meet-ups, grounding pass rate, evaluation pass rate, fallback rate, median latency per function.
- [ ] README: what it is ("Your data. Your choice. Your attention."), live URL, how to run, architecture, a "Muse Spark by function" table (TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT: capability, API feature, guardrail, fallback, reasoning effort), evaluation results, source limits (LinkedIn and Instagram), "Built during the hackathon" vs `prior-work/`, Muse Code usage, honest limitations, licence.
- [ ] Video, 3 minutes or less, only hackathon work, following the beat sheet in `docs/MUSE-SPARK-BY-FUNCTION.md`: one capability on screen every 20 to 30 seconds, captioned (TELL IT: conversation, SAY IT: audio, FIND IT: web search, PLAN IT: tools, SNAP IT: vision, CHECK IT: workings), then MEET IT with no AI on purpose, then GO LIVE. One line on prior work. Credit Muse Spark and Muse Code. Avoid lonely, shy, anxiety, therapy, coach, screen time.
- [ ] Submit on the CV platform by 18:00 Wed 4 Nov; check repo, video and live URL in a private window; credits claimed. Post the video on X and submit the link for Most Viral; ask testers to vote on 9 Nov.

## Kickoff questions to confirm
- Meta Model API base URL, auth, exact Muse Spark model id, rate limits; credit claim link.
- Do hackathon keys work from Switzerland (Meta's blog describes the Muse Spark preview as US only)?
- On our key: audio input, image input, built-in `web_search`, structured output, parallel tool calls, `previous_response_id`, prompt caching.
- Coding start: after kickoff on 26 Oct, or from 27 Oct.
- A declared pre-hackathon design system is acceptable if clearly marked.
