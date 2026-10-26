# Decisions

One line per decision: date, decision, why. Newest at the bottom.

- 2026-10-23: Pivot to Hoolala!, a private, finite social web app with a Mono LCD look. A social product, not a coaching or wellbeing tool.
- 2026-10-23: Email magic link sign-in; the Live counter counts only interactions confirmed by both people; Cloudflare Worker + D1 + KV.
- 2026-10-26: Indie Developer track, "Build for Your World". Public repo, MIT licence.
- 2026-10-26: Go App-Free (v3.2) fully in scope; small talk, Sounds familiar?, Find a plan, Unplug, Outside picks moved to the roadmap.
- 2026-10-26: Muse Spark by function (TELL IT, SAY IT, SNAP IT, FIND IT, PLAN IT, CHECK IT). Web search replaces RSS and shared links; native audio replaces a separate transcription model; Telegram on demand only.
- 2026-10-26: Live URL `hoolala.hg-labs.io` as a Workers Custom Domain on the existing Cloudflare zone.
- 2026-10-26: Prior work in the repo is the design system and the planning docs only. The earlier clickable prototype is not carried over; the front end is built from scratch during the event.
- 2026-10-26: Coding agents: Claude Code orchestrates and reviews, Codex takes independent work packages, Muse Code takes SNAP IT and evals. Every commit carries an `Agent:` trailer.

## Open (confirm at kickoff)

- Meta Model API base URL, auth, exact Muse Spark model id, rate limits; credit claim link.
- Do hackathon keys work from Switzerland? Which features are on our key: audio, image, web_search, structured output, parallel tools, conversation state?
- Does Muse Code draw on the $150 credits?
- May code start after kickoff on 26 Oct, or only from 27 Oct?
