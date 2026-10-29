// WP32 Around me: borrow the location for one look, list what is near with
// a fit, a talking label and a why, read today's menu, check in. The point
// lives in memory only and is dropped after check-in.
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { Radar } from "../components/Radar";
import { Screen } from "../components/Screen";

interface Read { items: string[]; hours: string | null; kind: string; source: string }
interface Place {
  id: string; name: string; kind: string; distance_m: number; bearing: number;
  fit: "GOOD" | "OK" | "LOW"; talking: "QUIET" | "CHATTY" | "LIVELY" | null;
  why: string; why_source: "why_go" | "template"; facts: string[]; visits: number; read: Read | null;
}
interface Point { lat: number; lng: number }

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const FIT: Record<Place["fit"], string> = { GOOD: "Fits you", OK: "Worth a look", LOW: "Off your compass" };
const TALKING: Record<NonNullable<Place["talking"]>, string> = { QUIET: "Quiet", CHATTY: "Chatty", LIVELY: "Lively" };
const RADII = [500, 1000, 2000];

const point = (bearing: number) => COMPASS[Math.round(bearing / 45) % 8];
const metres = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

function locate(): Promise<Point> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unavailable"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

export function Around() {
  const { route } = useLocation();
  const [step, setStep] = useState<"ask" | "signed-out" | "scanning" | "list">("ask");
  const [places, setPlaces] = useState<Place[]>([]);
  const [widen, setWiden] = useState(0);
  const [spot, setSpot] = useState<Point | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function scan(atWiden: number) {
    setStep("scanning");
    setNote("");
    let p = spot;
    if (!p) {
      try {
        p = await locate();
      } catch {
        setStep("ask");
        return setNote("Location is off or unavailable. Around needs one look to work.");
      }
      setSpot(p);
    }
    const res = await api<{ places: Place[] }>("POST", "/api/around/scan", { ...p, consent: true, widen: atWiden });
    if (res.status === 401) return setStep("signed-out");
    if (res.status !== 200) {
      setStep("ask");
      setSpot(null);
      return setNote(res.data.error === "rate_limited" ? "That's enough looking for one hour. Go and see one of them?" : "Something went wrong. Try again.");
    }
    setWiden(atWiden);
    setPlaces(res.data.places);
    setStep("list");
  }

  async function checkin(place: Place) {
    if (!spot) return;
    setNote("Checking you in...");
    const res = await api("POST", "/api/checkin", { placeId: place.id, ...spot });
    setSpot(null); // The borrowed point is dropped, whatever happens next.
    if (res.status === 200) return route("/here");
    setNote(res.status === 401 ? "Sign in first, then check in." : "Check-in didn't work. You may be too far from the door.");
  }

  const detail = places.find((p) => p.id === open) ?? null;

  return (
    <Screen title="Around" tab="around">
      <h1 class="screen-title">Around you</h1>

      {step === "signed-out" && (
        <>
          <p class="lcd-block">Sign in first, then take a look around.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
        </>
      )}

      {step === "ask" && (
        <>
          <p class="lcd-block">Borrow your location for one look around. Used once, never stored, never on any map.</p>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => scan(0)}>One look around</button></li>
            <li><a class="lcd-key" href="/arrive">Skip, check in by name</a></li>
          </ul>
        </>
      )}

      {step === "scanning" && <p class="lcd-kicker" role="status">Looking around...</p>}

      {step === "list" && !detail && (
        <>
          <p class="lcd-kicker">Within {metres(RADII[widen])}</p>
          {places.length === 0 && (
            <p class="lcd-block">Nothing we know of this close. {widen < 2 ? "Look a little further, or add the place you are in." : "Add the place you are in?"}</p>
          )}
          {places.length > 0 && <Radar pins={places} radiusM={RADII[widen]} onPick={setOpen} />}
          <ul class="lcd-menu">
            {places.map((p, i) => (
              <li key={p.id}>
                <button class="lcd-option" type="button" onClick={() => setOpen(p.id)}>
                  <span class="option-text">
                    <span>{i + 1}. {p.name}</span>
                    <span class="option-meta">{metres(p.distance_m)} {point(p.bearing)} · {FIT[p.fit]}{p.talking ? ` · ${TALKING[p.talking]}` : ""}</span>
                    <span class="option-meta">{p.why}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <ul class="key-list">
            {widen < 2 && <li><button class="lcd-key" type="button" onClick={() => scan(widen + 1)}>Look further ({metres(RADII[widen + 1])})</button></li>}
            <li><a class="lcd-key" href="/arrive">Add the place I'm in</a></li>
          </ul>
        </>
      )}

      {step === "list" && detail && (
        <>
          <div class="lcd-block">
            <p class="lcd-kicker">{detail.name}</p>
            <p>{metres(detail.distance_m)} {point(detail.bearing)} · {FIT[detail.fit]}</p>
            {detail.talking && <p>Talking here: {TALKING[detail.talking].toLowerCase()}.</p>}
            <p>{detail.why}</p>
            {detail.why_source === "why_go" && <p class="lcd-small">An AI line, from what we know of this place.</p>}
          </div>
          {detail.read && (
            <div class="lcd-block">
              <p class="lcd-kicker">Today</p>
              <ul>{detail.read.items.map((i) => <li key={i}>{i}</li>)}</ul>
              {detail.read.hours && <p>{detail.read.hours}</p>}
              <p class="lcd-small">Read off {detail.read.source}, just now.</p>
            </div>
          )}
          {detail.facts.length > 0 && (
            <div class="lcd-block">
              <p class="lcd-kicker">What people say</p>
              <ul>{detail.facts.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
          {detail.visits > 0 && <p class="lcd-small">{detail.visits} Hoolala! visits lately.</p>}
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => checkin(detail)}>Check in here</button></li>
            <li><button class="lcd-key" type="button" onClick={() => setOpen(null)}>Back to the list</button></li>
          </ul>
        </>
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
