# HOOLALA!: Project Instructions v3.2
## Go App-Free: conversational onboarding and personalisation, without the judgement

The current product brief (26 Oct 2026), in scope for the hackathon. It replaces the earlier v2 brief, whose core rules (circle, catch-up in threes, Little Signals, invitations, mutual QR, finite by design) now live in `docs/CONTEXT.md`, `docs/DESIGN.md` and `AGENTS.md`. How each function uses Muse Spark: `docs/MUSE-SPARK-BY-FUNCTION.md`. Rules and judging: `docs/HACKATHON-RULES.md`. Plan: `docs/BUILD-PLAN.md`.

**Hoolala!: Your data. Your choice. Your attention.**
*You never know until you go.*

## 1. The difference to preserve

- Opal asks: what is distracting you, and how can we reduce it?
- Hoolala! asks: what matters to you, and how can technology help you have more of it?

Opal helps people manage distractions. Hoolala! helps people navigate possibilities. The onboarding should make that difference obvious from the first screen.

## 2. Reference product: Opal

Use Opal's onboarding as a design reference for its conversational pace, goal discovery, personalised setup, transitions and permissions asked in context. Do not copy Opal's branding, illustrations, interface assets or onboarding copy. Hoolala! keeps its monochrome Nokia identity.

| Opal approach | Hoolala! adaptation |
|---|---|
| Engaging first interaction | A playful opening question that creates curiosity |
| Conversational onboarding | The profile is built through a natural dialogue |
| Personal goals | Ask what people want more of in their lives |
| App selection | Choose sources to curate, not to block |
| Personalised recommendations | Relevant topics, people and opportunities |
| Focus schedules | Users set their own delivery rhythm |
| Usage thresholds | User-defined briefing limits with an easy override |
| Personalised results | A preview of their own Hoolala! |
| Progress feedback | Ask whether something helped with an intention |
| Clear permission requests | Explain exactly why a connection is useful |

Do not borrow Opal's screen-time projections ("years of your life reclaimed"). That is the definition of a life well spent we reject.

## 3. Core philosophy

- Screen time is not inherently good or bad. Never assume time with technology is wasted.
- Never show years lost, time wasted, productivity deficits or comparisons with other people.
- Never use guilt, shame, fear or arbitrary productivity standards.
- **The person defines what meaningful use of technology means to them.**
- Onboarding exists to understand intentions and configure an agent that supports them.
- A person who deliberately watches six hours of video is not failing Hoolala!.

## 4. Architecture

- The Hoolala! web app remains the main product.
- **Go App-Free** is an optional experience opened from the web app. It starts an agent-led onboarding that sets up the Personal Compass, sources and delivery rules.
- The first external channel is **Telegram**. Web and Telegram share one account and one configuration.
- No extra Hoolala! mobile app is ever required.

## 5. The onboarding conversation

Five to seven short stages, with progress cells, BACK, SKIP on optional steps, and every answer editable. A real Muse Spark conversation, not a questionnaire dressed up as chat, with a scripted fallback when the model is off.

1. **Hello, human.** "Before we get acquainted, what would you like a little more of?" Pick several: More real-world adventures / Better connections with friends / Interesting career opportunities / Learning and inspiration / Something else entirely.
2. **What matters.** "What would make your digital time feel worthwhile?" Free text. The agent asks one relevant follow-up, not a list.
3. **Where to look.** "Where should I look for things worth your attention?" Each source shows honestly what it can do (see section 7).
4. **Filter the noise.** "Anything you'd rather hear less about?" Topics, repeats, announcements, anything else.
5. **Boundaries.** "How often should I bother you?" On demand / once a day / once a week / custom; optional cap of three check-ins a day; quiet hours. "Your rules. Change them whenever you like."
6. **Profile reveal.** "Your world, according to you." The agent states the compass in one or two plain sentences, then "Everything else can wait. Sound about right?" with LOOKS RIGHT / CHANGE SOMETHING / START AGAIN.
7. **Go App-Free.** Explain Telegram delivery, link Telegram, confirm the delivery settings, state source limits, then send a first briefing: real items if sources are connected, otherwise a clearly labelled PREVIEW. End on one useful action, not another screen.

Never ask for age estimates, screen-time estimates or unnecessary personal information. (The 18+ confirmation at sign-up is a safety rule, not profiling, and stays.)

## 6. The Personal Compass

A user-controlled profile of what someone is curious about right now. Never a score, never a judgement of behaviour.

> **Your Personal Compass**
> *What you're curious about right now:*
> Discovering product design opportunities. Learning about AI and psychology. Spending more time with friends. Finding interesting things happening nearby.

| Part | Holds |
|---|---|
| Intentions | What the person wants more of; why, only if they chose to say; outcomes they'd find useful |
| Interests | Topics, professional interests, activities, preferred creators and sources, people and organisations |
| Filters | Excluded topics, relevance rules ("only near Lausanne") |
| Sources | Connected sources and what each can actually do |
| Delivery | Channel, on demand or schedule, optional cap, quiet hours, overrides |
| Actions | Which suggestions are welcome (meet friends, explore opportunities, events, follow-ups); everything outbound still needs approval |

- Built only from what the person said or chose. No hidden behavioural profiling, no personality labels, no psychological assumptions.
- Every part is editable in the web app or by plain language ("Stop showing me this topic."). The agent proposes the change, the person confirms, and the change shows in a CHANGES list where it can be undone.
- The compass evolves when life changes: a new job, a move, a new hobby, or simply wanting something different.

## 7. Sources, honestly

Hackathon build (26 Oct): friends on Hoolala! plus Muse Spark's built-in web search with citations (FIND IT, see `docs/MUSE-SPARK-BY-FUNCTION.md`). Feeds and shared links below are the roadmap, not the demo.


| Source | What Hoolala! can do | Label shown |
|---|---|---|
| Friends on Hoolala! | Notes, signals and plans shared with you | CONNECTED |
| Newsletters, blogs, sites with an RSS or Atom feed | Read new items from the feed address you add | CONNECTED (FEED) |
| Anything you share | Links you paste in the web app or forward to the Telegram bot | LINKS YOU SHARE |
| LinkedIn | LinkedIn's terms don't allow apps to read your feed or build digests from it. Share specific posts or job links instead. | LINKS YOU SHARE ONLY |
| Instagram | Instagram's API only reads your own account's profile and media, not the accounts you follow. Share specific posts instead. | LINKS YOU SHARE ONLY |
| Email newsletters without a feed | Not in the first version | COMING LATER |

Briefings show a title, a short summary in Hoolala!'s own words and the link to the original. Never reproduce whole articles or posts.

## 8. Briefings

- Finite: at most the person's cap (default 3 items), then "That's everything. We could show you more, but we'd have to make it up."
- Each item says why it's there, tied to a compass line ("Because you said: opportunities in Switzerland."), and links to its source. The model ranks and summarises only items that really came from the person's sources; every line is checked against the item ids.
- Each briefing ends with at most one action: open, save, ask a friend (So... Thursday?), or nothing.
- Feedback in one tap: MORE LIKE THIS / NOT USEFUL / LESS OF THIS TOPIC. Feedback becomes a visible, reversible compass change, never a hidden weight.
- Never treat time spent reading as proof of interest.
- Pull by default: scheduled delivery only if the person chose it, always inside quiet hours and the cap.

## 9. Continuous learning, out loud

Examples the agent must handle: "More like this." / "That wasn't useful." / "Prioritise updates from my connections." / "Stop showing me this topic." / "Only send me opportunities near Lausanne." Each one is a proposed compass edit, confirmed, listed and undoable.

## 10. Never

Guilt-based screen-time estimates, mandatory productivity goals, punitive streaks, comparison leaderboards, scarcity or fear in onboarding, forced permissions, engagement-maximising notifications, obstacles to changing or turning off limits.

## 11. Success metrics

Onboarding completed without friction; how accurate people say their compass is; confidence editing preferences; successful source and Telegram connections; relevance of first briefings (one tap: useful or not); whether people took the action they intended. Ask people whether it helped their goals; never assume less screen time is success.

## 12. Hackathon scope (decided 26 Oct)

In scope for 4 Nov: the full onboarding conversation, Personal Compass with plain-language edits and undo, sources (Hoolala! friends, RSS/Atom feeds, links shared in web or Telegram), honest LinkedIn and Instagram labels, briefings with grounding and feedback, Telegram link and delivery (on demand and scheduled, cap, quiet hours). LinkedIn and Instagram account connections are not built, because their platform rules don't allow this use. See `docs/BUILD-PLAN.md` for what was cut to make room.
