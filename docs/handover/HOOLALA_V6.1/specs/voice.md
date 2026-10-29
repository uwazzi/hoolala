# Surprise me voice (WP34) · HOOLALA v6.1

Thu 29 Oct 2026. Rework of the live `/surprise` page (WP26). Design reference: `design/screens/Voice.dc.html`. Feeds the compass (`specs/compass.md`, route 1). Follows AGENTS.md, DESIGN.md rules 22, 38, 39, 42, 43 and the compact header.

## What changes from the live page

| Live today (v6) | v6.1 |
|---|---|
| Ball, text box, SEND and VOICE: ON all on screen at once | One answer control: a pixel **mic key in the thumb zone**. TYPE and SKIP sit either side of it |
| "Hold the ball to talk" | The ball is Hoolala!'s face (state display only, not a button) |
| QUESTION 1 OF 5 text | Five pixel dots and "Q1 · FILLS TALK ABOUT" (which compass part this question feeds) |
| Answer sent straight away | Every answer shows I HEARD (or YOU TYPED) and the compass line it would make, then KEEP / SAY AGAIN / FIX BY TYPING |
| VOICE: ON / OFF | SOUND ON / OFF (Hoolala! speaking aloud only); captions always on |
| Softkeys BACK | Softkeys LEAVE / SOUND ON or OFF |
| Ends with "a little surprise" | "THAT'S YOU, IN 5 ANSWERS." then SHOW ME opens the compass reveal |

## Layout (top to bottom, 390 x 844)

1. Compact header (HOOLALA! and tagline).
2. Progress row: five 10 px squares (done solid, current mid-ink with outline, next empty), "Q1 · FILLS TALK ABOUT", SOUND toggle on the right.
3. The ball, 112 px, centred, in a 184 px band.
4. Hint line (Silkscreen 11 px), then the question as a caption (Silkscreen 20 px, centred), typed as it is spoken.
5. Transcript box (dashed): HEARING… while holding, then I HEARD / YOU TYPED.
6. Confirm block: "AI · FOR YOUR COMPASS" with the drafted line (part in caps, then text), KEEP (primary), SAY AGAIN and FIX BY TYPING.
7. **Thumb row** (above the softkeys, dashed top border): TYPE (pixel keyboard icon) on the left, the **mic key** in the centre (76 x 76 px, 2 px border, pixel mic), SKIP (pixel fast-forward icon) on the right. Label under the mic.
8. Softkeys: LEAVE (to Today) / SOUND ON or OFF.

Intro (before START): "FIVE QUICK QUESTIONS. THEN A LITTLE SURPRISE.", "Hold the mic at the bottom and answer out loud, or type. No account needed.", START, and the privacy line "Heard, then forgotten. Your voice becomes words and is never kept. Only lines you keep are saved, and only you see them."

## States

| State | Ball | Mic key | Hint | Other |
|---|---|---|---|---|
| speaking | wobbles (0.45 s loop) | dimmed, disabled | HOOLALA! IS ASKING… | caption types at speech pace (about 45 ms a character); TTS if SOUND ON |
| ready | breathes slowly (2.6 s) | dark, label HOLD TO TALK | YOUR TURN | |
| listening | squashed (scale 1.08, 0.9); 12 radial level bars from mic input; ring ripples | light, pressed (scale 0.94) with ring, label LET GO TO SEND | LISTENING. LET GO WHEN YOU'RE DONE. | live transcript fills HEARING… |
| thinking | 8-step pixel spin, 0.8 s | dimmed | GOT IT. ONE SECOND… | Muse Spark drafts the compass line |
| confirm | breathes | dark, label HOLD TO REDO | CHECK IT, OR HOLD THE MIC TO REDO | confirm block |
| typing | breathes | hidden | | textarea, SEND, "ANSWER OUT LOUD INSTEAD" |
| done | breathes | hidden | | THAT'S YOU, IN N ANSWERS. / SHOW ME |

Rules: release before 400 ms counts as a tap, not an answer: show "Hold it down while you talk." Pointer leaving the key while held = let go. Holding longer than 45 s stops and sends what was heard.

## Questions (each maps to a compass part)

1. What could you talk about for an hour? → TALK ABOUT (`interest`)
2. What would you like a little more of? → MORE OF (`intention`)
3. What drains you, or what should I leave alone? → LESS OF (`filter`)
4. When do you like to be out, alone or with others? → HOW I GO (`delivery`)
5. Anything else I should know about you? → whichever part fits

Keep the live wording if it already covers each part; otherwise use these.

## Implementation

**Speech to text.** Reuse what WP26 already ships for "heard, then forgotten". If it uses the browser's SpeechRecognition (`lang` from the page, en-GB default), keep it: interim results drive HEARING…, the final result fills I HEARD. If the browser has no SpeechRecognition (for example Firefox), hide the mic key and open typing directly with one line: "Voice isn't available in this browser. Type instead." Never upload or store audio. Never log transcripts.

**Mic level for the bars.** `getUserMedia({audio:true})` plus an `AnalyserNode`, 12 bars from the frequency bins, updated every 90 ms; stop all tracks on release. If permission is refused: "No mic access. You can type instead." and open typing.

**Text to speech.** `speechSynthesis` with an en-GB voice, rate 1.05, only when SOUND ON and only after the START tap (browsers block speech before a user gesture). Cancel speech when the mic is pressed, on SOUND OFF and on leaving the page. Captions always show, whatever the sound setting.

**Drafting the compass line (Muse Spark).** On let go or SEND: `POST /compass/propose {text, part_hint}` (from specs/compass.md) returns `{part, text, source:'surprise'}` without saving. Validator in `src/rules/compass.ts`: traces to the answer's words, no labels (types, health, politics, religion, sexuality), max 60 characters, part in the five. Fallback without the model: the answer itself trimmed to 60 characters, with the question's part. KEEP calls `POST /compass/confirm`. Before the account exists, kept lines stay in the session and are saved on sign-in, as WP26 does now.

**Safety.** Every answer passes the existing screening first. Crisis words: stop the flow and show the existing crisis message and helpline (DESIGN.md), no compass line. No answer is ever read back aloud.

**Accessibility.** The mic key is a `button` with `aria-pressed` while held and the label as its name. Keyboard: hold Space or Enter on the focused key to talk. `prefers-reduced-motion`: no wobble, spin, ripple or bars; caption appears at once; states shown by the hint line only. Thumb row keys at least 48 px tall.

## Tests first

- A tap under 400 ms never sends.
- Releasing outside the key ends listening and sends.
- Nothing is saved before KEEP; SAY AGAIN discards the transcript.
- With SpeechRecognition missing, typing opens and the mic key is hidden.
- Mic tracks are stopped after release (no open stream).
- No transcript or audio in logs or tables (assert).
- Crisis answer: no compass line, crisis message shown.
- SOUND OFF: `speechSynthesis.speak` never called.

## Scope for 4 Nov

Build all of the above on the existing `/surprise` route. After 4 Nov: other languages for speech, a choice of voice.
