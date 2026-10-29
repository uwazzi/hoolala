# Hoolala! build plan (27 Oct to 4 Nov 2026)

Product: `docs/SIGNALS-HERE.md` (the hackathon hero, wins on product scope) and `docs/MUSE-SPARK-BY-FUNCTION.md` (wins on model use). Hackathon rules and judging: `docs/HACKATHON-RULES.md`. Research behind the choice: `docs/COMPETITOR-REVIEWS.md`.

**Goal for the submission.** Hoolala! turns "we should talk sometime" into "we did". In any real café or coworking space, people answer three questions about real moments for a private Personal Compass, check in without friction (ARRIVE), see the place's details fetched and kept right by people (PLACE IT: parallel tools, place points), discover and post small invitations to talk (Signals here), with Muse Spark suggesting topics (SUGGEST IT: web search with citations), screening and translating them (SCREEN IT: structured output) and proposing where to meet (PLAN IT: parallel tools), every AI answer explained (CHECK IT). Then the model steps out: MEET IT (mutual QR, Live page with the connection rate), STAY IN TOUCH and GO LIVE.

**North-star metric:** real-world connection rate (accepted signals that end in a QR-confirmed meet-up).

Decisions (23 Oct): email magic link sign-in; the Live counter counts both-confirmed interactions only; Cloudflare Worker + D1 + KV; Muse Spark with a rule-based fallback.
Decisions (26 Oct, official guide): Indie Developer track, Build for Your World; public repo, MIT licence; prior work committed once and tagged `pre-hackathon`; pitched as a social product, never mental-health or coaching AI.
Decisions (27 Oct, Signals here): Signals here is the hero. Audience: everyone checked in at the same place, anonymous until both accept. Check-in ladder: QR poster first, location optional and never stored, place code as fallback. Telegram Mini App as the main entry at the place (Telegram login), email magic link for the web. Go App-Free (onboarding, Personal Compass, briefings, Telegram bot briefings), SAY IT and FIND IT-as-briefing move to after 4 Nov. Place host still to confirm; fallback place planned.
Decisions (27 Oct, v5): a venue is now **any public place** (café, bar, coworking, library), no host needed. Check-in is share location and pick the place, ADD THIS PLACE saves a new one at the person's location, search by name as fallback, QR poster optional. Onboarding **FIND ME** reads the person's public footprint with their OK and drafts the Personal Compass (back in scope, private, used only for their own suggestions and ordering). **PLACE IT** fetches place details (Google Maps live, web search for the menu); people confirm or fix them and earn private **place points**. Share card image moves to "if time".
Decisions (29 Oct, v6): tiny tries lead (GET OUTSIDE. MEET PEOPLE. GROW INSIDE.), Signals here second; TRY IT drafts inside code-set bounds; Friends slim (invite and crew); spec in `docs/HANDOFF-v6.md`.

## Before the build (owner)

- [ ] Cloudflare account with Workers, D1 and KV enabled; a domain or `*.workers.dev`.
- [ ] Email API account (Resend or similar), sender domain verified (web sign-in).
- [ ] Telegram bot from @BotFather, plus a **Mini App** for it (`/newapp`: short name `here`, URL of the deployed front end). Token into `wrangler secret`.
- [ ] Meta Model API account with a card and a $150 spend-limit alert; claim the credits (deadline Wed 4 Nov 21:00 ET).
- [ ] Google Maps Platform project with billing, a key restricted to the Places API (New) and our Worker, a budget alert. Fallback if not ready by Wed 28: OpenStreetMap search.
- [ ] **Pilot place by Thu 29 Oct.** No host needed any more; a busy Lausanne coworking space is still first choice (ask if posters and filming are OK), fallback a café or a university common room. Mon 2 Nov 11:00 to 16:00.
- [ ] Recruit 15 to 20 opt-in pilot participants at the place (short note: what it is, what we measure, that it's a test), plus 4 to 6 friends for the dry run on Sat 31.

## Schedule (Zurich)

| Day | Work packages | Event (Zurich) | End-of-day check |
|---|---|---|---|
| Tue 27 | WP1 skeleton and deploy, WP2 sign-in (email) | Agents 101, 17:00 | Live URL; you can sign in from your phone |
| Wed 28 | WP27 web app on Vite + Preact (morning), WP20 places and check-in (location, add place, search), WP21 Telegram Mini App and login | Agents 102, 17:00 | In a real café: share location, pick it or add it, checked in; GPS denied falls back to search |
| Thu 29 | DOCS-v6, issues, close the merged ones | Office hours 15:00; **pilot place and filming permission decided** | Docs diff reviewed; pilot place confirmed |
| Fri 30 | WP28 home v6 and tiny tries; WP31 staging fixes | Fireworks 17:00 (optional) | A new person completes one try in under a minute; tagline fixed, quiet empty state |
| Sat 31 | WP29 TRY IT (morning); **friends dry run (afternoon)** on the new home | | 15/15 TRY IT evals; friends try the new home at a café |
| Sun 1 | WP32 Around me (full); WP9 safety pass | | Radar scan with fit and why on staging; safety checklist ticked |
| Mon 2 | **Pilot in Lausanne, 11:00 to 16:00**; film demo shots on site; evening fixes | Office hours 16:00 | Metrics captured: try completion, signal-to-response, response-to-accept, connection rate |
| Tue 3 | Fixes from the pilot; film and edit the video; README results | Last day for submission questions | Video watched once by someone else |
| Wed 4 | Private-window check; WP9 submit by 18:00, post on X | Official deadline Thu 5 Nov 03:00 | Submitted; repo and video open while signed out |

## Cuts and order of cutting

Moved to after 4 Nov (designs stay in the design system as ROADMAP; not built, not in the demo): briefings (FIND IT), Telegram bot briefings, SAY IT, small talk missions, Sounds familiar?, Find a plan, Unplug, Outside picks, NFC, Muse Spark Open. The Personal Compass is back in scope through spoken answers, without briefings.

If time after Sun 1 (in this order): WP7 share card image, SNAP IT for menu boards, friends' Little Signals and Anyone around?, quick notes and invitations to friends.

If late, cut in this order: PLAN IT (keep the poster's own spot and time), Google Maps in PLACE IT (keep web search and people's facts), translation in SCREEN IT, SUGGEST IT web search, compass editing in plain words (keep EDIT and REMOVE), Live page animation. Cut order from 29 Oct (v6): WP30 timeline (keep the invite link), then TRY IT generation (keep the validator, the library and the "why" line), then WP31 extras.

Never cut: ARRIVE with location, add place and search by name, email sign-in, get personal with LOOKS RIGHT, the place card with sources and private points, Signals here with server-side audience, anonymity and expiry, I'M CURIOUS and mutual accept, quick replies, block and report, SCREEN IT (at least the code rules), CHECK IT and the eval set, mutual QR, the Live page with the connection rate, crisis message, the prior-work declaration.

## Data model (D1)

| Table | Key fields |
|---|---|
| `users` | id, email (unique, nullable), telegram_user_id (unique, nullable), first_name, is_adult (bool), created_at, deleted_at, intro_seen_at (nullable) |
| `sessions` | id, user_id, expires_at (also cached in KV) |
| `login_tokens` | token_hash, email, expires_at, used_at |
| `compass_items` | id, user_id, part (interest, talk_about, more_of, filter), text, source_url (nullable; null means "you said"), origin (find_me, questions, edit), active, created_at |
| `compass_changes` | id, user_id, before, after, words, confirmed_at, undone_at |
| `compass_people` | user_id, role (fixed allow-list), role_class (close, service), source (surprise), created_at. Roles only, never names; deleted with the account. |
| `game_tries` | id, user_id, game_id, level (soft, brave, bold), step, kind (talk, kind), who_role (nullable), title, source (ai, library), created_at, picked_at. Games older than 7 days deleted. |
| `places` | id, slug, name, kind (cafe, bar, coworking, library, other), city, lat, lng (from the person who added it, or the poster setup; never copied from Google), radius_m (default 150), google_place_id (nullable), spots_json, code (nullable, partner places), poster_key_hash (nullable), added_by, status (new, active, hidden), first_other_checkin_at, created_at |
| `place_facts` | id, place_id, field (hours, menu_item, price, spot, wifi, sockets, quiet, rule), value, source (people, google, web, snap), source_url, state (found, confirmed, disputed), added_by (nullable), confirmations, updated_at. Google-sourced rows are never stored: they are fetched live; `found` rows from the web expire after 30 days. |
| `place_contributions` | id, user_id, place_id, fact_id (nullable), action (add_place, add_fact, fix_fact, confirm_fact), points, state (pending, counted, rejected), created_at, counted_at. UNIQUE(user_id, fact_id, action, month) for confirms. |
| `checkins` | id, user_id, place_id, method (location, add, search, qr, code), started_at, ends_at (start + 4 h), left_at. Deleted after 24 hours. |
| `checkin_attempts` | id, place_id (nullable), method, ok (bool), reason (no_places_nearby, permission_denied, out_of_city, bad_key, wrong_code, expired), created_at. No user id, no coordinates. |
| `signals` | id, owner_id, audience (place, circle, private), place_id (for place), topic (60), when_at, spot, capacity (1 to 3), lang, translation, screening_verdict, screening_category, created_at, expires_at, state (open, full, cancelled, expired) |
| `signal_responses` | id, signal_id, responder_id, line (60, optional), state (requested, accepted, declined, withdrawn), created_at, decided_at |
| `quick_replies` | id, signal_id, user_id, kind (on_my_way, five_late, cant_make_it, at_spot), created_at |
| `meeting_points` | signal_id, spot, time, proposed_by (person, agent), confirmed_at |
| `blocks` | blocker_id, blocked_id, created_at |
| `reports` | id, reporter_id, target_user_id, signal_id, reason, created_at, status |
| `meet_exchanges` | id, initiator_id, token_hash, expires_at, joiner_id, initiator_agreed_at, joiner_agreed_at, signal_id (nullable) |
| `interactions` | id, kind (here, meet, invitation), user_a, user_b, place_id (nullable), signal_id (nullable), day, confirmed_at, UNIQUE(kind, user_a, user_b, day) |
| `stay_in_touch` | user_id, other_id, signal_id, chosen_at; when both rows exist a `friendships` row is created |
| `friendships` | user_a, user_b, created_at, status (active, blocked) |
| `moments` | id, user_id, interaction_id, label (private) |
| `workings` | id, user_id, function (findme, compassdraft, place, suggest, screen, plan, snap, try_it, why_go, read_it), tools_json (names only), citations_json, verdict, grounded_count, total_count, reasoning_effort, created_at; purged after 7 days |
| `llm_calls` | id, purpose, model, latency_ms, tool_calls, validated, fallback_used, created_at. No prompt or user text. |
| `metrics_daily` | place_id, day, checkin_attempts, checkin_ok_first_try, places_added, facts_found, facts_confirmed, facts_fixed, signals, signals_with_response, responses, accepted, confirmed_meets, stay_in_touch (anonymous counts only) |

`interactions` is the only table behind the public Live number. Coordinates sent for a location check-in are used for the nearby lookup and discarded; the only coordinates written are a new place's, from the person who added it. Voice transcripts are never written; only confirmed compass lines and roles are.

## API (JSON, session cookie unless noted)

Auth: `POST /api/auth/start` · `GET /auth/verify` · `POST /api/auth/telegram {initData}` (HMAC checked with the bot token) · `POST /api/auth/logout` · `GET /api/me` · `PATCH /api/me {firstName}` · `DELETE /api/me`
Get started: `POST /api/me/surprise/next {turns}` (three questions) · `POST /api/me/surprise/hear` (audio, transcribed and dropped) · `POST /api/me/compass/draft-line {questionId, answer}` · `POST /api/me/compass/save {lines, people}` · `GET /api/me/compass` · `GET /api/me/compass/people` · `DELETE /api/me/compass/people/:role` · `POST /api/me/compass/propose {text}` · `POST /api/me/compass/changes/:id/undo` · `DELETE /api/me/compass`
Places and check-in: `POST /api/places/nearby {lat, lng}` (Hoolala! places, then Google nearby; coordinates discarded after the lookup) · `GET /api/places/search?q=` · `POST /api/places {name, kind, lat, lng}` (ADD THIS PLACE, screened) · `GET /api/places/:slug/peek` (public: name and up to 3 open topics) · `POST /api/checkin {place, method, key? | code?}` · `POST /api/checkin/leave` · `GET /api/checkin`
Place card: `GET /api/places/:id/card` (people's facts plus PLACE IT fetch) · `POST /api/places/:id/facts {field, value}` · `POST /api/places/facts/:id/confirm` · `POST /api/places/facts/:id/dispute` · `GET /api/me/points` (private)
Signals here: `GET /api/here/signals?limit=3` · `POST /api/here/signals` (runs SCREEN IT) · `PATCH /api/here/signals/:id` · `POST /api/here/signals/:id/cancel` · `POST /api/here/signals/:id/curious {line?}` · `POST /api/here/responses/:id/accept` · `POST /api/here/responses/:id/decline` · `POST /api/here/signals/:id/quick {kind}` · `POST /api/here/suggest` (SUGGEST IT) · `POST /api/here/signals/:id/plan` (PLAN IT draft) · `POST /api/here/signals/:id/meeting-point {spot, time, confirmationToken}`
Safety: `POST /api/block` · `POST /api/report`
Meet, Live, friends: `POST /api/meet/start` · `POST /api/meet/join` · `POST /api/meet/:id/agree` · `POST /api/stay-in-touch/:signalId` · `GET /api/live` (public: total, connection rate, by place) · `GET /share/card/:interactionId.png` · `GET /s/:shareId`
Workings: `GET /api/workings/:id`
Telegram: `POST /telegram/webhook` (secret header; only notifications the person turned on: "Someone here is curious", "Accepted", quick replies)

## Work packages

### WP0 Kickoff and setup (done Mon 26)
- [x] Log in `docs/DECISIONS.md`: Meta Model API base URL, auth, model id, which features are on our key (web_search, structured output, parallel tools, image input, prompt caching), access from Switzerland.
- [x] Public repo with MIT `LICENSE`, commit 1 `Pre-hackathon work`, tag `pre-hackathon`.
- [ ] Commit 2: `AGENTS.md`, `CLAUDE.md`, `docs/` (DESIGN, BUILD-PLAN, DECISIONS, HACKATHON-RULES, SIGNALS-HERE, MUSE-SPARK-BY-FUNCTION, COMPETITOR-REVIEWS), `src/types.ts`, README stub.
- [x] One Muse Spark test call with a tool definition and a structured output schema.

### WP1 Skeleton and deploy (Tue 27, morning)
- [x] Responsive shared web layout: mobile first, fluid desktop container, readable text measure and documented rules for future screens.
- [x] Worker serves `public/` (new Mono LCD front end from `prior-work/design-system/`) with security headers and a CSP that allows Telegram's Mini App script. Home, sign-in, and placeholders for ARRIVE, HERE, MEET, LIVE.
- [x] D1 migrations for every table above; KV bound; Cron Trigger (expire check-ins and signals every 5 minutes, purge check-ins after 24 h; `metrics_daily` rollup deferred to WP5/WP6, see DECISIONS).
- [ ] `npm run deploy`; `/api/health` ok.

### WP2 Sign-in with email magic link (Tue 27, afternoon)
- [x] Email, 18+ checkbox, SEND MY LINK; tokens hashed, single use, 15 minutes; rate limits in KV; session cookie HttpOnly, Secure, SameSite=Lax (SameSite=None inside the Telegram webview, see WP21). First name on first sign-in.
- [x] Delete account removes check-ins, signals, responses, moments, friendships, Telegram id; keeps anonymous counts.
- [x] Tests: expired, reused, wrong tokens; same response whether or not the email exists.
- [ ] Owner: Resend account, sender domain verified, `wrangler secret put EMAIL_API_KEY` and `EMAIL_FROM`; sign in from your phone on staging.

### WP27 Web app on Vite + Preact (Wed 28, morning)
Map: `docs/ARCHITECTURE.md`. Replaces the plain pages in `public/` before more screens are built. API, rules, data and tests stay as they are.
- [x] `web/`: Vite + Preact + TypeScript; LCD styles and layout rules carried over from `public/styles.css`; no new runtime dependencies beyond Preact and a small router.
- [x] Worker serves the Vite build (`[assets] directory = "web/dist"` in both wrangler configs, `run_worker_first` kept); `npm run build` before deploy in CI and the deploy workflows.
- [x] Port home, sign-in (email, sent, first name, signed in, delete) and the ARRIVE/HERE/MEET/LIVE placeholders; `/auth/verify` redirects keep working.
- [x] CSP still holds: no inline scripts, Telegram's script allowed; the build works inside the Telegram webview.
- [x] One small API client in `web/` (JSON, same-origin cookies, typed with `src/types.ts` type-only imports).
- [ ] Remove `public/` once the port is live on staging; update `AGENTS.md`.
- [ ] Check inside the real Telegram webview once the Mini App exists (WP21).
- [x] Tests: worker tests pass against the new asset directory; a smoke check that `/`, `/signin` and `/live` load with the CSP.

### WP20 Places and check-in (Wed 28, morning)
- [x] `src/rules/checkin.ts` (pure, tests first): places within radius (haversine); search only within the person's city; optional poster key and code; check-in lasts 4 h or until leave; one active check-in per person.
- [x] Share location: explain first ("Only to find the place you're in."), then ask once. `POST /api/places/nearby` returns Hoolala! places, then Google nearby places (live, field mask: id, display name, primary type). Pick one: if it's a Google place not yet in Hoolala!, create the `places` row with the Google place id and the person's coordinates as the place's.
- [x] ADD THIS PLACE: name (screened) and kind; saved at the person's location; public places only (no "home", no street addresses as names). Points pending until someone else checks in there.
- [x] Search by name when location fails: "Your phone thinks you're in the lake. Search for the place instead."
- [ ] Optional poster for partner places (A4 LCD PNG with QR and code); admin script, not a UI.
- [x] Peek API (public): `GET /api/places/:slug/peek`, place name and up to 3 open topics. The PEEK screen comes with WP22.
- [x] The person's coordinates live only in the request (or become a new place's coordinates); never in `checkins`, logs or analytics. `checkin_attempts` stores method, ok and reason only.
- [x] Tests: out of radius, search outside the city refused, coordinates never stored except as a new place, one active check-in, Google content not written to D1.
- [ ] Staging acceptance at a real café: nearby list shows OpenStreetMap places, check in, leave, repeat with location denied (search). Not testable from the agent's sandbox, which can't reach Overpass.

### WP24 FIND ME and the Personal Compass (Fri 30, afternoon)
> Removed in v6.2 (WP36, owner-confirmed): no public-profile search; the compass comes from three spoken questions. Only this section remains.
- [x] Consent screen first; NO goes to three scripted questions. Inputs: name used online, city, optional links (max 3).
- [x] `src/llm/findme.ts`: at most 3 `web_search` calls about this person only; schema `{findings[{text, url}]}`; IS THIS YOU? with THAT'S ME / NOT ME.
- [x] Compass draft from ticked findings and answers: schema `{compass[{part, text, source_url}]}`; `src/rules/compass.ts` drops lines without a ticked source or "you said", and any personality, health, political, religious or sexuality label. LOOKS RIGHT / CHANGE SOMETHING / START AGAIN; nothing saved before LOOKS RIGHT.
- [x] MY COMPASS: lines with source, REMOVE, delete all, redo. Plain-words change with BEFORE / AFTER and UNDO: cut for now.
- [x] Compass used only to put matching signals first (FITS YOU). SUGGEST IT personalisation: later. Original item: Compass used only by SUGGEST IT and to put matching signals first for the viewer (FITS YOU, visible only to them). Never exposed through any other endpoint.
- [x] Tests: unticked findings never stored; another person's name refused; compass never in any response to anyone else; delete account deletes it.

### WP25 PLACE IT and place points (Sat 31, morning)
- [x] `src/llm/place.ts` (PLACE IT): parallel tools `google_place_details` (live: hours, website, price level), `web_search` (menu on the place's website), `get_place_facts`; schema `{facts[{field, value, source, url}]}`; runs on first visit and when facts are over 30 days old.
- [x] Place card: CONFIRMED HERE facts first, then AI / FOUND facts with their source line; Google attribution shown; THAT'S RIGHT / FIX IT / NOT ANY MORE.
- [x] `src/rules/places.ts` (pure, tests first): points table (add place 10, add or fix 5, confirm 2), counted only on another person's confirmation or 24 h without dispute, only while checked in at that place, never for your own, max 30 a day, one confirm per fact per person per month; disputes revert to found.
- [x] Edits pass `screening.ts` and SCREEN IT. MY MOMENTS shows your points privately; the Live page shows only collective counts.
- [x] Tests: no self-confirm, cap, not checked in refused, Google rows never stored, points never public.

### WP26 SURPRISE ME, a spoken head start (Wed 28, evening)
- [x] `src/rules/surprise.ts` (pure, tests first): at most 5 turns, fixed opening and scripted fallback, question and observation checks, lines must echo the person's words, screened topic ideas, crisis stop, WAV format check.
- [x] `src/llm/voice.ts` (HEAR IT, Muse Voice Transcribe) and `src/llm/surprise.ts` (follow-up questions and the surprise draft, Muse Spark), each with a no-model fallback.
- [x] `POST /api/me/surprise/hear|next|draft`, signed-in only, rate-limited, stateless; nothing stored before LOOKS RIGHT; audio never kept.
- [x] `/surprise`: pixel ball that ripples with Hoolala!'s voice (phone speech, VOICE ON/OFF) and the person's (hold to talk), typing fallback, the reveal (Passions, Projects, Inspiration, Rather not; AI / Surprise; two AI / Suggestion ideas). Third door on Get started.
- [ ] Try it on a real phone on staging (iOS Safari and Android Chrome): microphone prompt, speech voice, hold to talk.

### WP28 Home v6 and tiny tries (Fri 30)
- [x] Home per DESIGN v6 (rule 14, 42, 43, home spec); one-screen flow GET A TRY > GO > TELL ME > NEXT TIME; library of 15 tries (`src/content/tries.ts`, from `docs/design/v6/Flow.dc.html`); `tries` table and API (`POST /tries`, `GET /me/plant`); plant renderer (14 x 18 pixel grid, leaves and flowers by count); reduced motion.
- [ ] Acceptance: on a real phone, a new person understands the goal without help and completes one try in under a minute of screen time; works with LLM_ENABLED=false.

### WP29 TRY IT, adaptive tries with guardrails (Sat 31, morning)
- [x] `src/rules/tries.ts` with tests first (HANDOFF-v6 section 4); `src/llm/tryit.ts` (schema, low effort, 8 s timeout, validator, library fallback, `llm_calls` and `workings` rows); SCREEN IT second verdict; "why this one" in the flow; 15 new eval cases.
- [x] Acceptance: 15/15 evals; a step never changes without a tap.

### WP30 Friends, slim (Sun 1)
- [x] INVITE A FRIEND: share sheet with the invite text and a crew invite link (WhatsApp `wa.me` and Messenger share URLs, copy link); one private crew per person; timeline posts (outcome tag + text, screened), NICE ONE. Seed file at `scripts/demo-crew.sql` (owner runs once on staging). Replaces WP7.
- [ ] Acceptance: invite opens WhatsApp prefilled on a real phone; a friend who taps the link joins the crew; no counts per person anywhere.

### WP31b Navigation and Here (v6.1, Fri 30)
- [x] Softkeys TODAY · AROUND · FRIENDS on every top-level screen, current one inverted; Here sits under AROUND. Compact header everywhere (brand only, no status icons). The trio follows the route (`web/src/tabs.ts`): Today for home and compass, Around for around/here/place, Friends for friends; flows keep Back.
- [x] Here: typed headline (rule 43), keys rise after; quiet (QUIET IN HERE. FOR NOW., POST THE FIRST ONE, OR A TINY TRY HERE) and busy (count headline, SEE THE N TOPICS, POST MY OWN) states, never two keys with the same action.
- [x] Place line gains the talking meter (TALKING HERE bars, hidden under 3 ratings); More list with ABOUT THIS PLACE and I'M LEAVING; leaving opens the 5-word talking sheet (SKIP stores nothing; THANKS. SEE YOU OUT THERE. then BACK TO AROUND).
- [x] Tests: trio mapping unit-tested per route; meter hidden under 3 via the API; sheet shared with Arrive; no duplicate post keys.

### WP32 Around me (Sun 1)
- [x] Consent screen ("used for this scan only, never stored or shown", skip link); radar with sweep and pins by bearing and distance (never exact addresses) plus the numbered list; 500 m, then 1 km and 2 km widening on tap only; code fit (GOOD/OK/LOW from compass, features, visits) and talking rating (median from 3+ ratings in 90 days, rated while checked in); `src/llm/whygo.ts` + `src/llm/readit.ts` (schemas, low effort, validators, template/link fallbacks, `llm_calls` and `workings` rows); `place_ratings` table; rating capture on I'M LEAVING (QUIET / CHATTY / LIVELY); 10 scans an hour.
- [x] Evals: 10 WHY GO + 5 READ IT cases. Seed: 6 SAMPLE places around Riponne with SAMPLE-marked ratings (`scripts/demo-around.sql`); OSM stays the provider. Acceptance: HANDOFF-v6-around-me phone tests (consent, list, detail, widen, leave-rating) pass on staging.

### WP32 v6.1 rework: Around me after the live review (Sun 1)
- [x] First screen: idle radar panel (rings, radius label, pulsing YOU square), AROUND YOU plus the promise line, compass box (MATCHED TO YOUR COMPASS with top lines and EDIT, or the empty state with SET IT UP to Surprise me), the privacy line kept word for word, thumb-zone ONE LOOK AROUND (60 px) with SKIP, CHECK IN BY NAME under it. Location asked only after the tap; refused shows NO LOCATION, NO PROBLEM. with CHECK IN BY NAME and TRY AGAIN.
- [x] Scan in place (1.2 s sweep, typed status), radius chips 500 M / 1 KM / 2 KM, cards sorted by fit then talking then distance: number badge, fit badge, TYPE · DIST · MIN WALK, Why go, TALKING HERE 5-bar meter with the word, verified line. Open card: now-line, today's info with source, TINY TRY THERE, workings line, TAKE ME THERE (OSM directions) / I'M HERE. Empty 500 m and no-fit states with the tap-to-widen offer. Filter chips stay out (after 4 Nov).
- [x] Talking rating becomes the 5 design words (mostly quiet to very chatty), one per person per place per 7 days, median from 3+ in 90 days (migration 0010). Scan gains tiny_try, the workings line and the open-signal count per place.
- [x] Live map merge (D1 wins ties), food/shop/outdoors/culture/sport kinds (migrations 0011, 0012), open-now/opening-soon filter with today's hours, public phone and site on the card.
- [x] Tests first: weekly uniqueness; median and 3-rating gate; radius never above 2 km or widened without a tap; bars labelled 18+; location in no table.

### WP33 Compass, four directions (v6.1, Sat 31)
- [x] Four-direction screen with needle (0.6 s swing, overshoot), typed part line, counts, sources and REMOVE on every line; WHERE IT'S USED lines plus the fixed privacy line; first-time reveal (spin and settle, lines rise one by one, SOURCES row, tap for the full compass; the LOOKS RIGHT gate stays on the draft screens, where nothing is saved before it).
- [x] SAY IT YOUR WAY: `POST /api/me/compass/propose` (code guesses the line from the person's own words, saves nothing; the model never rewrites), YOUR WORDS with WAS plus CONFIRM, last three CHANGES with UNDO (`POST /api/me/compass/confirm_line`, `POST /api/me/compass/undo`, `GET /api/me/compass/changes`).
- [x] Stored parts become intention/interest/filter/delivery/action (migration 0013 maps talk_about to interest, more_of to intention; delivery and action start empty; origins gain feedback/suggest/delivery); validator extends (traces to words or ticked findings, banned labels, 60 chars, feedback keeps its try id).
- [x] Entry points: MY COMPASS dashed link under the plant on Today, EDIT on Around's compass line (review=delivery), REVIEW after a suggestion (review=suggest); COMPASS? row on the try debrief links `/compass?fix=TRYID` with THE TRY and starter words. Surprise me's five questions checked against the four directions (scripted set covers all four; model-asked how-questions fall back to HOW I GO).
- [x] Tests first: proposal saves nothing; undo restores exactly; personality labels and sourceless lines rejected; outcomes alone create nothing; A's compass never returned to B.

### WP34 Surprise me voice (v6.1, Sat 31, after WP33)
- [x] Thumb row (TYPE, 76 px mic, SKIP) replaces the ball hold; ball is state display only; progress dots with the fed compass part; caption types as spoken; I HEARD plus the drafted line, then KEEP / SAY AGAIN / FIX BY TYPING; SOUND ON / OFF (speech only, captions always); softkeys LEAVE / SOUND.
- [x] Keep the server transcription path (Meta ASR, heard then forgotten); no-mic browsers open typing with the note; tap under 400 ms never sends; release outside ends and sends; 45 s cap; crisis answers stop with the crisis message, never read aloud.
- [x] Drafting via WP33 `POST /compass/propose`; fallback trims the answer to 60 chars with the question's part; done state (THAT'S YOU, IN N ANSWERS.) opens the compass reveal.
- [x] Tests first: short tap never sends; release-outside sends; nothing saved before KEEP; no-mic fallback; mic tracks stopped; no transcripts in logs or tables; crisis path; SOUND OFF never speaks.

### WP31 add-on: compact header and Around softkeys
- [x] Compact brand bar on every screen (44 px, HOOLALA! left, tagline right, dashed bottom border); softkeys TODAY · AROUND · FRIENDS on top-level screens; Here sits under AROUND.
- [x] Here live fix: one POST THE FIRST ONE key in the empty state, no duplicate.

### WP31 Staging fixes (Fri 30)
- [x] Tagline under the name (not "Hello, name"); accepted signal card shows only the next step (PLAN > ON MY WAY > MEET; the rest behind MORE); empty state "QUIET IN HERE. FOR NOW." + POST THE FIRST ONE; softkeys TODAY / FRIENDS on the home.

### WP35 Onboarding story (v6.2, Fri 30)
- [x] Story on first open: six beats per `specs/onboarding-story.md` (copy final, sources shown); typed headline at 35 ms a character, stepped pixel animations, tap advances, SKIP/BACK · dots · NEXT/REPLAY row, LET'S GO on the last beat; `intro_seen_at` on the account plus a local flag. The health beat stays out.
- [x] Reduced motion: headline whole, pictures end state, no auto-advance; aria-live headline, decorative pictures, 44 px controls.
- [x] Full references in the README and `docs/RESEARCH.md` (Abdalla and Lanser details still open with the owner).
- [x] Tests first: first open shows beat 1; LET'S GO and SKIP set the seen flag and open WP36; tap completes then advances; six beats in order, no invented numbers.

### WP36 Let's get personal (v6.2, Sat 31)
- [x] Reuse the WP34 voice component (no duplicate): new intro, three Mom Test questions, three dots (`Qn OF 3 · FILLS ...`), NEXT saves the draft; progress strip SURPRISE ME · COMPASS · GAME · AROUND?; entry after the story and from Around me's SET IT UP.
- [x] COMPASS DRAFT (Muse Spark): one structured call per answer `{part, line, topic, place_kind, pace, people}`; code validator (part matches the question, roles from the allow-list, names stripped, banned labels, what happened never who); fallback trims to 60, keyword roles, gentle pace. Transcripts never stored.
- [x] Compass check: typed count headline, 2×2 grid with sources, PEOPLE IN YOUR DAYS box (roles only); LOOKS RIGHT. MAKE MY GAME saves lines and roles (`compass_people`); CHANGE SOMETHING clears the drafts.
- [x] FIND ME removed: consent, IS THIS YOU?, find and draft paths gone; footprint sources gone from the compass; roles removable via REMOVE.
- [x] Tests first: shared voice component; names become roles only; off-list roles dropped; labels rejected to fallback; nothing saved before LOOKS RIGHT; full flow with `LLM_ENABLED=false`; no transcripts in logs.

### WP37 Your game of tiny tries (v6.2, Sat 31 to Sun 1)
- [x] Library fallback first: 24 hand-written tries filled with topic, place and roles; a full game of 9 renders with `LLM_ENABLED=false`, 3 per level, talk and kind in each.
- [x] TRY IT game generation: one call for 9 tries `{title, level, kind, who_role, place_kind, why}`; code assigns step and minutes; validator (talk and kind per level, compass roles only, service roles light, no buying, looks, contact details or LESS OF, words_max, UK English, no em dashes); rejected twice swaps in a library try.
- [x] Screens: WRITING YOUR GAME checklist; tabs with START HERE on the pace tab; try cards with info line and NEW ONE (never repeats in the game); NEW GAME FROM SCRATCH; safety footnote; pick stores today's try, then Around me or skip. `game_tries` rows, games purged after 7 days; 20 NEW ONE and 3 NEW GAME a day, then the library.
- [x] 15 eval cases (5 pass, 10 reject).
- [x] Tests first: library game shape; model step ignored; NEW ONE never repeats; every validator rule rejects; limits fall back to library; pick stores today's try.

### WP38 Today, simplified (v6.2, Fri 30)
- [ ] Home per spec: compact plant row, TODAY'S TRY · STEP n typed with hint and FROM YOUR COMPASS >, LET'S GO with ANOTHER ONE and NOT TODAY; motto, big plant card, MY COMPASS box, DARE A FRIEND, WHERE? chips, Around link and TELL MY FRIENDS removed.
- [ ] Today's try is the picked game try (v6 library fallback for old accounts); ANOTHER ONE draws the next unpicked try at the level (a new game in the background when used up); NOT TODAY is the later state, no reminder.
- [ ] Off you go, I'M BACK, outcomes, NEXT TIME, plant growth and the COMPASS? row unchanged.
- [ ] Tests first: one primary key and two text links; try equals the pick; ANOTHER ONE keeps the level without repeats; removed items gone.

### WP21 Telegram Mini App and login (Wed 28, afternoon)
> Moved to ROADMAP 29 Oct (v6, owner-confirmed): the web app is the demo. The `wp21/telegram` work branch was deleted the same day; only this section remains.
- [ ] Location inside the Mini App: Telegram's location API where available, browser geolocation otherwise.
- [ ] A partner poster QR opens `t.me/<bot>/here?startapp=<slug>_<key>` on phones with Telegram, and the web URL otherwise (the web page shows both options).
- [ ] Mini App loads the same front end; `POST /api/auth/telegram` verifies `initData` with HMAC-SHA256 using the bot token, checks `auth_date` freshness, creates or finds the user by Telegram id, asks once for the 18+ confirmation, uses the Telegram first name only.
- [ ] Theme: keep the LCD look regardless of Telegram's theme; respect the safe area.
- [ ] Optional notifications through the bot (off by default, asked in context after posting): "Someone here is curious.", "Accepted. Terrace at 15:10.", quick replies. Nothing else, ever.
- [ ] Tests: forged initData rejected; stale auth_date rejected; notifications only when switched on.

### WP22 Signals here (Thu 29)
- [x] `src/rules/here.ts` (pure, tests first): a viewer sees a place signal only if both are checked in at that place now, the signal is open and unexpired, neither has blocked the other, and it's not their own; names are revealed only between an owner and an accepted responder; capacity respected; limits (2 open signals, 5 curious per hour).
- [x] Post: topic (60), WHEN (now, in 30 min, at a time), WHERE (place spots), FOR HOW MANY (1 to 3); expiry rule from `SIGNALS-HERE.md`; edit, cancel.
- [x] Discover: 3 at a time, then "That's everything here right now. Post one?" Shows topic, when, spot, "Someone here", expiry; translation when available with ORIGINAL toggle.
- [x] Respond: I'M CURIOUS with an optional line (60); owner sees "Someone here is curious: [line]"; ACCEPT or NOT THIS TIME (no reason; responder sees "Not this time. No hard feelings."). After accept, both see first names, the spot and the time.
- [x] Quick replies only: ON MY WAY / 5 MINUTES LATE / CAN'T MAKE IT / WE'RE AT THE [SPOT]. No free chat.
- [x] I'M LEAVING ends the check-in and hides open signals; responders see "They had to go."
- [x] Block (both ways, all places, immediate) and report (hides the item now, logs for review; a reported place is hidden until reviewed).
- [x] Tests: other place can't see; blocked hidden both ways; names hidden before accept; capacity; limits; expired and left hidden.
- [ ] Translation with ORIGINAL toggle waits for SCREEN IT (WP23); screening is code rules only until then.
- [ ] Staging acceptance with real people: two phones at one place, post, curious, accept, quick replies, block and report.

### WP23 SCREEN IT, SUGGEST IT and PLAN IT (Fri 30)
- [x] `src/rules/screening.ts` first (pure, tests): length, links, emails, phone numbers, handles, crisis words, a short word list (dating, sexual, slurs, selling). Code rules decide alone when the model is off or times out.
- [x] `src/llm/screen.ts` (SCREEN IT): structured output `{verdict, category, reason, fr, en}`, `reasoning_effort: minimal`, prompt caching on the house rules, 1.5 s target, 4 s timeout. Can approve or reject; never rewrites. Rejection screen: the reason in Hoolala! voice ("That sounds more like a date than a coffee break. Try again?") and EDIT.
- [x] `src/llm/suggest.ts` (SUGGEST IT): place name, area, time of day, spots, plus at most one `web_search` ("events near <area> today"), cached per place for 1 hour. Returns 3 ideas `{topic, why, citation_url?}`; `src/rules/grounding.ts` drops ideas naming an event without a returned citation; every idea also passes SCREEN IT. Shown as AI / SUGGESTION with USE THIS; never posted automatically.
- [x] `src/llm/agent.ts` (PLAN IT): tools `get_signal`, `get_place_spots`, `get_quick_replies`, `get_place_hours`, `draft_meeting_point` (draft only); parallel calls, max 4; returns "Terrace at 15:10?" with CONFIRM (issues the confirmation token) and CHANGE.
- [x] Every AI answer writes a `workings` row and an `llm_calls` row.
- [x] Tests: model never rewrites silently; invented event dropped; PLAN IT only proposes real spots; never "sent"; model-off paths.

### WP5 Meet and the connection rate (Sat 31)
- [x] From an accepted signal: MEET > shows a QR (10 minutes) plus a short code; the other scans and both agree; writes `interactions` (kind `here`, place, signal), a private moment each: "You met an actual human."
- [x] STAY IN TOUCH: both choose, then a friendship; one-sided choices are never revealed.
- [x] Tests: expiry, self-scan, blocked, one per pair per day, stay-in-touch only when mutual.
- [ ] Real-phone check: one phone shows the QR, the other's camera opens it, both tap WE MET.

### WP6 Live page (Sat 31)
- [x] Public `/live`: total real-life hellos since 27 Oct (both-confirmed), **real-world connection rate** ("7 of 9 accepted signals became a conversation"), check-in success rate, place details confirmed this week (collective), per place. Updates every 60 s. No names, no map, no leaderboard. Open Graph image.
- [ ] Open Graph image for `/live` and SAMPLE places excluded from the counts (both with WP9).

### WP14 CHECK IT and the evaluation set (Sun 1)
- [x] SHOW THE WORKINGS under every AI answer: capability (Web search, Screening, Tools, Vision), tools in call order, citations, the screening verdict and category, grounded count, reasoning effort. No personal text beyond what the person already sees.
- [x] `evals/` with about 30 cases (see `MUSE-SPARK-BY-FUNCTION.md`); `npm run eval` prints a pass rate; run before each deploy. Pass rate, median latency per function and fallback rate go into the README.

### WP7 Share card, slim (Sun 1)
> Folded into WP30: the invite card is the share card. Kept here for history.
- [ ] After a confirmed meet: "I went live." / "One of N real-life hellos on Hoolala!" / "You never know until you go." No names, no place unless the person ticks it. Web Share with the image, fallback links, COPY LINK.

### WP9 Safety, pilot and submission (Sun 1 to Wed 4)
- [ ] Safety pass: 18+ gate, block and report both ways, house rules on the poster and the first screen, rate limits on every model endpoint and on posting, replying, adding places and points, crisis message everywhere, privacy page in plain English (compass draft consent and what is kept, place-level check-in, the person's coordinates discarded, Google attribution, check-ins deleted after 24 h, anonymity until both accept, what the model sees).
  - [x] Privacy page in plain English at `/privacy` (28 Oct), describing what the code does.
- [x] Demo place for judges: a clearly labelled SAMPLE place with a sample signal from "Sample Sophie" who accepts automatically, so a judge alone can do the whole loop. Never counted on the Live page.
- [ ] Dry run (Sat 31, café, friends) and pilot (Mon 2, place, 15 to 20 people). Measure the four metrics; observe whether people post or reply without help; ask "How comfortable was replying?" (1 to 5) and "What made you curious, uncomfortable or reluctant?"
- [ ] README: what it is, live URL, how to run, architecture, "Muse Spark by function" table, evaluation results, pilot results (honest, small numbers), "Built during the hackathon" vs `prior-work/`, Muse Code usage, limitations, licence.
- [ ] Video (3 minutes, hackathon work only, beat sheet in `MUSE-SPARK-BY-FUNCTION.md`), filmed at the place with consenting people only, no faces of anyone who didn't agree. Avoid lonely, shy, anxiety, therapy, coach, dating.
- [ ] Submit by 18:00 Wed 4 Nov; check everything in a private window; credits claimed. Post on X for Most Viral.

## Questions to confirm
- Meta Model API features on our key from Switzerland (see WP0).
- Pilot place (by Thu 29) and Google Maps key.
- Whether filming at the pilot place needs the owner's OK (assume yes; ask in person).
