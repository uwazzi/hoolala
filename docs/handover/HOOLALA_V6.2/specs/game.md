# Your game of tiny tries (WP37) · HOOLALA v6.2

Design reference: `design/screens/Onboard.dc.html` (stages GAME, set the `startAt` tweak to `game` to jump there). States: `design/SCREENS.md`.

## What it is

After the compass check, Muse Spark (TRY IT) writes a personal game: **9 tries in three levels, SOFT, BRAVE and BOLD**, mixing **SMALL TALK** and **KIND IT** (small acts of kindness), personalised with the person's topic, place and the **people in their days** from the compass. The person picks one; it becomes today's try. This is the main Muse Spark showcase of v6.2.

## Screens

**1. Writing your game** (about 2.6 s, then moves on by itself)
- Spinning Hoolala! face, typed headline WRITING YOUR GAME...
- A box with five lines that tick from □ to ■ one by one: READING YOUR COMPASS / ADDING YOUR PEOPLE: BROTHER · NEIGHBOUR · WAITER (or NO PEOPLE NAMED: TRIES SAY SOMEONE) / TRY IT WRITES 9 TRIES: SMALL TALK AND KIND IT / CODE CHECKS EACH ONE: SAFE, PUBLIC, SHORT / CODE SETS THE LEVELS: SOFT, BRAVE, BOLD.
- Footnote: "TRY IT writes fresh words every time, so no two games are the same. Code sets each level, checks every try against the safety rules, and swaps in a hand-written one if a try fails."
- The real call runs here; if it takes longer, the lines wait on the last unticked one.

**2. The game**
- Typed headline YOUR GAME. PICK A LEVEL, PICK A TRY.
- Three level tabs (52 px): SOFT (STEPS 1-2), BRAVE (STEPS 3-4), BOLD (STEP 5). The tab matching the person's pace shows START HERE instead of its steps (gentle → SOFT, mixed or direct → BRAVE; never BOLD). All tabs are always open.
- One line under the tabs: SOFT "A nod, a thank you, a kind word. Over in seconds." / BRAVE "One question or one kind act, with a reply. A minute or two." / BOLD "Big for you, still small for the world. Five minutes, in public."
- Three try cards per level. Each card: the try (Silkscreen 12 px), and an info line `KIND IT · STEP 2 · 1 MIN · FROM YOUR COMPASS: NEIGHBOUR` (or SMALL TALK; the compass part only when a person from the compass is used). On the right of each card, a **NEW ONE** key (56 px wide, dashed left border, pixel refresh icon).
- NEW ONE: the card turns dashed and reads TRY IT IS WRITING A NEW ONE... / CHECKING IT AGAINST THE RULES for about 0.7 s, then shows a new try at the same level, never one already shown in this game, possibly with a different person.
- Under the cards: NONE OF THESE? NEW GAME FROM SCRATCH (text link) goes back to screen 1 and writes all 9 again.
- Safety footnote (10 px): "Every level stays safe: public places, no contact details, no touching, nothing about looks. Any level is fine. Trying counts." (wording may change, see open decision on BOLD tries with people you know).
- Bottom: before a pick, a dashed PICK A TRY ABOVE. After a pick (selected card inverts): "Saved as today's try. Want a place for it? Around me scans 500 m for places where people chat. Optional." then FIND A PLACE AROUND ME > (opens the existing Around me first screen, unchanged) and SKIP. I KNOW WHERE TO GO (opens Today).

## Generation (Muse Spark, TRY IT)

- Input: compass lines (TALK ABOUT topic, MORE OF place kind, HOW I GO pace, LESS OF filters) and roles with their class. No transcripts, no names.
- Output (JSON schema): `{ "tries": [ { "title": string, "level": "soft|brave|bold", "kind": "talk|kind", "who_role": role|null, "place_kind": string|null, "why": string } ] }`, exactly 9, 3 per level.
- **Code assigns** `step` (soft 1 or 2, brave 3 or 4, bold 5) and minutes (1, 2, 5) from the existing per-step bounds table (words_max, minutes, asks_of_other). The model never sets the step.
- Validator (rejects, never rewrites; existing banned themes still apply: appearance, flirting, contact details, touch, following, filming, children, **money**, late alcohol, private places):
  - each level has at least one `talk` and one `kind`;
  - `who_role` is null or one of the person's roles;
  - `service` roles (waiter, barista, driver, cashier, librarian) only in light tries: no questions about their private life, no asking them to leave their work, at most 2 minutes;
  - no buying anything for anyone; kindness is words, help or something from home;
  - no LESS OF item appears;
  - title within words_max for its step; UK English; no em dashes.
- NEW ONE: one call for one try, same level and kind, `exclude` = the titles already shown.
- Fallback (model off, timeout, or rejected twice): the hand-written library below, filled with the person's topic, place and roles; `{who}` with no matching role becomes "someone you see often" (any), "someone you see every day" (close) or "the person serving you" (service).
- Limits: at most 20 NEW ONE and 3 NEW GAME per person per day; after that, NEW ONE draws from the library.

## Hand-written library (fallback, also the eval reference)

`{p}` place, `{topic}` topic, `{rec}` "favourite …" from the topic, `{who}` a role of the given class.

| Level | Kind | Who | Try |
|---|---|---|---|
| SOFT 1 | talk | none | Smile and nod at three people at {p}. |
| SOFT 2 | talk | any | Say good morning to {who} and ask how they are. |
| SOFT 1 | kind | none | Hold the door for someone at {p} and say "have a good one". |
| SOFT 2 | kind | any | Thank {who} for one thing they did this week, and say what it was. |
| SOFT 1 | kind | service | Tell {who} "have a good day" as you leave. |
| SOFT 2 | talk | close | Ask {who} how their week is going. |
| SOFT 2 | talk | none | Ask someone at {p} if the seat next to them is free, then say thanks. |
| SOFT 1 | kind | none | Let someone go ahead of you in the queue at {p}. |
| BRAVE 3 | talk | none | Ask someone at {p} for their {rec}. |
| BRAVE 3 | talk | close | Ask {who} one question about their weekend, then one more. |
| BRAVE 3 | kind | close | Offer {who} a hand with something small: carrying, finding, holding. |
| BRAVE 4 | kind | any | Tell {who} one thing they do that makes your day easier. |
| BRAVE 4 | talk | any | Mention {topic} to {who} and ask if they are into it too. |
| BRAVE 3 | talk | service | Ask {who} what they would pick today, and why. |
| BRAVE 4 | kind | close | Make {who} a drink or bring a snack from home, no reason needed. |
| BRAVE 4 | kind | service | Tell {who} they did a great job today, out loud. |
| BOLD 5 | talk | none | Ask two people at {p} for their {rec}, then tell each the other's answer. |
| BOLD 5 | talk | close | Suggest a ten-minute {topic} break with {who} this week. |
| BOLD 5 | kind | close | Ask {who} if there is something you could do for them this week, and do it. |
| BOLD 5 | talk | none | Start a two-minute chat about {topic} at {p}, and say your name before you go. |
| BOLD 5 | kind | any | Leave a thank-you note for {who} where they will find it today. |
| BOLD 5 | talk | none | Ask at {p} if there is a group or event you could join, and go once. |
| BOLD 5 | talk | any | Ask {who} to show you something they are good at, and learn it for five minutes. |
| BOLD 5 | kind | close | Tell {who} out loud what difference they make to your week. |

## Data

`game_tries` (id, user_id, game_id, level, step, kind, who_role, title, source 'ai'|'library', created_at, picked_at). Games older than 7 days are deleted. The picked try is also stored as today's try for Today (WP38). Leaves and outcomes stay as in v6 (I TRIED earns a leaf; no points for anything else).

## Evals

Add 15 eval cases to the existing set: 5 that must pass (one per level and kind, with roles), 10 that must be rejected (a buying try, a service role asked about their family, a BOLD try at someone's home with a stranger, a name, a looks compliment, a phone-number ask, a LESS OF item, a level with only talk, a step set by the model, an em dash).

## Who decides what

| Decision | Code | AI | Person |
|---|---|---|---|
| Words of each try | Validator | Writes | NEW ONE, NEW GAME |
| Level, step, minutes, START HERE | Assigns | Never | Picks any level |
| Which person a try names | Allow-list from the compass | Chooses among the person's roles | Can remove roles in MY COMPASS |
| Today's try | | | Picks it |

## Tests to write first

1. With `LLM_ENABLED=false`, a full game of 9 renders from the library, 3 per level, each level with talk and kind.
2. The model's `step` field, if present, is ignored; code assigns it.
3. NEW ONE never repeats a title shown in the same game.
4. Each validator rule above rejects its eval case.
5. Rate limits switch NEW ONE to the library after 20 a day.
6. Picking a try stores it as today's try and shows the Around me / skip keys.

## Scope

All of it for 4 Nov. Showing the game again later (a GAME entry on Today) is after 4 Nov; for now ANOTHER ONE on Today draws the next try from the same game (WP38).
