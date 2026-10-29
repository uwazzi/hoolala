# Around me (WP32) · HOOLALA v6.1

Thu 29 Oct 2026. Design reference: `design/screens/Around.dc.html` and `Here.dc.html` (canvas "Hoolala! today", artboards Around me and Here). Follows AGENTS.md and DESIGN.md rules 42 to 45.

## What it does

The person taps SCAN AROUND ME. Hoolala! looks within 500 m, shows the places on an LCD radar, and lists them by fit to the person's compass. Each card says why to go, how easy it is to talk there (from Hoolala! visits), and, where available, today's menu or event from the place's own page. If nothing fits, the person widens to 1 km, then 2 km.

## First screen (review of the live /around, 29 Oct)

The live first screen asks for location without saying what you get, hides that results are personal, gives SKIP the same weight as the main key, and leaves the thumb zone empty. Rework it as in `design/screens/Around.dc.html` (state before the scan):

1. **Radar first, idle.** The radar panel sits at the top from the start: rings, "500 M" label, your square pulsing at the centre, no pins. Tapping the main key starts the sweep **in place** (no page change) and the pins pop into the same panel.
2. **Promise.** AROUND YOU, then one line: "Places within a short walk that fit you, and how easy it is to talk to people there."
3. **Compass line.** A box: "MATCHED TO YOUR COMPASS" with the person's top lines (e.g. coffee · board games · mornings) and EDIT, which opens the compass. If the compass is empty: "Your compass is empty, so results are general. SET IT UP" (opens Surprise me).
4. **Privacy line (keep the live copy).** "Borrow your location for one look around. Used once, never stored, never on any map."
5. **Thumb zone.** At the bottom, above the softkeys, with a dashed top border: ONE LOOK AROUND (primary, 60 px), and under it the text link SKIP, CHECK IN BY NAME. Same pattern as the mic on Surprise me.
6. Only after the tap does the browser ask for location. If refused: "No location, no problem." and open check-in by name.

## Must keep from the design

- **Typed lines (rule 43).** The scan status types out ("Scanning 500 m around you…" then "3 places within 500 m. 2 fit you well."); headlines on Here type out; keys appear when the text is complete; reduced motion shows it at once.
- **The radar.** A 1.2 s sweep while scanning; your square pulses at the centre; numbered pins pop in, solid for good fit, dashed for low fit; rings rescale with the radius; tapping a pin opens its card.
- **Ask before locating.** One screen: what it does, your compass, "used for this scan only, never stored or shown". NOT NOW is always there.
- **Softkeys TODAY · AROUND · FRIENDS** on every top-level screen; Here sits under AROUND.

## Who decides what

| Decision | Owner | How |
|---|---|---|
| Which places are in range | Code | Places provider, radius 500 / 1000 / 2000 m, excluded types |
| Fit (GOOD / OK / LOW) | Code | Compass tag overlap with place type and features, plus talking rating; deterministic, testable |
| Talking rating | Code | Median of Hoolala! visit ratings, shown only from 3 ratings |
| "Why go" sentence and tiny try | Muse Spark (**WHY GO**) | Writes words from facts code gives it; cannot change fit or rating |
| Today's menu or event | Muse Spark (**READ IT**) | Extracts from the place's own page; every item must appear in the source text |

## Data

**Places.** Reuse the provider FIND ME already uses. If choosing now: OpenStreetMap via Overpass is free and fine to cache (ODbL, show "© OpenStreetMap contributors"); Google Places (New) Nearby Search is richer but paid, and its terms limit caching and require Google attribution. Keep only: id, name, type, lat/lon, website, opening hours, a few tags (outdoor seating, shared tables, board games, live music). Cache by area (geohash of 6 characters) for 24 hours.

**Excluded types:** casinos, adult venues, nightclubs, private homes. Bars are shown with 18+.

**Menus and events.** Only from the place's own website or public page listed by the provider. Never scrape Google Maps or review sites. Server fetch with a clear user agent, respect robots.txt, 5 s timeout, first 20 kB of text. READ IT returns at most 3 items plus hours, with source and date. Cache 24 hours. If anything fails: "See their menu" link only. Show "Source: their website, read today."

**Talking rating.** After a verified visit (check-in at the place, as Signals here already does), on I'M LEAVING ask once: "How was it for talking here?" with five words (mostly quiet, a little, sometimes chatty, often chatty, very chatty). One rating per person per place per 7 days. Shown as the median when there are 3 or more, from the last 90 days. Never per person, never names, never comments. "Checked by N Hoolala! visits."

**Location.** Sent once per scan, not stored, not logged (logs keep the geohash at most). Scans limited to 10 an hour.

## Radius logic

1. Start at 500 m.
2. If 0 places: type "Quiet within 500 m. Want me to look a bit further?" with LOOK UP TO 1 KM.
3. If places but none GOOD or OK fit: same offer, worded "Nothing fits you well yet."
4. The person always taps to widen; nothing widens on its own. Maximum 2 km.

## Muse Spark functions

**WHY GO** (new row in MUSE-SPARK-BY-FUNCTION.md)
- Input: compass tags; place facts as a numbered list (type, tags, hours, Hoolala! talking label, today's item if any); fit from code.
- Output (schema): `{ why: string ≤140, tiny_try: string ≤80, facts_used: number[] }`. Low effort, 6 s timeout, one call for up to 6 places.
- Validator: `facts_used` must exist; no number, time or price in `why` unless it appears in a used fact; banned themes from `tries.ts` apply to `tiny_try`; tiny try must sit at step 1 to 3.
- Fallback: a template, e.g. "On your compass: coffee. Talking here: often chatty."
- SHOW THE WORKINGS: "Why this one: compass (coffee) + shared table + 7 Hoolala! visits."

**READ IT** (new row)
- Input: page text (20 kB), place name, today's date.
- Output: `{ items: string[] ≤3, hours?: string, kind: 'menu'|'event'|'hours' }`.
- Validator: every item must appear in the source text (normalised substring match); otherwise drop it. No allergen or health claims.

## Code

- `src/rules/places.ts`: `inRange`, `excluded`, `fitFor(compass, place, rating) → 1|2|3`, `talkingLabel(ratings) → label | null` (null under 3), `nextRadius`.
- `src/llm/whygo.ts`, `src/llm/readit.ts`.
- `src/api/around.ts`: `POST /around/scan {lat, lon, radius}` returns places with fit, rating, why, tiny try; `POST /places/:id/rating`.
- Front end: `Around` screen (consent, radar, cards, filters), Here screen updates.
- Table `place_ratings (place_id, user_id, label 1..5, created_at)` with a unique (place_id, user_id, week) index.

Tests first: fit is the same for the same input; rating hidden at 2 ratings, shown at 3; median correct; radius never above 2000 m or widened without a tap; excluded types never returned; READ IT item not in source is dropped; WHY GO with an invented price is rejected; location not written anywhere (assert on logs and tables).

Evals: 10 WHY GO cases (5 must pass, 5 traps: invented feature, flirting try, price not in facts) and 5 READ IT cases (2 with items absent from the page).

## Cut for 4 Nov

Build: consent, radar, scan at 500 m / 1 km / 2 km, code fit, WHY GO with fallback, talking rating capture and display, READ IT for places with a website.

Seed for the demo: the pilot place and 5 to 8 places around it, with real provider data and a few seeded ratings marked SAMPLE (rule: sample data is labelled).

After 4 Nov: filters beyond FOR YOU, events from public pages, rating decay tuning, offline cache.

## Where it fits in the days

The week is already full. Around me (about one day) fits only by trading:

- **Option A:** Sun 1 builds WP32 Around me; WP30 Friends shrinks to the dare link only (no timeline).
- **Option B:** keep WP30 as planned; Around me ships as a scan with fit and why, without READ IT and ratings (both after 4 Nov).

Owner to choose before Muse Code starts WP32.

## Header (all screens; live since v6, check every screen)

Replace the phone-style status bar (signal bars, battery, centred HOOLALA!) with one compact brand bar, 44 px high, 24 px side margins, 2 px dashed bottom border (`--lcd-ink-secondary`): **HOOLALA!** on the left (Silkscreen 700, 18 px), the tagline "You never know until you go." on the right (Space Mono 11 px, secondary ink). No other icons. Same bar on every screen; screen names live in the softkeys (TODAY · AROUND · FRIENDS), not the header.
