# Demo video script · 3 minutes

Submission video for the Meta Global AI Developer Hackathon. Read with
`docs/HACKATHON-RULES.md` (section 4, 5, 8) and
`docs/MUSE-SPARK-BY-FUNCTION.md`. Every Muse moment below names its code.

## Rules this script obeys

- 3:00 max. Only hackathon work on screen (all app code; the LCD look and
  a mock-up predated the event and are disclosed once, on camera).
- No "lonely", "shy", "anxiety", "therapy", "coach" anywhere. The word
  "date" appears exactly once: typed, then refused by SCREEN IT.
- Safety on camera: the refusal, anonymous until both accept, first names
  only, coordinates borrowed once and dropped.
- Say what the model does and where it stops: check-in and meeting are
  model-free on purpose.

## Cast, props, pre-flight

- Two phones (A and B), each signed in with its own test account and a
  fictional first name. No real personal data on camera at any point.
- Film on staging (`https://staging.hoolala.hg-labs.io`), same build as
  production, so the shoot never pollutes the public Live counts.
- Pilot café with permission; consenting people only in frame.
- Motion ON (the growing plant and typing are the point), sound ON for
  the voice answer, batteries full, screen brightness up for the QR scan.
- Rehearse the refusal once: type `Looking for a date tonight?`, expect
  "That sounds more like a date than a coffee break. Try again?".
  Backup line: `Single and ready to mingle`. Both are code-rule rejects,
  so they work with the model off too.

## The 180 seconds

| Time | Shot | Action on screen | Voiceover / caption |
|---|---|---|---|
| 0:00–0:10 | Café wide, two regulars at nearby tables | Title card: HOOLALA! | "We have sat at the same table for six months." / "Never spoken." / "Hoolala! Signals, not feeds." |
| 0:10–0:22 | Phone A, signed out | Landing: headline types and rotates, plant grows leaf by leaf, story squares replay; LET'S GO | "One page says what it is. One tap starts." Cut through the email link: "Sign in once, by email. No password." |
| 0:22–0:47 | Phone A onboarding | Voice question: hold the mic, answer; the drafted line appears marked as AI. Five quick ones as chips, fast. Snake plays while the juicy bits are kept. Compass check, LOOKS RIGHT. MAKE MY GAME: nine tries across SOFT, BRAVE, BOLD. Pick one. | "Three spoken questions become your private compass. Muse Spark keeps the useful bits and writes your game of tiny tries. Code sets the bounds: soft, brave or bold, you pick." |
| 0:47–1:00 | Phone A, Today | The try typed big. LET'S GO. Phone down (cut). I'M BACK. WENT WELL. A leaf pops on the plant. | "One tiny try a day. Every try grows a leaf, whatever happened. No streaks, no scores." |
| 1:00–1:18 | Phone A, Around | ONE LOOK AROUND, radar sweeps: quiet nearby. Tap the place: card fetches hours and menu lines, each with its source. POST YOUR OWN. | "Around looks 500 metres, rooms only, never people. The place card is fetched live, sources attached, nothing stored until a person confirms it." |
| 1:18–1:43 | Phone A, compose | NEED ONE? Three ideas from the compass. Pick one, edit. Type `Looking for a date tonight?` Refused, with the reason shown. Fix the line. POST. The room is live. | "Ideas come from your compass, every one screened before you see it. And this is the safety bar: dating lines get a friendly no. People post the topic, never themselves." |
| 1:43–2:08 | Phone B joins | B scans, finds the room, JOINs. A: I'M AT THE TABLE, PHONE DOWN, QR UP. B scans the table code: recorded, both at the same table. HOW DID IT GO? Celebration, +5 leaves. | "Anyone nearby joins. Phones go on the table; a scan records the meeting, by user id only. Then both say how it went. Real meetings grow five leaves." |
| 2:08–2:23 | Phone A | SHOW THE WORKINGS: tools, citations, verdicts. Live page: the connection rate ticks up. | "Every AI answer shows its workings. And the meeting itself? Two people confirm it. No model infers real life." |
| 2:23–2:33 | Café wall | The poster. Scan it with a third phone: YOU'RE IN, look around or post. | "And the poster on the wall onboards the next table." |
| 2:33–2:48 | Phone A | GO LIVE: the screen powers down. HOOLALA! IS OFF. YOU'RE ON. End cards. | "Signals, not feeds." Disclosure: "The visual design and a mock-up existed before the event; everything you just saw was built during it." "Built with Muse Spark and Muse Code." Repo and live links. |

About 12 seconds of slack for transitions. If running long, cut the
place card (1:00–1:18 keeps scan plus POST YOUR OWN) and the poster tag.

## Muse moments to code

| Beat | Function | Code |
|---|---|---|
| Voice answer to compass line | COMPASS DRAFT (one line per answer, screened, roles only) | `src/llm/compassdraft.ts`, `web/src/pages/Surprise.tsx` |
| Snake while bits are kept | JUICY BITS (one extraction call, validator rejects) | `src/llm/juicy.ts`, `web/src/pages/Juicy.tsx` |
| Nine tries, three levels | TRY IT (structured 9, code assigns step and bounds) | `src/llm/tryit.ts`, `src/rules/tries.ts`, `web/src/pages/Game.tsx` |
| Place card with sources | PLACE IT (parallel tools, confirm to keep) | `src/llm/place.ts`, `src/api/placecard.ts` |
| Topic ideas | SUGGEST IT (compass context, screened, cited) | `src/llm/suggest.ts`, `src/llm/roomideas.ts` |
| Refused line | SCREEN IT (code rules first, verdict with reason, FR/EN) | `src/llm/screen.ts`, `src/rules/screening.ts` |
| Workings and rate | CHECK IT (tools, citations, verdicts; eval set) | `src/api/workings.ts`, `evals/run.ts` |
| Scan, table QR, meet, stay in touch | None, on purpose | `src/rules/rooms.ts`, `src/api/rooms.ts` |

## Submission checklist

- Repo link opens for signed-out visitors; `main` is the promoted build.
- Video link opens for signed-out visitors; video is 3:00 or under.
- Live product opens at `https://hoolala.hg-labs.io`.
- Optional Most Viral post on X with the demo link before the deadline.
