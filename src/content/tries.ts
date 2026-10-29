// WP28: the 15-try library (copy from docs/design/v6/Flow.dc.html). Data, not
// code: 3 tries per step, one per place. TRY IT (WP29) drafts fresh tries;
// this library stays the fallback and the no-model path.

export type TryPlace = "anywhere" | "cafe" | "work";

export interface LibraryTry {
  id: string;
  step: number;
  place: TryPlace;
  title: string;
  hint: string;
  meta: string;
}

export const TRY_LIBRARY: LibraryTry[] = [
  { id: "1-anywhere", step: 1, place: "anywhere", title: "SMILE AT THREE PEOPLE.", hint: "A SMILE IS ENOUGH. A NOD COUNTS TOO.", meta: "2 MIN · NO TALKING NEEDED" },
  { id: "1-cafe", step: 1, place: "cafe", title: "NOD AT SOMEONE AT THE NEXT TABLE.", hint: "CATCH AN EYE, NOD, BACK TO YOUR COFFEE.", meta: "1 MIN · NO TALKING NEEDED" },
  { id: "1-work", step: 1, place: "work", title: "SMILE AT A COLLEAGUE YOU DON’T KNOW.", hint: "IN THE CORRIDOR OR BY THE COFFEE MACHINE.", meta: "1 MIN · NO TALKING NEEDED" },
  { id: "2-anywhere", step: 2, place: "anywhere", title: "SAY GOOD MORNING TO SOMEONE NEW.", hint: "JUST “MORNING”. THAT’S THE WHOLE SCRIPT.", meta: "1 MIN · TWO WORDS" },
  { id: "2-cafe", step: 2, place: "cafe", title: "SAY HELLO TO THE BARISTA, EYES UP.", hint: "LOOK UP FROM THE PHONE. “HI, HOW’S IT GOING?”", meta: "1 MIN · ONE LINE" },
  { id: "2-work", step: 2, place: "work", title: "SAY HELLO TO SOMEONE IN THE LIFT.", hint: "“MORNING.” THEN ENJOY THE RIDE.", meta: "1 MIN · ONE WORD" },
  { id: "3-anywhere", step: 3, place: "anywhere", title: "ASK SOMEONE FOR A LOCAL TIP.", hint: "“IS THERE A GOOD BAKERY ROUND HERE?”", meta: "3 MIN · ONE QUESTION" },
  { id: "3-cafe", step: 3, place: "cafe", title: "ASK THE BARISTA HOW THEIR DAY IS GOING.", hint: "LISTEN TO THE ANSWER. NO FOLLOW-UP NEEDED.", meta: "2 MIN · ONE QUESTION" },
  { id: "3-work", step: 3, place: "work", title: "ASK A COLLEAGUE WHAT THEY’RE WORKING ON.", hint: "“WHAT’S KEEPING YOU BUSY THIS WEEK?”", meta: "3 MIN · ONE QUESTION" },
  { id: "4-anywhere", step: 4, place: "anywhere", title: "CHAT FOR TWO MINUTES WITH A SHOPKEEPER.", hint: "ASK WHAT SELLS BEST. LET THEM TALK.", meta: "5 MIN · SHORT CHAT" },
  { id: "4-cafe", step: 4, place: "cafe", title: "ASK THE PERSON BESIDE YOU WHAT THEY’RE READING.", hint: "“IS IT GOOD? I’M LOOKING FOR MY NEXT ONE.”", meta: "5 MIN · SHORT CHAT" },
  { id: "4-work", step: 4, place: "work", title: "JOIN A CHAT AT THE COFFEE MACHINE.", hint: "STAND NEARBY, SMILE, ADD ONE THING.", meta: "5 MIN · SHORT CHAT" },
  { id: "5-anywhere", step: 5, place: "anywhere", title: "SUGGEST A COFFEE TO SOMEONE YOU’VE CHATTED WITH.", hint: "“FANCY A COFFEE SOMETIME?” A NO IS FINE.", meta: "10 MIN · AN INVITATION" },
  { id: "5-cafe", step: 5, place: "cafe", title: "INVITE SOMEONE TO SHARE YOUR TABLE.", hint: "“THIS SEAT’S FREE IF YOU NEED IT.”", meta: "10 MIN · AN INVITATION" },
  { id: "5-work", step: 5, place: "work", title: "INVITE A COLLEAGUE FOR A COFFEE BREAK.", hint: "“I’M GRABBING ONE. COMING?”", meta: "10 MIN · AN INVITATION" },
];

export const STEP_NAMES = ["Smile and nod", "Say hello", "Small question", "Short chat", "Suggest a coffee"];

export function tryById(id: string): LibraryTry | null {
  return TRY_LIBRARY.find((t) => t.id === id) ?? null;
}

/** This step's tries: the requested place first, anywhere as backup. */
export function triesFor(step: number, place: TryPlace): LibraryTry[] {
  const at = TRY_LIBRARY.filter((t) => t.step === step);
  if (place === "anywhere") return at;
  return [...at.filter((t) => t.place === place), ...at.filter((t) => t.place === "anywhere")];
}

// WP37: the 24-try game library (copy from specs/game.md). Data, not code:
// the fallback when TRY IT is off or a draft fails, and the eval reference.
// Placeholders: {p} place, {topic} topic, {rec} "favourite ..." from the
// topic, {who} a compass role phrase (or a someone when nobody fits).

export type GameLevel = "soft" | "brave" | "bold";
export type GameKind = "talk" | "kind";
export type GameWho = "none" | "any" | "close" | "service";

export interface GameLibraryTry {
  level: GameLevel;
  step: number;
  kind: GameKind;
  who: GameWho;
  template: string;
}

export const GAME_LIBRARY: GameLibraryTry[] = [
  { level: "soft", step: 1, kind: "talk", who: "none", template: "Smile and nod at three people at {p}." },
  { level: "soft", step: 2, kind: "talk", who: "any", template: "Say good morning to {who} and ask how they are." },
  { level: "soft", step: 1, kind: "kind", who: "none", template: 'Hold the door for someone at {p} and say "have a good one".' },
  { level: "soft", step: 2, kind: "kind", who: "any", template: "Thank {who} for one thing they did this week, and say what it was." },
  { level: "soft", step: 1, kind: "kind", who: "service", template: 'Tell {who} "have a good day" as you leave.' },
  { level: "soft", step: 2, kind: "talk", who: "close", template: "Ask {who} how their week is going." },
  { level: "soft", step: 2, kind: "talk", who: "none", template: "Ask someone at {p} if the seat next to them is free, then say thanks." },
  { level: "soft", step: 1, kind: "kind", who: "none", template: "Let someone go ahead of you in the queue at {p}." },
  { level: "brave", step: 3, kind: "talk", who: "none", template: "Ask someone at {p} for their {rec}." },
  { level: "brave", step: 3, kind: "talk", who: "close", template: "Ask {who} one question about their weekend, then one more." },
  { level: "brave", step: 3, kind: "kind", who: "close", template: "Offer {who} a hand with something small: carrying, finding, holding." },
  { level: "brave", step: 4, kind: "kind", who: "any", template: "Tell {who} one thing they do that makes your day easier." },
  { level: "brave", step: 4, kind: "talk", who: "any", template: "Mention {topic} to {who} and ask if they are into it too." },
  { level: "brave", step: 3, kind: "talk", who: "service", template: "Ask {who} what they would pick today, and why." },
  { level: "brave", step: 4, kind: "kind", who: "close", template: "Make {who} a drink or bring a snack from home, no reason needed." },
  { level: "brave", step: 4, kind: "kind", who: "service", template: "Tell {who} they did a great job today, out loud." },
  { level: "bold", step: 5, kind: "talk", who: "none", template: "Ask two people at {p} for their {rec}, then tell each the other's answer." },
  { level: "bold", step: 5, kind: "talk", who: "close", template: "Suggest a ten-minute {topic} break with {who} this week." },
  { level: "bold", step: 5, kind: "kind", who: "close", template: "Ask {who} if there is something you could do for them this week, and do it." },
  { level: "bold", step: 5, kind: "talk", who: "none", template: "Start a two-minute chat about {topic} at {p}, and say your name before you go." },
  { level: "bold", step: 5, kind: "kind", who: "any", template: "Leave a thank-you note for {who} where they will find it today." },
  { level: "bold", step: 5, kind: "talk", who: "none", template: "Ask at {p} if there is a group or event you could join, and go once." },
  { level: "bold", step: 5, kind: "talk", who: "any", template: "Ask {who} to show you something they are good at, and learn it for five minutes." },
  { level: "bold", step: 5, kind: "kind", who: "close", template: "Tell {who} out loud what difference they make to your week." },
];

/** When no compass role fits {who}: a someone, never a name. No FROM YOUR COMPASS label. */
export const GAME_FILL_FALLBACK: Record<string, string> = {
  any: "someone you see often",
  close: "someone you see every day",
  service: "the person serving you",
};

/** Every compass role in plain words for a try. Lowercase, so {who} fills read as typed. */
export const ROLE_PHRASE: Record<string, string> = {
  barista: "the barista",
  boss: "your boss",
  brother: "your brother",
  child: "your child",
  colleague: "a colleague",
  dad: "your dad",
  friend: "a friend",
  mum: "your mum",
  neighbour: "your neighbour",
  regular: "a regular",
  sister: "your sister",
  teammate: "a teammate",
};
