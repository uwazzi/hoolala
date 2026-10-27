# Competitor review analysis (v3.2)

Saved 27 Oct 2026 from the owner's research. Reviews of Anuma, Ding, Meet Around and EyesTalk on the App Store and Google Play. Evidence is thin: only Ding's location and check-in failures are a verified, recurring complaint. Everything else is a hypothesis to test in our own pilot.

**Apple App Store & Google Play | 26 October 2026**

I checked the store listings and publicly accessible customer reviews for **Anuma, Ding, Meet Around and EyesTalk**, the four closest verified competitors.

### 1. Review overview

| Competitor | Apple App Store | Google Play | Available feedback | Evidence quality |
|---|---|---|---|---|
| **Anuma** | 4.5/5: 6 ratings (US) | 5,000+ downloads; no public rating shown | Messaging bugs; appreciation for shared AI memory | Very limited |
| **Ding** | 4.0/5: 33 ratings (Greece) | 10,000+ downloads; no public rating shown | Repeated location errors; some positive usability feedback | Moderate, but dated |
| **Meet Around** | Insufficient ratings | 100+ downloads; no public rating shown | No substantial public review sample found | Insufficient |
| **EyesTalk** | Insufficient ratings | No public rating shown | No substantial public review sample found | Insufficient |

Sources: [Anuma: App Store](https://apps.apple.com/us/app/anuma-chat-meet-people-irl/id6758104125), [Ding: App Store reviews](https://apps.apple.com/gr/app/ding-check-in-meet/id6457262207?see-all=reviews), [Meet Around: Google Play](https://play.google.com/store/apps/details?id=com.noerix.meetaround), [EyesTalk: App Store](https://apps.apple.com/us/app/eyestalk-spot-talk-vibe/id6781209791). [App Store](https://apps.apple.com/us/app/anuma-chat-meet-people-irl/id6758104125)

**Important:** App Store ratings are country-specific. Also, an absent public rating does not necessarily mean an app has zero users or zero reviews.

### 2. What people like and dislike

#### Ding: The clearest evidence of a usability problem

Ding provides the strongest usable customer-feedback sample.

**What people like**

One reviewer described a major update positively, calling the application useful. Another UK review praised the ease and fun of its original flirting experience.

These are individual opinions, not evidence of a broad positive trend.

**What people dislike**

The recurring complaint is location verification.

Several distinct reviewers reported that they could not check in despite being physically present or granting location permissions.

One January 2024 reviewer described repeated location errors that prevented them from using the app. A March 2025 reviewer said location restrictions made the application unusable.

The developer suggested checking permissions and ensuring the selected venue matched the user's physical location. [App Store](https://apps.apple.com/gr/app/ding-check-in-meet/id6457262207?platform=iphone\&see-all=reviews)

**Limitation:** These complaints predate Ding's May 2026 version 3.0. They demonstrate a historical problem, not necessarily an unresolved current bug.

**Hoolala! opportunity:** Never let inaccurate GPS make the core experience unusable.

Use a progressive check-in process: location permission where available, venue selection, QR-code verification when needed, and clear recovery instructions.

#### Anuma: Promising AI, but reliability matters

Only a small number of ratings are available.

**What people like**

An accessible review praises the ability to use different AI models while maintaining shared memory.

That is relevant to Hoolala!'s Personal Compass, although it doesn't directly validate AI-assisted social introductions.

**What people dislike**

The same reviewer describes disappearing messages and needing to repeatedly restart the application.

Anuma's developer acknowledged the reported behavior and requested further details for investigation. [App Store](https://apps.apple.com/us/app/anuma-chat-meet-people-irl/id6758104125)

**Hoolala! opportunity:** AI should improve the experience without becoming a fragile dependency.

People should always be able to create a Signal manually, even if AI personalization is unavailable.

There is currently insufficient independent review evidence to conclude whether Anuma's Nearby functionality works well for meeting people.

#### Meet Around: Interesting product, insufficient feedback

I couldn't establish meaningful positive or negative customer-review themes from its current public store listings.

However, the developer's version history mentions improvements to confusing map buttons, search and filtering controls, accessibility labels, and a photo-related crash.

These are **developer-reported changes**, not independently verified customer complaints. [App Store](https://apps.apple.com/ai/app/meet-around/id6777694218)

**Hoolala! opportunity:** Keep the first interaction extremely clear.

Users should immediately understand how to discover a Signal, respond and connect. A complicated map could create unnecessary friction.

#### EyesTalk: Too early to evaluate satisfaction

Its App Store listing does not provide enough reviews to establish an overall rating.

The developer's release history mentions improvements to sign-in, camera permissions, map performance and guest exploration.

Again, these are product updates rather than evidence of widespread customer dissatisfaction. [App Store](https://apps.apple.com/us/app/eyestalk-spot-talk-vibe/id6781209791)

**Hoolala! opportunity:** Guest exploration could be valuable.

Allow people to understand what Hoolala! offers before requiring them to complete a profile.

**Greely:** I couldn't verify a relevant app-store identity and reliable review sample, so I've excluded it rather than mixing feedback from unrelated applications.

---

### 3. What the evidence means for Hoolala!

There is one clearly recurring, verified issue: **location-based products can fail at the exact moment users want to connect.**

Other potential issues are important hypotheses, but they are not yet established by these competitors' reviews.

| Potential user frustration | Evidence | Hoolala! design response |
|---|---|---|
| Cannot check into a venue | Multiple Ding reviews | GPS + QR-code fallback |
| Messages disappear unexpectedly | One Anuma review | Reliable messaging, explicit expiry rules |
| Navigation feels confusing | Meet Around release notes | Simplified Signal discovery |
| Too many onboarding steps | Not established by reviews | Optional Discover My Compass |
| Nobody nearby is participating | Not established by reviews | Launch in concentrated communities |
| Privacy or unwanted approaches | Not established by reviews | Anonymous Signals, mutual consent, blocking |
| AI suggestions feel irrelevant | Not established by reviews | Place-aware suggestions, always optional |

The final four problems are particularly important to investigate through Hoolala!'s own user research.

### 4. Recommended product priorities

For Hoolala! v3.2, I would prioritize three experiences.

**First: Arrive without friction.** Users can open the Telegram Mini App, share their location or verify their venue, and discover Signals immediately. A failed GPS check should offer a clear alternative rather than a dead end.

**Second: Create curiosity immediately.** A user sees an interesting invitation before needing to reveal their identity. The AI may suggest a topic inspired by the location, but posting manually should remain just as easy.

**Third: Make connecting feel safe and effortless.** Responses require mutual acceptance, identity disclosure remains optional, topics are moderated, and users can leave the interaction whenever they wish.

### 5. My recommendation for the Lausanne MVP

The limited review evidence means that copying competitors' features would be risky. Instead, test the underlying assumptions directly.

Start with one coworking space and aim to recruit **15–20 opt-in participants** for a small usability experiment.

Measure whether participants can check in successfully, whether they understand Signals without explanation, whether the suggestions encourage responses, and how many accepted connections result in actual conversations.

Afterwards, ask participants what made them curious, uncomfortable or reluctant to interact.

Use three main success measures:

- **Check-in success rate:** Can users access the experience on their first attempt?
- **Signal-to-response conversion:** Do invitations generate genuine interest?
- **Real-world connection rate:** How many mutually accepted interactions result in a conversation?

The last measure should become Hoolala!'s primary product metric.

### Conclusion

**The competitor reviews don't yet establish what users love or hate about AI-powered, place-based social discovery.** Most competing products simply lack enough publicly accessible feedback.

But Ding's location complaints give Hoolala! one concrete lesson: technical friction can prevent social interaction before it even begins.

And that supports a specific direction for v3.2:

**Make it effortless to arrive, intriguing to discover, safe to respond and natural to meet.**

Hoolala!'s opportunity isn't necessarily to provide more functionality than Anuma, Ding or EyesTalk. It's to make the transition from discovering a conversation to actually talking to someone feel remarkably simple.