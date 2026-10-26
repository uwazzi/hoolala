# Meta Global AI Developer Hackathon: rules and what they mean for Hoolala!

Source: the official participant guide at https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details (read 26 Oct 2026). This is a paraphrased summary; if anything here disagrees with the guide or with Discord #announcements, the official source wins. All Zurich times are worked out from ET (Europe changed clocks on 25 Oct, the US changes on 1 Nov).

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

- **$150 Meta Model API credits** per participant: claim link "coming soon"; a credit card must be on the account to call the API; set a spend-limit alert on the Billing page. Claim by the deadline.
- Partner credits (not guaranteed): Baseten $100 plus a 2M TPM limit (use model `meta-models/muse-spark-open-1026`, not the id in their docs); Modal $100 for the first 1,000; Fireworks $25 for shortlisted teams.
- Docs: overview, quickstart, model list, API cookbook, Muse Code recipes, OSS model cookbook; on-demand sessions on Muse Spark multimodality and building with Muse Spark and Muse Code.
- Discord: introduce yourself in #intros, questions in #questions, Meta team in #office-hours, updates in #announcements.

## 8. What this means for Hoolala!

### Fit and framing
- Problem statement: **Build for Your World**. Track: **Indie Developer**.
- Pitch Hoolala! as a **social product** (a tiny private circle that turns into real plans and real meet-ups), never as a mental-health, loneliness-treatment or coaching chatbot. The anti-project list names AI mental-health advisers and AI coaches. In the submission, video and README:
  - Avoid "lonely", "shy", "social anxiety", "therapy", "wellbeing coach". Use "friends", "plans", "real life", "small talk game".
  - Small talk missions are a playful private game with pre-written missions (data), not AI advice. The model never gives emotional or health advice.
  - The crisis message stays fixed text from `src/rules/safety.ts`, presented as a safety feature, not a product feature.

### Use of Meta AI tooling (a quarter of the score)
Model calls must be visible and meaningful, not a single "rewrite this" button. **The full plan is now `docs/MUSE-SPARK-BY-FUNCTION.md`:** six functions (TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT), each showing one Muse Spark capability (conversation state and structured output, native audio, vision, web search with citations, parallel tool calling, verifiable workings and evals). The list below is the earlier version, kept for history:

1. **Muse Spark runs the onboarding conversation** with one follow-up per stage and schema-validated output, and drafts the Personal Compass only from the person's own answers.
2. **Muse Spark turns plain language into compass edits** ("Only send me opportunities near Lausanne"), shown as before/after, confirmed, undoable.
3. **Verifiable briefings.** Muse Spark ranks real candidates (friends' items and feed items) against the compass and writes a reason per item; a validator rejects any line not tied to a real item and compass id. Shows craft ("Agents 102: verifiable agents").
4. **Tool-using agent behind a confirmation boundary** in the web chat and Telegram: "anyone free for coffee Thursday?" becomes tool calls and stops at a confirm. Targets Best Agentic Use-Case.
5. **Muse Code as the coding agent.** Agent commits carry the trailer `Agent: Muse Code`, reported in the README and video.

Not in the hackathon build: Muse Voice Transcribe, Muse Spark Open, Muse Image, Muse Wonder.

**Anti-project risk for v3.2:** a briefing built from outside content can look like a "basic RAG app". Make the difference obvious in the video and README: an agent-led setup, a compass the person controls in plain language, grounded and explained ranking, friends' items first, and briefings that end in a real-world action. LinkedIn and Instagram are "links you share only", stated openly, because their platform rules forbid feed reading and digests.

### New work and prior work
Built **before** 26 Oct (must be declared, and not shown in the demo as hackathon work):
- Brainstorming and project organisation: product briefs, the Muse Spark plan, build plan, agent rules, these rules notes.
- The Mono LCD design system (tokens, guidelines, component previews).
- A clickable prototype also existed; it is deliberately **not** in the repo, and the front end is built from scratch during the event.
- Product brief, context and plan documents.

How we make it obvious:
- Repo starts after kickoff. Commit 1: `Pre-hackathon assets (built before 26 Oct 2026)` adding the design system and an inventory of prior work (`PRIOR-WORK.md`), tagged `pre-hackathon`. Every later commit is hackathon work, so `git diff pre-hackathon..main` shows it.
- README section "Built during the hackathon" with a table: prior (design system and plans only, no product code) vs new (all code: Worker backend, D1, sign-in, circles, invitations, Little Signals server rules, the six Muse Spark functions, Telegram, mutual QR, Live counter, share card).
- The demo video narrates only the new parts and says once, plainly, that the visual design and a clickable mock-up existed before.

### Demo (3 minutes, judged as a quarter of the score)
Real accounts on a public URL, two phones, Telegram, model switched on. Suggested beats (updated for v3.2): "Hello, human." onboarding with one agent follow-up; "Your world, according to you."; Telegram link; a briefing with a friend's signal and a feed item, each with a reason; a plain-language compass edit with confirm and undo; ASK A FRIEND becomes an invitation and the friend answers I'M IN; two phones do the mutual QR; the Live number ticks up; share card; Go live. End on "Your data. Your choice. Your attention." and "built with Muse Spark and Muse Code".

### Growth bonuses
The share card and "Please don't follow us. Bring a friend." suit **Most Viral** and **Community Vote**: post the demo on X before the deadline, submit the link, ask pilot testers to vote on 9 Nov.

## 9. Still to confirm (Discord #questions or kickoff)
- Can code start after the kickoff on Mon 26 Oct, or only from Tue 27 Oct (the guide lists the building period as 27 Oct to 4 Nov)? Default: only setup on Monday.
- Exact Meta Model API base URL, auth, model ids (Muse Spark, Muse Voice Transcribe) and rate limits.
- Whether a declared pre-hackathon design system is acceptable (assumed yes under the "clearly identify" rule).
