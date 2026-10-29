# Let's get personal (WP36) · HOOLALA v6.2

Design reference: `design/screens/Onboard.dc.html` (stages SURPRISE ME and COMPASS). Voice UI reference: `design/screens/Voice.dc.html`. States: `design/SCREENS.md`.

## Reuse the existing voice UI. Only the questions move.

**Do not build a new voice screen.** Use the Surprise me voice UI exactly as built for WP34 (v6.1, `specs/voice.md` in HOOLALA_V6.1): Hoolala!'s face (the ball), the thumb row TYPE · hold-to-talk MIC · SKIP, captions always on, HEARING… then I HEARD, the AI compass draft block, SAY AGAIN, FIX BY TYPING, SOUND ON / OFF, the speech code from WP26, the no-mic typing fallback and the privacy line. If WP34 is not merged yet, build it first; this work package is a configuration of it.

What changes, and nothing else:

| Part | v6.1 Surprise me | v6.2 Let's get personal |
|---|---|---|
| Entry | Separate Surprise me page | Straight after the onboarding story (WP35); also from Around me's SET IT UP when the compass is empty |
| Intro screen | FIVE QUICK QUESTIONS. THEN A LITTLE SURPRISE. | **LET'S GET PERSONAL.** / "Three questions about real moments you've had, so your tiny tries fit you. No right answers. Hold the mic at the bottom and answer out loud, or type. About a minute." / START > / privacy line unchanged |
| Questions | Five opinion questions | **Three past-experience questions (Mom Test)**, below |
| Progress | Five dots | Three dots, `Q1 OF 3 · FILLS TALK ABOUT` |
| Confirm key | KEEP > | **NEXT >** (still saves the drafted line) |
| After the last answer | THAT'S YOU, IN 5 ANSWERS. → compass reveal | Compass check (below) → the game (WP37) |
| Head start | FIND ME offered | **Removed entirely** (see DECISIONS) |

Speech starts on the START tap (a user gesture), so browsers allow it.

A progress strip sits under the header for the whole onboarding: SURPRISE ME · COMPASS · GAME · AROUND? (current filled, done light, later dashed; AROUND? is optional).

## The three questions (Mom Test: real past moments, never opinions or hypotheticals)

| # | Spoken and captioned | Fills | Sample answer (design only) | Drafted line |
|---|---|---|---|---|
| 1 | Think of the last time you lost track of time talking with someone. What were you talking about? | TALK ABOUT | Board games with my brother, last Saturday. We argued about the rules for an hour. | Board games (with my brother, last Saturday) |
| 2 | Where were you the last time a chat just happened, without you planning it? | MORE OF | At the café by the station. The waiter asked about the book I was reading. | Cafés, where chats just happen |
| 3 | The last time you talked to someone new, how did it start? | HOW I GO | My neighbour said hello on the stairs first, and I just answered. | Gently: easier when the other person starts |

LESS OF is not asked; it shows as empty ("Add later, if you like") and is filled from MY COMPASS or the COMPASS? row later.

## Drafting the compass from an answer (Muse Spark)

One call per answer, after release of the mic (or SEND when typing).

- Input: the question id and the transcript or typed text. Nothing else.
- Output (structured, JSON schema): `{ "part": "TALK_ABOUT|MORE_OF|HOW_I_GO", "line": string (max 60 chars), "topic": string|null, "place_kind": string|null, "pace": "gentle|mixed|direct"|null, "people": [role] }`.
- `people` is a list of **roles from a fixed allow-list only**: mum, dad, brother, sister, grandparent, family, colleague, neighbour, flatmate, friend, waiter, barista, driver, cashier, librarian. Each role has a class: `close` (family, colleague, neighbour, flatmate, friend) or `service` (waiter, barista, driver, cashier, librarian).
- Validator (code, rejects, never rewrites): line within length; `part` matches the question; roles only from the allow-list; **no personal names, ever** (strip capitalised names, reject if any remain); no personality, health, politics, religion or sexuality labels (existing compass rules); the line describes what happened, never what the person is ("easier when the other person starts", never "you are shy").
- Fallback (model off or rejected twice): the typed or heard text, trimmed to 60 characters, becomes the line; roles come from a keyword match on the allow-list; pace defaults to `gentle`.
- Transcripts and audio are never stored or logged. Only the confirmed lines and roles are stored, after LOOKS RIGHT.

## Compass check (new screen)

- Typed headline: THAT'S YOU, IN 3 ANSWERS. (the count is the number kept).
- 2 x 2 grid: N · MORE OF, E · TALK ABOUT, S · LESS OF, W · HOW I GO. Filled cells: surface fill, solid border, source FROM: SURPRISE ME or FROM: YOU TYPED. Empty cells: dashed border, "Add later, if you like", EMPTY FOR NOW.
- A full-width box: **PEOPLE IN YOUR DAYS**, e.g. BROTHER · NEIGHBOUR · WAITER, source FROM: YOUR ANSWERS · ROLES ONLY, NEVER NAMES. Empty: "Nobody named yet. Tries will say someone."
- "Nothing is saved until you say it looks right. Change or undo any line later in MY COMPASS."
- Primary LOOKS RIGHT. MAKE MY GAME > (saves the lines and roles, then opens WP37). Secondary CHANGE SOMETHING (back to the intro of this flow, answers cleared).

## Data

New: `compass_people` (user_id, role, role_class, source='surprise', created_at). Roles only. Deleted with the account and removable in MY COMPASS. Existing compass line storage unchanged (source labels FROM: SURPRISE ME, YOU SAID, FROM: YOUR FEEDBACK).

## Who decides what

| Decision | Code | AI | Person |
|---|---|---|---|
| Questions and their order | Fixed | None | |
| Line wording | Validator | Drafts | NEXT, SAY AGAIN or FIX BY TYPING |
| Roles | Allow-list, name stripping | Proposes | Sees them on the compass check; LOOKS RIGHT or CHANGE |
| Saving | Only after LOOKS RIGHT | | Taps |

## Tests to write first

1. The voice component renders with the new intro, three questions and NEXT, using the WP34 component (no duplicate component).
2. A transcript containing a name ("my brother Tom") stores the role `brother` and never "Tom".
3. A role outside the allow-list is dropped.
4. A drafted line with a personality label is rejected and the fallback is used.
5. Nothing is written to storage before LOOKS RIGHT; CHANGE SOMETHING clears the drafts.
6. With `LLM_ENABLED=false` the whole flow completes using fallbacks.
7. No transcript or audio appears in logs.

## Scope

All of it for 4 Nov. Editing roles inside MY COMPASS can reuse REMOVE (no new UI).
