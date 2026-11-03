# Landing for signed-out visitors (WP66) · HOOLALA v6.6

Design reference: `design/screens/Mobile.dc.html` (phone, first) and `design/screens/Main.dc.html` (desktop). States: `design/SCREENS.md`.

## What changes from the live version
| Live (v6.5) | v6.6 |
|---|---|
| Signed-out visitors at `/` get `<Story guest />`: six slides, tap NEXT five times before learning what Hoolala! does | Signed-out visitors at `/` get `<Landing />`: one short scroll, why, what and how visible without tapping |
| SIGN IN key on every slide competes with the story | SIGN IN is a quiet link in the header; one primary LET'S GO in the hero and one at the end |
| Fixed headline per slide | Hero headline types and rotates through four lines |
| A static sprout on the last slide | The app's own `Plant` grows from a bare pot to 9 leaves, then blooms, on a loop |
| One beat at a time | Four beats in visible squares, all on screen; each square replays its scene in turn, with four progress squares |
| No "how it works" | Three steps and a one-line trust row |

Signed-in people: no change (Today, or the existing Story when `introSeen === false`).

## Layout (mobile first, then wider)
Use the shared LCD styles in `web/src/styles.css` and the tokens in `docs/DESIGN.md`. App container fluid up to 960px; gutters 16 / 24 / 32px at base / 640 / 960px (`AGENTS.md` rule 8). On a phone the LCD green runs edge to edge.

1. **Header** (dashed bottom rule): HOOLALA! (Silkscreen 20px) with "You never know until you go." under it (13px, secondary). Right: SIGN IN text link (Silkscreen 14px, 44px tall) to `/signin`.
2. **Hero:** a wrapping row; text column first, plant second (below the text on a phone).
   - Headline: Silkscreen 700, `clamp(26px, 7vw, 52px)`, line height 1.05, three lines, `white-space: pre-line`, fixed `min-height: 3.2em` so nothing jumps. Typed with the block cursor (`.lcd-cursor`).
   - Line: "One tiny thing to try in real life, each day." (Space Mono 18px, max 32ch).
   - Primary key LET'S GO > (full width up to 320px, 52px tall).
   - Plant box: `lcd-surface` square, 2px ink border, `clamp(170px, 45vw, 220px)`; inside, `<Plant cell={9} />`. Caption under it: EVERY TRY GROWS A LEAF. (Silkscreen 12px, secondary).
3. **WHY GO?** (solid top rule): kicker WHY GO?; grid `repeat(auto-fit, minmax(130px, 1fr))`, gap 24/16px, so 2 by 2 on a phone and 4 across on desktop.
   - Each beat: a square scene (`aspect-ratio: 1`, `lcd-surface`, 2px ink border) and its headline under it (Silkscreen 700, 15px).
   - The playing square gets a 3px ink outline, offset 3px.
   - Under the grid, a row with four 14px progress squares on the left (filled up to the playing beat) and the beat label on the right (Silkscreen 12px), e.g. 2 OF 4 · THE LIKING GAP.
   - Then the inverted turn bar: SO, HOOLALA! GET OUTSIDE. MEET PEOPLE. GROW INSIDE.
   - Then one sources line (12px, secondary).
4. **HOW IT WORKS** (solid top rule): three steps in a grid `minmax(200px, 1fr)`. Each step is a big number (Silkscreen 32px) with a title (16px) and a few words under it (14px, secondary).
   - 1 TELL US A LITTLE · Two minutes.
   - 2 GET ONE TINY TRY · Soft, brave or bold.
   - 3 GO. PHONE DOWN. · Your plant grows.
   - Then the trust row: FIRST NAMES ONLY · NOT A DATING APP · NO STREAKS · 18+.
5. **Close:** YOU NEVER KNOW UNTIL YOU GO. (Silkscreen, `clamp(22px, 4vw, 28px)`), then LET'S GO > (full width up to 320px).
6. **Footer** (dashed top rule, 13px, secondary): "Run a place? Make a poster" (link to `/posters`) on the left. On the right: "Powered by hg-labs.io · Muse Spark by Meta · Privacy" (links to hg-labs.io and `/privacy`).

## Content (copy is final)
Headline lines, in this order (`\n` = line break):
1. `SAY HI.\nSEE WHAT\nHAPPENS.`
2. `ONE HELLO\nCOULD MAKE\nYOUR DAY.`
3. `SAME FACES.\nTIME FOR A\nFIRST WORD.`
4. `THE BEST CHAT\nIS ONE TABLE\nAWAY.`

Story beats: take the headlines and sources from `web/src/story.ts` `BEATS`, so the landing and the story can never disagree. Use BEATS[0] (THE NUMBERS), BEATS[2] (THE LIKING GAP), BEATS[3] (THE GOOD NEWS) and BEATS[4] (GIVING HELPS TOO). The turn bar uses BEATS[5].head. BEATS[1] (THE CATCH) is left out on purpose. The sources line joins the four `source` strings: "Sources: WHO 2025 · Tissera et al. 2025 · Wild et al. 2025; Drebing et al. 2025 · Lanser & Eisenberger 2022; Lee et al. 2025". Do not invent or shorten citations differently from `story.ts`.

Beat labels: 1 OF 4 · THE NUMBERS / 2 OF 4 · THE LIKING GAP / 3 OF 4 · THE GOOD NEWS / 4 OF 4 · GIVING HELPS TOO. With reduced motion: THE STORY IN 4 BEATS.

## Motion
All motion is stepped (no easing showpieces), driven by timers in the component. Clear the timers on unmount and pause them when the tab is hidden (`document.visibilityState`).

| Element | Behaviour | Timing |
|---|---|---|
| Headline | Types a line letter by letter, holds, erases, types the next; loops through 4 lines | 70 ms per letter, hold 2600 ms, erase 30 ms per letter, 400 ms gap |
| Plant | `Plant` with `leaves` 0 to 9 and `grew = leaves - 1` (so the newest leaf pops, as on Today); holds at 9, then back to 0 | 650 ms per leaf, hold 2800 ms at 9, 500 ms on the bare pot |
| Story | One square at a time builds its scene from empty step by step; the others show their full scene; then the next square; loops | 320 ms per step, hold 1400 ms when a scene is complete, 250 ms between squares (about 10 s a round) |

Scene steps (the canvas source has the exact pixels):

| Beat | Steps |
|---|---|
| 1 The numbers | five people appear one by one, then the sixth, faded (6 steps) |
| 2 The liking gap | two people; then the thought bubble; then the first three dots; then the last three (4 steps) |
| 3 The good news | the first person; the second; then HELLO! (3 steps) |
| 4 Giving helps too | two people; then the coffee by the giver, half way, and at the receiver with steam (4 steps) |

## States
| State | What the person sees | What they can do | Copy |
|---|---|---|---|
| Signed out, first frame | Header, hero with the first headline typing, bare pot | Read, LET'S GO, SIGN IN, scroll | as above |
| Signed out, scrolled | Story looping, steps, close | Same | as above |
| Reduced motion | Headline line 1 complete, cursor still; plant full (9 leaves, no pop); all four scenes complete, no outline, progress squares empty, label THE STORY IN 4 BEATS | Same | as above |
| Auth loading, no local seen flag | The landing (most likely a guest) | Same | |
| Auth loading, local seen flag | Nothing (as today), so no flash for returning people | | |
| Signed in | Today, unchanged | | |
| Signed in, `introSeen === false` | The existing Story, unchanged (see open decision) | | |
| Narrow (320px) | Everything stacks; the longest headline still fits; no horizontal scroll | | |

## Who decides what
| Decision | Code | AI | Person |
|---|---|---|---|
| Show landing or Today | `shouldShowStory` logic (guest = landing) | none | |
| Which headline, timing | fixed data in the component | none | |
| Where LET'S GO goes | `/signin`, as the guest Story does today | none | taps |

No model call on this page.

## Data
None stored. If you mark the visit, use the existing local seen flag (`setLocalSeen`) only when LET'S GO or SIGN IN is tapped, as the Story does; never on page view. No analytics, no tracking, no new cookies.

## Accessibility
- One `h1`. It carries `aria-label="Say hi. See what happens."`, and its typed text and cursor are `aria-hidden`, so screen readers don't hear letters.
- The plant and scenes are decorative (`aria-hidden`). The beat headlines are real text, always readable.
- The progress squares are `aria-hidden`; the beat label is plain text, not `aria-live`.
- Keys are real `<a href>` links, at least 44px tall, with a visible focus outline (3px dashed ink, 3px offset).
- `prefers-reduced-motion` stops all three animations and shows the complete state.
- Contrast as in `docs/DESIGN.md`. The faded sixth person is decoration.

## Tests to write first
1. `shouldShowStory`-based routing: signed out renders `Landing`, not `Story`. Signed in renders Today. Signed in with `introSeen === false` still renders `Story`.
2. The landing's beat headlines and sources equal `BEATS[0,2,3,4]` from `story.ts`; the turn bar equals `BEATS[5].head`.
3. Headline rotation is a pure function (like `storyTick`): given state and elapsed steps, it types, holds, erases and wraps from line 4 to line 1. With `reduced: true`, it returns line 1 complete.
4. Plant loop is a pure function: 0 to 9 then back to 0. `grew` is always `leaves - 1`, and -1 under reduced motion.
5. Story loop is a pure function: the playing beat advances 0 to 3 and wraps; the steps per beat are 6, 4, 3, 4; every non-playing beat is complete; under reduced motion, beat is -1 and all are complete.
6. Copy check: no banned words (lonely, shy, anxiety, therapy, coach), no em dashes; "dating" appears only as NOT A DATING APP.
7. LET'S GO and SIGN IN link to `/signin`; the footer links to `/posters` and `/privacy`.

## Scope
For 4 Nov: everything above.
After: a "+1 LEAF" flash under the pot; reusing the Story `Picture` scenes in the squares if the owner picks that; translating the landing.
