# FriendNote

One consented note from a friend, shown alone inside a catch-up of at most three.

- Paper block: sender and day in Silkscreen, a dashed rule, then the note in Space Mono exactly as written (never uppercased or rewritten).
- Progress: three pixel cells, filled up to the current note. Labelled "Note N of M".
- Actions: REPLY (secondary) and NEXT NOTE > (primary); on the last note the primary reads FINISH >.
- An AI summary, if shown, sits in its own block with a `SUMMARY` kicker and never replaces the original.
- Consumer provides: sender name (from permitted backend data), relative day, text, index and total.
