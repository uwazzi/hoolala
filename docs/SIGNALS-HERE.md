# Signals here: the hackathon hero (v5, 27 Oct 2026)

Decided 27 Oct after the competitor review (`claude/COMPETITOR-REVIEWS.md`): the main feature for 4 Nov is **Signals here**. People at the same **place** (any public place: a café, a bar, a coworking space, a library) post and answer small, open invitations to talk, stay anonymous until both accept, then meet in person. Where this brief and older docs differ, this brief wins on product scope.

v5 changes (27 Oct, owner's decision): a venue is now **any place**, not a partner venue with a host. Onboarding reads the person's **public footprint** (with their OK) to draft their **Personal Compass**. Check-in is **share location, pick the place**; a place that isn't there yet is added and saved. People who add places and keep their details right (for example the menu the agent fetched from Google Maps) earn **place points**.

> "We've sat at the same table for six months."
> Never spoken.
>
> **Hoolala!** *You never know until you go.*

## 1. The idea in one line

Make it effortless to arrive, intriguing to discover, safe to respond and natural to meet, anywhere people already sit side by side. Hoolala! turns "we should talk sometime" into "we did".

**North-star metric: real-world connection rate**, the share of mutually accepted signals that end in a meet-up both people confirm with the QR handshake.

## 2. What the research does and doesn't tell us

- Verified: location check-in fails at the worst moment (several Ding reviews). So **GPS must never be the only way in**: searching for the place by name always works.
- Not yet established, so we test it in the pilot: whether people understand signals without explanation, whether AI topic ideas help, whether anyone is around, how comfortable people feel replying, and whether people bother to improve place details for points.

## 3. The flow

| Step | What happens | Model? |
|---|---|---|
| **0. Get started (once)** | Sign in, 18+. A short story about why small contacts matter, then three spoken questions about real moments. Each answer drafts one compass line; you check the sketch and the people in your days. Nothing saved until LOOKS RIGHT. | **COMPASS DRAFT** |
| **1. Arrive** | "OK to share your location?" Hoolala! shows the places within about 150 m. Pick yours: checked in. Not listed? ADD THIS PLACE (name and kind); it's saved at your location. GPS off or wrong? Search the place by name. Partner places may also have a QR poster. | No, on purpose |
| **2. The place** | A place card: what kind of place, hours, the menu, the good spots. Details the agent fetched (Google Maps, the place's own website) show as AI / FOUND with their source; details people confirmed show as CONFIRMED HERE. THAT'S RIGHT / FIX IT earns place points. | **PLACE IT** |
| **3. Peek** | "3 signals here right now", topics only, no names. | No |
| **4. Discover** | Up to 3 open signals at once, each with a topic, a time, a spot and an expiry, in your language. Ones that fit your compass come first, marked only for you. | SCREEN IT translates |
| **5. Post** | Write a topic (60 characters), or ask for ideas that fit you and the place. Pick when and where. | SUGGEST IT, SCREEN IT |
| **6. Respond** | I'M CURIOUS, with an optional line. The poster sees "Someone here is curious", never a name. | SCREEN IT on the line |
| **7. Accept** | ACCEPT (up to 3 people) or NOT THIS TIME. Only after both accept does each side see the other's first name. | No |
| **8. Meet** | A meeting point and time ("Terrace, 15:10"), quick replies only. | PLAN IT proposes; the poster confirms |
| **9. Confirm** | Two phones, mutual QR, both agree. +1 private moment; the Live number and the connection rate tick up. | No, on purpose |
| **10. Stay in touch?** | Only if both choose it. | No |
| **11. Go live** | HOOLALA! IS OFF. YOU'RE ON. | No |

## 4. Get started: three questions and the Personal Compass

- **First open.** A six-beat story about why small contacts matter, then LET'S GO: the same voice UI as Surprise me, three questions about real past moments.
- **What Muse Spark does:** one structured draft per answer: the line (60 characters, what happened), its topic, place, pace and the people in it. Code validates every draft; a bad one falls back to the trimmed answer. Transcripts are never stored.
- **The compass check:** "A FIRST SKETCH OF YOU, IN N LINES." The lines by direction, each "you said", plus PEOPLE IN YOUR DAYS (roles only, never names). LOOKS RIGHT. MAKE MY GAME saves; CHANGE SOMETHING starts over. Editable later in plain words, with undo.
- **What is stored:** only the confirmed lines and roles. Nothing before LOOKS RIGHT.
- **What it's for:** SUGGEST IT topics that fit you and the place, your game of tiny tries, and putting signals that fit you first (a small FITS YOU, shown only to you). **Never shown to anyone else, never used to match or rank people.** Anonymity until both accept is unchanged.
- **What it never is:** a personality type, a score or a judgement. Interests in your own words only.
- Model off: the same three questions; the answer trimmed to a line with keyword roles.

## 5. Arrive: share location, pick the place

Never a dead end. Each step offers the next.

1. **Share location (primary).** One explained permission: "Only to find the place you're in." The server returns places within about 150 m: Hoolala! places first, then nearby places from Google Maps (live). Pick one: checked in.
2. **Add this place.** Not listed: ADD THIS PLACE with a name and a kind (café, bar, coworking, library, other). The place is **saved at your location** (the place's coordinates come from the person who added it) and the person who added it earns place points once someone else checks in there.
3. **Search by name.** Location off, denied or wrong ("Your phone thinks you're in the lake."): type the place's name and pick it. Allowed only for places within the city you set; the check-in is marked `search` for the metrics.
4. **QR poster and code (optional).** A partner place can print a poster with a QR and a four-letter code; scanning it checks in directly. Used for the pilot.

- A check-in lasts until I'M LEAVING or 4 hours. Leaving hides your open signals.
- **The person's own coordinates are used to find nearby places and then discarded.** What is saved is the place (when someone adds one) and the check-in (person, place, time), deleted after 24 hours. No location history, no map of people.
- First-attempt check-in success rate stays a headline metric.

## 6. The place card: PLACE IT and place points

- **What a place knows:** kind, opening hours, the menu (a few highlights and prices), spots (terrace, big table, window bar), wifi, power sockets, how quiet it is, house rules.
- **PLACE IT (agent):** on first visit or when details are older than 30 days, Muse Spark calls its tools in parallel: Google Maps place details (live), a web search for the menu and hours on the place's own website, and Hoolala!'s confirmed details. It returns a structured list of facts, each with its source. Fetched facts show as AI / FOUND with "> google maps" or "> the place's website"; they are not stored as Hoolala! data (Google Maps content is shown live with attribution, only the Google place id is kept).
- **People make it true:** each fetched fact has THAT'S RIGHT / FIX IT / NOT ANY MORE. A confirmed or fixed fact becomes a Hoolala! place fact: written by people at the place, shown as CONFIRMED HERE with the date.
- **Place points (private):**

| Action | Points | Counted when |
|---|---|---|
| Add a new place | 10 | Someone else checks in there |
| Add or fix a detail (menu item, price, hours, spot) | 5 | Another person confirms it, or nobody disputes it for 24 hours |
| Confirm a detail | 2 | Straight away (once per detail per person per month) |

- Only while checked in at that place; never for your own additions; at most 30 points a day; disputed facts go back to AI / FOUND.
- Points show only to you, in MY MOMENTS: "You've helped 4 places. 62 place points." Collective only on the Live page: "37 place details confirmed this week."
- **Points reward caring for places, never social activity.** No points for posting, replying or meeting. No leaderboards, no public totals, no streaks, no levels.

## 7. Signals here

- **Audience: everyone checked in at the same place right now.** Not visible outside the place, not searchable, not on any map.
- **Topic:** up to 60 characters, plus WHEN (now, in 30 minutes, at a time), WHERE (one of the place's spots) and FOR HOW MANY (1 to 3 people).
- **Expiry:** at the chosen time plus 30 minutes, when the poster leaves, or after 2 hours.
- **Limits:** at most 2 open signals per person, 5 I'M CURIOUS per hour.
- **Discovery is finite:** 3 at a time, then "That's everything here right now. Post one?"
- **Anonymous until both accept:** "Someone here" before; first names only after. No photos, no profiles, no compass shown to others.
- **No free chat.** Quick replies only (ON MY WAY / 5 MINUTES LATE / CAN'T MAKE IT / WE'RE AT THE TERRACE).
- **Not dating.** Topics and replies are screened; the first screen and any poster say so.

### Example topics (the voice)

- "Coffee break at 15:00. Small talk welcome, work talk tolerated."
- "Anyone else stuck on a pitch deck? Moral support at the big table."
- "Their flat white is apparently famous. Verdict at 16:00?"
- "First time here. What's good on the menu?"

## 8. Muse Spark in Signals here

Full detail: `MUSE-SPARK-BY-FUNCTION.md`.

| Function | What it does | Capability | Guardrail | Fallback |
|---|---|---|---|---|
| **COMPASS DRAFT** | One spoken answer to a compass line with topic, place, pace and people | Structured output | The question's part; roles from the allow-list, never names; banned labels rejected; transcripts never stored; nothing saved before LOOKS RIGHT | The trimmed answer with keyword roles |
| **PLACE IT** | Fetches a place's details: hours, menu, spots | Parallel tool calling (Google Maps details, web search, our facts), structured output | Facts carry their source; fetched facts never become Hoolala! data without a person confirming; Google content shown live with attribution | Place card with people's details only |
| **SUGGEST IT** | Three topics that fit you, the place (its menu, its spots) and what's on nearby today | Web search with citations, structured output | Dashed AI block, never posted automatically; cited events must come from returned sources | Hand-written topics by time of day |
| **SCREEN IT** | Checks every topic, reply and place detail; translates FR/EN | Structured output | Code rules first; approve or reject, never rewrite | Code rules only |
| **PLAN IT** | Proposes the meeting spot and time | Parallel tool calling | Draft only; the poster confirms | The spot and time the poster picked |
| **SNAP IT** (stretch) | Photograph the menu board to update the menu | Vision | Image in memory only; becomes facts to confirm | Type it in |
| **CHECK IT** | SHOW THE WORKINGS, evaluation set | Verifiable agent behaviour | No personal text in the log | "Model off: rules only." |

The model steps out on purpose for **ARRIVE**, **MEET IT**, **STAY IN TOUCH** and **GO LIVE**.

## 9. Safety and privacy (non-negotiable)

- 18+ at sign-in. Only checked-in people can see or answer signals.
- Anonymous until both accept; first names only after; no photos, profiles or compass shown to others.
- Spoken answers draft the compass; transcripts and audio never stored; people as roles only; the compass is deleted with the account.
- Location: used to find places, then discarded. Saved: places people add, and check-ins for 24 hours. No location history, no map of people.
- Places are public places only (no homes, no private addresses); a reported place is hidden at once.
- Block works both ways, everywhere, immediately. Report hides a signal, reply or place detail at once.
- Screening on every topic, reply and place detail. Rate limits on posting, replying, adding places and points.
- Public meeting points inside the place only, never "my place".
- Crisis words return the fixed help message, never model text.
- Pitch and copy never say "lonely", "shy", "anxiety", "therapy", "coach" or "dating".

## 10. Metrics (measured privately, reported in aggregate)

| Metric | Definition |
|---|---|
| **Check-in success rate** | Check-ins that succeed on the first attempt, by method (location, add, search, QR) |
| **Signal-to-response conversion** | Signals that get at least one I'M CURIOUS |
| **Response-to-accept** | I'M CURIOUS requests that are accepted |
| **Real-world connection rate (north star)** | Accepted signals that end in a QR-confirmed meet-up |
| Stay-in-touch rate | Confirmed meet-ups where both choose STAY IN TOUCH |
| Place data quality | Share of fetched details confirmed or fixed by people; places added and visited by someone else |
| Get-personal completion | Share who finish LOOKS RIGHT, and how many drafts they change first |
| Understood without help, comfort | Pilot observation and two questions afterwards |

Never time in app, opens or "engagement".

## 11. The pilot

- **Place:** any busy public place now works, no host needed: a Lausanne coworking space is still first choice for the density; fallback a café or a university common room. Posters are optional (QR shortcut). Decide by Thu 29 Oct.
- **People:** 15 to 20 opt-in adults who are there anyway, plus 4 to 6 friends for the dry run at a café on Sat 31 Oct.
- **When:** Mon 2 Nov, 11:00 to 16:00.
- **Afterwards:** the metrics above, two questions, and the video shot on site with consent.

## 12. Data (summary; full schema in `BUILD-PLAN.md`)

`places` (name, kind, coordinates given by the person who added it, radius, Google place id, spots, optional code and poster key, added_by, status), `place_facts` (place, field, value, source people / google / web, state found / confirmed / disputed, confirmed_by_count, updated), `place_contributions` (person, place, fact, action, points, counted_at), `compass_items` (person, part, text, source_url or "you said") and `compass_changes`, `checkins` (person, place, method, started, ends, left; deleted after 24 h), `checkin_attempts` (method, ok, reason; no person, no coordinates), `signals` (audience `place`), `signal_responses`, `interactions` (kind `here`).

## 13. What happens to everything else

- **Built for 4 Nov:** sign-in (Telegram Mini App, email on the web), the Personal Compass from spoken answers, places with location check-in and ADD THIS PLACE, PLACE IT and place points, Signals here, mutual accept, quick replies, SUGGEST IT, SCREEN IT, PLAN IT, CHECK IT, mutual QR, Live page, STAY IN TOUCH, Go live.
- **If time (after Sun 1):** share card image, SNAP IT for menus, friends' Little Signals and Anyone around?, quick notes and invitations.
- **After 4 Nov:** briefings (FIND IT), Telegram bot briefings, SAY IT, small talk missions, Sounds familiar?, Outside picks, NFC.
