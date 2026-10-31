# Five quick ones (WP36, revised) · HOOLALA v6.3

Design reference: `design/screens/Onboard.dc.html` (stage SURPRISE ME). Voice UI it reuses: `design/screens/Voice.dc.html`. States: `design/SCREENS.md`.

**Build exactly what the screen shows.** Copy, order, sizes, chip labels, keys and states are final. Do not reword, restyle, reorder or "improve" anything. If something cannot be built as drawn, record a STOP in `checks/CHECKS-REPORT.md` and ask the owner.

## What changes from v6.2

| v6.2 (Let's get personal) | v6.3 (Five quick ones) |
|---|---|
| Intro LET'S GET PERSONAL. | **HELLO, HUMAN.** / "Five quick ones, then you're out of here." / "Tap an answer, hold the mic and talk, or type." / START > / privacy line |
| Three free-text questions | **Five questions, mostly chips, two follow-ups**, below |
| An AI compass line drafted after each answer, with NEXT | **No per-answer AI.** Chips are stored as they are. The two free-text answers are processed once, at the end (WP39) |
| After Q3 → compass check | After Q5 → **closing line and the juicy bits screen with Snake (WP39)** → compass check |
| Three progress dots | Five dots; follow-ups keep the same dot and add `· FOLLOW-UP` (`Q1 OF 5 · FOLLOW-UP`) |

## Reuse the existing voice UI. Do not rebuild it.

Same component as WP34 and v6.2: Hoolala!'s face (the ball, now 88 px in a 124 px band), captions typed while spoken (en-GB, `rate 1.05`), the thumb row TYPE · hold-to-talk MIC (76 px) · SKIP, the transcript box (HEARING… then I HEARD or YOU TYPED), SAY AGAIN, FIX BY TYPING, SOUND ON / OFF, the typing fallback without a mic. **New in the component:** a chips slot (below the caption) and a short reply line (Hoolala! answers a chip). Add these as options of the one component; do not fork it.

## The script (copy is final)

| Step | Spoken and captioned | Type | Chips | Behaviour |
|---|---|---|---|---|
| Intro | HELLO, HUMAN. Five quick ones, then you're out of here. | | | START speaks Q1 (the tap unlocks speech) |
| Q1 | When did you last lose track of time talking to someone? | one | THIS WEEK · THIS MONTH · AGES AGO · CAN'T REMEMBER | Tap moves on. **CAN'T REMEMBER** → reply "Fair. We'll start gentle." (1.7 s), **skips the follow-up**, goes to Q2 |
| Q1 follow-up | Nice. What was it about? Ramble if you like. I'll keep the good bits. | text | | Dictation or typing → I HEARD / YOU TYPED → "I'll keep the good bits at the end. Ramble away." → NEXT > · SAY AGAIN · FIX BY TYPING |
| Q2 | Who did you say more than "hi" to this week? | many | BARISTA · NEIGHBOUR · COLLEAGUE · DRIVER · SHOP STAFF · A REGULAR · NOBODY YET | Several allowed; NOBODY YET clears the others and the others clear it. TYPE adds free text ("Someone else? Type it"), shown as "+ …". NEXT > enabled once one chip or text is given |
| Q2 follow-up | And who did you only nod at? | many | same, with **NOBODY** instead of NOBODY YET | as Q2 |
| Q3 | Battery check. How's yours today? | one | LOW · OK · GOOD · FULL | Reply then moves on: LOW "Soft tries today. Noted." · OK "Steady does it." · GOOD "Good. Room for a brave one." · FULL "Full battery. Bold it is." |
| Q4 | What did you nearly say to someone lately, but didn't? | text | | as the Q1 follow-up |
| Q5 | Last one. Anything to keep off the table? | many | POLITICS · WORK · FAMILY · HEALTH · MONEY · LOOKS · NOTHING, I'M EASY | NOTHING, I'M EASY is exclusive; NEXT > |
| Closing | Got it. Give me a moment to keep the juicy bits. | | | Opens WP39 |

- Holding the mic works on every step. On chip steps the transcript is matched to chips by code (role and word match), then shown selected with the I HEARD box, so the person can still change them.
- SKIP moves to the next step; SKIP on Q1 also skips its follow-up.
- Hints under the face: `TAP ONE, OR HOLD THE MIC` (one), `TAP ANY, OR HOLD THE MIC` (many), `HOLD THE MIC AND RAMBLE, OR TYPE` (text).
- Chips: min 44 px tall, 12 px padding, Silkscreen 12 px, 2 px ink border; selected = ink fill. `aria-pressed` on many-chips.

## Data (what is stored, before the compass check)

Nothing is stored until LOOKS RIGHT on the compass check. Held in memory for the session: `q1` (chip), `q1f` (text), `q2` (chips + text), `q2f` (chips + text), `q3` (chip), `q4` (text), `q5` (chips). Audio is never stored. Free text is discarded as soon as WP39 has extracted the kept bits.

## Rules from these answers (code, not AI)

- **START HERE level:** battery LOW or OK → SOFT, GOOD → BRAVE, FULL → **BOLD**. **CAN'T REMEMBER on Q1 always sets SOFT**, overriding the battery. (The battery reply still plays as written; all levels stay open.)
- **People tiers:** Q2 chips (and roles found in the free text) = `said`; Q2 follow-up chips = `nod`. SOFT tries prefer `nod` people; BRAVE and BOLD prefer `said` people.
- **Places from roles:** BARISTA → the café, NEIGHBOUR → your building, COLLEAGUE → work, DRIVER → the bus stop, SHOP STAFF → the shop, A REGULAR → your usual spot. The first `said` role's place fills `{p}`; default the café.
- **Off the table (Q5):** each item is a banned theme for TRY IT for this person; **FAMILY also removes family roles** and **WORK removes COLLEAGUE** from tries and from the compass people.

## Tests to write first

1. The step order and copy match the table; follow-ups keep the dot and show `· FOLLOW-UP`.
2. CAN'T REMEMBER plays its reply and skips the follow-up; SKIP on Q1 also skips it.
3. Exclusive chips (NOBODY YET, NOBODY, NOTHING, I'M EASY) clear the others and vice versa.
4. Battery replies play the exact copy; START HERE = SOFT, SOFT, BRAVE, BOLD; CAN'T REMEMBER forces SOFT.
5. Off-table FAMILY removes BROTHER from people and tries; WORK removes COLLEAGUE.
6. One voice component renders every step (no second voice component in the codebase).
7. Nothing is written to storage before LOOKS RIGHT; no audio or free text in logs.

## Scope

All of it for 4 Nov.
