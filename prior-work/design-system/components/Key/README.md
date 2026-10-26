# Key

A full-width, squared key for the one main action on a screen, with a lighter secondary key below it when needed.

- `.lcd-key--primary`: `lcd-selected` fill, `lcd-selected-ink` text. One per screen.
- `.lcd-key`: `lcd-surface` fill. The single alternative (EDIT, ANOTHER IDEA).
- Silkscreen 14px uppercase, 44px minimum, 2px border, 2px corners. A trailing `>` means "goes somewhere".
- Press: a 120ms stepped inversion to `lcd-sunken`. No smooth transitions.
- Labels are short and human: `CATCH ME UP >`, `I'M IN`, `YES, SEND IT`, `GO LIVE >`. Avoid SUBMIT.
- Use `<button>` for actions, `<a href>` for navigation.
