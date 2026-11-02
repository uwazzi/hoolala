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

/** "15:30" from an ISO time, in the viewer's own time zone. */
export function hhmm(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
