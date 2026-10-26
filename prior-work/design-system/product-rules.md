# Product rules

The interaction contract. Every screen, agent reply and API must keep these.

## The home

One two-line observation, then HOOLALA! and the tagline, two keys and a short menu, nothing else:

- Keys: `ANYTHING NEW?` (FIND IT) · `GO APP-FREE` (TELL IT, until the compass exists; then `MY COMPASS`)
- Menu: `LITTLE SIGNALS` · `ANYONE AROUND?` · `INVITE THEM OUT` · `SNAP IT` · `MEET IRL`
- A one-question chat box at the bottom, with a microphone key for SAY IT.

Softkeys: `CHAT` (left) and `MY MOMENTS` (right). Every other screen has a BACK softkey and returns here; Escape does too.

## Hackathon build and roadmap (26 Oct 2026)

In the build: home, sign-in, circle, notes and invitations, Little Signals, Anyone around?, the six Muse Spark functions, Telegram on demand, Meet IRL, the Live page, the share card and Go live. Designed but **ROADMAP** (not built before 4 Nov): Sounds familiar? and its sharing and discovery (rules 12, 13, 18), small talk (rule 14), Outside picks (rule 19), Find a plan as its own flow (open invitations appear in FIND IT instead), Unplug, NFC, scheduled delivery.

## Non-negotiables

1. **No feed.** A catch-up shows at most 3 notes, one at a time, then an ending screen. No pagination, pull-to-refresh, recommendations, trending lists or "load more".
2. **Pull by default.** Notes stay unread until the person asks. Surprise delivery is opt-in and respects quiet hours. No unread counters on the home; the person asks ANY NEWS?
3. **Private by default.** Sharing needs chosen recipients and a confirmation. No public location, contact exposure, read receipts or online status.
4. **Complete, don't retain.** Every sequence ends with a way out: YOU'RE ALL CAUGHT UP. GO ENJOY YOUR DAY. No autoplay, streak loss, guilt, growth hooks or vanity counters.
5. **Confirm every outbound action.** Draft > show recipients > person confirms > backend publishes > receipt. Never show SENT before the backend acknowledges.
6. **One plan at a time.** Show date, time and timezone. RSVP needs a separate confirmation.
7. **Real life without surveillance.** QR or NFC is opt-in on both phones, short-lived and mutual. It proves proximity, never a conversation or a friendship.
8. **Reward wisely.** UNPLUG records a self-declared break. A web app cannot track whole-phone screen time, so never claim it. Moments are private keepsakes: no scores, leaderboards or comparisons.
9. **A light facilitator, not a companion.** The chat retrieves what friends shared, summarises accurately, helps people say what they mean, surfaces mutual opportunities and recognises when it's done ("That's everything. We could show you more, but we'd have to make it up."). It never invents updates, availability or feelings, keeps friends' words separate from its own suggestions, and never sends, shares or invites without approval. Not a therapist, not an engagement optimiser.
10. **Notes are small and effortless.** LEAVE A NOTE offers a QUICK NOTE ("Finally finished moving.", "Thinking of you.") or INVITE THEM OUT (activity, when, where, who). Recipients are chosen every time; notes can be edited and deleted (MY NOTES). Never require interesting content or a posting schedule. Invitations are answered I'M IN or NOT THIS TIME, no explanation needed.
11. **GO LIVE switches Hoolala! off.** The joke flips "going live": the pixel screen SWITCHES TO FULL RESOLUTION... while a resolution readout steps 84 x 48 > 640 x 480 > 1920 x 1080 > 7680 x 4320 > REAL LIFE, then the backlight steps down to `shell-bg` (about 3s in total, instant with reduced motion). The dark screen shows a blinking LIVE light, HOOLALA! IS OFF. YOU'RE ON., the line "Now showing everywhere except here. Your phone can take a break too." and one SWITCH ON key. Keep it a wink: never lecture about screen time. No app can power off a phone, so never claim it did; a native build may later offer to start the OS Focus or Do Not Disturb mode, with permission.
12. **ROADMAP. Sounds familiar? is finite and private by default.** Observations are two short lines (80 characters each), saved privately unless the author picks circle or anonymous public. Public ones pass an identifying-details check and human moderation first. Discovery shows three per session, then ends. No likes, counts, authors, rankings or feed. The point is to recognise a moment, smile, and maybe make something happen, not to make more content.
13. **AI suggests, people decide.** AI help on observations stays in a labelled suggestion, preserves the author's idea, and is never published automatically.
14. **ROADMAP. Small talk is step by step and private.** Tiny missions with people you don't know yet, on a 5-step ladder (1 Smile and nod, 2 Say hello, 3 Small question, 4 Short chat, 5 Suggest a coffee). Loop: pick one of 3 missions > guess how it'll go (1 to 10, skippable) > try-saying line, when and where > off you go > debrief (I did it / I tried / Not this time, actual 1 to 10, one thing noticed) > plot twist (actual minus guess). Courage counts tries, not wins. Offer a step up after 3 runs with 2 done; offer a step down after a rough one; never force either. No streaks, no reminders, nothing public. Public everyday places only; no flirting or pick-up missions; "no thanks" is always a fine answer.
15. **Little signals, not an online status.** A signal is a voluntary, temporary hint ("Coffee wouldn't hurt.", "Social battery: 12%.", or 40 characters of your own) shared with the circle, chosen friends, or kept private. Default expiry 4 hours (1 hour, tonight or tomorrow morning also offered); edit or cancel any time. Recipients only meet a signal when they catch up or ask ANYONE AROUND?. Expired, cancelled or private signals never reach anyone, enforced on the server. No presence dots, no "seen", no pressure to reply, no notifications unless authorised.
16. **Anyone around? uses only what friends shared.** It lists availability signals friends explicitly shared with this person, may add what the person's own moments say ("You and Sophie last met in April."), then offers SUGGEST A PLAN / LEAVE A NOTE / MAYBE LATER. Mood signals (one of those days, do not disturb-ish, low battery) are never used for suggestions or automated outreach. No inference from location or behaviour, no matching with strangers, nothing sent without approval.
17. **Catch-ups come in threes.** ANYTHING NEW? shows notes and signals three at a time. After three: THAT'S THREE. ASK FOR MORE only if the person asks. At the end: THAT'S EVERYTHING. WE COULD SHOW YOU MORE, BUT WE'D HAVE TO MAKE IT UP.
18. **ROADMAP. Black box sharing.** Observations export in three styles: black box (white on black), LCD card (pixel), plain text. Cards carry only the joke and a small HOOLALA! signature. Social platforms are acquisition channels, never an engagement model to copy. Growth line: PLEASE DON'T FOLLOW US. BRING A FRIEND.
19. **ROADMAP. Outside picks are optional and clean.** A clearly labelled OUTSIDE PICKS screen suggests free, borrowed or repaired activities. No paid placements in private messages, no data selling, no behavioural ads, no hidden sponsorships, nothing that monetises emotional vulnerability. Any future partner (e.g. mission-aligned outdoor brands) needs human approval and a visible label.
20. **No pictures or video as content.** Notes are text. A photo for SNAP IT and a voice note for SAY IT are inputs only: processed in memory, never stored, never shown to anyone else, and always with a typed alternative.
21. **Go App-Free starts with what you want more of.** TELL IT is a short conversation (five stages on camera: what you'd like more of, what makes digital time worthwhile, what to hear less about, how often, the reveal). Playful first line ("Hello, human."), multiple choices plus free text, at most one follow-up question per stage, progress cells, BACK and SKIP everywhere, every answer editable. Never ask for age, screen-time estimates or anything not needed.
22. **The Personal Compass is yours, in your words.** "What you're curious about right now": intentions, interests, filters, delivery and welcome actions, built only from what the person said or chose. Never a score, a personality label or a judgement of behaviour. Plain-language edits ("Only send me things near Lausanne") show BEFORE / AFTER and save only on CONFIRM; every change sits in a CHANGES list with UNDO. Nothing learnt from time spent, opens or scrolling.
23. **FIND IT is finite, grounded and explained.** ANYTHING NEW? shows at most the person's cap (default 3): friends' notes, signals and invitations first, in their own words, then up to two finds from the web. Each AI line says why it is there (AI / WHY THIS: "Because you said: live music.") and every web find shows its source. Lines that can't be traced to a real item or a returned source are dropped. Ends with one action at most and THAT'S EVERYTHING. WE COULD SHOW YOU MORE, BUT WE'D HAVE TO MAKE IT UP. Feedback (MORE LIKE THIS / NOT USEFUL / LESS OF THIS) becomes a visible compass change with UNDO.
24. **SAY IT and SNAP IT show what was understood before anything happens.** YOU SAID: "..." or LOOKS LIKE: Jazz at Le Bourg, Thu 21:00, with FIX IT and NOT NOW. Low confidence opens the details for checking first. Never describe people or faces from a photo.
25. **PLAN IT drafts, people send.** The agent may combine shared availability, finds and the compass into one draft invitation, labelled AI / DRAFT. It always stops at SEND THIS TO SOPHIE? with YES, SEND IT and EDIT. Mood signals never reach it. Never "SENT" before the server confirms.
26. **Show the workings.** Every AI answer has a SHOW THE WORKINGS key: the capability used, tools called, sources, "Grounded: 3 of 3 lines", the compass line behind each item. It shows method, never other people's private data.
27. **Telegram is the same Hoolala!, smaller.** Go App-Free links Telegram with a single-use link. Briefings arrive only when asked ("anything new?"). Same caps, labels, confirmations and endings as the web; no chat-style companionship, no "good morning" messages, no streaks. PAUSE and UNLINK work from both sides.

## The primary flows

| Flow | Screens | Ends with |
|---|---|---|
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
| ROADMAP | Find a plan, Unplug, Small talk, Sounds familiar?, Discovery (designed, see their components) | |

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
