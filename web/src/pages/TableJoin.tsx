// WP-A4 quick onboarding from the table: a camera scan by someone without an
// account goes landing, email link and 18+, first name, straight to the
// table. No compass, no Around, no tour, and never a location prompt.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { Screen } from "../components/Screen";

interface Pending {
  pendingId: string;
  topic: string;
  size: string;
}

type LandingPhase = "loading" | "landing" | "check" | "sent" | "wrapped";

export function TableLanding() {
  const [phase, setPhase] = useState<LandingPhase>("loading");
  const [pending, setPending] = useState<Pending | null>(null);
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    api<Pending>("GET", "/api/table/pending")
      .then((res) => {
        if (res.status !== 200) return setPhase("wrapped");
        setPending(res.data);
        setPhase("landing");
      })
      .catch(() => setPhase("wrapped"));
  }, []);

  async function sendLink() {
    if (!pending || busy) return;
    if (!adult) return setNote("Please confirm you are 18 or over first.");
    setBusy(true);
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/table/start", { email: email.trim(), adult, pendingId: pending.pendingId });
    } catch {
      setBusy(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    if (res.status === 404) return setPhase("wrapped");
    if (res.status === 400) return setNote("That email doesn't look right. Try again?");
    if (res.status !== 200) return setNote("Something went wrong. Try again.");
    setPhase("sent");
  }

  return (
    <Screen title="Hoolala! room">
      {phase === "loading" && (
        <div class="around-body">
          <p class="around-status">OPENING THE TABLE...</p>
        </div>
      )}

      {phase === "wrapped" && (
        <div class="around-body">
          <h1 class="around-head">THAT TABLE HAS WRAPPED UP.</h1>
          <p class="around-promise">Hoolala! is set up for next time.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Get Hoolala!</a></li></ul>
        </div>
      )}

      {phase === "landing" && pending && (
        <>
          <div class="around-body">
            <span class="table-kicker">HOOLALA! ROOM</span>
            <p class="room-topic">{pending.topic}</p>
            <span class="room-meta">{pending.size}</span>
            <p class="around-promise">You just scanned a phone on this table. Someone here wants to talk about this.</p>
            <p class="around-promise">Hoolala! gets people off their phones and talking. Join in 30 seconds.</p>
            <p class="around-privacy">Not a dating app. First names only.</p>
          </div>
          <div class="thumb-zone">
            <button class="thumb-key" type="button" onClick={() => setPhase("check")}><span>JOIN THIS TABLE</span><span aria-hidden="true">&gt;</span></button>
          </div>
        </>
      )}

      {phase === "check" && (
        <>
          <div class="around-body">
            <h1 class="around-head">CHECK YOUR EMAIL</h1>
            <label class="field-label" for="table-email">EMAIL</label>
            <input
              id="table-email"
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
          <p class="around-promise">Tap the link we sent. It brings you straight back to this table.</p>
        </div>
      )}
    </Screen>
  );
}

type ClaimPhase = "loading" | "name" | "joining" | "wrapped" | "full" | "signin";

export function TableClaim() {
  const { query, route } = useLocation();
  const pendingId = typeof query.pending === "string" ? query.pending : "";
  const [phase, setPhase] = useState<ClaimPhase>("loading");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function claim(firstName?: string) {
    setPhase("joining");
    setNote("");
    let res;
    try {
      res = await api<{ roomId: string }>("POST", "/api/table/claim", firstName === undefined ? { pendingId } : { pendingId, firstName });
    } catch {
      setPhase("name");
      return setNote("No connection. Try again when you're back online.");
    }
    if (res.status === 401) return setPhase("signin");
    if (res.status === 409 && res.data.error === "full") return setPhase("full");
    if (res.status === 409) return setPhase("wrapped");
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
    route(`/room?id=${res.data.roomId}&table=1`);
  }

  useEffect(() => {
    if (!pendingId) return setPhase("wrapped");
    api<{ firstName: string | null }>("GET", "/api/me")
      .then((res) => {
        if (res.status === 401) return setPhase("signin");
        if (res.data.firstName) return claim();
        setPhase("name");
      })
      .catch(() => setPhase("signin"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  return (
    <Screen title="Join the table">
      {(phase === "loading" || phase === "joining") && (
        <div class="around-body">
          <p class="around-status">JOINING THE TABLE...</p>
        </div>
      )}

      {phase === "signin" && (
        <div class="around-body">
          <h1 class="around-head">ONE TAP LEFT.</h1>
          <p class="around-promise">Tap the link in your email first: it signs you in on this phone.</p>
        </div>
      )}

      {phase === "wrapped" && (
        <div class="around-body">
          <h1 class="around-head">THAT TABLE HAS WRAPPED UP.</h1>
          <p class="around-promise">Your account is ready for next time.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/">Open Hoolala!</a></li></ul>
        </div>
      )}

      {phase === "full" && (
        <div class="around-body">
          <h1 class="around-head">THAT TABLE IS FULL.</h1>
          <p class="around-promise">Your account is ready for next time.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/">Open Hoolala!</a></li></ul>
        </div>
      )}

      {phase === "name" && (
        <>
          <div class="around-body">
            <h1 class="around-head">WHAT SHOULD THE TABLE CALL YOU?</h1>
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
