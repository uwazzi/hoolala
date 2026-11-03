// Poster QR onboarding: a camera scan of the generic coffee-machine poster
// counts the scan in its GPS zone, then runs the fast onboarding (email
// link and 18+, first name) and ends on a choice: look around for open
// rooms, or post an icebreaker. Counting never blocks or identifies
// anyone; denied GPS still onboards.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { locate } from "../around";
import { Screen } from "../components/Screen";

type LandingPhase = "working" | "landing" | "check" | "sent";

export function PosterLanding() {
  const { query, route } = useLocation();
  const [phase, setPhase] = useState<LandingPhase>("working");
  const place = typeof query.place === "string" ? query.place.slice(0, 40) : "";
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await api("POST", "/api/posters/scan", await locate());
      } catch {
        try {
          await api("POST", "/api/posters/scan", {});
        } catch {
          // Counting never blocks onboarding.
        }
      }
    })();
    try {
      if (place) sessionStorage.setItem("poster-place", place);
    } catch {
      // Private mode: the place prefill is skipped, onboarding continues.
    }
    api<{ firstName: string | null }>("GET", "/api/me")
      .then((res) => {
        if (res.status !== 200) return setPhase("landing");
        route("/p/claim");
      })
      .catch(() => setPhase("landing"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendLink() {
    if (busy) return;
    if (!adult) return setNote("Please confirm you are 18 or over first.");
    setBusy(true);
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/posters/start", { email: email.trim(), adult });
    } catch {
      setBusy(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    if (res.status === 400) return setNote("That email doesn't look right. Try again?");
    if (res.status !== 200) return setNote("Something went wrong. Try again.");
    setPhase("sent");
  }

  return (
    <Screen title="Hoolala! poster">
      {phase === "working" && (
        <div class="around-body">
          <p class="around-status">OPENING HOOLALA!...</p>
        </div>
      )}

      {phase === "landing" && (
        <>
          <div class="around-body">
            <span class="table-kicker">HOOLALA! POSTER</span>
            <h1 class="around-head">TALK TO A HUMAN HERE.</h1>
            <p class="around-promise">You just scanned a Hoolala! poster at this place. Join in 30 seconds, then look around or post one line.</p>
            <p class="around-privacy">Not a dating app. First names only. Your exact spot is never stored.</p>
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" onClick={() => setPhase("check")}><span>JOIN IN 30 SECONDS</span><span aria-hidden="true">&gt;</span></button>
          </div>
        </>
      )}

      {phase === "check" && (
        <>
          <div class="around-body">
            <h1 class="around-head">CHECK YOUR EMAIL</h1>
            <label class="field-label" for="poster-email">EMAIL</label>
            <input
              id="poster-email"
              class="lcd-field"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />
            <label class="check-row">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult((e.target as HTMLInputElement).checked)} />
              <span>I am 18 or over.</span>
            </label>
            {note && <p class="lcd-small" role="status">{note}</p>}
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" disabled={busy || !email.trim()} onClick={sendLink}>
              <span>SEND MY LINK</span><span aria-hidden="true">&gt;</span>
            </button>
          </div>
        </>
      )}

      {phase === "sent" && (
        <div class="around-body">
          <h1 class="around-head">CHECK YOUR EMAIL</h1>
          <p class="around-promise">Tap the link we sent. It brings you back to look around or post your icebreaker.</p>
        </div>
      )}
    </Screen>
  );
}

type ClaimPhase = "loading" | "name" | "joining" | "signin" | "choice";

export function PosterClaim() {
  const [phase, setPhase] = useState<ClaimPhase>("loading");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [postUrl, setPostUrl] = useState("/around/new");

  async function claim(firstName?: string) {
    setPhase("joining");
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/posters/claim", firstName === undefined ? {} : { firstName });
    } catch {
      setPhase("name");
      return setNote("No connection. Try again when you're back online.");
    }
    if (res.status === 401) return setPhase("signin");
    if (res.status === 422) {
      setPhase("name");
      return setNote(String((res.data as { message?: string }).message ?? "That one doesn't fit. Try again?"));
    }
    if (res.status === 400) {
      setPhase("name");
      return setNote("First name only, up to 20 characters.");
    }
    if (res.status !== 200) {
      setPhase("name");
      return setNote("Something went wrong. Try again.");
    }
    let place = "";
    try {
      place = sessionStorage.getItem("poster-place") ?? "";
      sessionStorage.removeItem("poster-place");
    } catch {
      // Private mode: no prefill, the icebreaker form still opens.
    }
    setPostUrl(place ? `/around/new?place=${encodeURIComponent(place)}` : "/around/new");
    setPhase("choice");
  }

  useEffect(() => {
    api<{ firstName: string | null }>("GET", "/api/me")
      .then((res) => {
        if (res.status === 401) return setPhase("signin");
        if (res.data.firstName) return claim();
        setPhase("name");
      })
      .catch(() => setPhase("signin"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen title={phase === "choice" ? "You are in" : "Post your icebreaker"}>
      {(phase === "loading" || phase === "joining") && (
        <div class="around-body">
          <p class="around-status">GETTING YOU IN...</p>
        </div>
      )}

      {phase === "choice" && (
        <div class="around-body">
          <h1 class="around-head">YOU'RE IN.</h1>
          <p class="around-promise">Look for open rooms around you, or post your own icebreaker.</p>
          <ul class="key-list">
            <li><a class="lcd-key lcd-key--primary" href="/around">Look around</a></li>
            <li><a class="lcd-key" href={postUrl}>Post your own</a></li>
          </ul>
          <p class="around-privacy">First names only. Your exact spot is never stored.</p>
        </div>
      )}

      {phase === "signin" && (
        <div class="around-body">
          <h1 class="around-head">ONE TAP LEFT.</h1>
          <p class="around-promise">Tap the link in your email first: it signs you in on this phone.</p>
        </div>
      )}

      {phase === "name" && (
        <>
          <div class="around-body">
            <h1 class="around-head">WHAT SHOULD PEOPLE CALL YOU?</h1>
            <p class="around-privacy">First name only.</p>
            <input
              class="lcd-field"
              type="text"
              maxLength={20}
              autoComplete="given-name"
              placeholder="Your first name"
              value={name}
              aria-label="First name"
              onInput={(e) => setName((e.target as HTMLInputElement).value.slice(0, 20))}
            />
            {note && <p class="lcd-small" role="status">{note}</p>}
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" disabled={busy || !name.trim()} onClick={() => { setBusy(true); claim(name.trim()).finally(() => setBusy(false)); }}>
              <span>I'M IN</span><span aria-hidden="true">&gt;</span>
            </button>
          </div>
        </>
      )}
    </Screen>
  );
}
