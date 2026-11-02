// v6.5 poster hooks (copy from design/screens/Poster.dc.html). Data, not
// code: three ready-made hooks with fixed wrapped lines; own hooks wrap
// at print time with wrapHook().

export interface ReadyHook {
  label: string;
  lines: string[];
}

export const READY_HOOKS: ReadyHook[] = [
  { label: "Same place. Never a word.", lines: ["SAME PLACE.", "SAME FACES.", "NEVER A WORD."] },
  { label: "Someone here might be up for a chat.", lines: ["SOMEONE HERE", "MIGHT BE UP", "FOR A CHAT."] },
  { label: "What if you said hi today?", lines: ["WHAT IF YOU", "SAID HI", "TODAY?"] },
];
