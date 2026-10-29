# Muse Code kickoff: Hoolala! v6 (tiny tries lead)

Thu 29 Oct 2026. Hand-over from the design session to Muse Code. Deadline: submit by Wed 4 Nov, 18:00 Zurich.

## Files in the repo (branch `v6-docs`)

| File | What it is |
|---|---|
| `docs/HANDOFF-v6.md` | The spec: changelog, DESIGN rules, TRY IT, `tries.ts`, issues, days left |
| `docs/design/v6/Flow.dc.html` | Home and tiny-try flow, reference only |
| `docs/design/v6/Friends.dc.html` | Friends, reference only |
| `docs/MUSE-CODE-KICKOFF.md` | This file |

The prototype files are design references: copy, layout, states, the plant algorithm and the 15 tries. They are not production code (they use the canvas runtime, not Preact).

---

## The prompt to paste into Muse Code

```text
Work from branch v6-docs. Read AGENTS.md first, then docs/HANDOFF-v6.md and docs/MUSE-CODE-KICKOFF.md.
Product decision (29 Oct, from the owner): the home now says GET OUTSIDE. MEET PEOPLE.
and the daily tiny try is the hero. Signals here stays as the second path. Do not
reopen this decision; if something conflicts, log it in docs/DECISIONS.md and ask.

Work in this order, one package per branch and PR, milestone "Submission (4 Nov)":

0. DOCS-v6 (today): apply sections 1 to 3 of docs/HANDOFF-v6.md to docs/CHANGELOG.md,
   docs/DESIGN.md and docs/MUSE-SPARK-BY-FUNCTION.md; apply the AGENTS.md changes in
   docs/MUSE-CODE-KICKOFF.md; add WP28 to WP31 to docs/BUILD-PLAN.md.
   GitHub housekeeping (if you have gh access): close the issues listed in
   HANDOFF-v6 section 5 "Close now", each with a comment naming the PR; create
   WP28, WP29, WP30, WP31 from section 5 with label work-package.
1. WP31 staging fixes (Fri 30, small).
2. WP28 home v6 and tiny tries (Fri 30). Reference: docs/design/v6/Flow.dc.html.
3. WP29 TRY IT with guardrails (Sat 31 morning). src/rules/tries.ts tests first,
   exactly as specified in HANDOFF-v6 section 4.
4. WP30 friends, slim (Sun 1). Reference: docs/design/v6/Friends.dc.html.
5. WP9 safety pass (Sun 1).

For every package: tests first for src/rules/ and permission checks; npm test,
npm run typecheck and npm run eval pass; works with LLM_ENABLED=false; commits
"WPn: what changed" with the trailer "Agent: Muse Code"; UK English, no em dashes;
deploy to staging and post the staging URL in the PR. Stop and ask me before:
changing src/types.ts beyond what a package needs, adding a dependency, touching
prior-work/, or anything in "Owner decisions" in docs/MUSE-CODE-KICKOFF.md.
Start with DOCS-v6 and show me the diff before merging.
```

---

## AGENTS.md changes (part of DOCS-v6)

These lines in the current AGENTS.md would block the new design. Change them as follows.

1. **Header line:** "Updated 27 Oct 2026 for Signals here v5" becomes "Updated 29 Oct 2026 for v6: tiny tries lead; Signals here is the second path (`docs/HANDOFF-v6.md`)."

2. **What we are building:** open the paragraph with: "A finite, real-world nudge with a Nokia LCD look. The first screen says GET OUTSIDE. MEET PEOPLE. and offers one tiny try a day on a private 5-step ladder; a private pixel plant gains a coloured leaf for every try. When people share a place, Signals here lets them post small invitations to talk..." Add TRY IT to the list of Muse Spark functions.

3. **Folder table:** add `src/rules/tries.ts` (step bounds, validation, leaves, next-step suggestion) to `src/rules/`; `src/llm/tryit.ts` (TRY IT) to `src/llm/`; `src/api/` gains `tries`, `plant`, `crew`; new `src/content/tries.ts` (the 15-try library, data not code).

4. **Product rules:** add these bullets.
   - **Code owns the step and the leaves.** TRY IT drafts words only; `src/rules/tries.ts` validates against the requested step's bounds and the always-on limits; rejected drafts fall back to the library; tries are stored with the code-assigned step. Steps change only through the person's NEXT TIME tap. Leaves are flat, one per try made.
   - **The plant and the step are private.** Never shown to others, never on the Live page, never compared. Colour only in the plant.
   - **Crew posts are stories, not chat.** Small private crew by invite link (one crew, link expires in 7 days); posts are screened like topics; NICE ONE only; no replies thread, no counts per person, no leaves for posting. No names, faces or photos of strangers.
   - **Invites are never auto-sent.** WhatsApp, Messenger or copied link, opened by the person's tap; we never read contacts.

5. **The "Never" line:** "Never: ... streaks, comparisons..." stays. Add after it: "The 5-step ladder and the plant are allowed because they are private and the person chooses every step; they must never become public levels, scores or rankings."

6. **"No free chat"** stays for Signals here. Add: "(Crew posts follow the crew rule above.)"

---

## Owner decisions (Muse Code asks, does not decide)

- **WP21 Telegram Mini App:** proposed move to ROADMAP. Owner to confirm.
- **WP7 share card:** proposed to fold into WP30's dare card. Owner to confirm.
- **"GHOSTED" in copy:** the prototype says NO REPLY / GHOSTED; the handoff uses NO REPLY only. Owner's call.
- **Pilot place and filming permission** (due today).
- Anything that changes the demo beat sheet beyond HANDOFF-v6 section 3.

## What "done" looks like on 4 Nov

On a real phone, in a private window: open the app, understand the goal at once, get a try, mark NO REPLY, see a coloured leaf, choose SAME STEP, see TRY IT's "why this one", dare a friend on WhatsApp, and still reach Signals here at a SAMPLE place. README shows 51/51 evals (36 + 15), honest pilot numbers and the Muse Spark table with TRY IT.
