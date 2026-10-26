# Hoolala! Mono LCD

You never know until you go.

Hoolala! is a tiny, private social network that knows when to say goodbye. It turns "we should catch up" into "we did". Friends leave each other short notes, little signals and plans. Muse Spark listens, looks, searches and drafts, then stops and lets two people decide. Catch-ups end after three at most, and the app's best moment is the screen that sends you back to real life. The look is early-mobile nostalgia: one green monochrome LCD, pixel type, inverted selection bars and little one-bit drawings.

This system is the visual **and interaction** source of truth for every Hoolala! surface: the web app, Telegram (Go App-Free), marketing pages and pitch material. Any agent (Claude, Muse Code, Cursor or another) building for Hoolala! starts here.

> The tagline "You never know until you go." always sits directly under the HOOLALA! name. It is the only brand line. The positioning line "Your data. Your choice. Your attention." is used for Go App-Free, the pitch and the README, never under the logo. "Less screen. More life." is retired and must not be used.
>
> Version 3 (26 Oct 2026): adds Go App-Free, the Personal Compass and the six Muse Spark functions (TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT). Version 2 (23 Oct) replaced the purple "quest companion" system. The name is **Hoolala!** everywhere; "HOO!" is not used. "Hoolala!" is a working name, not trademark-cleared.

## How to use this system (agents read this first)

1. Read this README, then **Product rules**, **Voice and copy** and **AI and data**.
2. Take every colour, size and duration from `tokens.json`. Never type a hex value that is not a token.
3. Build only the flows and components described here. If a request needs a feed, a counter, a public profile, invented content or screen-time judgement, stop and say which rule it breaks.
4. Use sample data, clearly labelled, until a real API exists. Never fake an API result.
5. Components marked **ROADMAP** in their guidelines (small talk, Sounds familiar? and its sharing, Find a plan, Unplug, Outside picks) are designed but not in the hackathon build. Don't build them unless asked.

## The product in one sentence

A social network where messages wait for you, not the reverse: it connects a tiny trusted circle, helps turn what people say into real plans, then encourages everyone to get back to real life.

## The loop: six Muse Spark functions, then real life

| Function | The moment | Component |
|---|---|---|
| TELL IT | "Hello, human." A short conversation becomes your Personal Compass | OnboardingStage, CompassReveal, PersonalCompass |
| SAY IT | A voice note ("coffee Thursday?") becomes a request | VoiceNote |
| SNAP IT | A poster or chalkboard photo becomes an event draft | SnapResult |
| FIND IT | A finite briefing: friends first, then cited finds nearby | BriefingItem |
| PLAN IT | The agent drafts one invitation; you confirm | AgentDraft |
| CHECK IT | SHOW THE WORKINGS: tools, citations, what was grounded | Workings |
| MEET IT | Two phones, mutual QR, both agree. No AI, on purpose | PrivateKeepsake |
| GO LIVE | HOOLALA! IS OFF. YOU'RE ON. | EndOfSession |

Telegram carries the same functions in a chat window: see TelegramSurface.

## Experience principles

| Principle | Build this | Never build this |
|---|---|---|
| **Pull, don't push** | CATCH ME UP opens 1 to 3 private items, on request; Telegram briefings on demand | A feed, unread badges, notification bait |
| **Finite by design** | Every sequence ends: THAT'S EVERYTHING. GO LIVE. | Endless next items, recommendations, infinite scroll |
| **A relationship, not an audience** | Notes to chosen people, confirmed before sending | Followers, likes, comments, public profiles |
| **Analog rhythm** | Occasional notes, one plan at a time, quiet hours | Typing indicators, read receipts, streaks, real-time pressure |
| **Present in the world** | Plans, a mutual opt-in QR tap, private keepsakes | Location tracking, claims that a meeting was verified |
| **One small interface** | A conversational home and a few task panels | Dashboards, tab overload, push notifications |
| **Your attention, your rules** | A Personal Compass the person writes and edits in plain words, with undo | Hidden profiling, screen-time scores, productivity goals, "years reclaimed" |
| **AI as editor, shown openly** | Muse Spark drafts, ranks and explains; SHOW THE WORKINGS on every AI answer | AI-invented updates, autonomous social actions, a companion persona, black-box ranking |

## Visual foundations

### Colour: only the LCD

One colour world. Meaning comes from inversion, spacing and pixel drawings, never from a notification rainbow.

| Token | Hex | Rule |
|---|---|---|
| `lcd-bg` | #BED39C | The screen. Every app surface. |
| `lcd-surface` | #DDE7C6 | Paper: blocks, inputs, secondary keys. |
| `lcd-sunken` | #AEC58A | Depth: sunken panels, pressed states, the person's own messages. |
| `lcd-ink` | #182513 | Text, rules, icons, the selected bar, primary keys. |
| `lcd-ink-secondary` | #304327 | Secondary text, dashed dividers, AI labels. |
| `surround-bg` | #E5E8E0 | Page around the LCD on desktop and in docs. |
| `shell-bg` | #1B221B | Device shell, in mockups and hero images only. |

Contrast: `lcd-ink` on `lcd-bg` 9.9:1, secondary 6.6:1, reversed text on the selected bar 12.4:1. No gradients, no other hues, no coloured emoji, no glows, no soft shadows.

### Telling friends, AI and the web apart without colour

Three voices share one screen, so each has a fixed shape:

| Whose words | Shape |
|---|---|
| A friend's own words | `lcd-surface` paper block, solid 2px border, sender name in Silkscreen. Exactly as written. |
| Muse Spark (summary, reason, draft, suggestion) | Dashed `lcd-ink-secondary` border, kicker starting AI / (AI / SUMMARY, AI / WHY THIS, AI / DRAFT). |
| Something found on the web | Paper block with a `>` source line at the bottom (domain and date) linking to the original. |
| The person's own messages | `lcd-sunken` block, right aligned. |

### Typography

- **Silkscreen** (display): logo, titles, short menu labels, keys, status. Uppercase, short, never long text.
- **Space Mono** (body): notes, replies, prompts, inputs. Sentence case, 16px, line height 1.5.
- Google Fonts: `https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap`
- Controls never below 14px. 12px only for supplementary labels (kickers, status bar).
- Support accents and multilingual text: never strip characters to fit the pixel look.

### Layout and shape

- 8px grid with a 4px half step. Mobile first from 320px; fluid on desktop with a 42ch text measure.
- 2px borders, 2px squared corners on everything. Rounded corners only on the device shell in mockups.
- One focal action per screen. More empty space than information.
- Navigation through inverted selection bars and a softkey bar (left action, right BACK). They are real buttons.
- No device chrome in the product. The phone bezel is for hero images and demos only.

### Pixel drawings

- Icons on a 16 x 16 grid, shown at 24 or 32px, `image-rendering: pixelated` and `shape-rendering: crispEdges`, monochrome `lcd-ink`.
- Motifs: envelope, sun, hill, pine, record, bicycle, phone, stars, a hand-wave; new for v3: a compass, a microphone, a camera, a magnifying glass, a cog for the workings.
- Decorative terrain (hills, a pine, a sun) marks moments of ending and leaving. Illustration is never mistaken for user content.

### Motion

Brief and stepped: a 120ms inversion flash on press, entrances of 180ms or less. No smooth easing showpieces, no autoplay. While Muse Spark works, show a stepped pixel loader with what it is doing in words (LISTENING... / READING THE POSTER... / LOOKING NEARBY...), never a fake typing indicator. `prefers-reduced-motion` turns it all off.

## Accessibility (non-negotiable)

- Semantic HTML: real buttons, links and labelled form fields. Keyboard works everywhere; Escape returns home.
- Visible focus: 3px dashed `lcd-ink` outline, 3px offset.
- Every control at least 44 x 44px, menu rows at least 48px.
- Body 16px. Contrast AA or better, checked on the real ground.
- `aria-live="polite"` only for short replies, never for whole screens of content.
- AI summaries, reasons and drafts are visibly marked as AI and kept apart from friends' own words.
- Voice and photo inputs always have a typed alternative.
- Retro constraints never block comprehension.
