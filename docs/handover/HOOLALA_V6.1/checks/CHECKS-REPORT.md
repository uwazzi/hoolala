# Checks report · HOOLALA v6.1

Filled by the coding agent before writing code. One block per work package. Result: PASS, PASS WITH NOTES, or STOP. A STOP blocks that work package until the owner answers. Gate details are in `HANDOVER.md`, "Gates before any code".

## WP31b: Navigation and Here

| Gate | Result | Notes (blockers, risks, cheaper alternative, rule touched) |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | Trio softkeys and compact header are live (WP31 add-on). To build: typed Here headline, single quiet/busy key, OR A TINY TRY HERE, talking meter on the place line, More list (ABOUT THIS PLACE, I'M LEAVING), leaving sheet with the 5-word rating. Here sits under AROUND again (restore the tab). ABOUT THIS PLACE opens the Around card for the checked-in place (needs place id on the check-in view; have it). |
| Security and privacy | PASS | SKIP on the leaving sheet stores nothing (test). Meter shows only the aggregate from 3+ ratings. |
| Value alignment | PASS | "3 PEOPLE HERE WOULD LIKE TO TALK" counts open signals at the place, a collective per-place number, not a per-person count. No scores or rankings. |

Questions for the owner:
- None. The leaving sheet is shared between Here (More list) and Arrive (existing goodbye); both call the same endpoint.

## WP32: Around me

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | Scan, fit, WHY GO, READ IT, ratings and the /around route are live on staging (WP32). To build per the design: first-screen rework (idle radar panel, promise, compass line via GET /api/me/compass, thumb-zone key), scan in place with typed status, radius chips (500 M / 1 KM / 2 KM all tappable), cards sorted by fit then talking then distance with why, 5-bar meter, verified line, open card (now-line, today's info with source, TINY TRY THERE, workings line, TAKE ME THERE / I'M HERE). Talking rating changes from 3 values daily to the 5 design words with one rating per person per place per 7 days (migration 0010). Scan response gains tiny_try, the workings line and the open-signal count per place. Filter chips beyond FOR YOU stay out (after 4 Nov per the spec); the chips row is skipped, not drawn dead. Places come from our own D1 places (OSM import stays the provider, owner call 29 Oct); excluded types cannot occur in our kind set, bars get the 18+ label. Menus: READ IT is live; robots.txt is not checked, the fetch identifies as Hoolala! with a 5 s timeout and 20 kB cap. Cost per scan: one WHY GO call plus up to 3 READ IT calls, all low effort. |
| Security and privacy | PASS WITH NOTES | Location sent once per scan, never stored or logged (assert on tables; no coordinate logging anywhere). 10 scans an hour already enforced. READ IT prompt injection: the fetched page is data only, and the validator drops any item not found in the source text. Ratings are collective only, median from 3+ in 90 days. |
| Value alignment | PASS WITH NOTES | The 5-bar meter and talking words are about the place only (rule change approved in design/DECISIONS.md). Bars carry 18+. Cards never rank people; LOW fit says why ("Not on your compass, so it ranks low") without guilt. |

Questions for the owner:
- ~~TAKE ME THERE behaviour is undefined in the spec and the mock. Proposal: an OpenStreetMap directions link for the place. OK?~~ Answered 29 Oct: OSM directions link.
- ~~Around scope and places provider were already decided 29 Oct (full WP32, OSM stays). Confirming these v6.1 "open" items stay as decided.~~ Confirmed 29 Oct: full WP32 first, OSM stays.

## WP33: Compass

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | Compass storage, GET, confirm and remove-line exist; FIND ME and Surprise me feed it. To build: four-direction screen with needle and typing, SAY IT YOUR WAY (POST /api/me/compass/propose, confirm, undo), sources on every line, first-time reveal, MY COMPASS entry on Today, EDIT entry on Around, COMPASS? row on the try debrief. Stored parts change from interest/talk_about/more_of/filter to intention/interest/filter/delivery/action (migration maps talk_about to interest and more_of to intention; delivery and action start empty). Surprise/FIND ME validators extend to the new parts, 60 chars, named feedback sources. |
| Security and privacy | PASS | Compass never returned to another person (existing tests stay and extend to the new endpoints). Change log keeps words and undo state only. |
| Value alignment | PASS | Banned labels already rejected by the validator; nothing saved before LOOKS RIGHT / SAVE; outcomes alone never become lines. |

Questions for the owner:
- None.

## WP34: Surprise me voice

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | /surprise is live with the ball, TTS (speechSynthesis, en-GB) and server transcription (Meta ASR, audio sent once and dropped). The spec assumes browser SpeechRecognition; we keep our server path instead (same "heard, then forgotten" promise, no browser cloud). To build: thumb row (TYPE, 76 px mic, SKIP), ball as state display, progress dots with the fed compass part, I HEARD plus drafted line with KEEP / SAY AGAIN / FIX BY TYPING, SOUND toggle, no-mic fallback to typing, done state opening the compass reveal. Drafting reuses WP33 POST /compass/propose, so WP34 follows WP33. The five live questions are checked against the compass spec table. |
| Security and privacy | PASS | No audio or transcript stored or logged (assert in tests). Screening on every answer; crisis words stop the flow with the existing message; answers never read back aloud. Mic tracks stop on release. |
| Value alignment | PASS | Captions always on; SOUND controls speech only; nothing saved before KEEP; not a companion, five questions then done. |

Questions for the owner:
- None. Confirming the server transcription path stays (no switch to browser SpeechRecognition).
