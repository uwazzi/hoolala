// WP37 game helpers: the build-screen ticker and the try info line. Pure,
// so the tests run in node.
export const BUILD_TICK_MS = 450;
export const BUILD_LINES = 5;

export interface BuildState {
  ticked: number;
  done: boolean;
}

export function startBuild(): BuildState {
  return { ticked: 1, done: false };
}

/** One tick every 450 ms; the last line waits for the game data. */
export function buildTick(s: BuildState, hasData: boolean, reduced: boolean): BuildState {
  if (s.done) return s;
  if (reduced) return hasData ? { ticked: BUILD_LINES, done: true } : { ticked: 1, done: false };
  if (s.ticked < BUILD_LINES - 1) return { ticked: s.ticked + 1, done: false };
  return hasData ? { ticked: BUILD_LINES, done: true } : s;
}

export function peopleLine(people: string[] | null): string {
  if (people === null) return "ADDING YOUR PEOPLE...";
  return people.length > 0 ? `ADDING YOUR PEOPLE: ${people.map((p) => p.toUpperCase()).join(" · ")}` : "NO PEOPLE NAMED: TRIES SAY SOMEONE";
}

export function offTableLine(offtable: string[] | null): string {
  if (offtable === null) return "KEEPING OFF...";
  return offtable.length > 0 ? `KEEPING OFF: ${offtable.join(" · ")}` : "NOTHING OFF THE TABLE";
}

export function tryInfo(kind: string, step: number, minutes: number, whoRole: string | null, nearly = false): string {
  const head = kind === "kind" ? "KIND IT" : "SMALL TALK";
  if (nearly) return `${head} · STEP ${step} · ${minutes} MIN · FROM WHAT YOU NEARLY SAID`;
  const who = whoRole ? ` · FROM YOUR COMPASS: ${whoRole.toUpperCase()}` : "";
  return `${head} · STEP ${step} · ${minutes} MIN${who}`;
}
