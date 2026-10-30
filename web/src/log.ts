// Say-hi log: the last API outcomes in memory, sent only when the person
// taps send. Method, path and status only: never bodies, tokens or locations.
export interface LogLine {
  t: number;
  line: string;
}

const MAX = 50;
const lines: LogLine[] = [];

export function pushLog(line: string): void {
  lines.push({ t: Date.now(), line: line.slice(0, 200) });
  if (lines.length > MAX) lines.splice(0, lines.length - MAX);
}

export function takeLog(): LogLine[] {
  return [...lines];
}
