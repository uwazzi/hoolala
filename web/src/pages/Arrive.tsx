// WP20 ARRIVE: share location, pick the place, add it, or search by name.
// Never a dead end. No AI. Coordinates stay in memory for this screen only.
import { useEffect, useState } from "preact/hooks";
import { CITIES } from "../../../src/rules/checkin";
import type { CheckinView, NearbyPlace, PlaceKind, PlaceSummary } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";

type Step = "loading" | "signed-out" | "ask" | "locating" | "pick" | "add" | "search" | "checking" | "here";
type Point = { lat: number; lng: number };

const KINDS: { id: PlaceKind; label: string }[] = [
  { id: "cafe", label: "Café" },
  { id: "bar", label: "Bar" },
  { id: "coworking", label: "Coworking" },
  { id: "library", label: "Library" },
  { id: "other", label: "Other" },
];

const ERRORS: Record<string, string> = {
  too_far: "That place is a bit far from you. Pick one nearby, or search instead.",
  not_found: "We couldn't find that place. Pick another, or search instead.",
  out_of_city: "That place is in another town. Check the town and search again.",
  bad_city: "Type the town or village you're in.",
  name_home: "Public places only. Homes stay private.",
  name_address: "Give the place's name, not its address.",
  name_contact: "Just the name, no links, emails or numbers.",
  name_length: "A name between 2 and 60 characters, please.",
  bad_kind: "Pick what kind of place it is.",
  too_many: "That's a lot of tries. Wait a few minutes, then try again.",
  wrong_code: "That code doesn't match a place. Check the poster.",
  bad_key: "That poster link doesn't work. Try sharing your location.",
};

const LAKE = "Your phone thinks you're in the lake. Search for the place instead.";
const CITY_KEY = "hoolala.city";

function until(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** The last town this phone used; empty the first time, never assumed. */
function savedCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveCity(city: string) {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    // Private windows: the default city is fine.
  }
}

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

export function Arrive() {
  const [step, setStep] = useState<Step>("loading");
  const [note, setNote] = useState("");
  const [here, setHere] = useState<CheckinView | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PlaceKind | "">("");
  const [city, setCity] = useState(savedCity());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSummary[] | null>(null);

  function go(next: Step, message = "") {
    setStep(next);
    setNote(message);
  }

  function failed(error?: string, fallback = "Something went wrong. Try again.") {
    setNote((error && ERRORS[error]) || fallback);
  }

  useEffect(() => {
    api<{ checkin: CheckinView | null }>("GET", "/api/checkin").then((res) => {
      if (res.status === 401) return go("signed-out");
      if (res.data.checkin) {
        setHere(res.data.checkin);
        return go("here");
      }
      go("ask");
    });
  }, []);

  async function done(res: { status: number; data: { checkin?: CheckinView; error?: string } }, back: Step, message = "") {
    if (res.status === 200 && res.data.checkin) {
      setHere(res.data.checkin);
      setPoint(null); // Coordinates are not kept once checked in.
      return go("here", message);
    }
    go(back);
    failed(res.data.error);
  }

  async function shareLocation() {
    go("locating");
    let p: Point;
    try {
      p = await locate();
    } catch {
      return go("search", "Location is off or unavailable. Search for the place instead.");
    }
    setPoint(p);
    const res = await api<{ places: NearbyPlace[]; city: string | null }>("POST", "/api/places/nearby", p);
    if (res.status !== 200) {
      go("ask");
      return failed(res.data.error);
    }
    if (res.data.city) {
      setCity(res.data.city);
      saveCity(res.data.city);
    }
    setNearby(res.data.places);
    if (!res.data.city && !res.data.places.length) return go("search", LAKE);
    go("pick", res.data.places.length ? "" : "Nothing we know of within about 150 m. Add it, or search instead.");
  }

  async function pick(place: NearbyPlace) {
    if (!point) return go("ask");
    go("checking");
    const body = "id" in place.ref ? { placeId: place.ref.id, ...point } : { external: { provider: place.ref.provider, id: place.ref.externalId }, ...point };
    done(await api("POST", "/api/checkin", body), "pick");
  }

  async function addPlace(event: Event) {
    event.preventDefault();
    if (!point) return go("ask");
    if (!kind) return failed("bad_kind");
    go("checking");
    done(
      await api("POST", "/api/places", { name, kind, ...point }),
      "add",
      "Place added. Points arrive when someone else checks in. Bring a friend?",
    );
  }

  async function search(event: Event) {
    event.preventDefault();
    saveCity(city);
    const res = await api<{ places: PlaceSummary[] }>("GET", `/api/places/search?city=${encodeURIComponent(city)}&q=${encodeURIComponent(query)}`);
    if (res.status !== 200) return failed(res.data.error === "bad_query" ? undefined : res.data.error, "Type at least two letters of the place's name.");
    setResults(res.data.places);
    setNote(res.data.places.length ? "" : "No place by that name here yet. Share your location to add it.");
  }

  async function pickSearched(place: PlaceSummary) {
    go("checking");
    done(await api("POST", "/api/checkin", { method: "search", placeId: place.id, city }), "search");
  }

  async function leave() {
    await api("POST", "/api/checkin/leave");
    setHere(null);
    go("ask", "You've left. See you next time.");
  }

  const searchLink = (
    <li><button class="lcd-key" type="button" onClick={() => go("search")}>Search instead</button></li>
  );

  return (
    <Screen title={step === "here" ? "Here" : "Where are you?"}>
      <h1 class="screen-title">{step === "here" ? "Here" : "Where are you?"}</h1>

      {step === "signed-out" && (
        <>
          <p class="lcd-block">Sign in first, then tell us where you are.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
        </>
      )}

      {step === "ask" && (
        <>
          <p class="lcd-block">Only to find the place you're in. We use your location once and forget it.</p>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={shareLocation}>Share location</button></li>
            {searchLink}
          </ul>
        </>
      )}

      {(step === "loading" || step === "locating" || step === "checking") && (
        <p class="lcd-kicker" role="status">
          {step === "locating" ? "Looking nearby..." : step === "checking" ? "Checking you in..." : "Loading..."}
        </p>
      )}

      {step === "pick" && (
        <>
          {nearby.length > 0 && (
            <ul class="lcd-menu">
              {nearby.map((place) => (
                <li key={"id" in place.ref ? place.ref.id : place.ref.externalId}>
                  <button class="lcd-option" type="button" onClick={() => pick(place)}>
                    <span class="option-text">
                      <span>{place.name}</span>
                      <span class="option-meta">
                        {KINDS.find((k) => k.id === place.kind)?.label} · {place.band === "here" ? "Here" : "Next door"}
                        {place.source === "osm" && " > openstreetmap"}
                        {place.source === "google" && " > google maps"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul class="key-list">
            <li><button class="lcd-key" type="button" onClick={() => go("add")}>Not on the list? Add this place</button></li>
            {searchLink}
          </ul>
        </>
      )}

      {step === "add" && (
        <form onSubmit={addPlace} noValidate>
          <label class="lcd-label" for="place-name">What's it called?</label>
          <input class="lcd-field" id="place-name" type="text" maxLength={60} required value={name}
            onInput={(e) => setName(e.currentTarget.value)} />
          <fieldset class="chips">
            <legend class="lcd-label">What kind of place?</legend>
            {KINDS.map((k) => (
              <label class="chip" key={k.id}>
                <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} />
                <span>{k.label}</span>
              </label>
            ))}
          </fieldset>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="submit">Add it</button></li>
            <li><button class="lcd-key" type="button" onClick={() => go(nearby.length ? "pick" : "ask")}>Back to the list</button></li>
          </ul>
          <p class="lcd-small">Public places only. It's saved where you are now, so add it while you're there.</p>
        </form>
      )}

      {step === "search" && (
        <>
          <form onSubmit={search} noValidate>
            <label class="lcd-label" for="city">Town or village</label>
            <input class="lcd-field" id="city" list="known-cities" autocomplete="address-level2" maxLength={60} required
              value={city} onInput={(e) => setCity(e.currentTarget.value)} placeholder="Lausanne, Pully, Échallens..." />
            <datalist id="known-cities">
              {CITIES.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
            <label class="lcd-label" for="place-query">The place's name</label>
            <input class="lcd-field" id="place-query" type="search" maxLength={40} required value={query}
              onInput={(e) => setQuery(e.currentTarget.value)} />
            <ul class="key-list">
              <li><button class="lcd-key lcd-key--primary" type="submit">Search</button></li>
              <li><button class="lcd-key" type="button" onClick={shareLocation}>Try location again</button></li>
            </ul>
          </form>
          {results && results.length > 0 && (
            <ul class="lcd-menu">
              {results.map((place) => (
                <li key={place.id}>
                  <button class="lcd-option" type="button" onClick={() => pickSearched(place)}>
                    <span class="option-text">
                      <span>{place.name}</span>
                      <span class="option-meta">{KINDS.find((k) => k.id === place.kind)?.label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {step === "here" && here && (
        <>
          <div class="lcd-block">
            <p class="lcd-kicker">{here.place.name}</p>
            <p>Here until {until(here.endsAt)}.</p>
          </div>
          <ul class="key-list">
            <li><a class="lcd-key lcd-key--primary" href="/here">What's here?</a></li>
            <li><button class="lcd-key" type="button" onClick={leave}>I'm leaving</button></li>
          </ul>
        </>
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}

