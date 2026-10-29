<!-- Hoolala! Mono LCD design system, portable copy (v5, 27 Oct 2026). Source of truth: the Hoolala! design system in Claude. Product: SIGNALS-HERE.md and MUSE-SPARK-BY-FUNCTION.md. Drop into a repo as docs/DESIGN.md. -->

# Hoolala! Mono LCD

You never know until you go.

Hoolala! helps people who share a place actually talk. At any public place (a café, a bar, a coworking space) people get a head start from their public footprint as a private Personal Compass, check in by sharing their location or adding the place, keep the place's details right for private place points, post and answer small invitations to talk (Signals here), stay anonymous until both accept, and meet in person. It turns "we should talk sometime" into "we did". Beyond the venue, Hoolala! is a tiny, private social network that knows when to say goodbye. Friends leave each other short notes, little signals and plans. Muse Spark listens, looks, searches and drafts, then stops and lets two people decide. Catch-ups end after three at most, and the app's best moment is the screen that sends you back to real life. The look is early-mobile nostalgia: one green monochrome LCD, pixel type, inverted selection bars and little one-bit drawings.

This system is the visual **and interaction** source of truth for every Hoolala! surface: the web app, Telegram (Go App-Free), marketing pages and pitch material. Any agent (Claude, Muse Code, Cursor or another) building for Hoolala! starts here.

> The tagline "You never know until you go." always sits directly under the HOOLALA! name. It is the only brand line. The positioning line "Your data. Your choice. Your attention." is used for Go App-Free, the pitch and the README, never under the logo. "Less screen. More life." is retired and must not be used.
>
> Version 6 (29 Oct 2026): the first screen says GET OUTSIDE. MEET PEOPLE. GROW INSIDE. and offers today's **tiny try**; small talk (rule 14) is in the build, adapted by TRY IT within code-set bounds; the private plant; Friends (invite and crew timeline). Signals here stays, as the second path. New rules 42 to 45.
>
> Version 5 (27 Oct 2026): a venue is now **any place**, no host needed. FIND ME (onboarding from the public footprint, with consent) brings the Personal Compass back; check-in is share location, pick or ADD THIS PLACE; PLACE IT fetches place details people confirm for **place points** (private). New: FootprintCheck, PlaceCard; VenueCheckIn becomes PlaceCheckIn.
>
> Version 4 (27 Oct 2026): **Signals here** is the hackathon hero (check-in ladder, place signals, anonymous until both accept, quick replies, meeting points, the real-world connection rate). Muse Spark: SUGGEST IT, SCREEN IT, PLAN IT, CHECK IT, SNAP IT as a stretch. Go App-Free and its components move to ROADMAP.
>
> Version 3 (26 Oct 2026): adds Go App-Free, the Personal Compass and the six Muse Spark functions (TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT). Version 2 (23 Oct) replaced the purple "quest companion" system. The name is **Hoolala!** everywhere; "HOO!" is not used. "Hoolala!" is a working name, not trademark-cleared.

## How to use this system (agents read this first)

1. Read this README, then **Product rules**, **Voice and copy** and **AI and data**.
2. Take every colour, size and duration from `tokens.json`. Never type a hex value that is not a token.
3. Build only the flows and components described here. If a request needs a feed, a counter, a public profile, invented content or screen-time judgement, stop and say which rule it breaks.
4. Use sample data, clearly labelled, until a real API exists. Never fake an API result.
5. Components marked **ROADMAP** in their guidelines (Go App-Free and the Personal Compass, briefings, voice notes, Sounds familiar? and its sharing, Find a plan, Unplug, Outside picks) are designed but not in the hackathon build. Don't build them unless asked.

## The product in one sentence

A social network where messages wait for you, not the reverse: it connects a tiny trusted circle, helps turn what people say into real plans, then encourages everyone to get back to real life.

## The loop (v4): Signals here

| Step | The moment | Component |
|---|---|---|
| FIND ME | "Want a head start?" What's public about you, IS THIS YOU?, then your compass | FootprintCheck, CompassReveal, PersonalCompass |
| ARRIVE | Share location, pick the place or ADD THIS PLACE. GPS wrong? Search by name. No AI, on purpose | PlaceCheckIn |
| PLACE IT | Hours, menu, spots with sources; THAT'S RIGHT / FIX IT for place points | PlaceCard |
| PEEK and DISCOVER | "3 signals here right now", then three at a time, anonymous, translated | PlaceSignal |
| POST | A topic, when, where in the venue, for how many. SUGGEST IT gives ideas; SCREEN IT checks | PlaceSignal |
| RESPOND | I'M CURIOUS; the poster accepts; first names appear; quick replies only | CuriousRequest |
| PLAN IT | "Terrace at 15:10?" The agent drafts; the poster confirms | MeetingPoint |
| CHECK IT | SHOW THE WORKINGS: tools, citations, the screening verdict | Workings |
| MEET IT | Two phones, mutual QR, both agree. The connection rate ticks up. No AI, on purpose | PrivateKeepsake |
| STAY IN TOUCH | Both choose it, or nothing happens | CuriousRequest |
| GO LIVE | HOOLALA! IS OFF. YOU'RE ON. | EndOfSession |

The v3 loop (TELL IT, SAY IT, FIND IT briefings, Telegram briefings) is ROADMAP after 4 Nov; its components stay below, marked.

## Experience principles

| Principle | Build this | Never build this |
|---|---|---|
| **Pull, don't push** | CATCH ME UP opens 1 to 3 private items, on request; Telegram briefings on demand | A feed, unread badges, notification bait |
| **Finite by design** | Every sequence ends: THAT'S EVERYTHING. GO LIVE. | Endless next items, recommendations, infinite scroll |
| **A relationship, not an audience** | Notes to chosen people, confirmed before sending | Followers, likes, comments, public profiles |
| **Analog rhythm** | Occasional notes, one plan at a time, quiet hours | Typing indicators, read receipts, streaks, real-time pressure |
| **Present in the world** | Plans, a mutual opt-in QR tap, private keepsakes, venue-level check-in for a few hours | Location tracking, maps of people, claims that a meeting was verified |
| **Curious, then safe** | Topics before identities; anonymous until both accept; quick replies only | Profiles, photos, swiping, free chat with strangers, anything that feels like dating |
| **Care for places** | Private place points for adding and fixing place details | Points for socialising, leaderboards, public totals, streaks |
| **One small interface** | A conversational home and a few task panels | Dashboards, tab overload, push notifications |
| **Your attention, your rules** | A Personal Compass the person writes and edits in plain words, with undo | Hidden profiling, screen-time scores, productivity goals, "years reclaimed" |
| **AI as editor, shown openly** | Muse Spark drafts, ranks and explains; SHOW THE WORKINGS on every AI answer | AI-invented updates, autonomous social actions, a companion persona, black-box ranking |

## Visual foundations

### Colour: only the LCD

One colour world. Meaning comes from inversion, spacing and pixel drawings, never from a notification rainbow.

| Token | Hex | Rule |
|---|---|---|
| `lcd-bg` | #BED39C | The screen. Every app surface. |
| `lcd-surface` | #DDE7C6 | Paper: blocks, inputs, secondary keys. |
| `lcd-sunken` | #AEC58A | Depth: sunken panels, pressed states, the person's own messages. |
| `lcd-ink` | #182513 | Text, rules, icons, the selected bar, primary keys. |
| `lcd-ink-secondary` | #304327 | Secondary text, dashed dividers, AI labels. |
| `surround-bg` | #E5E8E0 | Page around the LCD on desktop and in docs. |
| `shell-bg` | #1B221B | Device shell, in mockups and hero images only. |

Contrast: `lcd-ink` on `lcd-bg` 9.9:1, secondary 6.6:1, reversed text on the selected bar 12.4:1. No gradients, no other hues, no coloured emoji, no glows, no soft shadows.

### Telling friends, AI and the web apart without colour

Three voices share one screen, so each has a fixed shape:

| Whose words | Shape |
|---|---|
| A friend's own words | `lcd-surface` paper block, solid 2px border, sender name in Silkscreen. Exactly as written. |
| Muse Spark (summary, reason, draft, suggestion) | Dashed `lcd-ink-secondary` border, kicker starting AI / (AI / SUMMARY, AI / WHY THIS, AI / DRAFT). |
| Something found on the web | Paper block with a `>` source line at the bottom (domain and date) linking to the original. |
| The person's own messages | `lcd-sunken` block, right aligned. |

### Typography

- **Silkscreen** (display): logo, titles, short menu labels, keys, status. Uppercase, short, never long text.
- **Space Mono** (body): notes, replies, prompts, inputs. Sentence case, 16px, line height 1.5.
- Google Fonts: `https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap`
- Controls never below 14px. 12px only for supplementary labels (kickers, status bar).
- Support accents and multilingual text: never strip characters to fit the pixel look.

### Layout and shape

- 8px grid with a 4px half step. Mobile first from 320px. The web app is responsive at every width, including Telegram webviews; do not build a separate mobile version.
- The app container is fluid (`width: 100%`) up to 960px, centred on `surround-bg`. Simple screens are one centred 42ch column (the measure sits on `main`); `.lcd-layout` screens and the softkey bar use the full width. Never put the measure on `body` or the entire app. Keep the LCD surface on desktop, without a phone bezel.
- Base layout: one column, 16px gutters. At 640px use 24px gutters; at 960px use 32px gutters. Existing simple screens remain one column with more space. Use the shared `.lcd-layout` wrapper only for related task panels: one column by default, two equal columns from 960px. Never add content just to fill desktop space.
- Keep one focal action, identical content and DOM order across widths. Forms and primary action lists stay at most 42ch wide. Allow labels, links and long text to wrap; grid children need `min-width: 0`. Keep controls at least 44px and body text at 16px; do not shrink the mobile UI to fit.
- Use the shared `public/styles.css` layout for all new pages. Verify 320, 390, 768, 1024 and 1440px widths, plus 200% zoom: no horizontal scrolling or clipped controls, readable text, and usable softkeys. Respect safe-area insets and dynamic viewport height.
- 2px borders, 2px squared corners on everything. Rounded corners only on the device shell in mockups.
- One focal action per screen. More empty space than information.
- Navigation through inverted selection bars and a softkey bar (left action, right BACK). They are real buttons.
- No device chrome in the product. The phone bezel is for hero images and demos only.

### Pixel drawings

- Icons on a 16 x 16 grid, shown at 24 or 32px, `image-rendering: pixelated` and `shape-rendering: crispEdges`, monochrome `lcd-ink`.
- Motifs: envelope, sun, hill, pine, record, bicycle, phone, stars, a hand-wave; new for v4 and v5: a door, a coffee cup, a table, a pin for the spot, a menu, a plus for a new place; v3: a compass, a microphone, a camera, a magnifying glass, a cog for the workings.
- Decorative terrain (hills, a pine, a sun) marks moments of ending and leaving. Illustration is never mistaken for user content.

### Motion

Brief and stepped: a 120ms inversion flash on press, entrances of 180ms or less. No smooth easing showpieces, no autoplay. While Muse Spark works, show a stepped pixel loader with what it is doing in words (LISTENING... / READING THE POSTER... / LOOKING NEARBY...), never a fake typing indicator. `prefers-reduced-motion` turns it all off.

## Accessibility (non-negotiable)

- Semantic HTML: real buttons, links and labelled form fields. Keyboard works everywhere; Escape returns home.
- Visible focus: 3px dashed `lcd-ink` outline, 3px offset.
- Every control at least 44 x 44px, menu rows at least 48px.
- Body 16px. Contrast AA or better, checked on the real ground.
- `aria-live="polite"` only for short replies, never for whole screens of content.
- AI summaries, reasons and drafts are visibly marked as AI and kept apart from friends' own words.
- Voice and photo inputs always have a typed alternative.
- Retro constraints never block comprehension.

---
# Product rules

The interaction contract. Every screen, agent reply and API must keep these.

## The home (v6, today)

**Home (TODAY):** HOOLALA! and the tagline. GET OUTSIDE. MEET PEOPLE. GROW INSIDE. (display, 40 px). One line: "One tiny thing to try in real life each day. Small enough to do on the way to somewhere. You decide, always." The plant card (pixel plant, N TINY TRIES, links to My moments). GIVE ME TODAY'S TRY > (primary). INVITE A FRIEND TOO > (secondary). Softkeys TODAY / FRIENDS. After GIVE ME TODAY'S TRY, the one-screen flow of rule 14 with the goal bar, the plant and step meter, the three-step path (current solid, done shaded, next dashed) and the typed HOOLALA! SAYS block. Signals here is a dashed link at the bottom of the flow.

## The compact header (v6, all screens)

One brand bar, 44 px high: **HOOLALA!** left (Silkscreen 700, 18 px), the tagline right (Space Mono 11 px, secondary ink), 24 px side margins, 2 px dashed bottom border. Replaces the phone-style status bar. Screen names live in the softkeys (TODAY · AROUND · FRIENDS), not the header.

## Hackathon build and roadmap (29 Oct 2026, v6)

In the build: sign-in (email magic link on the web), FIND ME and the Personal Compass (rule 22 and rules 38 to 39), places and check-in, PLACE IT and place points (rules 40 to 41), tiny tries (rule 14), TRY IT (rule 44), Friends invite and crew (rule 45), Signals here, I'M CURIOUS and mutual accept, quick replies, PLAN IT meeting points, SUGGEST IT, SCREEN IT, CHECK IT, mutual QR, the Live page with the connection rate, STAY IN TOUCH, the invite card (replaces the share card) and Go live. If time: the share card image, SNAP IT for menu boards, friends' Little Signals and Anyone around?, quick notes and invitations. **ROADMAP** (after 4 Nov): the rest of Go App-Free (rule 21; the compass itself is in the build), briefings (rule 23), SAY IT (rule 24, voice part), Telegram briefings (rule 27), Telegram Mini App and login (WP21), Sounds familiar? (12, 13, 18), Outside picks (19), Find a plan, Unplug, NFC.

## Non-negotiables

1. **No feed.** A catch-up shows at most 3 notes, one at a time, then an ending screen. No pagination, pull-to-refresh, recommendations, trending lists or "load more".
2. **Pull by default.** Notes stay unread until the person asks. Surprise delivery is opt-in and respects quiet hours. No unread counters on the home; the person asks ANY NEWS?
3. **Private by default.** Sharing needs chosen recipients and a confirmation. No public location, contact exposure, read receipts or online status.
4. **Complete, don't retain.** Every sequence ends with a way out: YOU'RE ALL CAUGHT UP. GO ENJOY YOUR DAY. No autoplay, streak loss, guilt, growth hooks or vanity counters.
5. **Confirm every outbound action.** Draft > show recipients > person confirms > backend publishes > receipt. Never show SENT before the backend acknowledges.
6. **One plan at a time.** Show date, time and timezone. RSVP needs a separate confirmation.
7. **Real life without surveillance.** QR or NFC is opt-in on both phones, short-lived and mutual. It proves proximity, never a conversation or a friendship.
8. **Reward wisely.** (Place points, rule 41, are the one exception: private credit for place data, never for social activity.) UNPLUG records a self-declared break. A web app cannot track whole-phone screen time, so never claim it. Moments are private keepsakes: no scores, leaderboards or comparisons.
9. **A light facilitator, not a companion.** The chat retrieves what friends shared, summarises accurately, helps people say what they mean, surfaces mutual opportunities and recognises when it's done ("That's everything. We could show you more, but we'd have to make it up."). It never invents updates, availability or feelings, keeps friends' words separate from its own suggestions, and never sends, shares or invites without approval. Not a therapist, not an engagement optimiser.
10. **Notes are small and effortless.** LEAVE A NOTE offers a QUICK NOTE ("Finally finished moving.", "Thinking of you.") or INVITE THEM OUT (activity, when, where, who). Recipients are chosen every time; notes can be edited and deleted (MY NOTES). Never require interesting content or a posting schedule. Invitations are answered I'M IN or NOT THIS TIME, no explanation needed.
11. **GO LIVE switches Hoolala! off.** The joke flips "going live": the pixel screen SWITCHES TO FULL RESOLUTION... while a resolution readout steps 84 x 48 > 640 x 480 > 1920 x 1080 > 7680 x 4320 > REAL LIFE, then the backlight steps down to `shell-bg` (about 3s in total, instant with reduced motion). The dark screen shows a blinking LIVE light, HOOLALA! IS OFF. YOU'RE ON., the line "Now showing everywhere except here. Your phone can take a break too." and one SWITCH ON key. Keep it a wink: never lecture about screen time. No app can power off a phone, so never claim it did; a native build may later offer to start the OS Focus or Do Not Disturb mode, with permission.
12. **ROADMAP. Sounds familiar? is finite and private by default.** Observations are two short lines (80 characters each), saved privately unless the author picks circle or anonymous public. Public ones pass an identifying-details check and human moderation first. Discovery shows three per session, then ends. No likes, counts, authors, rankings or feed. The point is to recognise a moment, smile, and maybe make something happen, not to make more content.
13. **AI suggests, people decide.** AI help on observations stays in a labelled suggestion, preserves the author's idea, and is never published automatically.
14. **Small talk is step by step and private.** One tiny try at a time with people you don't know yet, on a 5-step ladder (1 Smile and nod, 2 Say hello, 3 Small question, 4 Short chat, 5 Suggest a coffee). One screen, three steps: GET A TRY (I'M IN / ANOTHER ONE / NOT TODAY, plus WHERE? anywhere, café, work) > GO (the try-saying line, I'M BACK) > TELL ME (WENT WELL / NO REPLY / GHOSTED / AWKWARD BUT DONE / DIDN'T HAPPEN). Then NEXT TIME: GENTLER / SAME STEP / BRAVER. Hoolala! suggests one (braver after it went well, same after no reply or awkward, gentler after it didn't happen); the person decides. Nobody is moved up or down without a tap. Courage counts tries, not wins: a leaf for every try made, whatever happened. No streaks, no reminders, nothing public. Public everyday places only; no flirting or pick-up tries; "no thanks" is always a fine answer. Kind lines: "No worries, sometimes it happens. It says nothing about you." / "Awkward just means new. It wears off." / "The plant doesn't mind."
15. **Little signals, not an online status.** A signal is a voluntary, temporary hint ("Coffee wouldn't hurt.", "Social battery: 12%.", or 40 characters of your own) shared with the circle, chosen friends, or kept private. Default expiry 4 hours (1 hour, tonight or tomorrow morning also offered); edit or cancel any time. Recipients only meet a signal when they catch up or ask ANYONE AROUND?. Expired, cancelled or private signals never reach anyone, enforced on the server. No presence dots, no "seen", no pressure to reply, no notifications unless authorised.
16. **Anyone around? uses only what friends shared.** It lists availability signals friends explicitly shared with this person, may add what the person's own moments say ("You and Sophie last met in April."), then offers SUGGEST A PLAN / LEAVE A NOTE / MAYBE LATER. Mood signals (one of those days, do not disturb-ish, low battery) are never used for suggestions or automated outreach. No inference from location or behaviour, no matching with strangers, nothing sent without approval.
17. **Catch-ups come in threes.** ANYTHING NEW? shows notes and signals three at a time. After three: THAT'S THREE. ASK FOR MORE only if the person asks. At the end: THAT'S EVERYTHING. WE COULD SHOW YOU MORE, BUT WE'D HAVE TO MAKE IT UP.
18. **ROADMAP. Black box sharing.** Observations export in three styles: black box (white on black), LCD card (pixel), plain text. Cards carry only the joke and a small HOOLALA! signature. Social platforms are acquisition channels, never an engagement model to copy. Growth line: PLEASE DON'T FOLLOW US. BRING A FRIEND.
19. **ROADMAP. Outside picks are optional and clean.** A clearly labelled OUTSIDE PICKS screen suggests free, borrowed or repaired activities. No paid placements in private messages, no data selling, no behavioural ads, no hidden sponsorships, nothing that monetises emotional vulnerability. Any future partner (e.g. mission-aligned outdoor brands) needs human approval and a visible label.
20. **No pictures or video as content.** Notes are text. A photo for SNAP IT and a voice note for SAY IT are inputs only: processed in memory, never stored, never shown to anyone else, and always with a typed alternative.
21. **ROADMAP. Go App-Free starts with what you want more of.** TELL IT is a short conversation (five stages on camera: what you'd like more of, what makes digital time worthwhile, what to hear less about, how often, the reveal). Playful first line ("Hello, human."), multiple choices plus free text, at most one follow-up question per stage, progress cells, BACK and SKIP everywhere, every answer editable. Never ask for age, screen-time estimates or anything not needed.
22. **The Personal Compass is yours, in your words.** "What you're curious about right now": intentions, interests, filters, delivery and welcome actions, built only from what the person said or chose. Never a score, a personality label or a judgement of behaviour. Plain-language edits ("Only send me things near Lausanne") show BEFORE / AFTER and save only on CONFIRM; every change sits in a CHANGES list with UNDO. Nothing learnt from time spent, opens or scrolling.
23. **ROADMAP. FIND IT is finite, grounded and explained.** ANYTHING NEW? shows at most the person's cap (default 3): friends' notes, signals and invitations first, in their own words, then up to two finds from the web. Each AI line says why it is there (AI / WHY THIS: "Because you said: live music.") and every web find shows its source. Lines that can't be traced to a real item or a returned source are dropped. Ends with one action at most and THAT'S EVERYTHING. WE COULD SHOW YOU MORE, BUT WE'D HAVE TO MAKE IT UP. Feedback (MORE LIKE THIS / NOT USEFUL / LESS OF THIS) becomes a visible compass change with UNDO.
24. **SAY IT and SNAP IT show what was understood before anything happens.** YOU SAID: "..." or LOOKS LIKE: Jazz at Le Bourg, Thu 21:00, with FIX IT and NOT NOW. Low confidence opens the details for checking first. Never describe people or faces from a photo.
25. **PLAN IT drafts, people send.** The agent may combine shared availability, finds and the compass into one draft invitation, labelled AI / DRAFT. It always stops at SEND THIS TO SOPHIE? with YES, SEND IT and EDIT. Mood signals never reach it. Never "SENT" before the server confirms.
26. **Show the workings.** Every AI answer has a SHOW THE WORKINGS key: the capability used, tools called, sources, "Grounded: 3 of 3 lines", the compass line behind each item. It shows method, never other people's private data.
27. **ROADMAP. Telegram is the same Hoolala!, smaller.** Go App-Free links Telegram with a single-use link. Briefings arrive only when asked ("anything new?"). Same caps, labels, confirmations and endings as the web; no chat-style companionship, no "good morning" messages, no streaks. PAUSE and UNLINK work from both sides.

28. **Arrive without friction (no AI).** Check-in is a ladder, never a dead end: share location once (explained first: "Only to find the place you're in."), pick the place from those within about 150 m; not listed, ADD THIS PLACE (name and kind, saved at that location); location wrong or off, search by name within your city; partner places may have a QR poster and code. The person's own coordinates are discarded after the lookup; only places people add are saved, and check-ins are deleted after 24 hours. Public places only. Failure copy is kind and specific: "Your phone thinks you're in the lake. Search for the place instead."
29. **Curiosity before identity.** Scanning shows PEEK: the place and up to 3 open topics, no names, before signing in. Sign-in is one tap in Telegram, an email link on the web.
30. **Signals here are for the room, for a while.** Everyone checked in at the same place right now can see a place signal; nobody else can. A topic is 60 characters, with WHEN, WHERE (a spot in the place) and FOR HOW MANY (1 to 3). It expires at its time plus 30 minutes, when the poster leaves, or after 2 hours. At most 2 open signals per person. Discovery shows 3 at a time, then THAT'S EVERYTHING HERE RIGHT NOW. POST ONE? No feed, no map, no "people near you".
31. **Anonymous until both accept.** Before acceptance everyone is "Someone here". I'M CURIOUS (with an optional line, 60 characters) goes to the poster, who chooses ACCEPT or NOT THIS TIME. Only after acceptance do the two see each other's first names. Never photos, profiles, last names or contact details.
32. **Quick replies, not chat.** After acceptance: ON MY WAY / 5 MINUTES LATE / CAN'T MAKE IT / WE'RE AT THE [SPOT]. No free text between people who met through a signal.
33. **Screened, never rewritten.** Every topic, reply line and suggestion passes code rules (contacts, links, length, words) and SCREEN IT (verdict, category, reason). The model approves or rejects; it never changes someone's words. A rejection says why in Hoolala! voice and offers EDIT. Not dating, not selling, not recruiting.
34. **Suggestions and plans are drafts.** SUGGEST IT ideas are labelled AI / SUGGESTION, cite their source when they mention an event, and are never posted without a tap. PLAN IT proposes a spot and time labelled AI / DRAFT; the poster confirms.
35. **Real-world connection rate is the only metric we show off.** The Live page shows collective numbers: real-life hellos (both-confirmed), the connection rate (accepted signals that became a QR-confirmed meet-up) and first-try check-in success. Never per person, never ranked.
36. **Stay in touch is mutual or invisible.** After a confirmed meet-up, each can choose STAY IN TOUCH. Only if both do does a friendship start. A one-sided choice is never revealed.
37. **Leaving is always one tap.** I'M LEAVING ends the check-in and hides your signals; responders see "They had to go." Block works both ways at every place; report hides the item at once.

38. **FIND ME asks first and only looks at you.** "Want a head start? OK to read your public profile?" YES, HAVE A LOOK / NO, I'LL TELL YOU. It searches only the name, city and links the person gives, at most three times; shows IS THIS YOU? with THAT'S ME / NOT ME (namesakes are normal); keeps only ticked findings; and stores only the compass lines that come out of them, each with its source. Never another person, never a login to a social network, never the raw results.
39. **The compass stays private.** Interests in the person's words, each with "from: [source]" or "you said". It shapes only their own topic ideas and puts signals that fit them first (FITS YOU, shown only to them). Never shown to others, never used to match, rank or recommend people. No personality types, scores, health, politics, religion or sexuality.
40. **Place facts say where they came from.** The place card shows CONFIRMED HERE facts (people at the place) first, then AI / FOUND facts with a source line (> google maps, > the place's website). Google Maps content is shown live with attribution and not kept. A fetched fact becomes a Hoolala! fact only when a person confirms or fixes it. Edits are screened. Places are public places only.
41. **Place points are for caring for places, and private.** Add a new place 10 (once someone else checks in), add or fix a detail 5 (once confirmed or undisputed for a day), confirm a detail 2. Only while checked in there, never for your own, at most 30 a day. Shown only to you in MY MOMENTS ("You've helped 4 places."); the Live page shows collective counts only. **Never points for posting, replying or meeting people.** No leaderboards, levels, badges for rank, streaks or public totals.
42. **Colour is earned.** The interface stays LCD monochrome. Colour appears only in the plant, and only for tries the person made: greens for leaves, pink, yellow and blue for flowers. The plant is private, never wilts, never shrinks and is never compared.
43. **Hoolala! types.** Hoolala!'s prompts appear letter by letter (about 25 ms a character) with a block cursor; the keys rise in only when the text is complete. With `prefers-reduced-motion`, text and keys appear at once. Never type the person's own words.
44. **Code owns the step and the score; TRY IT writes the words.** Each step has hard bounds (talking, minutes, what is asked of the other person). TRY IT drafts a try as structured output; `src/rules/tries.ts` rejects anything outside the step it was asked for or against the always-on limits, SCREEN IT gives a second verdict, and the hand-written library is the fallback. Every try is stored with the step code assigned, never a step the model claims. Leaves are flat (one per try). Step changes need the person's tap. The "why this one" line is SHOW THE WORKINGS.
45. **Friends share stories, not scores.** A crew is small and private (invite link, one crew, expires in 7 days, anyone can be removed). The timeline shows what happened, with its honest tag, and NICE ONE. No counts per person, no "not yet" lists, no leaves for posting (rule 41). No names, faces or photos of strangers; posts pass screening. Invites go out by WhatsApp, Messenger or a copied link; never auto-sent, never to contacts we read.

## The primary flows

| Flow | Screens | Ends with |
|---|---|---|
| Get started | Sign in, 18+ > WANT A HEAD START? > name, city, links > IS THIS YOU? > YOUR WORLD, ACCORDING TO YOU. | LOOKS RIGHT saves the compass; NO goes to three questions |
| Arrive | WHERE ARE YOU? > share location > pick the place (or ADD THIS PLACE, or search) > checked in > PEEK | HERE UNTIL 15:40. |
| This place | THIS PLACE > confirmed facts, then AI / FOUND with sources > THAT'S RIGHT / FIX IT / NOT ANY MORE | NOTED. +5 PLACE POINTS ONCE SOMEONE CONFIRMS. |
| Discover | WHAT'S HERE? > 3 signals, anonymous, translated > I'M CURIOUS | THAT'S EVERYTHING HERE RIGHT NOW. POST ONE? |
| Post one | Topic (or NEED A TOPIC? > 3 AI ideas) > when, where, how many > CHECKING... > SIGNAL UP. | Your signal on home until it expires |
| Curious and accept | I'M CURIOUS (+ line) > the poster sees SOMEONE HERE IS CURIOUS > ACCEPT or NOT THIS TIME > first names | Quick replies and a meeting point |
| Meeting point | PLAN IT: "Terrace at 15:10?" > CONFIRM or CHANGE | ON MY WAY, then MEET |
| Meet and stay in touch | MEET > QR > both agree > YOU MET AN ACTUAL HUMAN. > STAY IN TOUCH? | +1 private moment; a friendship only if both chose it |
| Leave | I'M LEAVING > signals hidden | THANKS FOR DROPPING BY. GO LIVE? |
| Tiny try | GIVE ME TODAY'S TRY > GET A TRY > GO > TELL ME > NEXT TIME | A leaf on the plant for every try made |
| Catch up | ANYTHING NEW? > notes and signals, 3 at a time > THAT'S THREE (ASK FOR MORE) > end | THAT'S EVERYTHING. WE COULD SHOW YOU MORE, BUT WE'D HAVE TO MAKE IT UP. |
| Little signals | Pick a signal or write one > dry reply > how long > circle / choose friends / private | SIGNAL UP. Shows on home until it expires |
| Anyone around? | Friends' shared availability signals > SO... THURSDAY? | Suggest a plan, leave a note, or maybe later |
| Reply | Note > write > review recipient and words > confirm | Receipt, or a plain error |
| Leave a note | Quick note (chips, who, review, send) or invite them out; MY NOTES to edit or delete | NOTE LEFT. |
| Invite them out | Pick an activity (board games, card games, grab a coffee, walk in the park, picnic, something else) > when, time, where, who, one line > review > confirm | INVITATION OUT., or a plain error. Answers arrive with the next catch-up |
| Go App-Free (TELL IT) | Hello, human. > what you'd like more of > what makes it worthwhile > less of > how often > YOUR WORLD, ACCORDING TO YOU. > link Telegram | LOOKS RIGHT, then a first briefing or a labelled PREVIEW |
| My compass | Compass lines > edit or say it in plain words > BEFORE / AFTER > confirm; CHANGES with UNDO | SAVED. or UNDONE. |
| Find it | ANYTHING NEW? > friends' items, then finds, up to the cap, each with AI / WHY THIS | THAT'S EVERYTHING. One action at most |
| Say it | Hold the mic or send a voice note > YOU SAID: "..." > routes to Find it or Plan it | A draft to confirm, or an answer |
| Snap it | Take or choose a photo > READING THE POSTER... > LOOKS LIKE: ... | SO... THURSDAY? opens Plan it, or NOT NOW |
| Plan it | One request > the agent checks what friends shared > AI / DRAFT > SEND THIS TO SOPHIE? | INVITATION OUT. only on a server receipt |
| Show the workings | SHOW THE WORKINGS > capability, tools, sources, grounded lines | BACK to the answer |
| Meet IRL | Both start > scan > both agree | +1 PRIVATE MOMENT, the Live number ticks up |
| Chat | One question > one short answer and one action | Routes into a flow, or a goodbye |
| ROADMAP | Find a plan, Unplug, Sounds familiar?, Discovery, the small-talk guess and plot twist (designed, see their components) | |

## Required states

Every flow designs: empty (NO NEWS RIGHT NOW. THAT'S OKAY.), loading (a short stepped pixel loader, no spinner theatre), error (CAN'T REACH YOUR NOTES RIGHT NOW. WANT TO TRY LATER?, retry only on request), and end of session.

## Evaluation checklist

- [ ] Looks like a legible monochrome pixel LCD, not a modern feed.
- [ ] Works at 320px and by keyboard alone.
- [ ] Every action has a finite completion point.
- [ ] No feeds, reactions, followers or competitive scores.
- [ ] AI only summarises permitted, real content, labels itself AI /, shows its workings and confirms outbound actions.
- [ ] Nothing judges screen time; the compass holds only what the person said.
- [ ] Photos and voice notes are never stored and always have a typed alternative.
- [ ] NFC, device tracking and messaging are not misrepresented.
- [ ] UK English, no em dashes, all sample data labelled.

---
# Voice and copy

Hoolala! is an anti-social-media social network. Not anti-social, not anti-technology, and definitely not a digital wellness coach.

## Personality

Witty, sarcastic, subtle, curious and unmistakably human. Observational humour from ordinary social life. Laugh with people, never at them. Show the absurdity instead of explaining the problem. Create curiosity, not guilt. It should read like a funny observation from a friend on an old Nokia, not a campaign from an agency.

## The formula: what we say, what actually happens

| What we say | What actually happens |
|---|---|
| "We live five minutes apart." | It's been six months. |
| "Anyone up for a drink?" | 47 people in the group. Three typing. Nobody answering. |
| "We should do this more often." | See you next Christmas. |
| "Let's organise something!" | A new WhatsApp group was born. Nothing else. |
| "I'll let you know." | Last seen in 2023. |
| "We have to meet before you leave." | Sent from the airport. |
| "We've sat at the same table for six months." | Never spoken. |
| "We should grab lunch sometime." | Eats at the desk. Every day. Same desk. |

Signature: **Hoolala!** *You never know until you go.*

Positioning (Go App-Free, pitch, README; never under the logo): **Your data. Your choice. Your attention.**

Pitch line for the hackathon (v4; video opening, README; never under the logo): **"We've sat at the same table for six months." / Never spoken.** Then **Signals, not feeds.**

Pitch line for Go App-Free (ROADMAP): **Hoolala! reads the feed, so you don't have to. You decide what to do with it.** "The feed" only ever means what Hoolala! can honestly read (friends' notes and signals, compass-shaped web finds, shared links), never other platforms' feeds.

The difference to keep: other apps ask what is distracting you. Hoolala! asks what you'd like more of. A person who deliberately watches six hours of video is not failing Hoolala!.

## Banned

Preachy, motivational or self-righteous lines: "reclaim your life", "disconnect to reconnect", "improve your digital well-being", "be more present", "touch grass". Any line that judges how someone uses their phone. Screen-time arithmetic: "years of your life", "hours wasted", "time reclaimed", productivity scores. Scarcity or fear in onboarding ("Don't miss out", "Only 2 spots left").

## Style rules

- UK English (favourite, colour, neighbour). No em dashes.
- **Labels, titles and keys** in Silkscreen uppercase, 1 to 4 words: `ANY NEWS?`, `I'M IN`, `OFF YOU GO!`.
- **Friends' notes, replies and long text** in Space Mono, sentence case, exactly as written. Never uppercase a person's words.
- Agent replies: 240 characters or fewer where possible, one suggested action.
- Hoolala! may say "I" in the chat as a plain helper, but never claims feelings, never says it missed anyone, never asks people to stay.
- AI text always wears its label: AI / SUMMARY, AI / WHY THIS, AI / DRAFT, AI / SUGGESTION. Friends' words never do.
- Loading lines say what is happening, plainly and briefly: LISTENING... / READING THE POSTER... / LOOKING NEARBY... / CHECKING WHAT FRIENDS SHARED...

## Microcopy

| Moment | Copy |
|---|---|
| Under the name (always) | You never know until you go. |
| Poster (optional, partner places) | SIGNALS HERE. / Small invitations to talk, from people in this room. / Scan to see what's up. Or type the code: KAFE. / Not a dating app. Anonymous until you both say yes. |
| Get started (FIND ME) | WANT A HEAD START? / Hoolala! can look at what's public about you online to guess what you like talking about. OK? / YES, HAVE A LOOK / NO, I'LL TELL YOU / LOOKING YOU UP. POLITELY... / IS THIS YOU? / THAT'S ME / NOT ME / Apparently there are three of you. Which one's you? / Only you see this. We keep the compass, not the search. |
| Arrive | WHERE ARE YOU? / Only to find the place you're in. / CHECKING YOU IN... / HERE UNTIL 15:40. / Not on the list? ADD THIS PLACE / Your phone thinks you're in the lake. Search for the place instead. |
| Add a place | WHAT'S IT CALLED? / WHAT KIND OF PLACE? / PLACE ADDED. Points arrive when someone else checks in. Bring a friend? |
| The place (PLACE IT) | THIS PLACE / CHECKING THE MENU... / CONFIRMED HERE / AI / FOUND > google maps / THAT'S RIGHT / FIX IT / NOT ANY MORE / NOTED. +5 PLACE POINTS ONCE SOMEONE CONFIRMS. / The internet says 4.50. The internet is not always right. |
| Place points | You've helped 4 places. 62 place points. / Points for caring for places. Never for people. |
| Peek | 3 SIGNALS HERE RIGHT NOW. / Topics only. Names come later, if both of you want. / I'M CURIOUS > |
| Discover | WHAT'S HERE? / Someone here / 15:00 / Coffee machine / THAT'S EVERYTHING HERE RIGHT NOW. POST ONE? / ORIGINAL |
| Post one | WHAT'S THE TOPIC? / NEED A TOPIC? / AI / SUGGESTION / CHECKING... / SIGNAL UP. Visible to people here until 15:30. |
| Screening refusal | That sounds more like a date than a coffee break. Try again? / Let's keep phone numbers out of it. Meet first. / Selling something? This room's off the clock. |
| Curious | I'M CURIOUS / Add a line? (optional) / SENT. They'll decide. No pressure either way. |
| Accept | SOMEONE HERE IS CURIOUS. / ACCEPT / NOT THIS TIME / You're on. It's Lea. / Not this time. No hard feelings. |
| Quick replies | ON MY WAY / 5 MINUTES LATE / CAN'T MAKE IT / WE'RE AT THE TERRACE |
| Meeting point | AI / DRAFT: Terrace at 15:10? / CONFIRM / CHANGE |
| Stay in touch | STAY IN TOUCH? / Only if you both say yes. We'll never tell them if you don't. |
| Leaving | I'M LEAVING / THANKS FOR DROPPING BY. Your signals are gone. / They had to go. |
| Example topics | "Coffee break at 15:00. Small talk welcome, work talk tolerated." / "Anyone else stuck on a pitch deck? Moral support at the kitchen." / "First week here. Where's the good coffee?" / "Their flat white is apparently famous. Verdict at 16:00?" |
| Home | One two-line observation, then HOOLALA! You never know until you go. Keys: SOUNDS FAMILIAR? / ANYTHING NEW? |
| Sounds familiar? | What's something we always say? / And what actually happens? / Painfully accurate. Want to share it? |
| Discovery | Here's one someone left behind… / That's all for now. The internet will survive. |
| Optional nudge | So… Thursday? [Ask a friend] [Maybe later] |
| Small talk | TINY MISSION. GREAT STORY? / HOW DO YOU THINK IT'LL GO? / OFF YOU GO. The world isn't going to surprise itself. / SO... HOW DID IT ACTUALLY GO? |
| Plot twist | PLOT TWIST! That beat your guess by 5. / SPOT ON. You know yourself well. / ROUGH ONE. That happens, and you still went. That counts. / +1 COURAGE |
| Little signals | HOW ARE YOU, ROUGHLY? / "Coffee wouldn't hurt." > Apparently you're accepting coffee applications. / "Do not disturb-ish." > The "-ish" is doing a lot of work there. / SIGNAL UP. |
| Anyone around? | Sophie could be persuaded into coffee. / Lucas is out and about. / You and Sophie last met in April. / SO... THURSDAY? |
| Catch-up end | THAT'S THREE. There's a bit more. Only if you ask. / THAT'S EVERYTHING. We could show you more, but we'd have to make it up. |
| Offline | Two hours offline. The internet has filed a missing-person report. / Nothing happened here while you were away. Beautiful. |
| Meet IRL | YOU MET AN ACTUAL HUMAN. Remarkable technology. Apparently it works without Wi-Fi. |
| Growth | Please don't follow us. Bring a friend. / Nothing to see here. And yet, here you are. |
| Promise | Anti-social media. Pro-social life. |
| Mailbox | 3 NOTES WAITING. OPEN THEM WHEN YOU WANT. |
| Note | A NOTE FOR YOU. / 2 OF 3 |
| End of catch-up | THAT'S EVERYTHING FOR NOW. GO LIVE. |
| Empty | NO NEWS RIGHT NOW. THAT'S OKAY. GO ENJOY YOUR DAY. |
| Error | CAN'T REACH YOUR NOTES RIGHT NOW. WANT TO TRY LATER? |
| Leave a note | WHAT SHALL WE DO? Pick something to do together. The world is the venue. |
| Invitation lines | "Board games at mine? I'll bring snacks." / "Fancy a coffee? An hour, no phones, proper catch-up." / "Walk in the park? Easy pace, lots of chatting." |
| Invitation sent | INVITATION OUT. Their answers arrive when you ask for news. |
| Before sending | SEND THIS TO SOPHIE? |
| After a break | NICE ONE. THE BEST PART HAPPENED AWAY FROM HERE. |
| Meet IRL | GOOD TO MEET YOU. +1 PRIVATE MOMENT |
| Sign-off | THAT'S ALL. OFF YOU GO. |
| Go App-Free (TELL IT) | GO APP-FREE / subtitle: Hoolala! reads the feed, so you don't have to. You decide what to do with it. / Hello, human. / Before we get acquainted, what would you like a little more of? / What would make your digital time feel worthwhile? / Anything you'd rather hear less about? / How often should I bother you? / Your rules. Change them whenever you like. |
| Intention choices | More real-world adventures. / Better connections with friends. / Interesting career opportunities. / Learning and inspiration. / Something else entirely. |
| Profile reveal | YOUR WORLD, ACCORDING TO YOU. / Everything else can wait. / Sound about right? [LOOKS RIGHT] [CHANGE SOMETHING] [START AGAIN] |
| Personal compass | YOUR PERSONAL COMPASS / What you're curious about right now: / CHANGES / UNDO |
| Compass edit | BEFORE / AFTER / SAVE THIS CHANGE? / SAVED. / UNDONE. Like it never happened. |
| Find it | ANYTHING NEW? / AI / WHY THIS: Because you said: live music. / Found on the web. Here's where. / THAT'S EVERYTHING. We could show you more, but we'd have to make it up. |
| Find it feedback | MORE LIKE THIS / NOT USEFUL / LESS OF THIS / Noted. Fewer football fixtures from now on. [UNDO] |
| Say it | LISTENING... / YOU SAID: "Anyone free for coffee Thursday?" / Didn't catch that. Mind typing it? |
| Snap it | READING THE POSTER... / LOOKS LIKE: Jazz at Le Bourg, Thu 21:00. / SO... THURSDAY? / Couldn't read it. The poster wins this round. Type it in? |
| Plan it | CHECKING WHAT FRIENDS SHARED... / Sophie could be persuaded into coffee, and the jazz fits you both. Shall I draft it? / AI / DRAFT |
| Show the workings | SHOW THE WORKINGS / HOW I GOT HERE / Grounded: 3 of 3 lines. / Sources / Model off: rules only. |
| Telegram link | Go App-Free. Same Hoolala!, fewer screens. / Linked. I'll only speak when spoken to. / Paused. Say "anything new?" whenever you like. |
| Privacy (photos, voice) | Read, then forgotten. We don't keep your photo. / Heard, then forgotten. We don't keep your voice note. |
| Go live (shutdown) | GOING LIVE / SWITCHING TO FULL RESOLUTION... / RESOLUTION: REAL LIFE |
| Switched off | LIVE / HOOLALA! IS OFF. YOU'RE ON. / Now showing everywhere except here. |

## Retired

"Less screen. More life." is retired. Do not use it in any surface.

## Never

| Never say | Say instead |
|---|---|
| "You're addicted to your phone." | Nothing. Never comment on phone use. |
| "You missed 12 updates!" | ANY NEWS? (only when asked) |
| "Your streak ends tonight." | Nothing. There are no streaks. |
| "Sophie is online now." | Nothing. No online status. |
| "SENT!" (before the server confirms) | SENDING... then SENT TO SOPHIE. or COULDN'T SEND. TRY AGAIN? |
| "I'll always be here for you." | THAT'S ALL. OFF YOU GO. |
| "You've reclaimed 4 years of your life!" | Nothing. Never count anyone's time. |
| "Based on your behaviour, you seem..." | Nothing. The compass only holds what you told us. |
| "Good morning! Here's your daily digest" (unasked) | Nothing until they ask ANYTHING NEW? |
| "I sent the invitation for you." | SEND THIS TO SOPHIE? then SENT TO SOPHIE. after the server confirms |
| "Your friends are posting more than you." | Nothing. No comparison. |
| "12 people near you!" | 3 SIGNALS HERE RIGHT NOW. (topics, never people) |
| "Lea viewed your signal." | Nothing. No views, no "seen". |
| "Find your match" / "Who's single here?" | Nothing. Not a dating app. |
| "Based on your profile, you're an introvert." | Nothing. The compass holds interests you confirmed, never types. |
| "Lea also likes jazz!" | Nothing. Nobody sees anyone's compass. |
| "You're #3 contributor in Lausanne!" | You've helped 4 places. (only to you) |

---
# AI and data

AI is the conversational navigation layer, never the source of anyone's posts.

## Architecture

```text
Web LCD UI or Telegram (state, keyboard, accessibility)
   | text, voice note or photo
   v
Conversation controller (intent + finite session state)
   +--> permissioned social backend (notes, circle, signals, invitations, compass)
   +--> Muse Spark, one job per function:
   |      TELL IT   conversation state + structured output -> compass draft
   |      SAY IT    native audio -> transcript + intent
   |      SNAP IT   vision -> event details
   |      FIND IT   web search with citations + ranking -> briefing lines
   |      PLAN IT   parallel tool calls -> one draft invitation
   +--> guardrails in code (compass validator, grounding validator, signal rule, caps)
   +--> confirmation boundary (sending, RSVP, compass changes)
   +--> workings log (CHECK IT) and the QR meet adapter
   v
One short reply / one clear next action / an intentional end
```

The app must work with the model switched off: every function has a rule-based fallback (scripted onboarding, friends-only briefing, typed details, a prefilled form).

## Muse Spark by function

| Function | Capability | Guardrail in code | Fallback |
|---|---|---|---|
| TELL IT | Multi-turn conversation, structured output | Every compass item traces to the person's words; no personality, health or screen-time labels; nothing saved before LOOKS RIGHT | Scripted stages |
| SAY IT | Native audio understanding | Audio in memory only; transcript shown first; crisis words checked on it | Type it |
| SNAP IT | Vision | Image in memory only; no people or faces described; low confidence asks for a check | Type the details |
| FIND IT | Web search with citations, ranking | Every line maps to a real friend item or a source returned in that call, plus a compass item; cap; friends first; mood signals never used | Friends' items, newest first |
| PLAN IT | Parallel tool calling | Draft only; confirmation token from a tap; only signals shared with this person | Prefilled invitation form |
| CHECK IT | Verifiable workings | Logs tool names, sources and grounded counts, never personal text | "Model off: rules only." |

## Tool contracts (server-side, authorised, audited)

| Tool | Rule |
|---|---|
| `list_my_updates({limit: 1-3, after?})` | Only after an explicit catch-up request. No load-more. |
| `get_open_invitations({limit: 1-3})` | Chronological, never by popularity. |
| `draft_note({text, audience_ids})` | Draft only. The UI shows recipients. |
| `publish_note({draft_id, confirmation_token})` | Only after a separate user gesture. Returns receipt or error. |
| `rsvp_invitation({invitation_id, response, confirmation_token})` | Confirmation required. |
| `start_focus_session({declared_minutes?})`, `complete_focus_session({session_id})` | Records a declared break, not OS screen time. |
| `begin_mutual_tap({peer_ephemeral_token})`, `confirm_mutual_tap({exchange_id})` | Opt-in on both sides, short TTL, no location. |
| `get_my_private_keepsakes({limit: 3})` | The person's own records only. |
| `get_my_compass()` | The requesting person's compass only. |
| `propose_compass_change({text})` | Returns BEFORE / AFTER; saves nothing. |
| `confirm_compass_change({proposal_id, confirmation_token})`, `undo_compass_change({change_id})` | Only after a separate user gesture; every change undoable. |
| `get_shared_availability()` | Availability signals shared with the requester; never mood. |
| `find_nearby({query, area?})` | Muse Spark web search, at most 2 per briefing; returns sources. |
| `draft_invitation({activity, when, where, to_ids, line})` | Draft only, labelled AI / DRAFT. |

The model never queries raw social data itself and never claims it sent anything by composing a reply. The backend authorises, executes, logs and reports success or failure.

## Grounding

- Summaries cite note ids internally so faithfulness can be checked.
- Friend names come only from permitted backend results.
- No data: NO NEWS RIGHT NOW. Never invent news.
- Asked to invent friend activity: decline and offer to draft a note instead.
- Summaries are visibly labelled (e.g. a `SUMMARY` kicker) and the original note is one tap away.

## Signals here (v5): model use, records and rules

| Function | Capability | Guardrail in code | Fallback |
|---|---|---|---|
| FIND ME | Web search with citations (at most 3, only the person's own name, city and links), structured output `{findings, compass}` | Consent first; IS THIS YOU?; raw findings never stored; every compass line has a ticked source or "you said"; banned labels; nothing saved before LOOKS RIGHT | Three scripted questions |
| PLACE IT | Parallel tools: `google_place_details` (live), `web_search` (menu, hours on the place's website), `get_place_facts`; structured `{facts[{field, value, source, url}]}` | Every fact has a source; Google content shown live with attribution, only the place id kept; nothing becomes a Hoolala! fact without a person; edits screened | People's facts only |
| SUGGEST IT | Web search with citations (1 per request, cached per place for an hour), structured output | Event ideas need a citation returned in that call; ideas pass screening; never posted without a tap | Hand-written topics by time of day |
| SCREEN IT | Structured verdict `{verdict, category, reason, fr, en}`, minimal effort | Code rules first (contacts, links, handles, length, words, crisis words); approve or reject only, never rewrite | Code rules only |
| PLAN IT | Parallel tools: `get_signal`, `get_place_spots`, `get_quick_replies`, `get_place_hours`, `draft_meeting_point` | Draft only; only this signal and place; confirmation token from a tap | The spot and time the poster picked |
| ARRIVE, MEET IT, STAY IN TOUCH | None, on purpose | Check-in rules, mutual QR, mutual choice | |

| Record | Fields and rules |
|---|---|
| Place | name, kind, city, coordinates from the person who added it, radius, Google place id, spots, optional code and poster key, added_by, status |
| Place fact | place, field (hours, menu item, price, spot, wifi, sockets, quiet, rule), value, source (people, google, web, snap), source url, state (found, confirmed, disputed), confirmations, updated. Google facts are fetched live, never stored. |
| Place contribution | person, place, fact, action (add place, add, fix, confirm), points, state (pending, counted, rejected). Private to the person. |
| Compass item | person, part, text, source url or "you said", origin (find me, questions, edit), active. Never returned to anyone else. |
| Check-in | user, place, method (location, add, search, qr, code), started, ends (4 hours), left. Deleted after 24 hours. Attempts store method, ok and reason only: never coordinates, never the user. |
| Place signal | owner, place, topic (60), when, spot, capacity (1 to 3), language and translation, screening verdict, expiry, state |
| Response | signal, responder, optional line (60), state (requested, accepted, declined, withdrawn), quick replies |

Server rule (`src/rules/here.ts`): a viewer sees a place signal only if both are checked in at that place now, it is open and unexpired, neither blocked the other, and it isn't theirs. First names only between an owner and accepted responders.

## Compass record (in the build through FIND ME)

| Field | Notes |
|---|---|
| `id`, `owner_id` | Owner only |
| `part` | `intention`, `interest`, `filter`, `delivery`, `action` |
| `text` | The person's own words (or a choice they picked) |
| `why` | Only if the person chose to say |
| `origin` | `onboarding`, `edit`, `feedback` |
| `active`, `created_at` | |

Changes live in a separate log (`before`, `after`, the person's words, `confirmed_at`, `undone_at`). Nothing is inferred from time spent, opens or scrolling.

## Workings record (SHOW THE WORKINGS)

`id, owner_id, function (tell, say, snap, find, plan), tools (names only), sources (URLs), grounded_count, total_count, reasoning_effort, created_at`, purged after 7 days. Never prompts, transcripts, photos or friends' text.

## Signal record

| Field | Notes |
|---|---|
| `id`, `owner_id` | Owner only can edit or cancel |
| `type`, `custom_text` | One of the preset types, or up to 40 characters |
| `kind` | `availability` or `mood`; mood signals are never used for suggestions |
| `audience` | `circle`, `chosen` (list of friend ids) or `private` |
| `created_at`, `expires_at` | Default expiry 4 hours |
| `state` | `active` or `cancelled` |

Server rule: a viewer sees a signal only if it is active, unexpired, not private, and the viewer is in its audience. Tools: `set_signal`, `cancel_signal`, `get_friend_signals({limit: 3})` (only for the requesting user), `get_social_opportunities()` (availability signals plus the user's own moment history; never mood, location or behaviour).

## Observation record

| Field | Notes |
|---|---|
| `id`, `owner_id` | Ownership is always stored, also for anonymous public ones |
| `say`, `happens` | The two human-written lines, 80 characters each |
| `source.happens` | `human`, `ai-accepted` or `ai-edited` |
| `ai_suggestion` | The suggestion text, kept separate from the human text |
| `visibility` | `private`, `circle` or `public` |
| `audience` | Circle or one friend, for `circle` |
| `moderation` | `not-applicable`, `pending`, `approved`, `rejected` |
| `pii_consent` | Explicit consent when identifying details were flagged |
| `created_at`, `updated_at` | Timestamps |

Extra tools: `draft_observation_suggestion({text, mode: shorter|funnier})` (suggestion only), `save_observation`, `share_observation({id, audience, confirmation_token})`, `submit_observation_for_review({id, confirmation_token})`, `get_discovery_observations({limit: 1-3})` (approved public only), `delete_observation({id})`.

## Privacy

- Notes are private by recipient ACL. No sharing to new audiences without the author.
- No access to contacts, calendar, precise location or usage analytics without a specific permission and a clear purpose.
- Check-in by location uses the person's coordinates once to find nearby places and discards them (only a newly added place keeps the coordinates it was added at); nothing about where someone has been is kept beyond their own private moments. Check-ins are deleted after 24 hours.
- Quiet hours, no bulk notifications, data deletion and circle revocation are first-class settings.
- Photos (SNAP IT) and voice notes (SAY IT) are processed in memory and never written to storage or logs.
- LinkedIn and Instagram are "links you share only": their platform rules don't allow reading feeds or building digests.
- Telegram: only the chat id needed to reply is stored; unlinking deletes it.
- Demo and prototype data is fictional and labelled SAMPLE ("Sample Sophie" for judges).

---

# Components

Core first, then Signals here (the hackathon build), then Go App-Free (ROADMAP after 4 Nov), then other ROADMAP components.

## Key

A full-width, squared key for the one main action on a screen, with a lighter secondary key below it when needed.

- `.lcd-key--primary`: `lcd-selected` fill, `lcd-selected-ink` text. One per screen.
- `.lcd-key`: `lcd-surface` fill. The single alternative (EDIT, ANOTHER IDEA).
- Silkscreen 14px uppercase, 44px minimum, 2px border, 2px corners. A trailing `>` means "goes somewhere".
- Press: a 120ms stepped inversion to `lcd-sunken`. No smooth transitions.
- Labels are short and human: `CATCH ME UP >`, `I'M IN`, `YES, SEND IT`, `GO LIVE >`. Avoid SUBMIT.
- Use `<button>` for actions, `<a href>` for navigation.

## MenuOption

A row in a short menu: the inverted black bar marks focus or the current choice, like an old phone menu.

- 48px minimum height, 2px `lcd-ink` border, Silkscreen 14px, a `>` at the right.
- Hover, focus and current state invert to `lcd-selected` / `lcd-selected-ink`.
- Five options at most. The home menu is fixed: LITTLE SIGNALS, ANYONE AROUND?, INVITE THEM OUT, SNAP IT, MEET IRL (ANYTHING NEW? and GO APP-FREE are keys above it).
- Never add counts or badges to an option (no "CATCH ME UP (3)").
- Arrow keys may move between options; Enter activates.

## SoftkeyBar

The two-key footer that always offers a clear action on the left and a way back on the right, with the decorative status bar at the top of the screen.

- Softkeys: left = the screen's action (CHAT, REPLY, CONFIRM), right = BACK, CANCEL or MY MOMENTS on home. Real buttons, 44px minimum, sticky to the bottom on mobile.
- The status bar (signal, HOOLALA!, battery) is decorative and `aria-hidden` apart from the name. It never shows real network, battery or unread states.
- Escape mirrors the right-hand BACK.

## FriendNote

One consented note from a friend, shown alone inside a catch-up of at most three.

- Paper block: sender and day in Silkscreen, a dashed rule, then the note in Space Mono exactly as written (never uppercased or rewritten).
- Progress: three pixel cells, filled up to the current note. Labelled "Note N of M".
- Actions: REPLY (secondary) and NEXT NOTE > (primary); on the last note the primary reads FINISH >.
- An AI summary, if shown, sits in its own block with a `SUMMARY` kicker and never replaces the original.
- Consumer provides: sender name (from permitted backend data), relative day, text, index and total.

## LittleSignal

A temporary, voluntary hint about mood or availability, sent without writing a message. Not an online status.

- **Pick:** HOW ARE YOU, ROUGHLY? Eight presets as menu rows in Space Mono sentence case (Coffee wouldn't hurt. / Up for something. / Fancy a walk? / Out and about. / Free tonight. Suspicious, I know. / One of those days. / Do not disturb-ish. / Social battery: 12%.) plus a 40-character field for your own.
- **Set:** the signal as the title, one dry reply bubble ("Apparently you're accepting coffee applications."), HOW LONG? (1 hour, 4 hours default, until 23:00, until 09:00 tomorrow), then SHARE WITH MY CIRCLE / CHOOSE FRIENDS (checkboxes, at least one) / KEEP PRIVATE.
- **Active:** a dashed chip on home (YOUR SIGNAL / UNTIL 02:59) and a double-bordered block on the signals screen with EDIT and CANCEL IT.
- **Received:** inside the catch-up as A LITTLE SIGNAL. with sender, expiry and text. Availability signals offer SUGGEST A PLAN; mood signals offer only LEAVE A NOTE and say "No reply needed."
- Never: presence dots, read receipts, "X is online", reply nudges, notifications without permission.

## SocialOpportunity

ANYONE AROUND?: a short, honest list of who has explicitly shared availability with you, then an optional nudge.

- Kicker: ANYONE AROUND? / ONLY WHAT FRIENDS CHOSE TO SHARE WITH YOU. Title: POSSIBLY. (or ALL QUIET. with SEND A SIGNAL / LEAVE A NOTE).
- One chat bubble per availability signal, in third person with its expiry ("Sophie could be persuaded into coffee."). Optionally one line from the person's own moments, labelled FROM YOUR MOMENTS. Then SO... THURSDAY?
- Keys: SUGGEST A PLAN TO [NAME] (opens the invitation flow prefilled, still needs review and confirm), LEAVE [NAME] A NOTE, MAYBE LATER.
- Never uses mood signals, location, activity data or strangers. Never sends anything by itself.

## ComposeNote

Leaving a note means inviting people out: pick an activity, set when and where, choose who, then review and confirm. Replies to a friend's note use the same review and confirm steps with plain text.

### Invitation (LEAVE A NOTE)

1. **WHAT SHALL WE DO?** A 2-column grid of tiles, each a 32px pixel icon plus a label: Board games (dice), Card games (cards), Grab a coffee (cup), Walk in the park (tree), Picnic (basket), Something else (?). Tiles are real buttons, 88px tall, `lcd-surface`, invert on hover.
2. **Details:** when (This evening, a named day, Next week), time, where (placeholder suggests a sensible spot), who's invited (close circle or one friend), and one line prefilled per activity that the person can edit (200 characters max). "Something else" asks for a short name for the idea.
3. **Review:** SEND THIS INVITATION? with icon, activity, day, time, place, the line and the recipients. YES, SEND IT and EDIT.
4. **Result:** INVITATION OUT. only on a backend receipt; otherwise COULDN'T SEND. TRY AGAIN?

### Reply (from a friend's note)

Labelled textarea (400 characters max), REVIEW >, then SEND THIS TO [NAME]? with the exact words.

### Rules

- No blank status box and no public posting: every note has an activity, a time and named recipients.
- Suggest simple, low-pressure activities. Anyone can answer NOT THIS TIME with no explanation.
- Empty or missing fields show an inline message, never a browser alert.
- Text only. No photo, video or link previews.

## AgentReply

The chat's answer: short, grounded in real notes, and always ending with one action or a goodbye.

- Person's message: sunken block, right aligned. Reply: paper block, left aligned, Space Mono.
- 240 characters or fewer, one suggested action as a key, plus THAT'S ALL to leave.
- Summaries carry a SUMMARY OF N NOTES kicker and link to the original notes.
- No avatar, name, feelings or typing indicator. Not a companion: it routes people into a flow or out of the app.
- No data: NO NEWS RIGHT NOW. THAT'S OKAY. Tool failure: CAN'T REACH YOUR NOTES RIGHT NOW. WANT TO TRY LATER?
- Every AI answer ends with a small SHOW THE WORKINGS key (see Workings). A microphone key next to the input starts SAY IT.

## EndOfSession

The screen every flow ends on: it acknowledges what happened and invites the person to close the app.

- Centred title, the pixel terrain, one or two lines of copy, one key (GO LIVE >, BACK TO LIFE >) that returns home.
- Variants: catch-up done, note sent, RSVP confirmed, break finished, private moment saved, empty mailbox.
- Its GO LIVE key starts the switch-off sequence (see Product rules): the screen "switches to full resolution" (real life), goes dark, and shows a LIVE light, HOOLALA! IS OFF. YOU'RE ON. and a SWITCH ON key. That dark screen uses `shell-bg` with `lcd-bg` text (10:1).
- Never follow it with recommendations, "while you're here" prompts or a next item.

## PrivateKeepsake

The real-world reward: a private record of a moment, never a score.

- Earned by a mutual, opt-in Meet IRL tap or scan (both people agree), or by finishing a declared break.
- Shown as a badge (+1 PRIVATE MOMENT) and, in My moments, as plain tallies the person alone can see.
- Never public, ranked, compared, levelled or tied to streaks. No "you're behind" or "keep it up" nudges.
- Copy states honestly what it records: a tap means proximity, a break is self-declared.

## FootprintCheck

FIND ME: the head start. With the person's OK, Muse Spark looks at what's public about them, they tick what's really them, and the compass is drafted from that. Then CompassReveal.

- **Consent first:** WANT A HEAD START? / "Hoolala! can look at what's public about you online (a website, a public profile, talks, articles) to guess what you like talking about. OK?" YES, HAVE A LOOK (primary) / NO, I'LL TELL YOU (three scripted questions, OnboardingStage).
- **Inputs:** THE NAME YOU USE ONLINE, YOUR CITY, and up to 3 links (optional). Helper: "Only you. We never look anyone else up."
- **Searching:** LOOKING YOU UP. POLITELY... with the stepped loader.
- **IS THIS YOU?:** findings one per block, each a short line in Hoolala!'s words plus a `lcd-src` line (domain), with THAT'S ME / NOT ME. Several namesakes are normal: "Apparently there are three of you. Which one's you?" Progress cells N of M. Nothing unticked is used.
- **Then:** DRAFT MY COMPASS > opens CompassReveal, every line with "from: [domain]" or "you said".
- Privacy line, always visible: "Only you see this. We keep the compass, not the search."
- Never: looking up someone else, a personality type, a score, anything about health, politics, religion or sexuality, a social network login.
- Consumer provides: consent state, inputs, findings with URL and tick state.

## OnboardingStage

One stage of Go App-Free (TELL IT): a short question from Muse Spark, a few choices, a free-text answer, and a way back.
> **IN THE BUILD (v5, 27 Oct).** Used by FIND ME: the compass is drafted from the person's confirmed public footprint or three questions. Telegram linking and briefings stay ROADMAP.

- Progress: five pixel cells (`lcd-progress`), labelled "Stage N of 5". BACK on the right softkey, SKIP on optional stages, every earlier answer editable.
- The question in Space Mono at body size, from Muse Spark or the scripted fallback. Stage 1 always opens "Hello, human. Before we get acquainted, what would you like a little more of?"
- Choices as `lcd-chip` toggles (`aria-pressed`), several allowed, plus SOMETHING ELSE ENTIRELY opening a free-text field. A free-text field on every stage ("Or say it your way").
- At most one follow-up question per stage, shown as a dashed AI block (`lcd-ai`, kicker FOLLOW-UP) under the answer, with ANSWER and SKIP.
- Primary key NEXT > (on the last stage SHOW ME >). While the model works: a stepped loader and THINKING IT OVER...
- Never asks for age, screen-time estimates, or anything the stage doesn't need. No guilt or scarcity copy.
- Consumer provides: stage index, question text, choices, selected choices, free text, optional follow-up.

## CompassReveal

The end of TELL IT: "Your world, according to you." Muse Spark states the Personal Compass back in one or two plain sentences, and the person decides.
> **IN THE BUILD (v5, 27 Oct).** Used by FIND ME: the compass is drafted from the person's confirmed public footprint or three questions. Telegram linking and briefings stay ROADMAP.

- Kicker GO APP-FREE / STAGE 5 OF 5, title YOUR WORLD, ACCORDING TO YOU.
- The compass lines as a short list in Space Mono, in the person's own words where possible. Below it, one dashed AI block: "I'll look for things that fit and leave the rest alone." and "Everything else can wait."
- SOUND ABOUT RIGHT? with three keys: LOOKS RIGHT (primary), CHANGE SOMETHING, START AGAIN. Nothing is saved until LOOKS RIGHT.
- After LOOKS RIGHT (v5): WHERE ARE YOU? (PlaceCheckIn). Each line shows "from: [source]" or "you said". (ROADMAP: the Telegram link step and a first briefing.)
- Never a score, a type, a personality label or a time projection. No "years reclaimed".
- Consumer provides: compass lines, the AI summary sentence.

## PersonalCompass

YOUR PERSONAL COMPASS: what the person is curious about right now, in their own words, with every change visible and undoable. Never a score.
> **IN THE BUILD (v5, 27 Oct).** Used by FIND ME: the compass is drafted from the person's confirmed public footprint or three questions. Telegram linking and briefings stay ROADMAP.

- Sections as kickers: WHAT YOU WANT MORE OF, INTERESTS, LESS OF THIS, HOW OFTEN, WELCOME SUGGESTIONS. Each line is plain Space Mono with EDIT and REMOVE.
- One field at the top: SAY IT YOUR WAY ("Only send me things near Lausanne."). Muse Spark proposes the change; the screen shows BEFORE / AFTER (`lcd-diff`) and SAVE THIS CHANGE? with SAVE (primary) and NOT NOW.
- CHANGES lists the last changes with their origin (you said, onboarding, feedback) and an UNDO key each. Undo confirms with UNDONE. Like it never happened.
- Built only from what the person said or chose. No inferred interests, no "people like you", nothing from time spent or opens.
- Consumer provides: compass items by part, the change log, a pending proposal.

## PlaceCheckIn

ARRIVE at any public place: share location, pick the place, or add it. Search by name when location fails. Then PEEK. No AI, on purpose.

- **Ask well:** WHERE ARE YOU? with one line on why ("Only to find the place you're in.") before the permission prompt, and SEARCH INSTEAD beside it.
- **Pick:** up to 5 places within about 150 m as `lcd-option` rows: name, kind and distance band (HERE, NEXT DOOR). Hoolala! places first, then Google Maps places with a small "> google maps" line. Tapping one checks in: CHECKING YOU IN... then HERE UNTIL 15:40.
- **Add:** NOT ON THE LIST? ADD THIS PLACE: WHAT'S IT CALLED? (`lcd-field`), WHAT KIND OF PLACE? (chips: café, bar, coworking, library, other), ADD IT. Then PLACE ADDED. Points arrive when someone else checks in. Public places only; a name that looks like a home or an address is refused kindly.
- **Search:** "Your phone thinks you're in the lake. Search for the place instead." A field with results from your city.
- **Poster (optional, partner places):** the A4 LCD poster with QR and a four-letter code still works and checks in directly.
- **Peek:** the place name, 3 SIGNALS HERE RIGHT NOW., topics only, I'M CURIOUS >.
- **Checked in:** a slim status strip at the top of home: place name and HERE UNTIL 15:40, I'M LEAVING in the menu.
- Never: a map of people, distances to people, "12 people near you", a permission prompt before explaining why, keeping anyone's location.
- Consumer provides: nearby places, method, state (asking, picking, adding, searching, ok, failed with reason), expiry, open topic count.

## PlaceCard

THIS PLACE: what a place is like, kept right by the people in it. PLACE IT fetches; people confirm or fix; they earn private place points.

- **Header:** place name in the title, kind and HERE UNTIL 15:40 as a kicker.
- **CONFIRMED HERE first:** paper blocks, `lcd-rows` (HOURS, MENU, SPOTS, WIFI, SOCKETS, QUIET) with "confirmed by 3 people, 2 days ago".
- **AI / FOUND next:** dashed AI blocks with the fact and a `lcd-src` line (> google maps, > the place's website). Google attribution visible whenever Google content shows. Each fact: THAT'S RIGHT / FIX IT / NOT ANY MORE.
- **Fix it:** the field prefilled, SAVE; then NOTED. +5 PLACE POINTS ONCE SOMEONE CONFIRMS. A dry line is allowed: "The internet says 4.50. The internet is not always right."
- While fetching: CHECKING THE MENU... with the stepped loader. SHOW THE WORKINGS under fetched facts.
- **Points** appear as a small `lcd-badge` (+2, +5) after an action and in MY MOMENTS as "You've helped 4 places. 62 place points." Never on anyone else's screen, never ranked.
- Never: reviews, star ratings, photos of people, popularity, "busy now" from people's check-ins, other contributors' names.
- Consumer provides: confirmed facts, found facts with source, pending contributions, points (own only).

## PlaceSignal

A small invitation to talk, visible only to people checked in at the same place, for a short while. Discover three at a time; post your own with optional AI ideas.

- **Discover (WHAT'S HERE?):** signals that fit the viewer's compass come first with a small FITS YOU kicker (only the viewer sees it). One signal per block: the topic in Space Mono as written (or translated, with ORIGINAL to toggle; translation in a dashed AI / TRANSLATED kicker), then a `lcd-rows` line: WHO (Someone here), WHEN (15:00), WHERE (Coffee machine), FOR (2 people), UNTIL (15:30). Key: I'M CURIOUS. Three per screen with progress cells, then THAT'S EVERYTHING HERE RIGHT NOW. POST ONE?
- **Post (POST ONE):** WHAT'S THE TOPIC? (60 characters with a counter), NEED A TOPIC? opening three AI / SUGGESTION blocks (each with USE THIS, and a `lcd-src` line when it cites an event), then WHEN (now, in 30 min, at a time), WHERE (place spots as `lcd-chip`s), FOR HOW MANY (1 to 3). POST IT > shows CHECKING... (SCREEN IT), then SIGNAL UP. or a friendly refusal with EDIT.
- **Mine:** a double-bordered block on home with the topic, UNTIL, the number of curious requests (only to the owner) and EDIT / CANCEL IT.
- Never: names or photos before acceptance, view counts, "seen", likes, a feed, a map.
- Consumer provides: topic, translation, when, spot, capacity, expiry, state, suggestions with optional citation.

## CuriousRequest

I'M CURIOUS, the decision, and what happens after: anonymous until both accept, then first names and quick replies only.

- **Sending:** I'M CURIOUS opens an optional line (60 characters, screened) and SEND. Then: "Sent. They'll decide. No pressure either way."
- **Receiving (owner):** SOMEONE HERE IS CURIOUS. with their line in a paper block, then ACCEPT (primary) and NOT THIS TIME. Up to the signal's capacity.
- **After accept:** both see "You're on. It's Lea." (first name only), the meeting point (see MeetingPoint) and four quick-reply keys: ON MY WAY / 5 MINUTES LATE / CAN'T MAKE IT / WE'RE AT THE [SPOT]. Replies show as short `lcd-me` or paper lines with a time. No text field.
- **After decline:** the responder sees "Not this time. No hard feelings." No reason, no name.
- **After the meet-up:** STAY IN TOUCH? "Only if you both say yes. We'll never tell them if you don't." YES / NO THANKS.
- Every screen has BLOCK and REPORT in the softkey menu.
- Consumer provides: request line, state, first name (after accept only), quick replies, meeting point.

## MeetingPoint

PLAN IT for Signals here: the agent proposes where and when to meet inside the place; the poster confirms. Then MEET opens the QR handshake.

- While the agent works: CHECKING THE ROOM... with the stepped loader.
- The proposal in a dashed AI / DRAFT block: "Terrace at 15:10? It's free until 16:00 and it's where you said." with CONFIRM (primary) and CHANGE (spot chips and a time field).
- Confirmed: a paper block MEETING POINT with the spot and time, visible to the owner and accepted responders only, and MEET > for the mutual QR at the spot.
- SHOW THE WORKINGS under the draft: tools (get_signal, get_place_spots, get_quick_replies in parallel), effort medium.
- Only spots that exist in the place; never "my place", never outside the place. Never says it confirmed anything itself.
- Consumer provides: proposed spot, time, reason, state.

## Workings

CHECK IT: SHOW THE WORKINGS opens a short, honest account of how an AI answer was made. Method, not private data.

- Opened from the small SHOW THE WORKINGS key under any AI answer (web) or an inline button (Telegram). Closes with BACK.
- Title HOW I GOT HERE, then a `lcd-rows` list: CAPABILITY (Conversation, Audio, Vision, Web search, Tools), TOOLS (names only, in call order, parallel calls marked), SOURCES (links), GROUNDED ("3 of 3 lines"), COMPASS (the lines used), EFFORT (minimal, low or medium).
- If lines were dropped by the grounding check, say so plainly: "1 line dropped: couldn't find where it came from."
- Model off: MODEL OFF: RULES ONLY. with what the rules did.
- Never shows prompts, transcripts, photos, other people's private notes or anyone's mood signals.
- Consumer provides: the workings record for that answer.

## TelegramSurface


> **v4 (27 Oct).** In the hackathon build Telegram is the **Mini App** that the place poster opens (same LCD front end, Telegram login checked on the server), plus three opt-in bot notifications only: "Someone here is curious.", "Accepted. Terrace at 15:10." and quick replies. Briefings in Telegram are ROADMAP.
Go App-Free in Telegram: the same Hoolala!, in someone else's chat window. Telegram draws its own bubbles, so the brand lives in the words, the structure and the inline buttons.

- **Linking:** the web reveal shows LINK TELEGRAM > with a single-use link (10 minutes). The bot's first message: "Linked. I'll only speak when spoken to." and the confirmed settings.
- **On demand only:** "anything new?", "anyone around?", a voice note (SAY IT), a photo (SNAP IT), or plain words to edit the compass. No unasked messages, no greetings, no daily digest unless chosen later.
- **Message shape:** one item per message for briefings, max the cap. First line in capitals as the label (A NOTE FROM SOPHIE, FOUND NEARBY, AI / WHY THIS), then the text, then a `> source` line for web finds. Friends' words exactly as written.
- **Inline buttons** mirror keys: ASK A FRIEND, MORE LIKE THIS, NOT USEFUL, SHOW THE WORKINGS, YES, SEND IT, EDIT, UNDO. Sending to a friend always needs the YES, SEND IT button, never free text alone.
- **Endings:** THAT'S EVERYTHING. We could show you more, but we'd have to make it up. PAUSE and UNLINK work by saying so.
- No emoji, no stickers, no typing indicator tricks. Crisis words return the fixed help message.
- The preview below is the LCD mock used in docs and the demo, not Telegram's real UI.

## SnapResult

> **STRETCH for 4 Nov.** In Signals here, SNAP IT turns a photo of the menu board (new menu facts to confirm, PlaceCard) or an event poster into a draft signal; otherwise as below.

SNAP IT: a photo of a poster, flyer or chalkboard becomes event details Muse Spark read, shown for checking, then one nudge towards a plan.

- Entry: SNAP IT on the home menu opens the camera or a file picker; in Telegram, send a photo. Typed alternative always offered (TYPE IT IN).
- While reading: READING THE POSTER... with the stepped loader.
- Result: LOOKS LIKE: and a `lcd-rows` list (What, When, Where), each editable. Low confidence opens the fields for checking first, with the kicker PLEASE CHECK.
- Keys: SO... THURSDAY? > (primary, opens PLAN IT prefilled), FIX DETAILS, NOT NOW.
- Never shows the photo back as content, never describes people or faces. Privacy line: Read, then forgotten. We don't keep your photo.
- Fails with humour: Couldn't read it. The poster wins this round. Type it in?
- Consumer provides: extracted title, date, time, place, confidence.

## BriefingItem

One item in a FIND IT briefing: a friend's own words, or a find from the web with its source, each with a short AI reason tied to the compass.
> **ROADMAP.** Part of Go App-Free, moved to after 4 Nov 2026 (27 Oct decision). Not in the hackathon build.

- Order: friends' notes, availability signals and open invitations first, then at most two web finds. At most the person's cap (default 3) per briefing, with progress cells "N of M".
- **Friend item:** FriendNote styling (paper block, sender, exact words). Its reason, if any, sits below in a dashed AI block.
- **Web find:** paper block, title in Silkscreen, one-line summary in Hoolala!'s words, date and place, then a `lcd-src` line (domain and date) linking to the original. Never reproduce the page.
- **AI / WHY THIS:** one line in a dashed block, naming the compass line in the person's words ("Because you said: live music, small venues.").
- Actions: one primary (ASK A FRIEND > opens PLAN IT, or NEXT >), then a small feedback row: MORE LIKE THIS / NOT USEFUL / LESS OF THIS, and SHOW THE WORKINGS. Feedback shows "Noted." with UNDO.
- Last item: THAT'S EVERYTHING. We could show you more, but we'd have to make it up.
- Consumer provides: kind, friend name and text or title, summary, date, place, source URL, reason, index and total.

## VoiceNote

SAY IT: speak a request instead of typing it. Muse Spark listens, and the screen shows what it heard before anything happens.
> **ROADMAP.** Part of Go App-Free, moved to after 4 Nov 2026 (27 Oct decision). Not in the hackathon build.

- A microphone key beside every chat input (`aria-label="Say it"`); press to start, press again to stop. In Telegram, a normal voice note.
- While recording: LISTENING... with the stepped loader and a STOP key. No waveform theatre, no timer pressure.
- Result: YOU SAID: "..." in a sunken block (the person's words), then what Hoolala! will do in one line (CHECKING WHAT FRIENDS SHARED...), and FIX IT to edit the text.
- Fails gently: Didn't catch that. Mind typing it?
- Privacy line, always visible on first use: Heard, then forgotten. We don't keep your voice note.
- Crisis words in the transcript return the fixed help message, never a model reply.
- Consumer provides: recording state, transcript, the routed intent.

## AgentDraft

PLAN IT: the agent's one proposal. Muse Spark combines what friends chose to share, recent finds and the compass into a single draft invitation, then stops for the person to decide.
> **ROADMAP.** Part of Go App-Free, moved to after 4 Nov 2026 (27 Oct decision). Not in the hackathon build.

- Above the draft, one short reply in a paper block saying what it found, using only shared facts ("Sophie could be persuaded into coffee, and the jazz fits you both.").
- The draft in a dashed AI block, kicker AI / DRAFT: activity, day, time, place, recipients and the one line, all editable.
- Then the normal review: SEND THIS TO SOPHIE? with YES, SEND IT (primary) and EDIT. On server receipt: INVITATION OUT. Otherwise COULDN'T SEND. TRY AGAIN?
- SHOW THE WORKINGS under it. Never uses mood signals, location or strangers. Never says it sent anything itself.
- Consumer provides: reply text, draft fields, recipient names from permitted data.

## PlanCard

One invitation from the village noticeboard, shown alone, with no popularity signals.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026). Open invitations appear in FIND IT instead.

- Title in Silkscreen, host as a badge, date, time with timezone and place, then one sentence.
- I'M IN > opens a separate confirmation (JOIN THIS?); ANOTHER IDEA shows the next, three at most, then THAT'S ALL THE PLANS FOR NOW.
- Never show attendee counts, "popular" labels or who else is going unless the host shares it.
- Ordered chronologically.

## SmallTalkMission

The step-by-step small talk loop: a tiny real-world mission, a private guess, the try, and the plot twist between expectation and reality.

> **In the build since 29 Oct 2026 (v6), simplified:** the one-screen GET A TRY > GO > TELL ME flow in rule 14. The guess, plot twist and courage insight below stay ROADMAP.

### Screens
1. **Start (first time):** HOW DO CHATS WITH STRANGERS FEEL? Three answers set the first step (1, 2 or 3).
2. **Pick a mission:** step N of 5 and its name, three mission buttons (title, minutes, one sentence, place). NOT TODAY, plus SMALLER STEP (or SHUFFLE on step 1). The LADDER softkey shows all five steps; any can be chosen.
3. **Guess:** the mission, HOW DO YOU THINK IT'LL GO?, a 1 to 10 grid (two rows of five, anchored 1 AWKWARD / 10 LOVELY), LOCK IN MY GUESS or SKIP THE GUESS.
4. **Plan:** TRY SAYING block with the opener line, WHEN (right now, within the hour, later today, tomorrow) and WHERE, then OFF YOU GO >.
5. **In progress:** OFF YOU GO. with the terrain and a mission recap with the deadline. I'M BACK > or GO LIVE. No reminders.
6. **Debrief:** I DID IT / I TRIED, IT DIDN'T REALLY LAND / NOT THIS TIME, then OUT OF 10? and one thing noticed (optional).
7. **Plot twist:** two 10-cell pixel bars (guess, actual), the plot-twist line, +1 COURAGE, a private insight after two runs ("Usually it goes 3.0 better than you guess."), and a ladder offer when earned.

### Rules
- Missions are data (title, text, opener line, place, minutes), drawn deterministically: same day and step, same three.
- Courage counts tries (did and tried). NOT THIS TIME records nothing negative and offers a smaller step.
- Step up after 3 runs at a step with 2 done; step down offered after "tried" or an actual of 3 or less. Both optional.
- Everything is private to the person. Never shared, ranked or counted publicly by default.
- Safety: public everyday places, no flirting or pick-up missions, respect "no"; crisis words trigger the fixed help message.

## SocialObservation

Two lines: what we say, in quotes, then what actually happens. The unit of Hoolala! humour.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

- Setup: Space Mono bold, in curly quotes. Punchline: Space Mono regular after a Silkscreen `>`, `lcd-ink-secondary` (on the home hero, `lcd-ink` and larger).
- Variants: `obs-hero` (home, one per visit), `obs-card` (paper block, previews and discovery), `obs-small` (lists, chat).
- Words appear exactly as written: never uppercased, never rewritten without the author choosing it.
- Home hero: one observation per visit from a small curated set, revealed with a stepped "new message" wipe (setup, then punchline about a second later). No carousel, no auto-advance. Reduced motion shows both at once.
- Consumer provides: `say`, `happens`, variant.

## ObservationComposer

Guided creation in two chat-style questions, quick enough to finish in under 30 seconds.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

1. WHAT'S SOMETHING WE ALWAYS SAY? One input (80 characters), NEXT >.
2. AND WHAT ACTUALLY HAPPENS? One input (80 characters), PREVIEW >, plus MAKE IT SHORTER and MAKE IT FUNNIER.

### AI help rules

- Help works only from the person's own words and preserves their idea: trim filler, tighten, or add a light deadpan tag. Never a different, generic joke.
- The suggestion appears in its own dashed block labelled SUGGESTION / AI with USE THIS and KEEP MINE. It never replaces the field unless chosen, and the person can still edit afterwards.
- Nothing AI-written is ever published automatically. The record stores the human text, the suggestion, and whether it was accepted or edited.
- Inline errors only ("What actually happens? Even three words will do."), never alerts.

## ObservationPreview

The finished observation shown back to its author, only to them, with a dry reaction and the three ways forward.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

- The observation as `obs-card`, then one reaction bubble: PAINFULLY ACCURATE. WANT TO SHARE IT? (or a close variant).
- Three stacked keys: KEEP IT FOR MYSELF, SHARE WITH MY CIRCLE > (primary), CONTRIBUTE ANONYMOUSLY >.
- A small row: EDIT, COPY, SHARE OUTSIDE (native share where the device offers it, otherwise copy with a select-and-copy fallback).
- Kicker always says PREVIEW / ONLY YOU CAN SEE THIS. Nothing is shared until a later confirmation.

## ObservationShare

Audience choice and consent for an observation. Private is the default; every step outward needs an explicit choice.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

| Choice | What happens | Stored as |
|---|---|---|
| Keep it for myself | Saved to My observations only | `visibility: private` |
| Share with my circle | Pick close circle or one friend, confirm, arrives in their mailbox from you | `visibility: circle`, `audience` |
| Contribute anonymously | Explained, checked for identifying details, submitted to human review | `visibility: public`, `moderation: pending` |

### Anonymous contributions

- Copy states plainly: your name is never shown; a person reviews it first; anonymous means anonymous to readers, not untraceable.
- Before submitting, check both lines for names (circle and capitalised names), places, emails, phone numbers, handles, links and street addresses. If anything is found, show THIS MIGHT IDENTIFY SOMEONE: [items], suggest "a friend", and require an explicit consent checkbox or an edit.
- Friends' private or circle observations never enter public discovery without the author's permission.
- My observations lists every item with its status (Private, Shared / audience, Public / in review or approved), COPY and DELETE (with an inline confirm; deleting a public one withdraws it).

## ObservationDiscovery

A finite way to meet other people's observations: three per session, then a natural ending. Never a feed.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

- Opened by asking (GOT ANYTHING FUNNY?) or from the composer (SHOW ME SOMEONE ELSE'S).
- Each screen: HERE'S ONE SOMEONE LEFT BEHIND…, one `obs-card`, three progress cells, and ANOTHER ONE / ADD MINE / THAT'S ENOUGH.
- After the third: THAT'S ALL FOR NOW. THE INTERNET WILL SURVIVE. with ADD MINE and BACK TO LIFE >.
- Only approved, anonymous contributions. No likes, reactions, counts, authors, rankings or "more like this".
- Error state: CAN'T REACH THE COLLECTION RIGHT NOW. WANT TO TRY LATER?

## ObservationAction

An occasional, optional nudge from recognition to real life: SO… THURSDAY?

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

- Appears only when the observation is about meeting up (coffee, drinks, catching up, five minutes apart, before you leave...). Never on every joke, never as a challenge.
- One line in Silkscreen and two keys: ASK A FRIEND (primary) and MAYBE LATER. Maybe later goes home with no follow-up.
- ASK A FRIEND opens the existing invitation flow prefilled (activity guessed from the observation, Thursday, "We keep saying it. So… Thursday?"), which still ends in review and confirm.

## ExportCard

BLACK BOX: three ways to take an observation outside Hoolala!.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

| Style | Look | Output |
|---|---|---|
| Black box | White Space Mono on pure black, small HOOLALA! in Silkscreen | 1080 x 1350 PNG |
| LCD card | `lcd-bg` card with a thick ink frame and scanlines | 1080 x 1350 PNG |
| Plain text | The two lines plus "Hoolala! You never know until you go." | Text |

- Style picker as three keys (selected one inverted), a live preview, SHARE IMAGE > (or SHARE TEXT >) and COPY TEXT.
- Images are drawn on a canvas and shared through the device's share sheet with the file; where that's not allowed, the image is shown to long-press or right-click and save.
- Cards contain only the observation and the signature. No names, faces, places or handles.

---

# Tokens (tokens.json)

```json
{
  "name": "Hoolala! Mono LCD",
  "version": 2,
  "meta": {"source": "Hoolala_Mono_LCD_Design_System_v1 (tokens.json, tokens.css, DESIGN_SYSTEM.md), converted to list format"},
  "color": {
    "themes": [{"id": "lcd", "name": "LCD"}],
    "tokens": [
      {"name": "lcd-bg", "value": "#BED39C", "usage": "The LCD screen. Default background of every app surface."},
      {"name": "lcd-surface", "value": "#DDE7C6", "usage": "Paper. Message blocks, inputs, secondary keys, raised inserts. Also reversed-out text on lcd-ink (12.4:1)."},
      {"name": "lcd-sunken", "value": "#AEC58A", "usage": "Depth. Sunken panels, pressed states, quiet wells. lcd-ink on it is 8.5:1."},
      {"name": "lcd-ink", "value": "#182513", "usage": "All important text, 2px rules and borders, icons, the selected bar and primary keys. 9.9:1 on lcd-bg."},
      {"name": "lcd-ink-secondary", "value": "#304327", "usage": "Secondary text, dashed dividers, placeholder text. 6.6:1 on lcd-bg, 5.7:1 on lcd-sunken."},
      {"name": "lcd-outline", "value": "{lcd-ink-secondary}", "usage": "Dotted and dashed outlines, decorative frames."},
      {"name": "lcd-selected", "value": "{lcd-ink}", "usage": "Focused or selected row and primary key fill."},
      {"name": "lcd-selected-ink", "value": "{lcd-surface}", "usage": "Text and icons on lcd-selected."},
      {"name": "shell-bg", "value": "#1B221B", "usage": "Device shell in marketing and demo mockups only. Never inside the product UI."},
      {"name": "shell-elevated", "value": "#384139", "usage": "Shell buttons and bezel highlights in mockups only."},
      {"name": "surround-bg", "value": "#E5E8E0", "usage": "Page around the LCD on desktop and in docs. lcd-ink on it is 12.9:1."},
      {"name": "surround-accent", "value": "#576D43", "usage": "One display phrase on surround-bg (e.g. the second line of the tagline), 4.8:1. Never body text, never on lcd-bg."}
    ]
  },
  "type": {
    "fonts": [],
    "families": {
      "display": "Silkscreen, \"Lucida Console\", monospace",
      "body": "\"Space Mono\", \"Courier New\", monospace"
    },
    "groups": [
      {"name": "Display", "family": "display", "styles": [
        {"name": "display-hero", "fontSize": "56px", "lineHeight": 1.05, "fontWeight": 700, "letterSpacing": "-0.03em", "sample": "YOU NEVER KNOW", "usage": "Marketing hero on surround-bg only."},
        {"name": "title", "fontSize": "28px", "lineHeight": 1.22, "fontWeight": 700, "letterSpacing": "-0.03em", "sample": "ANY NEWS?", "usage": "Screen title. Use clamp(22px, 5vw, 28px) in code. Max two short lines."},
        {"name": "title-s", "fontSize": "20px", "lineHeight": 1.22, "fontWeight": 700, "sample": "COFFEE SATURDAY", "usage": "Note sender, plan titles."},
        {"name": "key", "fontSize": "14px", "lineHeight": 1.2, "fontWeight": 700, "sample": "CATCH ME UP >", "usage": "Keys, menu options, softkeys. Never below 14px for a control."},
        {"name": "micro", "fontSize": "12px", "lineHeight": 1.3, "fontWeight": 400, "sample": "MAILBOX / 2 OF 3", "usage": "Kickers, status bar, supplementary labels only."}
      ]},
      {"name": "Text", "family": "body", "styles": [
        {"name": "body", "fontSize": "16px", "lineHeight": 1.5, "fontWeight": 400, "sample": "I'll be in town on Saturday. Fancy a coffee?", "usage": "Notes, replies, prompts, inputs. Sentence case, never forced uppercase."},
        {"name": "body-strong", "fontSize": "16px", "lineHeight": 1.5, "fontWeight": 700, "sample": "From: Sophie", "usage": "Inline emphasis, sender names in body."},
        {"name": "small", "fontSize": "13px", "lineHeight": 1.45, "fontWeight": 400, "sample": "Sample content. Nothing is sent.", "usage": "Honesty notes and helper text, lcd-ink-secondary."}
      ]}
    ]
  },
  "spacing": {
    "tokens": [
      {"name": "space-1", "value": "4px", "usage": "Half step, dense icon detail."},
      {"name": "space-2", "value": "8px", "usage": "The base unit. Gaps between keys."},
      {"name": "space-3", "value": "12px", "usage": "Key and row padding."},
      {"name": "space-4", "value": "16px", "usage": "Mobile screen gutter, block padding."},
      {"name": "space-5", "value": "24px", "usage": "Section gaps."},
      {"name": "space-6", "value": "32px", "usage": "Large separations, desktop gutters."}
    ]
  },
  "radius": {
    "tokens": [
      {"name": "radius-control", "value": "2px", "usage": "Every key, input, block and row. Squared, pixel feel."},
      {"name": "radius-shell", "value": "28px", "usage": "Device shell in mockups only."}
    ]
  },
  "size": {
    "tokens": [
      {"name": "touch-target", "value": "44px", "usage": "Minimum height and width of every control."},
      {"name": "menu-row", "value": "48px", "usage": "Minimum menu option height."},
      {"name": "border-pixel", "value": "2px", "usage": "Every border and rule."},
      {"name": "icon-size", "value": "24px", "usage": "Pixel icons drawn on a 16 x 16 grid, shown at 24 or 32px with image-rendering: pixelated."},
      {"name": "measure", "value": "42ch", "usage": "Maximum text measure on desktop."},
      {"name": "screen-min", "value": "320px", "usage": "Smallest supported viewport."}
    ]
  },
  "duration": {
    "tokens": [
      {"name": "motion-step", "value": "120ms", "usage": "Stepped inversion flash on press. Off with reduced motion."},
      {"name": "motion-message", "value": "180ms", "usage": "Maximum for a message or screen entrance."}
    ]
  }
}
```

# Component CSS (components/bundle.css)

```css
/* Hoolala! Mono LCD: shared component styles. Uses the custom properties generated from tokens.json. */
@import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

.lcd { background: var(--lcd-bg); color: var(--lcd-ink); font-family: var(--font-body); font-size: 16px; line-height: 1.5; }
.lcd-kicker { font: 12px/1.3 var(--font-display); color: var(--lcd-ink-secondary); letter-spacing: .02em; text-transform: uppercase; }
.lcd-title { font: 700 clamp(22px, 5vw, 28px)/1.22 var(--font-display); letter-spacing: -.03em; text-transform: uppercase; margin: 0; }
.lcd-title-s { font: 700 20px/1.22 var(--font-display); text-transform: uppercase; margin: 0; }
.lcd-small { font-size: 13px; line-height: 1.45; color: var(--lcd-ink-secondary); }

.lcd-key { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: var(--touch-target); padding: 10px 12px; border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); background: var(--lcd-surface); color: var(--lcd-ink); font: 700 14px/1.2 var(--font-display); text-transform: uppercase; text-decoration: none; cursor: pointer; }
.lcd-key--primary { background: var(--lcd-selected); color: var(--lcd-selected-ink); }
.lcd-key:active { background: var(--lcd-sunken); color: var(--lcd-ink); }
.lcd-key--primary:active { background: var(--lcd-ink-secondary); color: var(--lcd-selected-ink); }

.lcd-menu { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.lcd-option { display: flex; align-items: center; gap: 12px; width: 100%; min-height: var(--menu-row); padding: 8px 12px; border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); background: transparent; color: var(--lcd-ink); font: 700 14px/1.2 var(--font-display); text-transform: uppercase; text-align: left; cursor: pointer; }
.lcd-option::after { content: ">"; margin-left: auto; }
.lcd-option:hover, .lcd-option[aria-current="true"], .lcd-option.is-selected { background: var(--lcd-selected); color: var(--lcd-selected-ink); }

.lcd-softkeys { display: flex; justify-content: space-between; gap: 8px; border-top: 2px solid var(--lcd-ink); padding: 4px 8px; }
.lcd-softkey { min-height: var(--touch-target); min-width: var(--touch-target); padding: 8px 12px; border: 0; background: transparent; color: var(--lcd-ink); font: 700 14px/1.2 var(--font-display); text-transform: uppercase; cursor: pointer; }
.lcd-softkey:hover { background: var(--lcd-selected); color: var(--lcd-selected-ink); }

.lcd-block { border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); background: var(--lcd-surface); padding: 12px 16px; }
.lcd-block--sunken { background: var(--lcd-sunken); }
.lcd-block--dashed { background: transparent; border-style: dashed; border-color: var(--lcd-ink-secondary); }
.lcd-rule { border: 0; border-top: 2px dashed var(--lcd-ink-secondary); margin: 8px 0; }
.lcd-badge { display: inline-block; padding: 2px 8px; border: 2px solid var(--lcd-ink); font: 12px/1.4 var(--font-display); text-transform: uppercase; }

.lcd-field { width: 100%; box-sizing: border-box; min-height: var(--touch-target); padding: 10px 12px; border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); background: var(--lcd-surface); color: var(--lcd-ink); font: 16px/1.5 var(--font-body); }
.lcd-field::placeholder { color: var(--lcd-ink-secondary); }
.lcd-label { display: block; margin-bottom: 4px; font: 700 14px/1.2 var(--font-display); text-transform: uppercase; }

.lcd-progress { display: flex; gap: 4px; height: 16px; }
.lcd-progress span { flex: 1; border: 2px solid var(--lcd-ink); }
.lcd-progress .on { background: var(--lcd-ink); }

.lcd-pixel { image-rendering: pixelated; shape-rendering: crispEdges; }

.lcd-key:focus-visible, .lcd-option:focus-visible, .lcd-softkey:focus-visible, .lcd-field:focus-visible { outline: 3px dashed var(--lcd-ink); outline-offset: 3px; }

/* Observations */
.obs{margin:0;display:flex;flex-direction:column;gap:8px}
.obs-say{margin:0;font:700 18px/1.35 var(--font-body)}
.obs-happens{margin:0;font:400 16px/1.5 var(--font-body);color:var(--lcd-ink-secondary)}
.obs-happens::before{content:"> ";font-family:var(--font-display)}
.obs-card{border:2px solid var(--lcd-ink);border-radius:var(--radius-control);background:var(--lcd-surface);padding:16px}
.obs-hero .obs-say{font-size:28px;line-height:1.25}
.obs-hero .obs-happens{font-size:18px;color:var(--lcd-ink)}

@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }

/* v3 (26 Oct 2026): Go App-Free, Personal Compass and the Muse Spark functions */
/* AI text: dashed secondary border and an AI / kicker. Never used for friends' words. */
.lcd-ai { border: 2px dashed var(--lcd-ink-secondary); border-radius: var(--radius-control); background: transparent; padding: 12px 16px; }
.lcd-ai > .lcd-kicker:first-child::before { content: "AI / "; }
/* Web finds: a source line linking to the original */
.lcd-src { display: block; margin-top: 8px; font: 12px/1.3 var(--font-display); text-transform: uppercase; color: var(--lcd-ink-secondary); text-decoration: underline; text-underline-offset: 3px; }
.lcd-src::before { content: "> "; }
/* Choice chips for onboarding answers; selected = inverted */
.lcd-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.lcd-chip { min-height: var(--touch-target); padding: 8px 12px; border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); background: var(--lcd-surface); color: var(--lcd-ink); font: 400 15px/1.3 var(--font-body); text-align: left; cursor: pointer; }
.lcd-chip[aria-pressed="true"] { background: var(--lcd-selected); color: var(--lcd-selected-ink); }
.lcd-chip:focus-visible { outline: 3px dashed var(--lcd-ink); outline-offset: 3px; }
/* Before / after for compass edits */
.lcd-diff { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 8px; }
.lcd-diff > div { border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); padding: 8px 12px; }
.lcd-diff > div:first-child { background: var(--lcd-sunken); text-decoration: line-through; text-decoration-thickness: 2px; }
.lcd-diff > div:last-child { background: var(--lcd-surface); }
/* The person's own message (right aligned, sunken) */
.lcd-me { align-self: flex-end; max-width: 80%; border: 2px solid var(--lcd-ink); border-radius: var(--radius-control); background: var(--lcd-sunken); padding: 8px 12px; }
/* Small text-like key used for SHOW THE WORKINGS */
.lcd-link-key { display: inline-flex; align-items: center; min-height: var(--touch-target); padding: 0 4px; border: 0; background: transparent; color: var(--lcd-ink); font: 700 14px/1.2 var(--font-display); text-transform: uppercase; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.lcd-link-key:focus-visible { outline: 3px dashed var(--lcd-ink); outline-offset: 3px; }
/* Stepped pixel loader: three cells that fill in steps */
.lcd-loader { display: inline-flex; gap: 4px; vertical-align: middle; }
.lcd-loader span { width: 8px; height: 8px; border: 2px solid var(--lcd-ink); }
.lcd-loader span.on { background: var(--lcd-ink); }
/* A list of label / value rows (workings, snap results) */
.lcd-rows { display: grid; grid-template-columns: max-content minmax(0,1fr); gap: 4px 12px; margin: 0; }
.lcd-rows dt { font: 700 12px/1.6 var(--font-display); text-transform: uppercase; color: var(--lcd-ink-secondary); }
.lcd-rows dd { margin: 0; }
```
