# Hoolala! changelog

## 2026-10-27: Sandbox setup

- Stored the global `MuseCodeSandbox` service secret in sbx for sandbox use. Secret values stay out of the repository.
- Deployed the isolated `hoolala-staging` Worker with the `staging.hoolala.hg-labs.io` custom domain; production `hoolala.hg-labs.io` is unchanged. Staging currently serves static assets and health checks only.

## 2026-10-27 (later): Any place, FIND ME and place points (v5)

- **A venue is now any public place**: a café, a bar, a coworking space, a library. No partner or host needed; posters and codes stay optional for partner places.
- **Check-in:** share location and pick the place; not listed, ADD THIS PLACE (saved at that location; the place's coordinates come from the person who added it); location wrong, search by name. The person's own coordinates are discarded after the lookup; check-ins are deleted after 24 hours.
- **FIND ME (onboarding):** "Want a head start? OK to read your public profile?" Muse Spark searches only the person's own name, city and links (at most 3 searches), shows IS THIS YOU? with sources, and drafts the **Personal Compass** from what they tick. Only compass lines with their sources are stored. Private: used only for their own topic ideas and to show signals that fit them first. NO means three quick questions.
- **PLACE IT:** an agent with parallel tools (Google Maps place details live, web search for the menu and hours, our confirmed facts) fills the place card with sourced facts. People confirm or fix them; only then do they become Hoolala! facts. Google content is shown live with attribution and not stored, per the Google Maps Platform terms (place id kept; latitude and longitude only 30 days).
- **Place points (private):** add a place 10 (once someone else checks in), add or fix a detail 5 (once confirmed), confirm 2; only while checked in, never for your own, max 30 a day. Never for posting, replying or meeting. No leaderboards or public totals; the Live page shows collective counts only.
- Build plan: WP20 becomes places and check-in; new WP24 FIND ME and the compass (Fri 30), WP25 PLACE IT and points (Sat 31); share card image moves to "if time"; new cut order (PLAN IT first if late); Google Maps key with OpenStreetMap as fallback.
- Design system v5: PlaceCheckIn (replaces VenueCheckIn), FootprintCheck, PlaceCard; OnboardingStage, CompassReveal and PersonalCompass back in the build; product rules 38 to 41; new copy. `DESIGN.md` regenerated.

## 2026-10-27: Signals here becomes the hackathon hero

- Decision from the competitor review (`COMPETITOR-REVIEWS.md`): the hackathon build is **Signals here**. People at the same venue check in by scanning a poster, post and answer small invitations to talk, stay anonymous until both accept, agree a meeting point and confirm the meet-up with a mutual QR. North star: the **real-world connection rate**.
- New `SIGNALS-HERE.md` (wins on product scope): the check-in ladder (QR poster, optional location compared once and never stored, four-letter code, host), peek before sign-in, discover 3 at a time, post (60-character topic, when, spot, 1 to 3 people), I'M CURIOUS and mutual accept, first names only after accept, quick replies instead of chat, PLAN IT meeting points, STAY IN TOUCH only if both choose it, limits, safety, metrics and the pilot.
- Audience: anyone checked in at the same venue right now. Telegram Mini App as the main entry at the venue, email magic link on the web.
- Muse Spark functions now: SUGGEST IT (web search with citations), SCREEN IT (structured verdicts plus FR/EN translation, never rewrites), PLAN IT (parallel tools, draft only), CHECK IT (workings and evals), SNAP IT as a stretch. ARRIVE, MEET IT and STAY IN TOUCH use no AI, on purpose.
- Moved to after 4 Nov: Go App-Free, the Personal Compass, briefings, SAY IT, Telegram briefings (`PROJECT-INSTRUCTIONS-v3.2.md` kept as that brief). Moved to "if time": friends' Little Signals and Anyone around?, quick notes and invitations.
- Build plan rewritten: WP20 venues and check-in, WP21 Mini App, WP22 Signals here, WP23 the Muse Spark functions; new D1 tables (venues, checkins, checkin_attempts, signals with venue audience, signal_responses, quick_replies, meeting_points, blocks, stay_in_touch, metrics_daily).
- Pilot: a Lausanne coworking space on Mon 2 Nov 11:00 to 16:00 with 15 to 20 opt-in people, friends dry run Sat 31 Oct. **Venue to confirm by Thu 29 Oct**; fallback a café, a university common room or a meetup.
- Design system v4: VenueCheckIn, PlaceSignal, CuriousRequest, MeetingPoint with previews; product rules 28 to 37; new home (WHAT'S HERE? / POST ONE); poster, check-in, screening and accept copy; Signals here records and server rule; Go App-Free components marked ROADMAP. `DESIGN.md` regenerated.
- Pitch: "We've sat at the same table for six months." / Never spoken. Closing line: "Signals, not feeds." Not a dating app, said on the poster and the first screen.

## 2026-10-26: Design system v3 (Go App-Free and Muse Spark)

- The Hoolala! design system in Claude now covers the new direction; `claude/DESIGN.md` is regenerated from it.
- Nine new components with previews: OnboardingStage, CompassReveal, PersonalCompass (TELL IT), BriefingItem (FIND IT), VoiceNote (SAY IT), SnapResult (SNAP IT), AgentDraft (PLAN IT), Workings (CHECK IT), TelegramSurface.
- New visual rule for three voices on one screen: friends' words in solid paper blocks, Muse Spark text in dashed blocks with an AI / kicker, web finds with a `>` source line.
- Home: ANYTHING NEW? and GO APP-FREE keys; menu LITTLE SIGNALS, ANYONE AROUND?, INVITE THEM OUT, SNAP IT, MEET IRL; a microphone key in the chat.
- Product rules 21 to 27 (Go App-Free, compass, FIND IT, SAY IT and SNAP IT, PLAN IT, SHOW THE WORKINGS, Telegram); rule 20 now allows photos and voice as inputs only, never stored.
- Voice: positioning line "Your data. Your choice. Your attention.", new microcopy, banned screen-time arithmetic.
- Marked ROADMAP: small talk, Sounds familiar? and its sharing, Find a plan, Outside picks, Unplug.

## 2026-10-26: Muse Spark by function

- New `MUSE-SPARK-BY-FUNCTION.md`: Hoolala! turns "we should catch up" into "we did", and each step shows one Muse Spark capability. The steps are TELL IT (conversation state, structured output), SAY IT (native audio in Telegram), SNAP IT (vision: poster to plan), FIND IT (built-in web search with citations, grounded), PLAN IT (parallel tool calling, draft only) and CHECK IT (show the workings, evaluation set). Then the model steps out: MEET IT and GO LIVE.
- Build plan: WP11 now uses web search instead of RSS and shared links; WP12 adds SAY IT and PLAN IT; new WP13 SNAP IT and WP14 CHECK IT; scheduled delivery cut; demo circle for judges; new video beat sheet.
- Agent rules: one `src/llm/` file per function, `evals/`, `workings` rows, audio and images never stored.
- Kickoff risk: confirm Muse Spark access from Switzerland and which features are on our key.

## 2026-10-26: Hackathon rules and v3.2 Go App-Free (plan and docs only, no code yet)

- Read the official participant guide; new `HACKATHON-RULES.md`: deadline Wed 4 Nov 21:00 ET (03:00 Zurich), building period from 27 Oct, public repo, 3-minute video of hackathon work only, prior work clearly marked, four equally weighted criteria, anti-project list.
- New `PROJECT-INSTRUCTIONS-v3.2.md`: Go App-Free, an Opal-inspired but non-judgemental onboarding conversation run by Muse Spark; the Personal Compass ("What you're curious about right now"), editable in plain language with confirm and undo; sources with honest labels (LinkedIn and Instagram are "links you share only" because their platform rules forbid feed reading and digests); finite, grounded briefings; Telegram as the first external channel. Positioning: "Your data. Your choice. Your attention."
- Build plan reworked: WP10 onboarding and compass, WP11 sources and briefings, WP12 Telegram. Cut from the hackathon build: small talk missions, Sounds familiar? persistence and discovery, Find a plan as its own flow, Unplug, Outside Picks, NFC, voice, Muse Spark Open.
- Agent rules: `prior-work/` read-only and tagged `pre-hackathon`; `Agent: Muse Code` commit trailer; new folders `src/sources/`, `src/briefing/`, `src/channels/telegram.ts`; compass and briefing rules; no screen-time moralising.

## 2026-10-23: Project instructions v2 ("Anti-social media. Pro-social life.")

- **Little signals** (new core): eight presets or your own 40 characters, a dry reply ("Apparently you're accepting coffee applications."), expiry (4 hours default), share with the circle, chosen friends or keep private. Your active signal sits on home with edit and cancel. Not an online status.
- **Anyone around?**: lists only availability signals friends shared with you (sample: Sophie, Lucas), plus "You and Sophie last met in April." from your moments, then So... Thursday? with Suggest a plan, Leave a note or Maybe later. Mood signals, expired, cancelled and private ones never show (sample audience rule in `serverVisibleSignals`).
- **Catch me up**: notes and friends' signals together, three at a time. "That's three" with Ask for more, then "That's everything. We could show you more, but we'd have to make it up." Mood signals say "No reply needed."
- **Leave a note**: now offers a quick note (idea chips: "Finally finished moving.", "Thinking of you.") or Invite them out. My notes lets you edit or delete sent notes.
- **Black box sharing** for Sounds familiar?: black box, LCD card or plain text. Images are drawn on the device and shared through the share sheet, or shown to save.
- **Outside picks** (optional, from Find a plan): free or repaired activities, no sponsors. **Bring a friend** (from My moments): "Please don't follow us. Bring a friend."
- Copy: "You met an actual human. Remarkable technology. Apparently it works without Wi-Fi."; "Two hours offline. The internet has filed a missing-person report."; two new home observations ("Define soon.", "And yet, here you are."); about panel promise "Anti-social media. Pro-social life."
- Home menu: Little signals, Anyone around?, Leave a note, Find a plan, Small talk. Unplug and Meet IRL move to My moments.
- Design system: LittleSignal, SocialOpportunity, ExportCard; product rules 9, 10 and 15 to 19; signal record. Plan: WP4c, signals schema and endpoints, v2 success metrics.
- Still simulated: friends, signals and delivery are sample data; audience enforcement is a client-side stand-in for the server rule.

## 2026-10-23: Small talk is back

- New home menu item SMALL TALK: the original step-by-step feature, rebuilt in Mono LCD. First visit asks how chats with strangers feel and sets step 1, 2 or 3 of 5 (Smile and nod, Say hello, Small question, Short chat, Suggest a coffee).
- Loop: pick 1 of 3 missions (20 in total, drawn the same way all day) > guess 1 to 10 > try-saying line, when and where > off you go (mission stays on until you're back) > I did it / I tried / Not this time > actual 1 to 10 and one thing noticed > plot twist with two pixel bars, +1 courage, and a private insight after two runs.
- Ladder offers a step up after 3 runs with 2 done and a step down after a rough one; both optional. The LADDER softkey lets you pick any step.
- Chat routes "shy", "small talk", "nervous" and similar to it. My moments counts small talk tries.
- Fixed: screens no longer replay their entrance animation when you tap something on the same screen.
- Design system: new SmallTalkMission component, product rule 14, voice lines. Context and build plan: WP4b ports the starter repo engine into the web app.

## 2026-10-23: Brand personality, home observation and "Sounds familiar?"

Evolves the existing Mono LCD web prototype. No rebuild: the architecture, tokens, components and old-Nokia identity are unchanged. Mailbox, invitations (Leave a note), Find a plan, Unplug, Meet IRL, My moments and Go live all work as before.

### Brand and copy
- New personality: witty, observational, never preachy. Formula: what we say / what actually happens.
- About panel rewritten ("An anti-social-media social network. Not anti-social. Not anti-phone. Just mildly suspicious of group chats that never leave the group chat.").
- Banned phrases recorded in the design system voice ("reclaim your life", "disconnect to reconnect", "digital well-being" and similar).
- Signature unchanged: Hoolala! You never know until you go.

### Home
- Opens with one two-line observation from a curated set of six. Each visit shows the next one (rotation index kept in browser storage). No carousel, no auto-advance.
- Stepped "new message" reveal: setup first, punchline about a second later. Off with reduced motion.
- Two keys under the brand: SOUNDS FAMILIAR? and ANYTHING NEW? (the existing mailbox). The other actions follow as a short menu; the chat box stays at the bottom.

### New: Sounds familiar?
- Two-question composer: "What's something we always say?" then "And what actually happens?" (80 characters each, Enter to continue).
- MAKE IT SHORTER / MAKE IT FUNNIER give a labelled suggestion (AI / demo) built from the user's own words. USE THIS or KEEP MINE; never applied or published automatically.
- Preview visible only to the author, with a dry reaction and three choices: keep for myself, share with my circle (choose audience, confirm), contribute anonymously.
- Anonymous submissions are checked for names, places, emails, phone numbers, handles, links and addresses. If found, the user must edit or tick explicit consent. Then status "in review".
- Copy and Share outside (native share if the device allows it, otherwise clipboard, otherwise a select-and-copy box).
- My observations (from the composer and My moments): status per item, copy, delete with inline confirm.
- Optional SO... THURSDAY? after observations about meeting up. ASK A FRIEND opens the existing invitation flow prefilled for Thursday; MAYBE LATER goes home.

### New: finite discovery
- "Got anything funny?" in chat, or "Show me someone else's" in the composer.
- Three approved anonymous observations per session, then "That's all for now. The internet will survive."
- No likes, counts, authors, rankings or recommendations. Error state if the collection can't be reached.

### Design system
- New components with guidelines and previews: SocialObservation, ObservationComposer, ObservationPreview, ObservationShare, ObservationDiscovery, ObservationAction.
- Voice, product rules (13 and 14), and AI and data (observation record and tools) updated. DESIGN.md regenerated.

### Demo implementation (not production)
| Area | In the prototype | Needed for production |
|---|---|---|
| Storage | Browser storage on one device | Server records per the observation schema, owner-scoped |
| Sharing with circle | Simulated server receipt | Mailbox delivery via existing messaging, recipient ACL |
| Public collection | Six hard-coded approved samples; own submissions stay "in review" | Moderation queue, reviewer tool, approve/reject with reasons, takedown |
| Identifying-details check | Client-side patterns (circle names, capitalised words, places, contacts) | Server-side PII detection plus human review |
| AI help | Deterministic stand-in that trims filler or adds a deadpan tag | Model call with a prompt that preserves the author's idea, timeout and fallback, logged as suggestion only |
| Native share | Web Share where available, else clipboard | Same, plus share card image if wanted |
| Accounts | Single anonymous "you" | Existing authentication |

### Data model (observation)
`id, owner_id, say, happens, source.happens (human | ai-accepted | ai-edited), ai_suggestion, visibility (private | circle | public), audience, moderation (not-applicable | pending | approved | rejected), pii_consent, created_at, updated_at`
