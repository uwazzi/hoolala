# Navigation and Here (WP31b) · HOOLALA v6.1

Design reference: `design/screens/Here.dc.html`, plus the softkeys on every screen in `design/screens/`. States: `design/SCREENS.md`.

## What changes from the live version

| Live (v6) | v6.1 |
|---|---|
| Softkeys vary (HOME / BACK, HERE / LIVE) | **TODAY · AROUND · FRIENDS** on every top-level screen; the current one is inverted (ink background, light text) |
| Here shows POST THE FIRST ONE and POST ONE (the same action twice) | One primary key: POST THE FIRST ONE (quiet) or SEE THE 3 TOPICS (busy) |
| Here has no way back to the try | Quiet state adds a dashed "OR A TINY TRY HERE >" (opens Today) |
| Headline appears at once | Headline types out (rule 43), keys rise in after |
| Place line: name and HERE UNTIL | Adds the talking meter: TALKING HERE ■■■■□ (from the place rating, hidden under 3 ratings) |
| I'M LEAVING ends the visit | I'M LEAVING opens the talking rating sheet (see `specs/around-me.md`, talking rating) |

## Layout (Here)

Compact header; place line (pixel pin, PLACE NAME, HERE UNTIL hh:mm · TALKING HERE meter) with a dashed rule under it; typed headline (Silkscreen 30 px); one body line; primary key (56 px); secondary (busy: POST MY OWN; quiet: OR A TINY TRY HERE); spacer; a "More" list with ABOUT THIS PLACE (opens Around me card) and I'M LEAVING; softkeys with AROUND active.

## Copy

- Quiet: "QUIET IN HERE. FOR NOW." / "Nobody has posted a topic yet. Someone has to go first. It could be you."
- Busy: "3 PEOPLE HERE WOULD LIKE TO TALK." / "Topics, not profiles. Nobody knows it's you until you both say yes."
- Leaving sheet: "HOW WAS IT FOR TALKING HERE?", five choices (mostly quiet, a little, sometimes chatty, often chatty, very chatty), "About the place, never people. Shown only once 3 visits have rated it.", SKIP; then "THANKS. SEE YOU OUT THERE." and BACK TO AROUND.

## Tests to write first

1. Every top-level route renders the three softkeys with exactly one active.
2. Here never renders two keys with the same action.
3. The talking meter is hidden when the place has fewer than 3 ratings.
4. I'M LEAVING opens the sheet; SKIP stores nothing.

## Scope

All of it for 4 Nov.
