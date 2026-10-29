# Checks report · HOOLALA v6.2

Filled by the coding agent before writing code. One block per work package. Result: PASS, PASS WITH NOTES, or STOP. A STOP blocks that work package until the owner answers. Gate details are in `HANDOVER.md`, "Gates before any code".

## WP35: Onboarding story

| Gate | Result | Notes (blockers, risks, cheaper alternative, rule touched) |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | No model, no new endpoints: one first-open route, six beats as fixed copy with stepped CSS/SVG pixel animation, tap/NEXT/BACK/SKIP/REPLAY controls, LET'S GO to WP36. `intro_seen_at` migration on users (nullable); localStorage flag for signed-out visitors. Reduced-motion path (whole headline, end-state pictures, no auto-advance) via matchMedia and the existing Typed pattern. Sprites are inline SVG with crispEdges, nothing to license. |
| Security and privacy | PASS | Only the seen flag is stored. Beats are fixed copy; no input, no PII, nothing logged. |
| Value alignment | PASS | Figures and sources exactly as specified; the health beat stays out; monochrome; no guilt, fear, streak or scarcity language. "Alone" is not a banned word (banned: lonely, shy, anxiety, therapy, coach, dating). |

Questions for the owner:
- None. The missing RESEARCH.md reference details stay open per HANDOVER.

## WP36: Let's get personal

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | Reuses the WP34 Surprise component with config-only deltas (intro, 3 questions and dots, NEXT label, compass-check end screen, progress strip). WP34 is built but NOT yet merged (branch `HOOLALA_V6.1/wp34-voice` pushed, PR pending): merge it into staging first and cut WP36 from staging (staging leads main; the v6.1 precedent — not main as HANDOVER assumes). New: COMPASS DRAFT structured call per answer plus the code validator and fallback; one save call on LOOKS RIGHT for lines and `compass_people` rows. NEXT confirms drafts in memory; LOOKS RIGHT persists (spec test 5; the "still saves" line in DECISIONS reads as draft-confirm, not storage). FIND ME removal covers the find/draft endpoints, `findme.ts`, consent and IS THIS YOU screens, tests, eval fixtures, and the AGENTS.md/BUILD-PLAN mentions. |
| Security and privacy | PASS WITH NOTES | The hear path is unchanged (audio transcribed and dropped, never stored or logged; existing tests). Name stripping plus the role allow-list in the validator. Nothing saved before LOOKS RIGHT. Rate limits on draft and save. Default: the migration drops stored find_me-origin compass rows (pre-pilot, ~no real users); confirm below. |
| Value alignment | PASS | Lines describe what happened (the validator rejects who-you-are lines); three questions then done, not a companion; every save behind a NEXT tap plus the LOOKS RIGHT gate; roles only, people never rated or contacted. |

Questions for the owner:
- Confirm dropping stored find_me-origin compass rows in the WP36 migration (alternative: keep the text, null the sources).

## WP37: Your game of tiny tries

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | TRY IT exists (single-try schema, `rules/tries.ts` validator, 15-try library, 8 s timeout); the game extends it: 9-try schema (level, kind, who_role, place_kind, why), code-assigned step and minutes, the extended validator (talk and kind per level, compass roles only, service-light with the 2-minute cap, no buying, looks, contact details or LESS OF), NEW ONE (excludes shown titles) and NEW GAME endpoints with 20/3-per-day limits, the `game_tries` migration with 7-day purge via cron, and the 24-try library fallback filled with topic, place and roles. Library first, so the dry run works with `LLM_ENABLED=false`. One 9-try low-effort call should land in ~3 s; the UI waits on the last unticked line. 15 evals. The interim BOLD rule stands until the owner answers (validator: strangers public-only, close roles anywhere; the screen keeps the current line). |
| Security and privacy | PASS WITH NOTES | Compass lines are person-typed: the TRY IT prompt treats them as data only, and the validator plus SCREEN IT drop out-of-bounds output. Roles only, no names in or out. Rate limits per spec. Game rows are per-user and purged after 7 days. |
| Value alignment | PASS | START HERE follows pace, never BOLD; every level always open; no scores, streaks or comparisons; kindness without buying; the safety footnote as specified. |

Questions for the owner:
- None beyond the open BOLD-at-home wording (the interim rule in DECISIONS applies until answered).

## WP38: Today, simplified

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | No model. Home rework per the Flow delta; today's try from the picked game try (build against the spec'd WP37 shapes: `game_tries`, picked flag); v6 library fallback for pre-game accounts; ANOTHER ONE draws the next unpicked try at the level (a new game in the background when used up); NOT TODAY is the later state. Off-you-go, outcomes, NEXT TIME, plant and the COMPASS? row untouched. |
| Security and privacy | PASS | No new data; removals only. |
| Value alignment | PASS | One primary key; no reminders, streaks or counts; removed items stay removed; the plant line as specified. |

Questions for the owner:
- None.
