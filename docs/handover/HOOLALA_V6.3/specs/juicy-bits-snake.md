# Keeping the juicy bits, with Snake (WP39) · HOOLALA v6.3

Design reference: `design/screens/Onboard.dc.html` (stage after Q5; set the `startAt` tweak to `juicy` to jump there). States: `design/SCREENS.md`.

**Build exactly what the screen shows.** This is a new screen; its layout, copy, board size, controls and timings are final. Do not restyle, add a score, change the controls or swap the game. Anything that cannot be built as drawn is a STOP in `checks/CHECKS-REPORT.md`.

## What it does

After Q5, Hoolala! says "Got it. Give me a moment to keep the juicy bits." While Muse Spark processes the answers (removing filler words and keeping only the bits useful for the game of small talk and kindness), **Snake starts by itself**, in the LCD style. When processing is done, SHOW ME WHAT YOU KEPT appears; the person can keep playing or go on.

## Layout (390 x 844), top to bottom

1. Compact header and the onboarding strip (SURPRISE ME active).
2. Row: Hoolala!'s face 40 px (spinning while processing, still when ready) and the typed headline **GOT IT. GIVE ME A MOMENT TO KEEP THE JUICY BITS.** (Silkscreen 700, 18 px).
3. Status row (Silkscreen 11 px): `KEEPING THE JUICY BITS ■■□□□` filling as it works, then `READY WHEN YOU ARE.`; on the right while playing, STOP PLAYING (underlined).
4. **Snake view (default, starts automatically):**
   - Board 342 x 216 px (19 x 12 cells of 18 px), `lcd-surface` fill, 2 px ink border. Snake cells 16 px (head `lcd-ink`, body `lcd-ink-secondary`), food 10 px ink square.
   - Ticker under the board (Silkscreen 12 px): first `EAT A PIXEL. EACH ONE IS A JUICY BIT. ARROW KEYS WORK TOO.`, then `+ BOARD GAMES`, `+ BARISTA`… (each food eaten reveals the next kept bit, cycling).
   - Controls in the thumb zone, **an inverted T**: ▲ centred on the top row; ◀ ▼ ▶ on the bottom row. Buttons 72 x 56 px, 6 px gap, 2 px ink border, 22 px pixel arrows, `touch-action: manipulation`, `aria-label` Left / Up / Down / Right.
5. **Trimming view** (after STOP PLAYING): a surface box with each free-text answer, labelled `Q1 · WHAT IT WAS ABOUT` and `Q4 · WHAT YOU NEARLY SAID`; filler words get struck through and fade to 35%, other non-keywords fade to 55%, keywords invert (ink fill). Then KEPT with the kept bits as small ink chips appearing one by one. Then PLAY SNAKE WHILE YOU WAIT > (dashed key with a pixel snake) to return to the game. No free text at all: "Nothing to trim. Just your taps."
6. Bottom key: while processing, a dashed `STILL KEEPING THE JUICY BITS...`; when ready, **SHOW ME WHAT YOU KEPT >** (56 px, ink fill) → compass check.

## Snake rules

- Starts automatically when the screen opens; the board takes keyboard focus (`tabIndex=0`, focus without scrolling). Clicking the board focuses it again.
- **Keyboard (desktop):** arrow keys and WASD, handled on the focused board only (no global key listener); `preventDefault` so the page does not scroll.
- **Touch:** the inverted-T buttons. A reverse turn (left while going right) is ignored.
- Speed: one step every 170 ms (260 ms with reduced motion). Walls wrap around. Starts at length 3, centre, moving right; first food at a fixed spot ahead.
- Eating grows the snake by one and places new food on a free cell.
- Hitting itself: `OOPS. GO AGAIN.` over the board for 1.2 s, then a fresh snake. **No game over screen, no score, no length counter, no high score, nothing stored, no analytics events.** (Rules: no scores, no guilt.)
- The game stops when the person leaves the screen. It never appears anywhere else in the app in v6.3.

## Processing (Muse Spark, one call)

- Chips (q1, q2, q2f, q3, q5) are already structured; **code** turns them into kept bits. Only the two free-text answers (q1f, q4) go to the model.
- Input: q1f and q4 text, the person's chips, the off-table list. No names, no audio.
- Output (JSON schema): `{ "topics": [string] (max 3, 1 to 3 words each), "people": [{ "role": allow-list, "tier": "said" }], "nearly_said": { "line": string (max 60 chars, in the person's voice, e.g. "I love the music you play"), "to_role": allow-list|null } | null }`.
- Validator (rejects, never rewrites): filler words never appear in topics; roles only from the allow-list (mum, dad, brother, sister, grandparent, family, colleague, neighbour, flatmate, friend, waiter, barista, driver, cashier, librarian, shop staff, a regular); **no personal names** (strip, reject if any remain); topics and `nearly_said` screened (SCREEN IT) and checked against the off-table list and the banned themes; no labels about the person (personality, health, politics, religion, sexuality).
- Fallback (model off, timeout 8 s, or rejected twice): code removes filler and stop words, keeps the remaining words of 4+ letters, known phrases ("board games"), and allow-list roles; `nearly_said.line` = up to three kept words. The screen and the game work the same.
- The free text is discarded once kept bits exist. Kept bits are stored only after LOOKS RIGHT.
- Show SHOW ME WHAT YOU KEPT when the call (or fallback) finishes, but not before the headline has finished typing. Target: under 6 s.

## Kept bits (shown as chips, then on the compass check)

Order: topics (`BOARD GAMES`, `RULES`), people said (`BARISTA`, `NEIGHBOUR`, `BROTHER`), people nodded (`COLLEAGUE (NOD)`, `DRIVER (NOD)`), `NEARLY SAID`, `BATTERY OK`, then `NOT: POLITICS`, `NOT: MONEY`.

## Compass check (changed values, same screen as v6.2)

| Cell | Value | Source label |
|---|---|---|
| N · MORE OF | Saying it: "I love the music you play" | FROM: WHAT YOU NEARLY SAID |
| E · TALK ABOUT | Board games · rules | FROM: YOUR STORY |
| S · LESS OF | Politics · money (or "Nothing. You're easy.") | FROM: KEEP OFF THE TABLE |
| W · HOW I GO | Battery ok today · last long chat: this month | FROM: BATTERY CHECK |
| PEOPLE IN YOUR DAYS | MORE THAN HI: BARISTA · NEIGHBOUR · BROTHER / A NOD SO FAR: COLLEAGUE · DRIVER | FROM: YOUR ANSWERS · ROLES ONLY, NEVER NAMES |

Empty cells keep the v6.2 dashed "Add later, if you like" style. Headline: THAT'S YOU, IN n ANSWERS. (n = main questions answered, max 5).

## Game changes (WP37, otherwise unchanged)

- START HERE follows the rules in `specs/five-quick-ones.md` (FULL battery → BOLD; CAN'T REMEMBER → SOFT).
- When `nearly_said` exists, **one of the three BOLD tries is always**: *Say the thing you nearly said to {who}: "{line}".* (KIND IT, step 5, `FROM WHAT YOU NEARLY SAID`; {who} = `to_role`, or "them"). NEW ONE may replace it.
- Writing-your-game lines: READING YOUR ANSWERS / ADDING YOUR PEOPLE: … / KEEPING OFF: POLITICS · MONEY (or NOTHING OFF THE TABLE) / TRY IT WRITES 9 TRIES: SMALL TALK AND KIND IT / CODE SETS THE LEVELS: SOFT, BRAVE, BOLD.
- Off-table items are banned themes for that person's TRY IT calls and library fills.

## Accessibility

- Board: `aria-label` "Snake. Steer with the arrow keys or the buttons below."; status and ticker are `aria-live="polite"`. Snake is optional fun: SHOW ME is reachable without playing, by keyboard and screen reader.
- Reduced motion: slower snake, no face spin, the trimming marks apply at once.

## Tests to write first

1. Snake starts on entering the screen; the board has focus; arrow keys and WASD steer; other keys do nothing; the page does not scroll.
2. Touch buttons in the inverted T steer; a reverse turn is ignored.
3. Self-collision shows OOPS. GO AGAIN. and restarts; no score or length is rendered or stored anywhere.
4. Eating reveals the next kept bit in the ticker.
5. SHOW ME appears only after processing finishes; leaving the screen stops the game timer.
6. With `LLM_ENABLED=false`, the fallback produces the same kept-bit structure and the flow completes.
7. Filler words never appear in kept bits; a name in the free text never appears anywhere.
8. When `nearly_said` exists, one BOLD try is the nearly-said try.

## Scope

All of it for 4 Nov.
