# ComposeNote

Leaving a note means inviting people out: pick an activity, set when and where, choose who, then review and confirm. Replies to a friend's note use the same review and confirm steps with plain text.

## Invitation (LEAVE A NOTE)

1. **WHAT SHALL WE DO?** A 2-column grid of tiles, each a 32px pixel icon plus a label: Board games (dice), Card games (cards), Grab a coffee (cup), Walk in the park (tree), Picnic (basket), Something else (?). Tiles are real buttons, 88px tall, `lcd-surface`, invert on hover.
2. **Details:** when (This evening, a named day, Next week), time, where (placeholder suggests a sensible spot), who's invited (close circle or one friend), and one line prefilled per activity that the person can edit (200 characters max). "Something else" asks for a short name for the idea.
3. **Review:** SEND THIS INVITATION? with icon, activity, day, time, place, the line and the recipients. YES, SEND IT and EDIT.
4. **Result:** INVITATION OUT. only on a backend receipt; otherwise COULDN'T SEND. TRY AGAIN?

## Reply (from a friend's note)

Labelled textarea (400 characters max), REVIEW >, then SEND THIS TO [NAME]? with the exact words.

## Rules

- No blank status box and no public posting: every note has an activity, a time and named recipients.
- Suggest simple, low-pressure activities. Anyone can answer NOT THIS TIME with no explanation.
- Empty or missing fields show an inline message, never a browser alert.
- Text only. No photo, video or link previews.
