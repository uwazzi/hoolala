# Decisions · HOOLALA v6.2

Accepted by the owner on Thu 29 Oct 2026. Do not reopen; log any conflict in the checks report and ask. All v6.1 decisions still stand unless changed here.

## Accepted in v6.2

- **The first open plays a short story** (six beats, research with sources, about 30 s), then goes straight to Let's get personal. Shown once; SKIP always available.
- **Only sources from the owner's pitch reference list** appear in the story: WHO 2025, Kardas et al. 2022, Tissera et al. 2025, Wild et al. 2025, Drebing et al. 2025, Lanser and Eisenberger 2022, Lee et al. 2025.
- **Kindness is part of the product**: the story has a kindness beat, and the game mixes SMALL TALK and KIND IT tries at every level.
- **Let's get personal reuses the existing Surprise me voice UI.** Only the intro copy, the questions and the end of the flow change.
- **Three questions written with the Mom Test**: each asks about a real past moment, never an opinion or a "what if".
- **The confirm key reads NEXT** (it still saves the drafted line).
- **The compass records the people in your days as roles only** (brother, neighbour, waiter, colleague, driver...), never names. Tries are personalised with them.
- **The game has three levels: SOFT, BRAVE, BOLD.** START HERE follows the person's pace, never BOLD. Every level is always open.
- **Muse Spark writes the game (TRY IT)**; code sets steps and levels and validates every try; a hand-written library is the fallback.
- **NEW ONE** replaces a single try; **NEW GAME FROM SCRATCH** rewrites all nine.
- **Around me is optional** after picking a try, and uses the existing Around me screen with its radar. No new radar screen.
- **Today has one primary key**: today's try, typed, with LET'S GO, plus ANOTHER ONE and NOT TODAY as text links.
- Plant line: "Your plant. It only grows."

## Removed (do not reintroduce)

- **FIND ME (the head start)**, entirely: no public-profile search, no consent screen, no IS THIS YOU?, no FROM: YOUR BLOG sources. Muse Spark is used for the game instead.
- The five-question Surprise me script (replaced by three questions).
- On Today: the motto and explainer, the large plant card, the MY COMPASS box, DARE A FRIEND TOO, the WHERE? chips, the "see who here would like to talk" link, TELL MY FRIENDS WHAT HAPPENED.
- In the story: the Swiss FSO figure, Boothby 2018 and Epley and Schroeder 2014 (not in the reference list), and the SIX MONTHS. SAME TABLE. beat.
- The level name CRAZY (now BOLD).
- Any try that involves buying something for someone (kindness is words, help or something from home).
- A separate onboarding radar screen.

## Rule changes approved

- Tries may name people from the person's own life by role (family, colleague, neighbour, service staff). People are still never rated, ranked or contacted by Hoolala!.

## Still open (owner)

- **BOLD tries with people you already know may happen at home.** The safety line says "public places". Proposed wording: "Public places with strangers; anywhere with people you already know." Until the owner answers, the validator keeps every try with a stranger in a public place and allows `close` roles anywhere, and the screen keeps the current line.
- Around me scope (from v6.1): Option A (Around me in full) or Option B (Around me without menus and ratings). Around me is now optional in onboarding, which favours Option B if time is short.
- Abdalla et al. (2026) full author list and Lanser and Eisenberger (2022) volume and pages, to complete in `docs/RESEARCH.md` (the health beat that cites Abdalla is not shipped).
