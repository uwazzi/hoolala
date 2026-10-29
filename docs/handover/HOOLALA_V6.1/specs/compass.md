# Compass (WP33) · HOOLALA v6.1

Thu 29 Oct 2026. Design reference: `design/screens/Compass.dc.html` (compass screen) and `design/screens/Flow.dc.html` (try debrief, COMPASS? row). Builds on DESIGN.md rules 22, 38 and 39, the PersonalCompass and CompassReveal components, and the live Surprise me (WP26).

## The screen

- **Four directions, not a list.** The five stored parts map to four points:
  - **MORE OF** (north) = `intention`. Feeds today's tiny try (TRY IT).
  - **TALK ABOUT** (east) = `interest`. Feeds FITS YOU on Signals here and "why go" on Around me.
  - **LESS OF** (south) = `filter`. Filters every suggestion.
  - **HOW I GO** (west) = `delivery` and `action` (when, alone or with others, how far). Feeds Around me and TRY IT.
  Each point shows a count. Tapping one swings the needle there (0.6 s, slight overshoot), Hoolala! types what that part does (rule 43), and the lines rise in.
- **Every line** shows its source (FROM: SURPRISE ME, FROM: [domain], FROM: YOUR FEEDBACK, YOU SAID) and a REMOVE key.
- **SAY IT YOUR WAY:** one field. Muse Spark proposes the change and picks the part; the screen swings the needle to it and shows BEFORE / AFTER with SAVE / NOT NOW. Last three changes under CHANGES with UNDO.
- **WHERE IT'S USED:** one line per direction ("This part shapes today's tiny try.") and the fixed line "Never shown to anyone. Never used to match or rank people."
- **Reveal (first time, end of Surprise me or FIND ME):** YOUR WORLD, ACCORDING TO YOU. The needle spins for 2 s and settles on north while a one-line summary types out. LOOKS RIGHT / CHANGE SOMETHING / START AGAIN. Nothing saved before LOOKS RIGHT.
- **Entry points:** MY COMPASS (dashed link with a pixel compass icon, under the plant card on Today), EDIT on Around me's compass line, and the reveal. The header stays the brand only.

## How information is collected (four routes, one rule)

The rule: **a line exists only because the person said it or ticked it.** Muse Spark drafts; code validates; the person confirms; then it is saved.

1. **Surprise me (live).** Five questions, voice or typed. Voice is transcribed and never kept. The five questions should cover the four directions:

   | Question | Part |
   |---|---|
   | What could you talk about for an hour? | TALK ABOUT |
   | What would you like a little more of? | MORE OF |
   | What drains you, or what should I leave alone? | LESS OF |
   | When do you like to be out, and alone or with others? | HOW I GO |
   | Anything else I should know? | any |

   Check the live questions 2 to 5 against this table; change the wording only if a direction is missing.

2. **FIND ME (built).** Consent first; only the person's own name, city and links; at most 3 searches; IS THIS YOU? with THAT'S ME / NOT ME; only ticked findings become lines, tagged with the domain; the search is never kept.

3. **Say it your way.** Plain words on the compass screen; BEFORE / AFTER; SAVE; UNDO. Tagged YOU SAID.

4. **Feedback after a try (new, small).** On the try debrief (after the outcome), one optional row: COMPASS? MORE LIKE THIS / LESS LIKE THIS / SKIP. Tapping MORE or LESS shows "AI · SAVE TO YOUR COMPASS?" with the AFTER line (e.g. "LESS OF: tries like 'smile at three people' (from: your feedback)") and SAVE / NOT NOW. Saved shows "Saved to your compass. Undo or see it >". Nothing changes without SAVE. Same row later on Around me's I'M LEAVING (after the talking rating), as a follow-up.

## Never collected

Time spent, opens, scrolling, location history, who someone met, outcomes as traits, anything about health, politics, religion or sexuality, personality types, scores. Outcomes (no reply, awkward) never become compass lines on their own.

## Data and code

- Compass item (existing record): `part` (`intention`, `interest`, `filter`, `delivery`, `action`), `text`, `source` (URL or "you said"), `origin` (`onboarding`, `edit`, `feedback`; add `surprise`), `active`. Change log unchanged (`before`, `after`, words, `confirmed_at`, `undone_at`).
- Muse Spark output for every route: `{ part, text, source }[]`. Validator (`src/rules/compass.ts`, extend): every `text` traces to the person's words or a ticked finding; banned labels (types, health, politics, religion, sexuality); `part` in the five; max 60 characters; feedback lines must name the try or place they came from.
- API: `POST /compass/propose {text | feedback: {try_id, more|less}}` returns BEFORE / AFTER and saves nothing; `POST /compass/confirm {proposal_id}`; `POST /compass/undo {change_id}` (existing tools `propose_compass_change`, `confirm_compass_change`, `undo_compass_change`).

Tests first: feedback proposal saves nothing until confirm; undo restores exactly; a draft line with a personality label is rejected; a line with no source is rejected; outcomes alone never create a line; the compass of person A is never returned to person B.

## Scope for 4 Nov

Build: the four-direction screen with needle and typing, SAY IT YOUR WAY with BEFORE / AFTER and UNDO, sources on every line, the COMPASS? row on the try debrief. Check Surprise me's five questions against the table.

After 4 Nov: the COMPASS? row on Around me's I'M LEAVING; compass-driven ordering beyond FITS YOU.
