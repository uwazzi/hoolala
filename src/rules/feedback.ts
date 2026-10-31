// Say-hi feedback rules. Pure: caps and shapes only.

export const MAX_MESSAGE = 500;
export const MAX_SCREEN = 64;
export const MAX_LOG = 50;
export const MAX_LOG_LINE = 200;

export interface LogEntry {
  t: number;
  line: string;
}

/** The last entries, short lines only; anything malformed is dropped. */
export function cleanLog(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LogEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const { t, line } = e as { t?: unknown; line?: unknown };
    if (typeof t !== "number" || typeof line !== "string" || !line) continue;
    out.push({ t, line: line.slice(0, MAX_LOG_LINE) });
  }
  return out.slice(-MAX_LOG);
}
