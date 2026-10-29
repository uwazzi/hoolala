// Opening hours the way OpenStreetMap writes them, parsed enough to say
// open now, opening soon, or unknown. Pure. Only the common shapes are
// understood (24/7, weekday ranges, time ranges, off days, overnight);
// anything else fails open to unknown, never to closed.

export interface OpenInfo {
  state: "open" | "closed" | "unknown";
  /** Next opening today as HH:MM, when closed now but opening later today. */
  opensAt: string | null;
  /** Today's ranges as written, when any parsed. */
  today: string | null;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function minutesOf(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

function expandDays(spec: string): number[] | null {
  const out: number[] = [];
  for (const part of spec.split(",")) {
    const p = part.trim();
    if (p.includes("-")) {
      const [a, b] = p.split("-").map((s) => s.trim());
      const from = DAYS.indexOf(a);
      const to = DAYS.indexOf(b);
      if (from < 0 || to < 0) return null;
      for (let d = from; ; d = (d + 1) % 7) {
        out.push(d);
        if (d === to) break;
      }
    } else {
      const d = DAYS.indexOf(p);
      if (d < 0) return null;
      out.push(d);
    }
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (mins: number) => `${pad(Math.floor((mins % 1440) / 60))}:${pad(mins % 60)}`;

function localNow(now: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const minutes = (Number(get("hour")) * 60 + Number(get("minute"))) % 1440;
  return { day: Math.max(0, WEEKDAY.indexOf(get("weekday"))), minutes };
}

/** A time zone from the client, or the pilot fallback when it isn't one. */
export function resolveTimeZone(tz: unknown): string {
  if (typeof tz === "string") {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: tz });
      return tz;
    } catch {
      // Fall through to the pilot fallback.
    }
  }
  return "Europe/Zurich";
}

export function openState(hours: string | null | undefined, now: Date, timeZone: string): OpenInfo {
  const none: OpenInfo = { state: "unknown", opensAt: null, today: null };
  if (!hours || !hours.trim()) return none;
  const clean = hours.replace(/"[^"]*"/g, " ").trim();
  if (/^24\s*\/\s*7$/.test(clean)) return { state: "open", opensAt: null, today: "24/7" };
  const schedule: { open: number; close: number }[][] = [[], [], [], [], [], [], []];
  const mentioned = new Set<number>();
  for (const raw of clean.split(";")) {
    const rule = raw.trim();
    if (!rule) continue;
    const m = /^([A-Za-z,\-\s]+?)\s+(.+)$/.exec(rule);
    if (!m) continue;
    const days = expandDays(m[1].replace(/\s+/g, ""));
    if (!days) continue;
    const rest = m[2].trim().toLowerCase();
    if (rest === "off") {
      days.forEach((d) => mentioned.add(d));
      continue; // Closed these days: no ranges added.
    }
    const ranges: { open: number; close: number }[] = [];
    for (const span of rest.split(",")) {
      const [a, b] = span.split("-").map((s) => s.trim());
      const open = a ? minutesOf(a) : null;
      const close = b ? minutesOf(b) : null;
      if (open === null || close === null) {
        ranges.length = 0;
        break;
      }
      ranges.push({ open, close: close <= open ? close + 1440 : close });
    }
    if (!ranges.length) continue;
    for (const d of days) {
      mentioned.add(d);
      schedule[d].push(...ranges);
    }
  }
  if (!mentioned.size) return none;
  const { day, minutes } = localNow(now, timeZone);
  const spans = [...schedule[day], ...schedule[(day + 6) % 7].filter((r) => r.close > 1440).map((r) => ({ open: r.open - 1440, close: r.close - 1440 }))];
  const todays = schedule[day].map((r) => `${fmt(r.open)}-${fmt(r.close)}`).join(", ") || null;
  const current = spans.find((r) => minutes >= r.open && minutes < r.close);
  if (current) return { state: "open", opensAt: null, today: todays };
  if (!mentioned.has(day)) return none;
  const next = schedule[day].filter((r) => r.open > minutes).sort((a, b) => a.open - b.open)[0];
  return { state: "closed", opensAt: next ? fmt(next.open) : null, today: todays };
}

/** Labeled for the card: open now, opening within the hour, or nothing said. */
export function openLabel(info: OpenInfo, now: Date, timeZone: string): string | null {
  if (info.state === "open") return "Open now";
  if (info.state === "closed" && info.opensAt) {
    const { minutes } = localNow(now, timeZone);
    const at = minutesOf(info.opensAt);
    if (at !== null && at > minutes && at - minutes <= 60) return `Opens at ${info.opensAt}`;
  }
  return null;
}
