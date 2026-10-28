// WP5 MEET: two people who accepted each other confirm they met.
// One shows a QR (a link with a short code); the other points their phone
// camera at it, or types the code. Both say WE MET. No AI, on purpose.
import { useLocation } from "preact-iso";
import { useEffect, useState } from "preact/hooks";
import { encode } from "uqr";
import { api } from "../api";
import { Screen } from "../components/Screen";

interface MeetState { id: string; state: "waiting" | "joined" | "confirmed"; otherName: string | null; youAgreed: boolean; theyAgreed: boolean; expiresAt: string }

const ERRORS: Record<string, string> = {
  not_found: "That code doesn't work here. Check it with the other person.",
  expired: "That code has expired. Ask them to show a new one.",
  taken: "Someone else already used that code.",
  too_many: "That's a lot of tries. Wait a few minutes.",
  signed_out: "Sign in first.",
};

function Qr({ text }: { text: string }) {
  const { data, size } = encode(text, { border: 2 });
  return (
    <svg class="qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code to meet" shape-rendering="crispEdges">
      <rect width={size} height={size} fill="var(--lcd-surface)" />
      {data.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--lcd-ink)" /> : null)))}
    </svg>
  );
}

function minutesLeft(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 60_000));
}

export function Meet() {
  const { query } = useLocation();
  const [meet, setMeet] = useState<MeetState | null>(null);
  const [show, setShow] = useState<{ code: string; url: string } | null>(null);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [stay, setStay] = useState<"ask" | "done">("ask");

  async function join(code: string) {
    const res = await api<MeetState>("POST", "/api/meet/join", { code });
    if (res.status === 200) return setMeet(res.data);
    setNote(ERRORS[res.data.error ?? ""] ?? "Something went wrong. Try again.");
  }

  useEffect(() => {
    if (query.code) join(query.code);
    else if (query.signal) {
      api<{ id: string; code: string; url: string; expiresAt: string }>("POST", "/api/meet/start", { signalId: query.signal }).then((res) => {
        if (res.status !== 200) return setNote("Meet works from a signal you've both accepted.");
        setShow({ code: res.data.code, url: res.data.url });
        setMeet({ id: res.data.id, state: "waiting", otherName: null, youAgreed: false, theyAgreed: false, expiresAt: res.data.expiresAt });
      });
    }
  }, []);

  // Follow the other side until both have agreed.
  useEffect(() => {
    if (!meet || meet.state === "confirmed") return;
    const timer = setInterval(async () => {
      const res = await api<MeetState>("GET", `/api/meet/${meet.id}`);
      if (res.status === 200) setMeet(res.data);
    }, 2000);
    return () => clearInterval(timer);
  }, [meet?.id, meet?.state]);

  async function weMet() {
    if (!meet) return;
    const res = await api<MeetState>("POST", `/api/meet/${meet.id}/agree`);
    if (res.status === 200) return setMeet(res.data);
    setNote(ERRORS[res.data.error ?? ""] ?? "Something went wrong. Try again.");
  }

  async function stayInTouch() {
    if (!meet) return;
    await api("POST", `/api/meet/${meet.id}/stay-in-touch`);
    setStay("done");
  }

  const name = meet?.otherName ?? "them";

  return (
    <Screen title="Meet">
      <h1 class="screen-title">Meet</h1>

      {!meet && !query.signal && (
        <form onSubmit={(e) => { e.preventDefault(); join(typed); }} noValidate>
          <p class="lcd-block">Meeting someone from a signal? Point your camera at their QR, or type their code.</p>
          <label class="lcd-label" for="meet-code">Their code</label>
          <input class="lcd-field" id="meet-code" autocomplete="off" autocapitalize="characters" maxLength={8}
            value={typed} onInput={(e) => setTyped(e.currentTarget.value)} placeholder="K7QX4M" />
          <ul class="key-list"><li><button class="lcd-key lcd-key--primary" type="submit">That's them</button></li></ul>
        </form>
      )}

      {meet?.state === "waiting" && show && (
        <>
          <Qr text={show.url} />
          <p class="meet-code" aria-label={`Code ${show.code.split("").join(" ")}`}>{show.code}</p>
          <p class="lcd-small">Ask them to point their camera at this, or type the code on MEET. Works for {minutesLeft(meet.expiresAt)} more minutes.</p>
        </>
      )}

      {meet && meet.state !== "waiting" && meet.state !== "confirmed" && (
        <>
          <p class="lcd-block">Did you meet <strong>{name}</strong>?</p>
          {meet.youAgreed ? (
            <p class="lcd-kicker" role="status">Waiting for {name}...</p>
          ) : (
            <ul class="key-list">
              <li><button class="lcd-key lcd-key--primary" type="button" onClick={weMet}>We met</button></li>
              <li><a class="lcd-key" href="/here">Not yet</a></li>
            </ul>
          )}
        </>
      )}

      {meet?.state === "confirmed" && (
        <>
          <div class="lcd-block">
            <p class="signal-topic">You met an actual human.</p>
            <p>{name} too. That's one more on the Live page.</p>
          </div>
          {stay === "ask" ? (
            <>
              <p>Stay in touch with {name}? We only tell them if they choose it too.</p>
              <ul class="key-list">
                <li><button class="lcd-key lcd-key--primary" type="button" onClick={stayInTouch}>Stay in touch</button></li>
                <li><button class="lcd-key" type="button" onClick={() => setStay("done")}>No thanks</button></li>
              </ul>
            </>
          ) : (
            <ul class="key-list">
              <li><a class="lcd-key lcd-key--primary" href="/live">See the Live page</a></li>
              <li><a class="lcd-key" href="/here">Back to what's here</a></li>
            </ul>
          )}
        </>
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
