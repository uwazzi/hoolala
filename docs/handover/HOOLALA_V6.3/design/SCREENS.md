# Screen and state index · HOOLALA v6.3

Every state v6.3 adds or changes. Open a screen from `design/screens/` on the canvas (https://claude.ai/artifact/W2BoFNoCfeQZ3WAZqjnjHS), press Play, and use the tweak named here when a state needs one. The screens are the design to build exactly; they are not production code.

| WP | Feature / state | Screen file | How to reach it | Spec section |
|---|---|---|---|---|
| WP36 | HELLO, HUMAN. intro with START | `Onboard.dc.html` | Play (or LET'S GO / SKIP at the end of `Intro.dc.html`) | `specs/five-quick-ones.md`, "The script" |
| WP36 | Q1 chips (one choice) | `Onboard.dc.html` | START | same |
| WP36 | CAN'T REMEMBER reply, follow-up skipped | `Onboard.dc.html` | Tap CAN'T REMEMBER | same |
| WP36 | Q1 follow-up: dictation, I HEARD, NEXT / SAY AGAIN / FIX BY TYPING | `Onboard.dc.html` | Pick any other Q1 chip, then hold the mic | same |
| WP36 | Q2 and its follow-up: several chips, NOBODY YET / NOBODY, typed extra, NEXT | `Onboard.dc.html` | Continue; TYPE adds "+ …" | same |
| WP36 | Mic on a chip step: chips selected from what was heard | `Onboard.dc.html` | Hold the mic on Q2 | same |
| WP36 | Q3 battery with its four replies | `Onboard.dc.html` | Continue | same |
| WP36 | Q4 free text, Q5 off the table | `Onboard.dc.html` | Continue | same |
| WP39 | Juicy bits screen, Snake playing by itself | `Onboard.dc.html` | After Q5, or tweak startAt = juicy | `specs/juicy-bits-snake.md`, "Layout" |
| WP39 | Snake: keyboard, inverted-T buttons, OOPS. GO AGAIN., ticker | `Onboard.dc.html` | On the juicy screen | `specs/juicy-bits-snake.md`, "Snake rules" |
| WP39 | Trimming view: fillers struck, keywords lit, KEPT chips | `Onboard.dc.html` | STOP PLAYING | `specs/juicy-bits-snake.md`, "Layout" |
| WP39 | Processing then ready: SHOW ME WHAT YOU KEPT | `Onboard.dc.html` | Wait about 6 s | same |
| WP39 | Compass check from the kept bits, people MORE THAN HI / A NOD SO FAR | `Onboard.dc.html` | SHOW ME WHAT YOU KEPT, or tweak startAt = compass | `specs/juicy-bits-snake.md`, "Compass check" |
| WP39 | Game: START HERE from battery, nearly-said BOLD try | `Onboard.dc.html` | LOOKS RIGHT. MAKE MY GAME, or tweak startAt = game | `specs/juicy-bits-snake.md`, "Game changes" |

Context screens (unchanged, included so the flow is complete): `Intro.dc.html` (the story before), `Voice.dc.html` (the voice UI reused), `Around.dc.html` (optional after a try is picked).

Not drawn, use the existing app: everything after the game (Today, the try flow, the plant) is as in HOOLALA_V6.2.
