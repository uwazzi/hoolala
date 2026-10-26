# OnboardingStage

One stage of Go App-Free (TELL IT): a short question from Muse Spark, a few choices, a free-text answer, and a way back.

- Progress: five pixel cells (`lcd-progress`), labelled "Stage N of 5". BACK on the right softkey, SKIP on optional stages, every earlier answer editable.
- The question in Space Mono at body size, from Muse Spark or the scripted fallback. Stage 1 always opens "Hello, human. Before we get acquainted, what would you like a little more of?"
- Choices as `lcd-chip` toggles (`aria-pressed`), several allowed, plus SOMETHING ELSE ENTIRELY opening a free-text field. A free-text field on every stage ("Or say it your way").
- At most one follow-up question per stage, shown as a dashed AI block (`lcd-ai`, kicker FOLLOW-UP) under the answer, with ANSWER and SKIP.
- Primary key NEXT > (on the last stage SHOW ME >). While the model works: a stepped loader and THINKING IT OVER...
- Never asks for age, screen-time estimates, or anything the stage doesn't need. No guilt or scarcity copy.
- Consumer provides: stage index, question text, choices, selected choices, free text, optional follow-up.
