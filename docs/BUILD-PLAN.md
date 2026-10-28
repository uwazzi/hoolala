# Hoolala! build plan (27 Oct to 4 Nov 2026)

Product: `docs/SIGNALS-HERE.md` (the hackathon hero, wins on product scope) and `docs/MUSE-SPARK-BY-FUNCTION.md` (wins on model use). Hackathon rules and judging: `docs/HACKATHON-RULES.md`. Research behind the choice: `docs/COMPETITOR-REVIEWS.md`.

**Goal for the submission.** Hoolala! turns "we should talk sometime" into "we did". In any real café or coworking space, people get a head start from their public footprint (FIND ME: web search with citations, the Personal Compass), check in without friction (ARRIVE), see the place's details fetched and kept right by people (PLACE IT: parallel tools, place points), discover and post small invitations to talk (Signals here), with Muse Spark suggesting topics (SUGGEST IT: web search with citations), screening and translating them (SCREEN IT: structured output) and proposing where to meet (PLAN IT: parallel tools), every AI answer explained (CHECK IT). Then the model steps out: MEET IT (mutual QR, Live page with the connection rate), STAY IN TOUCH and GO LIVE.

**North-star metric:** real-world connection rate (accepted signals that end in a QR-confirmed meet-up).

Decisions (23 Oct): email magic link sign-in; the Live counter counts both-confirmed interactions only; Cloudflare Worker + D1 + KV; Muse Spark with a rule-based fallback.
Decisions (26 Oct, official guide): Indie Developer track, Build for Your World; public repo, MIT licence; prior work committed once and tagged `pre-hackathon`; pitched as a social product, never mental-health or coaching AI.
Decisions (27 Oct, Signals here): Signals here is the hero. Audience: everyone checked in at the same place, anonymous until both accept. Check-in ladder: QR poster first, location optional and never stored, place code as fallback. Telegram Mini App as the main entry at the place (Telegram login), email magic link for the web. Go App-Free (onboarding, Personal Compass, briefings, Telegram bot briefings), SAY IT and FIND IT-as-briefing move to after 4 Nov. Place host still to confirm; fallback place planned.
Decisions (27 Oct, v5): a venue is now **any public place** (café, bar, coworking, library), no host needed. Check-in is share location and pick the place, ADD THIS PLACE saves a new one at the person's location, search by name as fallback, QR poster optional. Onboarding **FIND ME** reads the person's public footprint with their OK and drafts the Personal Compass (back in scope, private, used only for their own suggestions and ordering). **PLACE IT** fetches place details (Google Maps live, web search for the menu); people confirm or fix them and earn private **place points**. Share card image moves to "if time".

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
| Thu 29 | WP22 Signals here: post, discover, respond, accept, quick replies, block and report | Office hours 15:00; **pilot place decided** | Two phones: one posts, one is curious, accept reveals first names, ON MY WAY arrives |
| Fri 30 | WP23 SCREEN IT and SUGGEST IT; PLAN IT; WP24 FIND ME and the compass | Fireworks 17:00 (optional) | A flirty topic is rejected; a French topic shows in English; FIND ME on your own name: findings with sources, NOT ME works, LOOKS RIGHT saves the compass |
| Sat 31 | WP25 PLACE IT and place points; WP5 meet and connection rate; WP6 Live page, STAY IN TOUCH; **dry run with friends at a café** | | The café's hours and menu appear with sources; FIX IT and a second phone's confirm add points; two phones confirm a meet-up; fixes listed |
| Sun 1 | WP14 CHECK IT and evals; dry-run fixes; posters for the pilot place (optional) | | Eval pass rate printed; SHOW THE WORKINGS on every AI answer |
| Mon 2 | **Pilot at the place, 11:00 to 16:00**; film demo shots on site; evening fixes | Office hours 16:00 | Metrics captured: check-in success, signal-to-response, response-to-accept, connection rate |
| Tue 3 | Fixes until 14:00; code freeze 18:00; edit the 3-minute video | Last day for submission questions | Video watched once by someone else |
| Wed 4 | WP9 submit by 18:00, post on X | Official deadline Thu 5 Nov 03:00 | Submitted; repo and video open while signed out |

## Cuts and order of cutting

Moved to after 4 Nov (designs stay in the design system as ROADMAP; not built, not in the demo): briefings (FIND IT), Telegram bot briefings, SAY IT, small talk missions, Sounds familiar?, Find a plan, Unplug, Outside picks, NFC, Muse Spark Open. The Personal Compass is back in scope through FIND ME, without briefings.

If time after Sun 1 (in this order): WP7 share card image, SNAP IT for menu boards, friends' Little Signals and Anyone around?, quick notes and invitations to friends.

If late, cut in this order: PLAN IT (keep the poster's own spot and time), Google Maps in PLACE IT (keep web search and people's facts), translation in SCREEN IT, SUGGEST IT web search, compass editing in plain words (keep EDIT and REMOVE), Live page animation.

Never cut: ARRIVE with location, add place and search by name, Telegram login and email sign-in, FIND ME consent and IS THIS YOU?, the place card with sources and private points, Signals here with server-side audience, anonymity and expiry, I'M CURIOUS and mutual accept, quick replies, block and report, SCREEN IT (at least the code rules), CHECK IT and the eval set, mutual QR, the Live page with the connection rate, crisis message, the prior-work declaration.

## Data model (D1)

| Table | Key fields |
|---|---|
| `users` | id, email (unique, nullable), telegram_user_id (unique, nullable), first_name, is_adult (bool), created_at, deleted_at |
| `sessions` | id, user_id, expires_at (also cached in KV) |
| `login_tokens` | token_hash, email, expires_at, used_at |
| `compass_items` | id, user_id, part (interest, talk_about, more_of, filter), text, source_url (nullable; null means "you said"), origin (find_me, questions, edit), active, created_at |
| `compass_changes` | id, user_id, before, after, words, confirmed_at, undone_at |
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
| `workings` | id, user_id, function (findme, place, suggest, screen, plan, snap), tools_json (names only), citations_json, verdict, grounded_count, total_count, reasoning_effort, created_at; purged after 7 days |
| `llm_calls` | id, purpose, model, latency_ms, tool_calls, validated, fallback_used, created_at. No prompt or user text. |
| `metrics_daily` | place_id, day, checkin_attempts, checkin_ok_first_try, places_added, facts_found, facts_confirmed, facts_fixed, signals, signals_with_response, responses, accepted, confirmed_meets, stay_in_touch (anonymous counts only) |

`interactions` is the only table behind the public Live number. Coordinates sent for a location check-in are used for the nearby lookup and discarded; the only coordinates written are a new place's, from the person who added it. Raw FIND ME findings are never written; only confirmed compass lines are.

## API (JSON, session cookie unless noted)

Auth: `POST /api/auth/start` · `GET /auth/verify` · `POST /api/auth/telegram {initData}` (HMAC checked with the bot token) · `POST /api/auth/logout` · `GET /api/me` · `PATCH /api/me {firstName}` · `DELETE /api/me`
Get started: `POST /api/me/find {consent: true, name, city, links[]}` (FIND ME: findings with sources) · `POST /api/me/compass/draft {kept[], answers}` · `POST /api/me/compass/confirm` · `GET /api/me/compass` · `POST /api/me/compass/propose {text}` · `POST /api/me/compass/changes/:id/undo` · `DELETE /api/me/compass`
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
- [x] Consent screen first; NO goes to three scripted questions. Inputs: name used online, city, optional links (max 3).
- [x] `src/llm/findme.ts`: at most 3 `web_search` calls about this person only; schema `{findings[{text, url}]}`; IS THIS YOU? with THAT'S ME / NOT ME.
- [x] Compass draft from ticked findings and answers: schema `{compass[{part, text, source_url}]}`; `src/rules/compass.ts` drops lines without a ticked source or "you said", and any personality, health, political, religious or sexuality label. LOOKS RIGHT / CHANGE SOMETHING / START AGAIN; nothing saved before LOOKS RIGHT.
- [x] MY COMPASS: lines with source, REMOVE, delete all, redo. Plain-words change with BEFORE / AFTER and UNDO: cut for now.
- [x] Compass used only to put matching signals first (FITS YOU). SUGGEST IT personalisation: later. Original item: Compass used only by SUGGEST IT and to put matching signals first for the viewer (FITS YOU, visible only to them). Never exposed through any other endpoint.
- [x] Tests: unticked findings never stored; another person's name refused; compass never in any response to anyone else; delete account deletes it.

### WP25 PLACE IT and place points (Sat 31, morning)
- [ ] `src/llm/place.ts` (PLACE IT): parallel tools `google_place_details` (live: hours, website, price level), `web_search` (menu on the place's website), `get_place_facts`; schema `{facts[{field, value, source, url}]}`; runs on first visit and when facts are over 30 days old.
- [ ] Place card: CONFIRMED HERE facts first, then AI / FOUND facts with their source line; Google attribution shown; THAT'S RIGHT / FIX IT / NOT ANY MORE.
- [ ] `src/rules/places.ts` (pure, tests first): points table (add place 10, add or fix 5, confirm 2), counted only on another person's confirmation or 24 h without dispute, only while checked in at that place, never for your own, max 30 a day, one confirm per fact per person per month; disputes revert to found.
- [ ] Edits pass `screening.ts` and SCREEN IT. MY MOMENTS shows your points privately; the Live page shows only collective counts.
- [ ] Tests: no self-confirm, cap, not checked in refused, Google rows never stored, points never public.

### WP21 Telegram Mini App and login (Wed 28, afternoon)
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
- [ ] `src/llm/agent.ts` (PLAN IT): tools `get_signal`, `get_place_spots`, `get_quick_replies`, `get_place_hours`, `draft_meeting_point` (draft only); parallel calls, max 4; returns "Terrace at 15:10?" with CONFIRM (issues the confirmation token) and CHANGE.
- [ ] Every AI answer writes a `workings` row and an `llm_calls` row.
- [ ] Tests: model never rewrites silently; invented event dropped; PLAN IT only proposes real spots; never "sent"; model-off paths.

### WP5 Meet and the connection rate (Sat 31)
- [x] From an accepted signal: MEET > shows a QR (10 minutes) plus a short code; the other scans and both agree; writes `interactions` (kind `here`, place, signal), a private moment each: "You met an actual human."
- [x] STAY IN TOUCH: both choose, then a friendship; one-sided choices are never revealed.
- [x] Tests: expiry, self-scan, blocked, one per pair per day, stay-in-touch only when mutual.
- [ ] Real-phone check: one phone shows the QR, the other's camera opens it, both tap WE MET.

### WP6 Live page (Sat 31)
- [x] Public `/live`: total real-life hellos since 27 Oct (both-confirmed), **real-world connection rate** ("7 of 9 accepted signals became a conversation"), check-in success rate, place details confirmed this week (collective), per place. Updates every 60 s. No names, no map, no leaderboard. Open Graph image.
- [ ] Open Graph image for `/live` and SAMPLE places excluded from the counts (both with WP9).

### WP14 CHECK IT and the evaluation set (Sun 1)
- [ ] SHOW THE WORKINGS under every AI answer: capability (Web search, Screening, Tools, Vision), tools in call order, citations, the screening verdict and category, grounded count, reasoning effort. No personal text beyond what the person already sees.
- [ ] `evals/` with about 30 cases (see `MUSE-SPARK-BY-FUNCTION.md`); `npm run eval` prints a pass rate; run before each deploy. Pass rate, median latency per function and fallback rate go into the README.

### WP7 Share card, slim (Sun 1)
- [ ] After a confirmed meet: "I went live." / "One of N real-life hellos on Hoolala!" / "You never know until you go." No names, no place unless the person ticks it. Web Share with the image, fallback links, COPY LINK.

### WP9 Safety, pilot and submission (Sun 1 to Wed 4)
- [ ] Safety pass: 18+ gate, block and report both ways, house rules on the poster and the first screen, rate limits on every model endpoint and on posting, replying, adding places and points, crisis message everywhere, privacy page in plain English (FIND ME consent and what is kept, place-level check-in, the person's coordinates discarded, Google attribution, check-ins deleted after 24 h, anonymity until both accept, what the model sees).
- [x] Demo place for judges: a clearly labelled SAMPLE place with a sample signal from "Sample Sophie" who accepts automatically, so a judge alone can do the whole loop. Never counted on the Live page.
- [ ] Dry run (Sat 31, café, friends) and pilot (Mon 2, place, 15 to 20 people). Measure the four metrics; observe whether people post or reply without help; ask "How comfortable was replying?" (1 to 5) and "What made you curious, uncomfortable or reluctant?"
- [ ] README: what it is, live URL, how to run, architecture, "Muse Spark by function" table, evaluation results, pilot results (honest, small numbers), "Built during the hackathon" vs `prior-work/`, Muse Code usage, limitations, licence.
- [ ] Video (3 minutes, hackathon work only, beat sheet in `MUSE-SPARK-BY-FUNCTION.md`), filmed at the place with consenting people only, no faces of anyone who didn't agree. Avoid lonely, shy, anxiety, therapy, coach, dating.
- [ ] Submit by 18:00 Wed 4 Nov; check everything in a private window; credits claimed. Post on X for Most Viral.

## Questions to confirm
- Meta Model API features on our key from Switzerland (see WP0).
- Pilot place (by Thu 29) and Google Maps key.
- Whether filming at the pilot place needs the owner's OK (assume yes; ask in person).
