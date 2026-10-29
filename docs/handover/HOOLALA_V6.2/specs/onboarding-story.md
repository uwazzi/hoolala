# Onboarding story (WP35) · HOOLALA v6.2

Design reference: `design/screens/Intro.dc.html`. States: `design/SCREENS.md`.

## What changes from the live version

| Live (v6.1) | v6.2 |
|---|---|
| The first open lands on Today | The first open plays a short animated story (six beats, about 30 seconds), then LET'S GO opens Let's get personal (WP36) |
| No research shown in the app | Each beat states one finding with its source, in plain words |

Shown **on the first open only**. After LET'S GO or SKIP, set `intro_seen_at` on the account (and a local flag for signed-out visitors) and never auto-play it again.

## Layout (390 x 844)

Compact header (HOOLALA! and the tagline). Below it, top to bottom:

1. Kicker line (Silkscreen 11 px, `lcd-ink-secondary`), e.g. `WHY GO? · THE NUMBERS`.
2. Headline, typed letter by letter (Silkscreen 700, 28 px, min-height 98 px), with the blinking block cursor while typing (rule 43).
3. The picture box: `lcd-surface` fill, 2 px ink border, flex-grow, min-height 300 px. Pixel figures are 8 x 12 pixel sprites drawn with `shape-rendering: crispEdges`. Monochrome only (colour is earned in the private plant).
4. After the headline finishes: one body line (Space Mono 14 px) and a source line (11 px, secondary ink). Both rise in.
5. Last beat only: the primary key LET'S GO > (56 px, ink fill), in the thumb zone.
6. Control row (52 px, 2 px top border): SKIP on beat 1 (BACK on later beats) · progress dots (one per beat) · NEXT > (REPLAY on the last beat).

The whole picture area is a tap target: a tap while typing finishes the headline; a tap after it moves to the next beat.

## Beats (copy is final; do not reword)

| # | Kicker | Headline | Picture | Body | Source line |
|---|---|---|---|---|---|
| 1 | WHY GO? · THE NUMBERS | 1 IN 6 OF US FEEL ALONE. | 3 x 2 grid of figures; the fifth drifts down-right and fades to 35% (8 steps, 1.6 s). Caption `1 · 2 · 3 · 4 · 5 · 6` with 6 underlined | Around the world, about one person in six. Rates are highest among young people. | Source: World Health Organization, 2025. |
| 2 | WHY GO? · THE CATCH | WE EXPECT AWKWARD. IT ISN'T. | Two figures lean in (4 steps); bubble HI!, then OH, HI! pops after 1.4 s; meters EXPECTED ■■□□□ and GOT ■■■■□ | People expect chats with strangers to be more awkward than they are, and expect others to care less than they really do. | Source: Kardas, Kumar and Epley, 2022. |
| 3 | WHY GO? · THE LIKING GAP | WE THINK THEY WON'T LIKE US. | Thought bubble THEY WON'T LIKE ME. flips at 1.4 s to THEY LIKED ME MORE THAN I THOUGHT.; a pixel heart pops between the two figures | After a chat, people think the other person liked them less than they did. The gap is widest for people who feel less sure of themselves. | Source: Tissera et al., 2025. |
| 4 | WHY GO? · THE GOOD NEWS | ONE HELLO. A LIFT FOR HOURS. | Two figures, HELLO! pops; four hour blocks 1H 2H 3H 4H fill one by one (from 0.6 s, every 0.5 s); caption FEELING LESS ALONE, HOURS LATER | A face-to-face chat predicts feeling less alone a few hours later. Brief contacts with familiar faces lift mood and belonging. | Sources: Wild et al., 2025; Drebing et al., 2025. |
| 5 | WHY GO? · GIVING HELPS TOO | A SMALL KINDNESS COUNTS. | A pixel cup slides from one figure to the other (6 steps, 1.2 s); THANKS! pops; caption A SMALL KINDNESS. TWO BETTER MOODS. | Small acts of kindness ease feeling alone in the moment and lift mood. Kindness to familiar faces helped more than to strangers. | Sources: Lanser and Eisenberger, 2022; Lee et al., 2025. |
| 6 | SO, HOOLALA! | GET OUTSIDE. MEET PEOPLE. GROW INSIDE. | A pixel plant grows in four steps (stem 0 s, leaf 0.5 s, leaf 1.0 s, flower 1.6 s), monochrome | A hello, a kindness, a chat. A few quick questions, then your own game of tiny tries. Soft, brave or bold: you pick. | No streaks. No scores. You never know until you go. |

The health beat in the design file (`showHealthBeat` tweak, off by default) is **not shipped** in v6.2. Keep it in the pitch video only, if at all.

Full references for the sources are in the owner's pitch document; add them to the README and `docs/RESEARCH.md`. Never invent or round a figure beyond what is written above.

## Timing

- Typing: 35 ms per character.
- Each beat holds 4.2 s after the headline finishes, then moves on by itself (except the last beat, which waits).
- All motion uses stepped animation (`steps(n)`), never smooth easing, to keep the LCD feel.

## Who decides what

| Decision | Code | AI | Person |
|---|---|---|---|
| Which beats, copy, sources | Fixed in code | None | Owner only |
| When to move on | Timer | None | Tap, NEXT, BACK, SKIP |

No model call anywhere in this work package.

## Accessibility

- `prefers-reduced-motion`: headline appears whole, pictures show their end state, no auto-advance. NEXT moves on.
- Headline region `aria-live="polite"`; the picture is decorative (`aria-hidden`); body and source are real text.
- Controls are real buttons or links, at least 44 px tall. SKIP is always reachable on beat 1.

## Tests to write first

1. First open shows beat 1; after LET'S GO or SKIP, `intro_seen_at` is set and the next open lands on Today.
2. Tapping during typing completes the headline; tapping again moves to the next beat.
3. Reduced motion: no auto-advance, headline whole on render.
4. Six beats, in the order above; no beat renders a number not in the table.
5. LET'S GO and SKIP both open Let's get personal (WP36).

## Scope

All of it for 4 Nov. Replaying the story from settings is after 4 Nov (not drawn).
