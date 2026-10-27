# Meta Global AI Developer Hackathon: rules and what they mean for Hoolala!

Source: the official participant guide at https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details (read 26 Oct 2026). This is a paraphrased summary; if anything here disagrees with the guide or with Discord #announcements, the official source wins. All Zurich times are worked out from ET (Europe changed clocks on 25 Oct, the US changes on 1 Nov). Section 8 updated 27 Oct for Signals here (v5: any place, FIND ME, PLACE IT).

## 1. Problem statement

The project must build towards one of two statements:

- **Build for Your World** (ours): bring Meta's models into a domain you know first-hand, solve a real problem, free up time and mental space.
- Push the Frontier: software, robotics, manufacturing, energy, materials.

The project **must use Meta's models**: Muse Spark series, Muse Wonder, Muse Image, Muse Voice Transcribe and SAM 3.1 through the Meta Model API; open weights Muse Glimmer and Muse Spark Open; Muse Code as the coding agent.

## 2. Key dates

| What | ET | Zurich |
|---|---|---|
| Kickoff (rules, prizes, judging, Meta speakers, livestream) | Mon 26 Oct, 12:00 | Mon 26 Oct, 17:00 |
| Agents 101: build a multimodal AI agent | Tue 27 Oct, 12:00 to 13:00 | 17:00 to 18:00 |
| Agents 102: best practices for verifiable agents | Wed 28 Oct, 12:00 to 13:00 | 17:00 to 18:00 |
| Fireworks: specialised intelligence with Muse open models | Fri 30 Oct, 12:00 to 13:00 | 17:00 to 18:00 |
| Office hours in Discord #office-hours (text only, weekdays) | 10:00 to 11:00 | 15:00 to 16:00 until Fri 30 Oct, then 16:00 to 17:00 |
| Building period | 27 Oct to 4 Nov | |
| Last full day for submission and technical questions | Tue 3 Nov | |
| **Submission deadline** (CV platform), final office hours | **Wed 4 Nov, 21:00** | **Thu 5 Nov, 03:00** |
| Meta API credits must be claimed by | Wed 4 Nov, 21:00 | Thu 5 Nov, 03:00 |
| Judging | 5 to 8 Nov | |
| Closing ceremony, top 5 per track judged live, community vote opens | Mon 9 Nov, 12:00 | Mon 9 Nov, 18:00 |
| Community vote winner | Mon 16 Nov | |

Own target stays: **submit by 18:00 Zurich on Wed 4 Nov.** Late submissions are not considered.

## 3. Rules

- **Public repository.** Open source, so add a licence (MIT suggested) and check every asset is ours or properly licensed (Silkscreen and Space Mono are SIL OFL, fine to embed with their licence).
- **Team size** up to 4; solo is allowed.
- **New work only.** What we present must have been built during the event. Existing work is allowed only if we clearly mark what is new.
- **Demo shows only hackathon work.** Judges must be able to see what was built during the event; failing to make this clear can mean disqualification at the judges' discretion.
- **Banned:** anything breaking legal, ethical or platform policies, or using code, data or assets we don't have rights to.
- **Anti-projects to avoid** (generic or against policy): AI that gives medical or mental-health advice, basic RAG apps, simple image analysers, simple "AI for education" chatbots, AI job-application screeners, AI nutrition coaches, personality analysers, sports coaches, anything political or about war.

## 4. Submission

- One project, submitted on the CV platform by the deadline.
- Required: public repo link, a **3-minute demo video** that highlights only what was built during the hackathon, and a live product. Video, code and live product are the main things judges look at.
- Check the repo and the video link open for anyone who is not signed in.
- Optional for the Most Viral prize: post the demo on X and submit the post link.

## 5. Judging

1. **Stage 1, pass or fail:** the project fits a problem statement and reasonably uses the Meta Model API and/or Meta open-weight models.
2. **Stage 2,** four criteria, equal weight, 0 to 10 each:
   - **Impact:** real-world potential, who benefits, could people actually use it, fits a problem statement.
   - **Use of Meta AI tooling:** creative use, beyond a basic integration, capabilities that surprise.
   - **Technical depth and execution:** sound, refined engineering.
   - **Demo:** works, holds up live, the video is genuinely good to watch.
3. **Stage 3:** top 5 per track, judged live from the videos with the same rubric.

## 6. Prizes

- **Indie Developer track** (our track as a solo entrant): $150K, $100K, $75K, $50K, $25K.
- Startups track: $250K down to $25K.
- Bonus prizes from Meta:
  - Most Viral Project, $20K: highest engagement on X up to end of 8 Nov.
  - Best Build on Meta Open Weight Models, $10K: Muse Glimmer or Muse Spark Open on own hardware or partner inference.
  - Community Vote, $10K: most votes in the public gallery.
  - Best Agentic Use-Case, $5K: agents completing meaningful tasks or multi-step workflows.
  - Best Creative Build, $5K: Muse Image or Muse Wonder.

## 7. Resources

- **$150 Meta Model API credits** per participant: a credit card must be on the account to call the API; set a spend-limit alert on the Billing page. Claim by the deadline.
- Partner credits (not guaranteed): Baseten $100 plus a 2M TPM limit (use model `meta-models/muse-spark-open-1026`, not the id in their docs); Modal $100 for the first 1,000; Fireworks $25 for shortlisted teams.
- Docs: overview, quickstart, model list, API cookbook, Muse Code recipes, OSS model cookbook; on-demand sessions on Muse Spark multimodality and building with Muse Spark and Muse Code.
- Discord: introduce yourself in #intros, questions in #questions, Meta team in #office-hours, updates in #announcements.

## 8. What this means for Hoolala! (updated 27 Oct for Signals here)

### Fit and framing
- Problem statement: **Build for Your World**. Track: **Indie Developer**.
- Pitch: **people who share a place but never talk** (any café, bar or coworking space). Hoolala! makes it effortless to arrive, intriguing to discover, safe to respond and natural to meet, and measures one thing: how many accepted invitations become real conversations.
- Not a mental-health product, not a coach, **not a dating app**. In the submission, video and README avoid "lonely", "shy", "social anxiety", "therapy", "coach" and "dating". Say "people who share a place", "small invitations to talk", "real conversations".
- Meeting people you don't know raises the bar on safety, and judges will look for it: anonymous until both accept, first names only, no free chat, screening on every topic and reply, block and report, place-level presence only, the person's coordinates discarded after the lookup, FIND ME only with consent and only about yourself, 18+. Show at least one of these on camera (a dating line refused by SCREEN IT).
- The crisis message stays fixed text from `src/rules/safety.ts`, presented as a safety feature.

### Use of Meta AI tooling (a quarter of the score)
The plan is `docs/MUSE-SPARK-BY-FUNCTION.md`: FIND ME (web search with citations about the person, with consent, and a compass draft), PLACE IT (parallel tools: Google Maps details, web search, our facts), SUGGEST IT (web search with citations, structured output), SCREEN IT (classification with reasons and FR/EN translation), PLAN IT (parallel tool calling, draft only), SNAP IT (vision, stretch) and CHECK IT (show the workings, an evaluation set with a pass rate). Check-in, meeting and staying in touch are model-free on purpose, and saying so is part of the pitch. Muse Code builds it; agent commits carry `Agent: Muse Code`. PLAN IT plus the multi-step check-in-to-meet flow is our entry for **Best Agentic Use-Case**.

**Anti-project risk:** FIND ME must not look like a "personality analyser": it finds interests the person confirms, in their words, with sources, never traits or types, and it's private. SCREEN IT must not look like a "simple" moderation wrapper. Show that it sits behind code rules, returns structured reasons, translates for a bilingual room, is evaluated, and never rewrites people's words.

### New work and prior work
Built **before** 26 Oct (declared, not shown as hackathon work): the Mono LCD design system, product briefs, plans, agent rules, these notes, and a clickable prototype that is deliberately not in the repo.

- Repo commit 1 `Pre-hackathon work`, tagged `pre-hackathon`; everything after is hackathon work (`git diff pre-hackathon..main`).
- README section "Built during the hackathon": prior (design system and plans, no product code) vs new (all code: Worker, D1, sign-in and Telegram login, FIND ME and the compass, places, check-in, PLACE IT and place points, Signals here with its server rules, the Muse Spark functions, evals, mutual QR, Live page, posters and share card).
- The video says once, plainly, that the visual design and a mock-up existed before.

### Demo (3 minutes, a quarter of the score)
Filmed at the pilot place with consenting people only. Beat sheet in `docs/MUSE-SPARK-BY-FUNCTION.md`: "We've sat at the same table for six months." / Never spoken; FIND ME with a namesake ticked NOT ME; share location and check in, GPS fails and search by name works; the place card with a fixed price; three signals, one translated; SUGGEST IT with a cited idea, a dating line refused; I'M CURIOUS, accept, first names, PLAN IT; two phones confirm on the terrace, the connection rate ticks up; SHOW THE WORKINGS; STAY IN TOUCH; GO LIVE. End on "Signals, not feeds." and "built with Muse Spark and Muse Code".

### Growth bonuses
The poster itself is shareable ("Signals here. Not a dating app."), and the share card and Live page suit **Most Viral** and **Community Vote**: post the demo on X before the deadline, ask pilot participants to vote on 9 Nov.

## 9. Still to confirm
- Meta Model API base URL, auth, model ids and rate limits; which features are on our key from Switzerland (web_search, structured output, parallel tools, image input, prompt caching).
- Whether a declared pre-hackathon design system is acceptable (assumed yes under the "clearly identify" rule).
- Pilot place by Thu 29 Oct, and the OK to film there.
