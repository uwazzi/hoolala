# Decisions · HOOLALA v6.6

Owner: Huguinho. Accepted 3 November 2026.

## Accepted
- The landing for signed-out visitors replaces the six tap-through intro slides at `/`. The aim is that a visitor understands why Hoolala! exists, what it does and how, quickly and without tapping.
- Sleek over complete: four parts only (hero, WHY GO?, HOW IT WORKS, close). Lots of space, a few words per block. The owner asked for less cognitive load.
- Mobile first. Most visitors arrive from the poster QR on a phone. The phone design is the primary artboard.
- The analog Mono LCD look stays: green screen, Silkscreen and Space Mono, inverted bars, pixel drawings.
- The hero headline types and rotates, like the app's typed prompts, through four more hopeful lines (copy in the spec).
- The plant is the app's own `Plant` component (`web/src/components/Plant.tsx`), with its colours, flowers and pop. It is not a new drawing, and the build must reuse the component, not copy it.
- The story keeps all four beats visible at once, each in its own visible square. Each square replays its animation in turn on a loop, with four progress squares showing how the story flows.
- Story headlines and sources come from `web/src/story.ts`, so they always match the in-app story. Beat 3 reads ONE HELLO. A LIFT FOR HOURS.
- SIGN IN moves to a quiet header link. LET'S GO appears twice (hero and close) and goes to `/signin`, as the guest story does today.
- The poster link and the "Muse Spark by Meta" credit sit in the footer.

## Rejected (do not reintroduce)
- Tap-through slides with NEXT and SKIP for signed-out visitors.
- A SIGN IN key on every screen of the story.
- A first draft with seven sections: in-page navigation, a sample Today card, an interactive SOFT / BRAVE / BOLD try, a dashed "AI / how tries are made" block, four steps and a places section. The owner found it overloaded.
- A play-once story triggered on scroll. It was invisible in practice; replaced by the loop.
- A custom one-bit plant drawing, and decorative flowers that the app's plant does not have.
- Sources not used by the app (Boothby 2018, Sandstrom & Dunn 2014, Curry 2018) and the headline "ONE HELLO. A BETTER DAY."

## Rule changes
- `docs/DESIGN.md` says "no autoplay" for motion. The owner approved looping, stepped motion on this marketing page, for the headline, the plant and the story. Conditions: it stays stepped, never plays sound, pauses when the tab is hidden, and stops completely under `prefers-reduced-motion`. This is a landing-page exception only; in-app screens keep the existing rule.
