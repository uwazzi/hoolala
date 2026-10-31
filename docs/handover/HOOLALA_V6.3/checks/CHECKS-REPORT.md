# Checks report · HOOLALA v6.3

Filled by the coding agent before writing code. One block per work package. Result: PASS, PASS WITH NOTES, or STOP. A STOP blocks that work package until the owner answers. Gate details are in `HANDOVER.md`, "Gates before any code". Any place where the build would differ from the drawn design is a STOP.

Checked Sat 31 Oct 2026 against branch `HOOLALA_V6.3` (contains `staging` with all v6.2 work). No STOPs. No deviation from the drawn design needed.

## WP36 (revised): Five quick ones

| Gate | Result | Notes (blockers, risks, cheaper alternative, rule touched) |
|---|---|---|
| Technical feasibility | PASS | Chips slot and reply line extend the one voice component (`web/src/pages/Surprise.tsx`); no second voice component. Fixed owner-written script replaces the `/api/me/surprise/next` question calls, which is simpler than v6.2. Dictation matched to chips by code (role and word match on the `/hear` transcript), same pattern as the existing keyword roles fallback. Timers (1.7 s reply, caption typing) follow the existing cleanup pattern. Dots 3 to 5 with `· FOLLOW-UP` label. No new dependency. |
| Security and privacy | PASS | Keeps the v6.2 guarantees: `/hear` transcribes and drops audio; answers held in memory only until LOOKS RIGHT; nothing in logs (rule 5, `npm run check:secrets`). No per-answer model call, so less text leaves the device than in v6.2. |
| Value alignment | PASS | Copy built as drawn, including the curly quotes in the design file (precedent: v6.2 story copy). FULL → BOLD and CAN'T REMEMBER → SOFT exactly as decided. The CAN'T REMEMBER plus FULL line tension is owned by the open question below; until answered the line stays as written per `design/DECISIONS.md`. |

Questions for the owner:
- CAN'T REMEMBER plus FULL: keep "Full battery. Bold it is." (current) or use "Full battery. We'll still start gentle."? Building the current line.

## WP39: Keeping the juicy bits, with Snake

| Gate | Result | Notes |
|---|---|---|
| Technical feasibility | PASS WITH NOTES | Snake is plain DOM cells on a 19 x 12 board with one interval (170 ms, 260 ms reduced motion), board-level key handling only (no global listener), focus without scroll, timer cleared on leave; all standard in the current stack. Trimming view is token styling on two timers with a reduced-motion instant path. One extraction call reuses the `src/llm/compassdraft.ts` pattern (structured output, validator, code fallback, `llm_calls` and `workings` rows). Note: the design gates SHOW ME at 6 s but the spec allows an 8 s timeout before the fallback; a slow call may show SHOW ME after 6 s. The fallback keeps the flow working, so this is a timing note, not a deviation. |
| Security and privacy | PASS | Free text (q1f, q4) sent once for extraction, then discarded; chips never need the model. Validator strips names, rejects off-list roles, labels about the person, filler in topics, and off-table themes; kept bits pass SCREEN IT before use. Snake stores nothing and emits no analytics events. |
| Value alignment | PASS | No score, counter, game over, high score or stored result; OOPS. GO AGAIN. restarts in place as drawn. SHOW ME WHAT YOU KEPT is a separate key reachable without playing (keyboard Tab order and screen reader label as drawn). Off-table FAMILY and WORK filters apply in roles, compass people, TRY IT themes and library fills. Copy as drawn; UK English; no em dashes. |

Questions for the owner:
- None for WP39. From v6.2, still open: the safety line for BOLD tries with people you know; Around me scope A or B; missing reference details.
