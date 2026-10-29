# Screen and state index · HOOLALA v6.2

Every state v6.2 adds or changes. Open a screen from `design/screens/` on the canvas (https://claude.ai/artifact/W2BoFNoCfeQZ3WAZqjnjHS), press Play, and use the tweak named here when a state needs one. The screens are interactive design references, not production code.

| WP | Feature / state | Screen file | How to reach it | Spec section |
|---|---|---|---|---|
| WP35 | Story beat 1: 1 IN 6 OF US FEEL ALONE. | `Intro.dc.html` | Play | `specs/onboarding-story.md`, "Beats" |
| WP35 | Story beats 2 to 5 (awkward, liking gap, hours, kindness) | `Intro.dc.html` | Wait, tap, or NEXT | same |
| WP35 | Story last beat with LET'S GO | `Intro.dc.html` | Beat 6 | same |
| WP35 | Reduced motion, no auto-advance | `Intro.dc.html` | Tweak autoplay off (approximates it) | `specs/onboarding-story.md`, "Accessibility" |
| WP36 | LET'S GET PERSONAL. intro with START | `Onboard.dc.html` | Play (or LET'S GO / SKIP in the story) | `specs/get-personal.md` |
| WP36 | Hoolala! asking Q1 to Q3 (captions typing) | `Onboard.dc.html` | START | `specs/get-personal.md`, "The three questions" |
| WP36 | Listening, thinking, I HEARD, AI draft, NEXT / SAY AGAIN / FIX BY TYPING | `Onboard.dc.html` | Hold and release the mic | `specs/get-personal.md`; voice UI from `Voice.dc.html` |
| WP36 | Typing an answer | `Onboard.dc.html` | TYPE in the thumb row | same |
| WP36 | Compass check with PEOPLE IN YOUR DAYS | `Onboard.dc.html` | After Q3, or tweak startAt = compass | `specs/get-personal.md`, "Compass check" |
| WP36 | Compass check with skipped parts (dashed, ADD LATER) | `Onboard.dc.html` | SKIP a question | same |
| WP37 | Writing your game | `Onboard.dc.html` | LOOKS RIGHT. MAKE MY GAME | `specs/game.md`, "Screens" |
| WP37 | The game, SOFT / BRAVE / BOLD tabs, START HERE | `Onboard.dc.html` | Tweak startAt = game | same |
| WP37 | NEW ONE writing state | `Onboard.dc.html` | NEW ONE on any card | same |
| WP37 | New game from scratch | `Onboard.dc.html` | NONE OF THESE? NEW GAME FROM SCRATCH | same |
| WP37 | Try picked: Around me (optional) or skip | `Onboard.dc.html` | Tap a try | same |
| WP37 | Around me first screen (unchanged, reused) | `Around.dc.html` | FIND A PLACE AROUND ME | HOOLALA_V6.1 specs/around-me.md |
| WP38 | Today home: plant row, today's try, LET'S GO | `Flow.dc.html` | Play | `specs/today-home.md` |
| WP38 | ANOTHER ONE / NOT TODAY | `Flow.dc.html` | Tap the links | same |
| WP38 | MY COMPASS (FIND ME source removed) | `Compass.dc.html` | FROM YOUR COMPASS > on Today | `specs/today-home.md` |
| WP36 | Empty compass in Around me opens Let's get personal | `Around.dc.html` | Tweak emptyCompass, then SET IT UP | `specs/get-personal.md`, "What changes" |

Reference only: `Voice.dc.html` is the v6.1 Surprise me voice UI, reused as is by WP36.

Not drawn, use the existing app: the off-you-go, I'M BACK, outcomes and plant growth states (unchanged since v6, see HOOLALA_V6.1 `design/screens/Flow.dc.html`); replaying the story from settings (after 4 Nov).
