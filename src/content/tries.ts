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
