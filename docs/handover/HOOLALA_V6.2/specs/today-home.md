# Today, simplified (WP38) · HOOLALA v6.2

Design reference: `design/screens/Flow.dc.html` (first screen). Compass entry: `design/screens/Compass.dc.html`. Around me link: `design/screens/Around.dc.html`. States: `design/SCREENS.md`.

## What changes from the live version

| Live (v6.1) | v6.2 |
|---|---|
| Motto GET OUTSIDE. MEET PEOPLE. GROW INSIDE. and an explainer line | Removed from Today (the onboarding story ends on the motto) |
| Large plant card "N TINY TRIES · Your plant grows with every one. It never wilts." | Compact plant row: 6 px pixel plant, **N TINY TRIES**, "Your plant. It only grows. >" (opens the plant) |
| MY COMPASS dashed box | Small link FROM YOUR COMPASS > under the try |
| LET'S GO opens a separate "today's try" screen | The try is on the home screen itself: TODAY'S TRY · STEP n OF 5, the try typed big, then its hint |
| DARE A FRIEND TOO | Removed (FRIENDS softkey) |
| WHERE? chips (anywhere, café, work) on the try screen | Removed (the game writes the place into the try) |
| "At a café or coworking? See who here would like to talk" link | Removed (AROUND softkey) |
| TELL MY FRIENDS WHAT HAPPENED after a try | Removed (FRIENDS softkey) |

## Layout (390 x 844), top to bottom

1. Compact header.
2. Plant row (link to the plant), with a dashed rule under it.
3. Kicker TODAY'S TRY · STEP n OF 5 (Silkscreen 11 px, secondary ink).
4. The try, typed (Silkscreen 700, 28 px, min-height 130 px, cursor while typing).
5. After typing: the hint (Silkscreen 13 px, secondary ink) and FROM YOUR COMPASS > (10 px, underlined, opens MY COMPASS).
6. Spacer.
7. Thumb zone: **LET'S GO >** (60 px, ink fill), then two text links side by side: ANOTHER ONE and NOT TODAY.
8. Softkeys TODAY (active) · AROUND · FRIENDS.

## Behaviour

- Today's try is the one the person picked in the game (WP37). Before any game exists (old accounts), use the v6 library at the person's step.
- LET'S GO opens the existing "off you go" state; I'M BACK, the four outcomes, NEXT TIME (GENTLER / SAME STEP / BRAVER), the plant growing and the COMPASS? row are unchanged from v6.
- ANOTHER ONE: the next unpicked try from the same game at the same level; when the game is used up, a new game is written in the background; the library is the fallback.
- NOT TODAY: the existing "later" state ("No problem. Your plant waits."). No reminder is sent.

## Copy (final)

- Plant row: `{n} TINY TRIES` / `Your plant. It only grows. >`
- Kicker: `TODAY'S TRY · STEP {n} OF 5`
- Keys: `LET'S GO`, `ANOTHER ONE`, `NOT TODAY`

## Tests to write first

1. The home screen shows exactly one primary key and two text links above the softkeys.
2. Today's try equals the try picked in the game.
3. ANOTHER ONE never repeats a try from the same game and keeps the level.
4. None of the removed items render on Today.

## Scope

All of it for 4 Nov.
