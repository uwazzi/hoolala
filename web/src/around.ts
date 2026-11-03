// v6.4 Around helpers: one geolocation look per tap, HH:MM end times.
// The borrowed point lives in memory only and is dropped after the scan.

export interface Point {
  lat: number;
  lng: number;
}

/** Exactly one geolocation request. Rejects when unavailable or refused. */
export function locate(): Promise<Point> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unavailable"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

/** Why a locate() call failed. Denied means the browser remembers the no. */
export type LocateReason = "denied" | "unavailable" | "timeout" | "unsupported";

export function locateReason(err: unknown): LocateReason {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  if (code === 3) return "timeout";
  return "unsupported";
}

/** One line for small notes where location was blocked in the browser. */
export const LOCATION_BLOCKED_NOTE = "Location is blocked in your browser. Allow it in the site settings, then try again.";

/** "15:30" from an ISO time, in the viewer's own time zone. */
export function hhmm(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
