// WP32 Around me (v6.1): the radar panel sits at the top from the start,
// idle until ONE LOOK AROUND runs the scan in place. Cards by fit with why
// go, the talking meter, today's read and a tiny try. The borrowed point
// lives in memory only and is dropped after check-in.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { Radar } from "../components/Radar";
import { Screen } from "../components/Screen";
import { Typed } from "../components/Typed";

interface Read { items: string[]; hours: string | null; kind: string; source: string }
interface Talking { level: 1 | 2 | 3 | 4 | 5; word: string }
interface Place {
  id: string; name: string; kind: string; source: "hoolala" | "osm" | "google"; external?: { provider: "osm" | "google"; id: string };
  distance_m: number; bearing: number; lat: number; lng: number;
  fit: "GOOD" | "OK" | "LOW"; talking: Talking | null;
  why: string; tiny_try: string; workings: string; facts: string[]; visits: number; here_now: number;
  open: { label: string | null };
  contact: { hours: string | null; phone: string | null; website: string | null; website_label: string | null };
  read: Read | null;
}
interface Point { lat: number; lng: number }
interface CompassLine { id: string; text: string }

type Phase = "ask" | "signed-out" | "refused" | "scanning" | "done";

const RADII = [500, 1000, 2000];
const FIT_BADGE: Record<Place["fit"], string> = { GOOD: "GOOD FIT", OK: "OK FIT", LOW: "LOW FIT" };
const KIND: Record<string, string> = { cafe: "CAFÉ", bar: "BAR · 18+", coworking: "COWORKING", library: "LIBRARY", food: "FOOD", shop: "SHOPS", outdoors: "OUTDOORS", culture: "CULTURE", sport: "SPORT", other: "PLACE" };
const READ_TITLE: Record<string, string> = { menu: "TODAY, FROM THEIR WEBSITE", event: "LATEST, FROM THEIR PAGE", hours: "OPENING HOURS" };

const radiusLabel = (m: number) => (m >= 1000 ? `${m / 1000} KM` : `${m} M`);
const metres = (m: number) => (m < 1000 ? `${m} M` : `${(m / 1000).toFixed(1)} KM`);
const walk = (m: number) => Math.max(1, Math.round(m / 80));
const visitsLine = (n: number) => `${n} Hoolala! visit${n === 1 ? "" : "s"}`;

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
  const [phase, setPhase] = useState<Phase>("ask");
  const [places, setPlaces] = useState<Place[]>([]);
  const [widen, setWiden] = useState(0);
  const [spot, setSpot] = useState<Point | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [compass, setCompass] = useState<CompassLine[] | null>(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    api<{ compass: CompassLine[] }>("GET", "/api/me/compass")
      .then((res) => {
        if (res.status === 401) return setPhase("signed-out");
        if (res.status === 200) setCompass(res.data.compass);
      })
      .catch(() => {
        // Offline: the compass box stays hidden, the scan still works.
      });
  }, []);

  const radiusM = RADII[widen];
  const next = widen < 2 ? widen + 1 : null;

  function status(): string {
    const label = radiusLabel(radiusM).toLowerCase();
    if (phase === "scanning") return `Scanning ${label} around you…`;
    if (!places.length) return `Quiet within ${label}. Want me to look a bit further?`;
    const good = places.filter((p) => p.fit === "GOOD").length;
    const n = `${places.length} place${places.length === 1 ? "" : "s"}`;
    return good ? `${n} within ${label}. ${good} fit you well. Tap one to see why.` : `${n} within ${label}. Nothing fits you well yet. Look a bit further?`;
  }

  async function scan(atWiden: number) {
    setPhase("scanning");
    setReady(false);
    setOpen(null);
    setNote("");
    let p = spot;
    if (!p) {
      try {
        p = await locate();
      } catch {
        return setPhase("refused");
      }
      setSpot(p);
    }
    let res;
    try {
      res = await api<{ places: Place[] }>("POST", "/api/around/scan", {
        ...p,
        consent: true,
        widen: atWiden,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch {
      setPhase("ask");
      return setNote("No connection. Try again when you're back online.");
    }
    if (res.status === 401) return setPhase("signed-out");
    if (res.status !== 200) {
      setPhase("ask");
      setSpot(null);
      return setNote(res.data.error === "rate_limited" ? "That's enough looking for one hour. Subscribe to Pro for more scans." : "Something went wrong. Try again.");
    }
    setWiden(atWiden);
    setPlaces(res.data.places);
    setOpen(res.data.places[0]?.id ?? null);
    setPhase("done");
  }

  async function checkin(place: Place) {
    if (!spot) return;
    setNote("Checking you in...");
    const body = place.external ? { external: place.external, ...spot } : { placeId: place.id, ...spot };
    let res;
    try {
      res = await api("POST", "/api/checkin", body);
    } catch {
      setSpot(null);
      return setNote("No connection. Try again when you're back online.");
    }
    setSpot(null); // The borrowed point is dropped, whatever happens next.
    if (res.status === 200) return route("/here");
    setNote(res.status === 401 ? "Sign in first, then check in." : "Check-in didn't work. You may be too far from the door.");
  }

  const pins = phase === "scanning" ? [] : places.map((p, i) => ({ id: p.id, n: i + 1, name: p.name, distance_m: p.distance_m, bearing: p.bearing, fit: p.fit }));
  const compassTop = (compass ?? []).slice(0, 4).map((l) => l.text).join(" · ");

  const statusNote = note ? <p class="lcd-small" role="status" aria-live="polite">{note}</p> : null;

  return (
    <Screen title="Around">
      <div class="around">
      <Radar pins={pins} radiusM={radiusM} scanning={phase === "scanning"} openId={open} onPick={(id) => setOpen(open === id ? null : id)} />

      {phase === "signed-out" && (
        <div class="around-body">
          <p class="lcd-block">Sign in first, then take a look around.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
        </div>
      )}

      {phase === "ask" && (
        <>
          <div class="around-body">
            <h1 class="around-head">AROUND YOU</h1>
            <p class="around-promise">Places within a short walk that fit you, and how easy it is to talk to people there.</p>
            {compass !== null && (
              compass.length === 0 ? (
                <a class="compass-box" href="/surprise">
                  <span class="compass-box-text"><span class="compass-box-label">YOUR COMPASS IS EMPTY</span><span>Results are general for now. Set it up in a minute.</span></span>
                  <span class="compass-box-go">SET IT UP</span>
                </a>
              ) : (
                <a class="compass-box" href="/compass">
                  <span class="compass-box-text"><span class="compass-box-label">MATCHED TO YOUR COMPASS</span><span>{compassTop}</span></span>
                  <span class="compass-box-go">EDIT</span>
                </a>
              )
            )}
            <p class="around-privacy">Borrow your location for one look around. Used once, never stored, never on any map.</p>
            {statusNote}
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" onClick={() => scan(0)}><span>ONE LOOK AROUND</span><span aria-hidden="true">&gt;</span></button>
            <a class="thumb-link" href="/arrive">SKIP, CHECK IN BY NAME</a>
          </div>
        </>
      )}

      {phase === "refused" && (
        <>
          <div class="around-body">
            <h1 class="around-head">NO LOCATION, NO PROBLEM.</h1>
            <p class="around-promise">Tell me where you are instead, or try again if you tapped no by accident.</p>
            {statusNote}
          </div>
          <div class="thumb-zone">
            <a class="thumb-key" href="/arrive"><span>CHECK IN BY NAME</span><span aria-hidden="true">&gt;</span></a>
            <button class="thumb-link" type="button" onClick={() => scan(0)}>TRY AGAIN</button>
          </div>
        </>
      )}

      {(phase === "scanning" || phase === "done") && (
        <div class="around-body">
          <div class="chip-row" role="group" aria-label="Radius">
            {RADII.map((r, i) => (
              <button key={r} type="button" class={`chip${i === widen ? " on" : ""}`} onClick={() => scan(i)} disabled={phase === "scanning"}>
                {radiusLabel(r)}
              </button>
            ))}
          </div>
          <p class="around-status" role="status"><Typed text={status()} onDone={() => setReady(true)} /></p>
          {phase === "done" && ready && (
            <div class="keys-rise cards">
              {places.map((p, i) => {
                const isOpen = open === p.id;
                return (
                  <article key={p.id} class={`card fit-${p.fit.toLowerCase()}${isOpen ? " open" : ""}`}>
                    <button type="button" class="card-head" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                      <span class="card-n" aria-hidden="true">{i + 1}</span>
                      <span class="card-main">
                        <span class="card-title-row"><span class="card-name">{p.name}</span><span class={`fit-badge fit-${p.fit.toLowerCase()}`}>{FIT_BADGE[p.fit]}</span></span>
                        <span class="card-meta">{KIND[p.kind] ?? "PLACE"} · {metres(p.distance_m)} · {walk(p.distance_m)} MIN WALK{p.open.label ? ` · ${p.open.label.toUpperCase()}` : ""}{p.source !== "hoolala" ? ` > ${p.source === "osm" ? "openstreetmap" : "google maps"}` : ""}</span>
                        <span class="card-why"><b>Why go:</b> {p.why}</span>
                        <span class="meter-row">
                          <span class="meter-label">TALKING HERE</span>
                          <span class="meter-bars" aria-hidden="true">{[1, 2, 3, 4, 5].map((b) => <span key={b} class={`meter-bar${p.talking && b <= p.talking.level ? " on" : ""}`} />)}</span>
                          <span class="meter-word">{p.talking ? p.talking.word : "not enough ratings yet"}</span>
                        </span>
                        <span class="card-verified">
                          {p.talking ? `✓ Checked by ${visitsLine(p.visits)}. Ratings are about the place, never people.` : p.visits > 0 ? `Only ${visitsLine(p.visits)} so far. Rate it when you go.` : "No Hoolala! visits yet. Rate it when you go."}
                        </span>
                      </span>
                    </button>
                    {isOpen && (
                      <div class="card-open">
                        {p.here_now > 0 && (
                          <a class="now-line" href="/here"><span>{p.here_now} {p.here_now === 1 ? "PERSON" : "PEOPLE"} HERE WOULD LIKE TO TALK</span><span aria-hidden="true">&gt;</span></a>
                        )}
                        {p.read ? (
                          <div class="card-info">
                            <span class="card-info-title">{READ_TITLE[p.read.kind] ?? "TODAY, FROM THEIR WEBSITE"}</span>
                            <span>{[...p.read.items, p.read.hours].filter(Boolean).join(". ")}</span>
                            <span class="card-source">Source: {p.read.source}, read today.</span>
                          </div>
                        ) : p.facts.length > 0 && (
                          <div class="card-info">
                            <span class="card-info-title">WHAT PEOPLE SAY</span>
                            <span>{p.facts.slice(0, 3).join(". ")}</span>
                          </div>
                        )}
                        <div class="card-info">
                          <span class="card-info-title">TINY TRY THERE</span>
                          <span>{p.tiny_try}</span>
                        </div>
                        {(p.contact.hours || p.contact.phone || p.contact.website) && (
                          <div class="card-info">
                            <span class="card-info-title">GOOD TO KNOW</span>
                            {p.contact.hours && <span>{p.contact.hours}</span>}
                            {p.contact.phone && <a href={`tel:${p.contact.phone.replace(/\s+/g, "")}`}>{p.contact.phone}</a>}
                            {p.contact.website && <a href={p.contact.website} target="_blank" rel="noreferrer">{p.contact.website_label ?? p.contact.website}</a>}
                          </div>
                        )}
                        <p class="card-workings">{p.workings}</p>
                        <div class="card-keys">
                          <a class="lcd-key lcd-key--primary" href={`https://www.openstreetmap.org/directions?to=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">TAKE ME THERE</a>
                          <button class="lcd-key" type="button" onClick={() => checkin(p)}>I'M HERE</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {next !== null && (
                <div class="widen">
                  <span class="widen-label">NOTHING GRABS YOU?</span>
                  <button type="button" class="widen-key" onClick={() => scan(next)}><span>LOOK UP TO {radiusLabel(RADII[next])}</span><span aria-hidden="true">&gt;</span></button>
                </div>
              )}
            </div>
          )}
          {statusNote}
        </div>
      )}
      </div>
    </Screen>
  );
}
