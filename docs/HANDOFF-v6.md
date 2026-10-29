# Hoolala! v6: tiny tries lead (handoff for Muse Code)

Date: Thu 29 Oct 2026. Source: the canvas "Hoolala! today: get a try, go, tell me" (https://claude.ai/artifact/W2BoFNoCfeQZ3WAZqjnjHS), artboards `Flow.dc.html` and `Friends.dc.html`. Paste each section into the file named in its heading.

---

## 1. `docs/CHANGELOG.md` (add at the top)

```markdown
## 2026-10-29: Tiny tries lead (v6)

- **Decision:** the first screen says why Hoolala! exists: GET OUTSIDE. MEET PEOPLE. The daily **tiny try** is the hero; Signals here becomes the second path ("At a café or coworking? See who here would like to talk"). Reverses the 27 Oct decision. Reason: first user test (Sylvie) did not know what to do on opening the app.
- **Small talk (rule 14) moves from ROADMAP into the build**, simplified: GET A TRY > GO > TELL ME on one screen. Four honest answers: WENT WELL, NO REPLY, AWKWARD BUT DONE, DIDN'T HAPPEN. Then NEXT TIME: GENTLER / SAME STEP / BRAVER, with a suggestion the person can ignore. The guess and plot twist move to ROADMAP.
- **The plant (private):** one leaf per try (went well, no reply, awkward); nothing for didn't happen; every third leaf flowers. Never wilts, no streaks, no reminders. Colour appears only in the plant (rule 42).
- **Hoolala! types:** prompts appear letter by letter; keys rise in after (rule 43).
- **TRY IT (Muse Spark):** writes the next try inside step bounds that code sets and checks. Code owns the step and the leaves (rule 44).
- **Friends (slim):** DARE A FRIEND sends this week's try by WhatsApp, Messenger or link; a small private crew timeline of what happened. No counts per person (rule 45). Replaces the share card (WP7).
- Softkeys on the home: TODAY / FRIENDS. Brand slip fixed: the tagline sits under the name, never "Hello, name".
```

---

## 2. `docs/DESIGN.md`

### 2a. Version note (top of file, above Version 5)

```markdown
> Version 6 (29 Oct 2026): the first screen says GET OUTSIDE. MEET PEOPLE. and offers today's **tiny try**; small talk (rule 14) is in the build, adapted by TRY IT within code-set bounds; the private plant; Friends (dare and crew timeline). Signals here stays, as the second path. New rules 42 to 45.
```

### 2b. Replace rule 14

```markdown
14. **Small talk is step by step and private.** One tiny try at a time with people you don't know yet, on a 5-step ladder (1 Smile and nod, 2 Say hello, 3 Small question, 4 Short chat, 5 Suggest a coffee). One screen, three steps: GET A TRY (I'M IN / ANOTHER ONE / NOT TODAY, plus WHERE? anywhere, café, work) > GO (the try-saying line, I'M BACK) > TELL ME (WENT WELL / NO REPLY / AWKWARD BUT DONE / DIDN'T HAPPEN). Then NEXT TIME: GENTLER / SAME STEP / BRAVER. Hoolala! suggests one (braver after it went well, same after no reply or awkward, gentler after it didn't happen); the person decides. Nobody is moved up or down without a tap. Courage counts tries, not wins: a leaf for every try made, whatever happened. No streaks, no reminders, nothing public. Public everyday places only; no flirting or pick-up tries; "no thanks" is always a fine answer. Kind lines: "No worries, sometimes it happens. It says nothing about you." / "Awkward just means new. It wears off." / "The plant doesn't mind."
```

### 2c. New rules (after rule 41)

```markdown
42. **Colour is earned.** The interface stays LCD monochrome. Colour appears only in the plant, and only for tries the person made: greens for leaves, pink, yellow and blue for flowers. The plant is private, never wilts, never shrinks and is never compared.

43. **Hoolala! types.** Hoolala!'s prompts appear letter by letter (about 25 ms a character) with a block cursor; the keys rise in only when the text is complete. With `prefers-reduced-motion`, text and keys appear at once. Never type the person's own words.

44. **Code owns the step and the score; TRY IT writes the words.** Each step has hard bounds (talking, minutes, what is asked of the other person). TRY IT drafts a try as structured output; `src/rules/tries.ts` rejects anything outside the step it was asked for or against the always-on limits, SCREEN IT gives a second verdict, and the hand-written library is the fallback. Every try is stored with the step code assigned, never a step the model claims. Leaves are flat (one per try). Step changes need the person's tap. The "why this one" line is SHOW THE WORKINGS.

45. **Friends share stories, not scores.** A crew is small and private (invite link, one crew, expires in 7 days, anyone can be removed). The timeline shows what happened, with its honest tag, and NICE ONE. No counts per person, no "not yet" lists, no leaves for posting (rule 41). No names, faces or photos of strangers; posts pass screening. Invites go out by WhatsApp, Messenger or a copied link; never auto-sent, never to contacts we read.
```

### 2d. Home spec (replace the current home block)

```markdown
**Home (TODAY):** HOOLALA! and the tagline. GET OUTSIDE. MEET PEOPLE. (display, 40 px). One line: "One tiny thing to try in real life each day. Small enough to do on the way to somewhere. You decide, always." The plant card (pixel plant, N TINY TRIES, links to My moments). GIVE ME TODAY'S TRY > (primary). DARE A FRIEND TOO > (secondary). Softkeys TODAY / FRIENDS. After GIVE ME TODAY'S TRY, the one-screen flow of rule 14 with the goal bar, the plant and step meter, the three-step path (current solid, done shaded, next dashed) and the typed HOOLALA! SAYS block. Signals here is a dashed link at the bottom of the flow.
```

---

## 3. `docs/MUSE-SPARK-BY-FUNCTION.md` (new row in the loop table, before SUGGEST IT)

```markdown
| 2b | **TRY IT** | "Last one got no reply. Happens. Same step, a fresh try." The next tiny try, written for this person, place and time | Structured output, short creative drafting | Schema `{title, hint, step, words_max, minutes, asks_of_other, place_kind, why}`, `reasoning_effort: low`; inputs: step (from code), place kind, time of day, last 3 outcomes, compass interests | `src/rules/tries.ts`: step must equal the requested step; every field inside that step's bounds; always-on limits; then SCREEN IT; stored with the code-assigned step | The hand-written library (15 tries, 3 per step) |
```

Beat sheet: replace the 0:00 to 0:30 opening with the home (GET OUTSIDE. MEET PEOPLE.), one try typed out, a real try filmed at the place, NO REPLY answered kindly, the plant gaining a coloured leaf, then NEXT TIME: SAME STEP and TRY IT's "why this one". Signals here follows as "and when you're somewhere with others".

---

## 4. `src/rules/tries.ts` (spec and skeleton; tests first, per AGENTS.md)

```ts
// Code owns the step and the score. TRY IT only drafts words inside these bounds.

export type Step = 1 | 2 | 3 | 4 | 5;
export type Outcome = 'went_well' | 'no_reply' | 'awkward' | 'didnt_happen';
export type PlaceKind = 'anywhere' | 'cafe' | 'work';
export type Ask = 'nothing' | 'greeting' | 'short_answer' | 'few_minutes' | 'yes_or_no';

export interface TryDraft {
  title: string;        // max 48 chars, uppercase in UI
  hint: string;         // the try-saying line, max 80 chars
  step: Step;           // what the model claims
  words_max: number;    // words the person says
  minutes: number;
  asks_of_other: Ask;
  place_kind: PlaceKind;
  why: string;          // SHOW THE WORKINGS line, max 90 chars
}

export const STEP_BOUNDS: Record<Step, { words_max: number; minutes_max: number; asks: Ask[] }> = {
  1: { words_max: 0,  minutes_max: 2,  asks: ['nothing'] },                                  // Smile and nod
  2: { words_max: 5,  minutes_max: 2,  asks: ['nothing', 'greeting'] },                      // Say hello
  3: { words_max: 15, minutes_max: 5,  asks: ['greeting', 'short_answer'] },                 // Small question
  4: { words_max: 60, minutes_max: 10, asks: ['short_answer', 'few_minutes'] },              // Short chat
  5: { words_max: 30, minutes_max: 15, asks: ['few_minutes', 'yes_or_no'] },                 // Suggest a coffee
};

// Always-on limits, every step. Checked on title + hint + why (lowercased, accents folded).
export const BANNED_THEMES = [
  'appearance',   // outfit, hair, looks, pretty, cute, body
  'flirting',     // date, number, flirt, single, kiss
  'contact',      // phone, number, instagram, snapchat, whatsapp, email, handle
  'touch',        // hug, touch, hold hands
  'following',    // follow them, walk with them home
  'filming',      // photo of, film, record
  'children',     // kid, child, teen, school gate
  'money',        // buy them, pay for, lend
  'alcohol_late', // bar after, shots, drinks late
  'private_places', // their home, your home, car
];

export interface Verdict { ok: boolean; reasons: string[] }

/** Reject, never rewrite. A rejected draft falls back to the library. */
export function validateTry(d: TryDraft, requested: Step): Verdict;
//  - d.step !== requested                       -> 'step_mismatch'
//  - d.words_max > bounds.words_max             -> 'too_many_words'
//  - d.minutes > bounds.minutes_max             -> 'too_long'
//  - !bounds.asks.includes(d.asks_of_other)     -> 'asks_too_much'
//  - any banned theme matched                   -> 'banned:<theme>'
//  - lengths, crisis words (shared with screening.ts)

/** Courage counts tries. Flat: one leaf, whatever step. */
export function leafFor(o: Outcome): 0 | 1; // went_well, no_reply, awkward -> 1; didnt_happen -> 0

/** A suggestion only; the person's tap decides. Never outside 1..5. */
export function suggestNext(step: Step, recent: Outcome[]): -1 | 0 | 1;
//  - last = went_well and at least 2 of the last 3 were went_well/awkward -> +1 (rule 14: braver after 3 runs with 2 done)
//  - last = went_well otherwise                                           -> +1 only if 3 runs at this step, else 0
//  - last = no_reply or awkward                                           -> 0
//  - last = didnt_happen                                                  -> -1
//  - clamp so step + result stays in 1..5 (else 0)

/** Step only changes through this, called from the person's NEXT TIME tap. */
export function applyChoice(step: Step, choice: -1 | 0 | 1): Step;
```

Storage: table `tries (id, user_id, step, source 'library'|'try_it', library_id?, outcome, created_at)`. The step is the code-assigned one. The model's text is not stored (rule: no personal text in logs); the library id or a hash is enough for calibration.

Tests to write first (`src/rules/tries.test.ts`):
1. A step 3 draft claiming step 3 with 12 words, 4 minutes, short_answer passes.
2. A draft claiming step 2 when step 3 was requested fails with step_mismatch.
3. Step 1 with any words fails with too_many_words.
4. "Compliment their outfit" fails with banned:appearance.
5. "Get their Instagram" at step 5 fails with banned:contact.
6. "Ask the teenagers at the bus stop" fails with banned:children.
7. leafFor gives 1 for no_reply and awkward, 0 for didnt_happen.
8. suggestNext never returns +1 at step 5 or -1 at step 1.
9. applyChoice cannot skip (step 2 with +1 gives 3, never 4).
10. With `LLM_ENABLED=false`, the next try always comes from the library, same step.

Evaluation set (CHECK IT): add 15 TRY IT cases (10 generated tries hand-labelled by step, must match; 5 traps, must be rejected). Target 15 of 15; publish in the README with the existing 36.

Calibration (CHECK IT, no personal text): per step and source, the share of didnt_happen. If TRY IT's share at a step is clearly above the library's, the generator is writing too hard; flag it.

---

## 5. GitHub: status and what to do

### Close now (merged, issue still open)

| Issue | Merged in |
|---|---|
| #2 WP0 Kickoff | done Mon 26 |
| #5 WP20 Places and check-in | #22, #25 |
| #9 WP22 Signals here | #23 |
| #10 WP23 SCREEN IT, SUGGEST IT, PLAN IT | #27, #28, #34 |
| #11 WP5 Meet and connection rate | #24 |
| #12 WP6 Live page | #24 |
| #13 WP14 CHECK IT and evals (36/36) | #32 |
| #6 WP24 FIND ME | #30 |
| #7 WP25 PLACE IT and points | #36 |
| #18 Wed 28 checklist | stale; close with a note |

### Still open and real

- **#15 WP9 Safety, pilot, submission:** SAMPLE place and privacy/README done (#26, #35). Left: safety pass check (18+ gate, rate limits incl. TRY IT, crisis message), dry run Sat 31, pilot Mon 2, video, submit.
- **#8 WP21 Telegram Mini App:** no PR yet. Proposal: move to ROADMAP; the web app is the demo. Keep only if the pilot place needs it.
- **#14 WP7 Share card:** fold into WP30 (the dare card is the share card).

### New issues (milestone Submission (4 Nov), label work-package)

**WP28 Home v6 and tiny tries (Fri 30)**
Home per DESIGN v6 (rule 14, 42, 43, home spec); one-screen flow GET A TRY > GO > TELL ME > NEXT TIME; library of 15 tries (`src/content/tries.ts`, from Flow.dc.html); `tries` table and API (`POST /tries`, `GET /me/plant`); plant renderer (14 x 18 pixel grid, leaves and flowers by count); reduced motion. Acceptance: on a real phone, a new person understands the goal without help and completes one try in under a minute of screen time; works with LLM_ENABLED=false.

**WP29 TRY IT, adaptive tries with guardrails (Sat 31, morning)**
`src/rules/tries.ts` with tests first (section 4); `src/llm/tryit.ts` (schema, low effort, 8 s timeout, validator, library fallback, `llm_calls` and `workings` rows); SCREEN IT second verdict; "why this one" in the flow; 15 new eval cases. Acceptance: 15/15 evals; a step never changes without a tap.

**WP30 Friends, slim (Sun 1)**
DARE A FRIEND: share sheet with the dare text and a crew invite link (WhatsApp `wa.me` and Messenger share URLs, copy link); one private crew per person; timeline posts (outcome tag + text, screened), NICE ONE. Seed a demo crew for the video. Replaces WP7. Acceptance: invite opens WhatsApp prefilled on a real phone; a friend who taps the link joins the crew; no counts per person anywhere.

**WP31 Staging fixes (Fri 30, 1 hour)**
Tagline under the name (not "Hello, name"); accepted signal card shows only the next step (PLAN > ON MY WAY > MEET; the rest behind MORE); empty state "QUIET IN HERE. FOR NOW." + POST THE FIRST ONE; softkeys TODAY / FRIENDS on the home.

**Docs v6 (today)**
This file's sections 1 to 3 into `docs/`, plus `AGENTS.md` line 7 (product summary: tiny tries first, TRY IT added to the Muse Spark list) and `BUILD-PLAN.md` (WP28 to WP31, the new days).

### Days left

| Day | Build | Not build |
|---|---|---|
| Thu 29 | Docs v6, issues, close the merged ones. Pilot place and filming permission confirmed | |
| Fri 30 | WP28 home and tries; WP31 fixes | |
| Sat 31 | WP29 TRY IT (morning); friends dry run (afternoon) on the new home | |
| Sun 1 | WP30 friends slim; WP9 safety pass | |
| Mon 2 | Pilot, Lausanne, 11:00 to 16:00 | No new features |
| Tue 3 | Fixes from the pilot; film and edit the video; README results | No new features |
| Wed 4 | Private-window check; submit by 18:00 Zurich | |

Cut order if late: WP30 timeline (keep the dare link), then TRY IT generation (keep the validator, the library and the "why" line), then WP31 extras.
