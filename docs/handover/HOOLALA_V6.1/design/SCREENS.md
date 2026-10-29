# Screen and state index · HOOLALA v6.1

Every feature state that v6.1 changes, where to see it in the reference screens, and how to reach it. Open a screen from `design/screens/` on the canvas (https://claude.ai/artifact/W2BoFNoCfeQZ3WAZqjnjHS), press Play, and use the tweak named here when a state needs one.

| WP | Feature / state | Screen | How to reach it | Spec |
|---|---|---|---|---|
| WP31b | Softkeys TODAY · AROUND · FRIENDS | `Flow.dc.html`, `Friends.dc.html`, `Around.dc.html`, `Here.dc.html`, `Compass.dc.html` | Any top-level screen | `specs/navigation-here.md` |
| WP31b | Compact header | All six | Any screen | `specs/around-me.md`, "Header" |
| WP31b | Here, quiet (one POST THE FIRST ONE key, OR A TINY TRY HERE) | `Here.dc.html` | Default (tweak quietPlace on) | `specs/navigation-here.md` |
| WP31b | Here, busy (3 PEOPLE HERE WOULD LIKE TO TALK) | `Here.dc.html` | Tweak quietPlace off | `specs/navigation-here.md` |
| WP32 | Around, first screen (idle radar, promise, compass line, thumb-zone ONE LOOK AROUND) | `Around.dc.html` | Default | `specs/around-me.md`, "First screen" |
| WP32 | Around, compass empty (YOUR COMPASS IS EMPTY · SET IT UP) | `Around.dc.html` | Tweak emptyCompass | same |
| WP32 | Around, location refused (NO LOCATION, NO PROBLEM. · CHECK IN BY NAME · TRY AGAIN) | `Around.dc.html` | Tweak locationRefused, then ONE LOOK AROUND | same |
| WP32 | Scanning (sweep in place, typed status) | `Around.dc.html` | ONE LOOK AROUND | "Must keep from the design" |
| WP32 | Results at 500 m, cards by fit, pins | `Around.dc.html` | After the scan | "What it does", "Who decides what" |
| WP32 | Card opened (why go, today's menu with source, tiny try, workings, TAKE ME THERE / I'M HERE) | `Around.dc.html` | Tap a card or a pin | "Data", "Muse Spark functions" |
| WP32 | Nothing within 500 m | `Around.dc.html` | Tweak emptyAt500, then scan | "Radius logic" |
| WP32 | Widen to 1 km / 2 km | `Around.dc.html` | LOOK UP TO 1 KM, or the radius chips | "Radius logic" |
| WP32 | Filters (FOR YOU, CAFÉ, FOOD, BAR, SHOPS, OUTDOORS) | `Around.dc.html` | Chips under the status | After 4 Nov beyond FOR YOU |
| WP32 | Talking rating on leaving (5 words, SKIP, thanks) | `Here.dc.html` | I'M LEAVING | "Data", talking rating |
| WP33 | Compass entry from Today (MY COMPASS) | `Flow.dc.html` | First screen, under the plant | `specs/compass.md`, "Entry points" |
| WP33 | Compass entry from Around (EDIT) | `Around.dc.html` | First screen, compass line | same |
| WP33 | Compass reveal (spinning needle, LOOKS RIGHT / CHANGE SOMETHING / START AGAIN) | `Compass.dc.html` | Default (tweak startWithReveal on) | "The screen" |
| WP33 | Compass everyday view, four directions, sources, REMOVE | `Compass.dc.html` | LOOKS RIGHT, or tweak startWithReveal off | same |
| WP33 | Say it your way (BEFORE / AFTER, SAVE / NOT NOW, CHANGES with UNDO) | `Compass.dc.html` | Type in SAY IT YOUR WAY, then SEND | same |
| WP33 | COMPASS? row after a try (MORE / LESS LIKE THIS, SAVE, saved link) | `Flow.dc.html` | GIVE ME TODAY'S TRY, I'M IN, I'M BACK, any outcome | "Feedback after a try" |
| WP34 | Surprise me intro (START) | `Voice.dc.html` | Default | `specs/voice.md`, "Layout" |
| WP34 | Asking, ready, listening, thinking, confirm (KEEP / SAY AGAIN / FIX BY TYPING) | `Voice.dc.html` | START, then hold the mic | "States" |
| WP34 | Typing instead | `Voice.dc.html` | TYPE in the thumb row | "States" |
| WP34 | No mic or unsupported browser (mic hidden, typing opens with a note) | `Voice.dc.html` | Tweak noMic, then START | "Implementation" |
| WP34 | Done (THAT'S YOU, IN 5 ANSWERS. · SHOW ME) | `Voice.dc.html` | Keep or skip all five | "States" |

Not drawn (use the existing app): check-in by name, the crisis message, the Signals here topic list.
